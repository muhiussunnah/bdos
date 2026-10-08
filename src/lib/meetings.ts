import type { SenderIdentity } from '@/lib/email/resend';
import type { Lead, LeadMeeting } from '@/lib/types';

/* ────────────────────────────────────────────────────────────────────────────
 * Meetings: booking-page links, video rooms (Teams / Meet / Zoom), calendar
 * invites (.ics, iTIP REQUEST / CANCEL) and RSVP detection.
 * Settings live in user_settings.data.meeting; the booked meeting lives on the
 * lead in leads.data.meeting.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface SenderMeeting { bookingUrl?: string; roomUrl?: string; calendarEmail?: string }
export interface MeetingSettings { timezone?: string; duration?: number; bySender?: Record<string, SenderMeeting> }
export interface MeetingConfig { bookingUrl: string; roomUrl: string; calendarEmail: string; timezone: string; duration: number }

export const DEFAULT_TZ = 'Europe/Stockholm';
export const DURATIONS = [15, 30, 45, 60, 90] as const;

export function meetingSettings(data: unknown): MeetingSettings {
  const m = (data as { meeting?: MeetingSettings } | null | undefined)?.meeting;
  return m && typeof m === 'object' ? m : {};
}

/** Config for one salesperson; empty fields fall back to the default sender's (set it once, works for all). */
export function meetingFor(data: unknown, senders: SenderIdentity[], senderId?: string | null): MeetingConfig {
  const ms = meetingSettings(data);
  const def = senders.find((s) => s.isDefault) || senders[0];
  const own = senderId ? ms.bySender?.[senderId] : undefined;
  const base = def ? ms.bySender?.[def.id] : undefined;
  return {
    bookingUrl: (own?.bookingUrl || base?.bookingUrl || '').trim(),
    roomUrl: (own?.roomUrl || base?.roomUrl || '').trim(),
    calendarEmail: (own?.calendarEmail || base?.calendarEmail || '').trim().toLowerCase(),
    timezone: ms.timezone || DEFAULT_TZ,
    duration: ms.duration || 60,
  };
}

export function meetingOf(l: Lead): LeadMeeting | null {
  const m = l.data && typeof l.data === 'object' ? l.data.meeting : undefined;
  return m && typeof m === 'object' && m.at ? m : null;
}

/** Scheduled and not finished yet. */
export function isUpcoming(m: LeadMeeting | null, now = Date.now()): boolean {
  return !!m && m.status === 'scheduled' && new Date(m.end || m.at).getTime() >= now;
}

export type Provider = 'teams' | 'meet' | 'zoom' | 'other';
export function providerOf(url?: string | null): Provider {
  const u = (url || '').toLowerCase();
  if (u.includes('teams.microsoft.com') || u.includes('teams.live.com')) return 'teams';
  if (u.includes('meet.google.com')) return 'meet';
  if (u.includes('zoom.us')) return 'zoom';
  return 'other';
}
export const PROVIDER_LABEL: Record<Provider, string> = { teams: 'Teams', meet: 'Google Meet', zoom: 'Zoom', other: 'Video link' };

/* ── formatting ─────────────────────────────────────────────────────────── */

export function fmtWhen(iso: string, tz = DEFAULT_TZ, lang = 'en'): string {
  return new Intl.DateTimeFormat(lang === 'sv' ? 'sv-SE' : 'en-GB', {
    timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}
export function fmtShort(iso: string, tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** One-click "add to my Google Calendar" (no setup needed). */
export function googleCalendarUrl(m: { title: string; at: string; end: string; link?: string; note?: string }): string {
  const z = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const p = new URLSearchParams({ action: 'TEMPLATE', text: m.title, dates: `${z(m.at)}/${z(m.end)}`, details: [m.link ? `Join: ${m.link}` : '', m.note || ''].filter(Boolean).join('\n\n'), location: m.link || '' });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/* ── iCalendar (RFC 5545 / iTIP) ─────────────────────────────────────────── */

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const cn = (s: string) => `"${s.replace(/"/g, "'")}"`;

/** Fold lines at 75 octets (UTF-8 safe) as the spec requires. */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '', bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export interface IcsInput {
  method: 'REQUEST' | 'CANCEL';
  uid: string; seq: number;
  start: Date; end: Date;
  title: string; description: string; location?: string;
  organizer: { name: string; email: string };
  attendees: { email: string; name?: string; accepted?: boolean }[];
}

export function buildIcs(e: IcsInput): string {
  const teams = providerOf(e.location) === 'teams';
  const lines = [
    'BEGIN:VCALENDAR', 'PRODID:-//Klientic//Meetings//EN', 'VERSION:2.0', 'CALSCALE:GREGORIAN', `METHOD:${e.method}`,
    'BEGIN:VEVENT',
    `UID:${e.uid}`, `SEQUENCE:${e.seq}`, `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(e.start)}`, `DTEND:${icsDate(e.end)}`,
    `SUMMARY:${icsText(e.title)}`,
    `DESCRIPTION:${icsText(e.description)}`,
    ...(e.location ? [`LOCATION:${icsText(e.location)}`, ...(/^https?:\/\//.test(e.location) ? [`URL:${e.location}`] : [])] : []),
    ...(teams && e.location ? [`X-MICROSOFT-SKYPETEAMSMEETINGURL:${e.location}`] : []),
    `STATUS:${e.method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
    `ORGANIZER;CN=${cn(e.organizer.name)}:mailto:${e.organizer.email}`,
    ...e.attendees.map((a) => `ATTENDEE;CN=${cn(a.name || a.email)};CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=${a.accepted ? 'ACCEPTED' : 'NEEDS-ACTION'};RSVP=${a.accepted ? 'FALSE' : 'TRUE'}:mailto:${a.email}`),
    ...(e.method === 'REQUEST' ? ['BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(e.title)}`, 'END:VALARM'] : []),
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** UTF-8 → base64 without Buffer (edge runtime). */
export function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/* ── invite email ────────────────────────────────────────────────────────── */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inviteEmail(o: {
  lang: string; cancel?: boolean; reschedule?: boolean; title: string; whenText: string; duration: number;
  link?: string; note?: string; intro?: string; senderName: string;
}): { subject: string; html: string; text: string } {
  const sv = o.lang === 'sv';
  const T = sv
    ? { invite: 'Inbjudan', updated: 'Uppdaterad inbjudan', cancelled: 'Inställt', when: 'När', length: 'Längd', min: 'min', join: 'Anslut till mötet', joinWith: 'Anslut via', agenda: 'Agenda', calendar: 'Inbjudan är bifogad — svara Ja/Nej direkt i din kalender.', cancelText: 'Mötet är tyvärr inställt. Hör av dig om du vill boka en ny tid.', regards: 'Vänliga hälsningar' }
    : { invite: 'Invitation', updated: 'Updated invitation', cancelled: 'Cancelled', when: 'When', length: 'Duration', min: 'min', join: 'Join the meeting', joinWith: 'Join with', agenda: 'Agenda', calendar: 'The invitation is attached — accept or decline right in your calendar.', cancelText: 'This meeting has been cancelled. Reply if you would like a new time.', regards: 'Best regards' };
  const prov = providerOf(o.link);
  const head = o.cancel ? T.cancelled : o.reschedule ? T.updated : T.invite;
  const subject = `${head}: ${o.title} – ${o.whenText}`;
  const intro = (o.intro || '').trim();
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#16121F;max-width:560px">
${intro ? `<p style="margin:0 0 16px">${esc(intro).replace(/\n/g, '<br>')}</p>` : ''}
<div style="border:1px solid #ECEAF1;border-radius:14px;padding:18px 20px;background:#FBFAFD">
  <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${o.cancel ? '#E5484D' : '#A435E8'}">${head}</div>
  <div style="font-size:18px;font-weight:800;margin:4px 0 12px;${o.cancel ? 'text-decoration:line-through;' : ''}">${esc(o.title)}</div>
  <div><b>${T.when}:</b> ${esc(o.whenText)}</div>
  <div><b>${T.length}:</b> ${o.duration} ${T.min}</div>
  ${!o.cancel && o.link ? `<div style="margin-top:14px"><a href="${esc(o.link)}" style="display:inline-block;background:#5B5FC7;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:10px">${prov === 'other' ? T.join : `${T.joinWith} ${PROVIDER_LABEL[prov]}`}</a></div><div style="margin-top:6px;font-size:12px;color:#6A6478;word-break:break-all">${esc(o.link)}</div>` : ''}
  ${o.note && !o.cancel ? `<div style="margin-top:14px"><b>${T.agenda}:</b><br>${esc(o.note).replace(/\n/g, '<br>')}</div>` : ''}
</div>
<p style="font-size:13px;color:#6A6478;margin:14px 0">${o.cancel ? T.cancelText : T.calendar}</p>
<p style="margin:0">${T.regards},<br>${esc(o.senderName)}</p>
</div>`;
  const text = [intro, `${head}: ${o.title}`, `${T.when}: ${o.whenText}`, `${T.length}: ${o.duration} ${T.min}`, !o.cancel && o.link ? `${T.join}: ${o.link}` : '', o.note && !o.cancel ? `${T.agenda}:\n${o.note}` : '', o.cancel ? T.cancelText : T.calendar, `${T.regards},\n${o.senderName}`].filter(Boolean).join('\n\n');
  return { subject, html, text };
}

/** Booking-link email (the lead picks a time on the booking page). */
export function bookingLinkEmail(o: { lang: string; firstName?: string | null; link: string; senderName: string; videoLabel?: string }): { subject: string; html: string } {
  const sv = o.lang === 'sv';
  const hi = sv ? `Hej${o.firstName ? ` ${o.firstName}` : ''},` : `Hi${o.firstName ? ` ${o.firstName}` : ''},`;
  const video = o.videoLabel ? (sv ? ` (digitalt via ${o.videoLabel})` : ` (online via ${o.videoLabel})`) : '';
  const body = sv
    ? `Välj en tid som passar dig så ses vi${video} — du får en kalenderinbjudan direkt när du har bokat.`
    : `Pick a time that suits you and we will meet${video} — you get a calendar invitation as soon as you book.`;
  const cta = sv ? 'Boka ett möte' : 'Book a meeting';
  return {
    subject: sv ? 'Boka ett möte med mig' : 'Book a time that suits you',
    html: `<p>${esc(hi)}</p><p>${esc(body)}</p><p><a href="${esc(o.link)}"><b>${cta} →</b></a></p><p>${sv ? 'Vänliga hälsningar' : 'Best regards'},<br>${esc(o.senderName)}</p>`,
  };
}

/* ── RSVP replies (Gmail / Outlook, English + Swedish) ───────────────────── */

export type Rsvp = 'accepted' | 'declined' | 'tentative';
export function rsvpFromSubject(subject?: string | null): Rsvp | null {
  const s = (subject || '').trim().toLowerCase();
  if (/^(tentative|tentatively accepted|preliminärt accepterat|preliminärt|preliminär|kanske)\s*:/.test(s)) return 'tentative';
  if (/^(accepted|accepterat|accepterad|godkänt|godkänd|ja)\s*:/.test(s)) return 'accepted';
  if (/^(declined|avböjt|avböjd|avvisat|avvisad|nej)\s*:/.test(s)) return 'declined';
  return null;
}
export const RSVP_LABEL: Record<Rsvp, string> = { accepted: 'Accepted', declined: 'Declined', tentative: 'Maybe' };

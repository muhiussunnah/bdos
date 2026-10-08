import { auth, bad, ok, logActivity } from '@/lib/api';
import { resolveEmail, sendEmail, parseAddressList } from '@/lib/email/resend';
import { isEmail } from '@/lib/csv';
import { meetingFor, buildIcs, toBase64, inviteEmail, fmtWhen, googleCalendarUrl, providerOf, PROVIDER_LABEL } from '@/lib/meetings';
import { addWorkingDays, attemptsOf, followupStage, DEFAULT_NEXT_WORKING_DAYS } from '@/lib/sales';
import { senderName } from '@/lib/email/afterSend';
import type { Lead, LeadData, LeadMeeting, Project } from '@/lib/types';

export const runtime = 'edge';

interface Body {
  action: 'book' | 'cancel';
  leadId: string;
  start?: string; duration?: number; title?: string; link?: string; note?: string; intro?: string;
  attendees?: string | string[]; fromId?: string | null; sendInvite?: boolean;
}

/**
 * Book, reschedule or cancel a meeting with a lead.
 *   book   → calendar invite (.ics REQUEST) to the lead (+ a copy for the salesperson's
 *            Google Calendar), lead → Meeting booked, prep task the day before.
 *            Booking again while a meeting is scheduled = reschedule (same UID, SEQUENCE+1).
 *   cancel → .ics CANCEL to everyone invited, lead → Follow-up.
 * sendInvite:false just logs a meeting that was booked elsewhere (e.g. the Google booking page).
 */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const b = (await req.json().catch(() => ({}))) as Body;
  if (!b.leadId) return bad('leadId is required');
  const { data: leadRow } = await supabase.from('leads').select('*').eq('id', b.leadId).single();
  if (!leadRow) return bad('Lead not found', 404);
  const lead = leadRow as Lead;
  const { data: project } = await supabase.from('projects').select('*').eq('id', lead.project_id).single();
  const lang = ((project as Project | null)?.outreach_language || 'en').slice(0, 2);

  const { data: settingsRow } = await supabase.from('user_settings').select('data').eq('owner_id', userId).maybeSingle();
  const resolved = await resolveEmail(supabase, userId, b.fromId || null);
  const cfg = meetingFor(settingsRow?.data, resolved.senders, resolved.sender?.id);
  const from = resolved.from;
  const organizer = { name: senderName(from), email: (from.match(/<([^>]+)>/)?.[1] || from).trim().toLowerCase() };

  const d: LeadData = (lead.data && typeof lead.data === 'object' ? lead.data : {}) as LeadData;
  const existing = d.meeting && d.meeting.status === 'scheduled' ? d.meeting : null;
  const now = new Date().toISOString();

  /* ── cancel ─────────────────────────────────────────────────────────── */
  if (b.action === 'cancel') {
    if (!existing) return bad('There is no scheduled meeting to cancel');
    const seq = existing.seq + 1;
    if (existing.invited && existing.attendees.length) {
      if (!resolved.apiKey) return bad('No Resend key. Add it in Settings → Email.', 428);
      const whenText = fmtWhen(existing.at, cfg.timezone, lang);
      const ics = buildIcs({ method: 'CANCEL', uid: existing.uid, seq, start: new Date(existing.at), end: new Date(existing.end), title: existing.title, description: existing.note || '', location: existing.link, organizer, attendees: existing.attendees.map((email) => ({ email })) });
      const mail = inviteEmail({ lang, cancel: true, title: existing.title, whenText, duration: existing.duration, senderName: organizer.name });
      try {
        await sendEmail({ to: existing.attendees, bcc: cfg.calendarEmail && cfg.calendarEmail !== organizer.email ? [cfg.calendarEmail] : undefined, subject: mail.subject, html: mail.html, text: mail.text, from, apiKey: resolved.apiKey, attachments: [{ filename: 'cancel.ics', content: toBase64(ics), contentType: 'text/calendar; charset=utf-8; method=CANCEL' }] });
      } catch (e) { return bad(e instanceof Error ? e.message : 'Could not send the cancellation', 502); }
      await supabase.from('messages').insert({ lead_id: lead.id, project_id: lead.project_id, owner_id: userId, direction: 'outbound', subject: mail.subject, body: mail.text, status: 'sent', to_email: existing.attendees.join(', '), from_email: from, sent_at: now, ai_meta: { manual: true, meeting: { uid: existing.uid, cancel: true }, html: mail.html } });
    }
    const attempts = attemptsOf(lead) + 1;
    const next = addWorkingDays(new Date(), DEFAULT_NEXT_WORKING_DAYS).toISOString();
    const data: LeadData = { ...d, attempts, meeting: { ...existing, seq, status: 'cancelled', updated_at: now } };
    await supabase.from('leads').update({ stage: followupStage(attempts), followup_step: Math.min(3, attempts), next_action_at: next, data, updated_at: now }).eq('id', lead.id);
    await supabase.from('tasks').delete().eq('lead_id', lead.id).eq('status', 'open').in('type', ['review', 'call']);
    await logActivity(supabase, userId, lead.project_id, 'meeting', `${lead.company_name}: meeting cancelled (${fmtWhen(existing.at, cfg.timezone, 'en')})`, { leadId: lead.id, by: organizer.name, uid: existing.uid });
    return ok({ cancelled: true, next_action_at: next });
  }

  /* ── book / reschedule ─────────────────────────────────────────────── */
  const start = b.start ? new Date(b.start) : null;
  if (!start || Number.isNaN(start.getTime())) return bad('Pick a date and time');
  const duration = Math.min(240, Math.max(15, Math.round(Number(b.duration) || cfg.duration)));
  const end = new Date(start.getTime() + duration * 60000);
  const title = (b.title || '').trim().slice(0, 160) || `Meeting with ${lead.company_name}`;
  const link = (b.link ?? cfg.roomUrl).trim();
  if (link && !/^https?:\/\/\S+$/i.test(link)) return bad('The meeting link must start with https://');
  const note = (b.note || '').trim().slice(0, 2000);
  const attendees = [...new Set((Array.isArray(b.attendees) ? b.attendees : parseAddressList(b.attendees || lead.email || '')).map((a) => a.trim().toLowerCase()).filter(Boolean))];
  const badAddr = attendees.find((a) => !isEmail(a));
  if (badAddr) return bad(`"${badAddr}" is not a valid email address`);
  const sendInvite = b.sendInvite !== false;
  if (sendInvite && !attendees.length) return bad('Add the lead\'s email to send the invitation');

  const reschedule = !!existing;
  const uid = existing?.uid || `${crypto.randomUUID()}@klientic.com`;
  const seq = existing ? existing.seq + 1 : 0;
  const whenText = fmtWhen(start.toISOString(), cfg.timezone, lang);
  const calendarCopy = cfg.calendarEmail && cfg.calendarEmail !== organizer.email && !attendees.includes(cfg.calendarEmail) ? cfg.calendarEmail : '';

  if (sendInvite) {
    if (!resolved.apiKey) return bad('No Resend key. Add it in Settings → Email.', 428);
    const ics = buildIcs({
      method: 'REQUEST', uid, seq, start, end, title, location: link || undefined,
      description: [note, link ? `${PROVIDER_LABEL[providerOf(link)]}: ${link}` : ''].filter(Boolean).join('\n\n'),
      organizer,
      attendees: [...attendees.map((email) => ({ email, name: email === lead.email?.toLowerCase() && lead.contact_name ? lead.contact_name : undefined })), ...(calendarCopy ? [{ email: calendarCopy, name: organizer.name, accepted: true }] : [])],
    });
    const mail = inviteEmail({ lang, reschedule, title, whenText, duration, link: link || undefined, note: note || undefined, intro: b.intro, senderName: organizer.name });
    try {
      await sendEmail({ to: attendees, bcc: calendarCopy ? [calendarCopy] : undefined, subject: mail.subject, html: mail.html, text: mail.text, from, apiKey: resolved.apiKey, attachments: [{ filename: 'invite.ics', content: toBase64(ics), contentType: 'text/calendar; charset=utf-8; method=REQUEST' }] });
    } catch (e) { return bad(e instanceof Error ? e.message : 'Could not send the invitation', 502); }
    await supabase.from('messages').insert({ lead_id: lead.id, project_id: lead.project_id, owner_id: userId, direction: 'outbound', subject: mail.subject, body: mail.text, status: 'sent', to_email: attendees.join(', '), from_email: from, sent_at: now, ai_meta: { manual: true, meeting: { uid, at: start.toISOString() }, html: mail.html } });
  }

  const meeting: LeadMeeting = {
    uid, seq, at: start.toISOString(), end: end.toISOString(), duration, title, link: link || undefined, note: note || undefined,
    attendees, senderId: resolved.sender?.id || null, by: organizer.name, status: 'scheduled', invited: sendInvite || !!existing?.invited,
    created_at: existing?.created_at || now, updated_at: now,
  };
  const data: LeadData = { ...d, meeting };
  const patch: Record<string, unknown> = { stage: 'meeting', next_action_at: meeting.at, data, updated_at: now };
  if (sendInvite) patch.last_contacted_at = now;
  const { error } = await supabase.from('leads').update(patch).eq('id', lead.id);
  if (error) return bad(/data/.test(error.message) ? 'Database update needed: run supabase/migrations/20261006_lead_data.sql' : error.message, 500);

  // one prep task: the working day before at 09:00, or an hour before when the meeting is soon
  await supabase.from('tasks').delete().eq('lead_id', lead.id).eq('status', 'open').in('type', ['review', 'call']);
  const dayBefore = new Date(start); dayBefore.setDate(dayBefore.getDate() - 1); dayBefore.setHours(9, 0, 0, 0);
  const due = dayBefore.getTime() > Date.now() ? dayBefore : new Date(Math.max(Date.now(), start.getTime() - 3600000));
  await supabase.from('tasks').insert({
    project_id: lead.project_id, owner_id: lead.owner_id, lead_id: lead.id, type: 'review', priority: 'A',
    title: `Prepare: meeting with ${lead.company_name}`, reason: `${fmtWhen(meeting.at, cfg.timezone, 'en')}${link ? ` · ${PROVIDER_LABEL[providerOf(link)]}` : ''}`,
    due_at: due.toISOString(), suggested_next_step: 'Open the lead → Meeting prep for talking points, then join from the Meetings page.',
  });

  await logActivity(supabase, userId, lead.project_id, 'meeting',
    `${lead.company_name}: meeting ${reschedule ? 'moved to' : sendInvite ? 'booked for' : 'logged for'} ${fmtWhen(meeting.at, cfg.timezone, 'en')}${sendInvite ? ` · invite sent to ${attendees.join(', ')}` : ''}`,
    { leadId: lead.id, by: organizer.name, uid, at: meeting.at, invited: sendInvite });

  return ok({ meeting, reschedule, googleCalendarUrl: googleCalendarUrl(meeting) });
}

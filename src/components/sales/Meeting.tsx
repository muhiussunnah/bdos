'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarCheck, CalendarPlus, Loader2, Video, Send, XCircle, Check, ExternalLink, CalendarX2 } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { useDialogs } from '@/components/providers/DialogProvider';
import { Modal } from '@/components/ui';
import { sendersFrom } from '@/lib/email/resend';
import { meetingFor, meetingOf, isUpcoming, googleCalendarUrl, providerOf, PROVIDER_LABEL, DURATIONS, fmtShort, RSVP_LABEL } from '@/lib/meetings';
import { addWorkingDays, toDateInput, toTimeInput, leadData } from '@/lib/sales';
import type { Lead, LeadMeeting } from '@/lib/types';

/**
 * Book (or reschedule / cancel) a meeting with a lead: date, time, length, Teams/Meet
 * link and a calendar invite the lead can accept in Gmail / Outlook. Afterwards one
 * click adds it to the salesperson's Google Calendar.
 */
export function BookMeetingModal({ lead, open, onClose, onDone }: { lead: Lead | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const { settings, project } = useApp();
  const { confirm } = useDialogs();
  const senders = useMemo(() => sendersFrom(settings), [settings]);
  const [fromId, setFromId] = useState('');
  const cfg = useMemo(() => meetingFor(settings?.data, senders, fromId || null), [settings, senders, fromId]);
  const existing = lead ? meetingOf(lead) : null;
  const scheduled = existing && existing.status === 'scheduled' ? existing : null;
  const sv = (project?.outreach_language || 'en').startsWith('sv');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [attendees, setAttendees] = useState('');
  const [note, setNote] = useState('');
  const [intro, setIntro] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const [busy, setBusy] = useState<'book' | 'cancel' | null>(null);
  const [done, setDone] = useState<{ meeting: LeadMeeting; googleCalendarUrl: string; reschedule: boolean } | null>(null);

  useEffect(() => {
    if (!open || !lead) return;
    const owner = leadData(lead).owner;
    const sid = (owner && senders.some((s) => s.id === owner) ? owner : senders.find((s) => s.isDefault)?.id) || '';
    setFromId(sid);
    const c = meetingFor(settings?.data, senders, sid || null);
    if (scheduled) {
      const at = new Date(scheduled.at);
      setDate(toDateInput(at)); setTime(toTimeInput(at)); setDuration(scheduled.duration); setTitle(scheduled.title);
      setLink(scheduled.link || ''); setAttendees(scheduled.attendees.join(', ')); setNote(scheduled.note || '');
    } else {
      setDate(toDateInput(addWorkingDays(new Date(), 1))); setTime('10:00'); setDuration(c.duration);
      setTitle(sv ? `Möte med ${lead.company_name}` : `Meeting with ${lead.company_name}`);
      setLink(c.roomUrl); setAttendees(lead.email || ''); setNote('');
    }
    setIntro(''); setSendInvite(true); setDone(null);
  }, [open, lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lead) return null;
  const prov = providerOf(link);

  async function book() {
    if (!lead) return;
    if (!date || !time) return toast.error('Pick a date and time');
    const start = new Date(`${date}T${time}:00`);
    if (Number.isNaN(start.getTime())) return toast.error('Pick a valid date and time');
    if (sendInvite && !attendees.trim()) return toast.error('Add the lead\'s email to send the invitation');
    setBusy('book');
    try {
      const res = await fetch('/api/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'book', leadId: lead.id, start: start.toISOString(), duration, title, link, note, intro, attendees, fromId: fromId || null, sendInvite }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setDone(d);
      toast.success(d.reschedule ? 'Meeting moved — updated invite sent' : sendInvite ? 'Meeting booked — invite sent' : 'Meeting logged');
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not book the meeting'); }
    finally { setBusy(null); }
  }

  async function cancel() {
    if (!lead || !scheduled) return;
    const ok = await confirm({ title: 'Cancel this meeting?', body: <>{scheduled.invited ? <>A cancellation goes to <b className="text-ink">{scheduled.attendees.join(', ')}</b> and removes it from their calendar. </> : null}The lead moves back to Follow-up with a call in {3} working days.</>, confirmLabel: 'Cancel meeting' });
    if (!ok) return;
    setBusy('cancel');
    try {
      const res = await fetch('/api/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', leadId: lead.id, fromId: fromId || null }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success('Meeting cancelled'); onDone(); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not cancel'); }
    finally { setBusy(null); }
  }

  if (done) {
    const m = done.meeting;
    return (
      <Modal open={open} onClose={onClose} title={done.reschedule ? 'Meeting moved' : 'Meeting booked'}>
        <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-4">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Check size={18} /></span>
          <div className="min-w-0">
            <div className="font-bold text-ink">{m.title}</div>
            <div className="text-[13px] text-dim">{fmtShort(m.at)} · {m.duration} min{m.link ? ` · ${PROVIDER_LABEL[providerOf(m.link)]}` : ''}</div>
            {m.invited && <div className="mt-1 text-[12px] text-faint">Invitation sent to {m.attendees.join(', ')} — they can accept it in their calendar.</div>}
            {!cfg.calendarEmail && <div className="mt-1 text-[12px] text-faint">Tip: add your Google Calendar address in Settings → Meetings and invites land there automatically.</div>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {m.link && <a href={m.link} target="_blank" rel="noreferrer" className="btn btn-ghost"><Video size={15} /> Open {PROVIDER_LABEL[providerOf(m.link)]}</a>}
          <a href={done.googleCalendarUrl} target="_blank" rel="noreferrer" className="btn btn-ghost"><CalendarPlus size={15} /> Add to Google Calendar</a>
          <button onClick={onClose} className="btn btn-accent">Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={`${scheduled ? 'Reschedule' : 'Book'} meeting · ${lead.company_name}`} wide>
      {scheduled && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-dim">
          <CalendarCheck size={14} className="text-accent" /> Booked {fmtShort(scheduled.at)}{scheduled.rsvp ? ` · ${RSVP_LABEL[scheduled.rsvp]}` : ''} — change the time below and an updated invite replaces the old one.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="field !mb-0"><label>Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="field !mb-0"><label>Date</label><input type="date" className="input !w-auto" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field !mb-0"><label>Time</label><input type="time" step={900} className="input !w-auto" value={time} onChange={(e) => setTime(e.target.value)} /></div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-faint">Length</span>
        {DURATIONS.map((m) => (
          <button key={m} type="button" onClick={() => setDuration(m)} className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition ${duration === m ? 'border-accent bg-[var(--accent-soft)] text-accent' : 'border-line text-dim hover:border-line-2'}`}>{m} min</button>
        ))}
        <span className="ml-auto text-[11px] text-faint">{cfg.timezone.replace('_', ' ')}</span>
      </div>

      <div className="field mt-3 !mb-0">
        <label className="flex items-center gap-1.5"><Video size={13} /> Meeting link {link && <span className="rounded-md bg-surface-2 px-1.5 text-[10.5px] font-bold text-dim">{PROVIDER_LABEL[prov]}</span>}</label>
        <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://teams.microsoft.com/l/meetup-join/…" />
        {!cfg.roomUrl && <p className="hint">Save your Teams room link once in Settings → Meetings and it is filled in every time.</p>}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="field !mb-0"><label>Invite (attendees)</label><input className="input" value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="anna@hotel.se, erik@hotel.se" /></div>
        <div className="field !mb-0"><label>Send from</label>
          <select className="input" value={fromId} onChange={(e) => setFromId(e.target.value)}>
            {senders.map((s) => <option key={s.id} value={s.id}>{s.name} &lt;{s.email}&gt;</option>)}
          </select></div>
      </div>
      <div className="field mt-3 !mb-0"><label>Agenda (optional)</label><textarea className="input min-h-[64px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Short intro of Famies · how the partnership works · next steps" /></div>
      {sendInvite && <div className="field mt-3 !mb-0"><label>Personal line above the invite (optional)</label><input className="input" value={intro} onChange={(e) => setIntro(e.target.value)} placeholder={sv ? 'Tack för ett trevligt samtal! Här är inbjudan till vårt möte.' : 'Thanks for the chat! Here is the invitation.'} /></div>}

      <label className="mt-3 flex items-start gap-2 text-[12.5px] text-dim">
        <input type="checkbox" className="mt-0.5" checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)} />
        <span>{scheduled?.invited ? 'Send the updated invitation' : 'Send a calendar invitation'} {attendees ? <>to <b className="text-ink">{attendees}</b></> : ''} — they can accept it in Gmail / Outlook.<br />
          <span className="text-faint">Untick if the lead already booked through your booking page — then it is only logged here.</span></span>
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {scheduled ? <button onClick={cancel} disabled={!!busy} className="btn btn-ghost text-bad">{busy === 'cancel' ? <Loader2 size={15} className="animate-spin" /> : <CalendarX2 size={15} />} Cancel meeting</button> : <span />}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={!!busy} className="btn btn-ghost">Close</button>
          <button onClick={book} disabled={!!busy} className="btn btn-accent">{busy === 'book' ? <Loader2 size={15} className="animate-spin" /> : sendInvite ? <Send size={15} /> : <CalendarCheck size={15} />} {scheduled ? 'Save new time' : sendInvite ? 'Book & send invite' : 'Log meeting'}</button>
        </div>
      </div>
    </Modal>
  );
}

/** "📅 Tue 14 Oct, 10:00 · Join" chip for cards and rows. */
export function MeetingChip({ lead, onOpen }: { lead: Lead; onOpen?: () => void }) {
  const m = meetingOf(lead);
  if (!m) return null;
  const upcoming = isUpcoming(m);
  if (m.status === 'cancelled') return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold line-through" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}><XCircle size={11} /> Meeting {fmtShort(m.at)}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <button type="button" onClick={onOpen} title="Reschedule or cancel" className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-extrabold" style={{ background: upcoming ? 'rgba(219,39,119,.12)' : 'var(--border)', color: upcoming ? '#DB2777' : 'var(--dim)' }}>
        <CalendarCheck size={11} /> {fmtShort(m.at)}{m.rsvp ? ` · ${RSVP_LABEL[m.rsvp]}` : ''}
      </button>
      {upcoming && m.link && <a href={m.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-extrabold text-white" style={{ background: '#5B5FC7' }}><Video size={11} /> Join</a>}
      {upcoming && <a href={googleCalendarUrl(m)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Add to Google Calendar" className="inline-flex items-center rounded-md border border-line px-1.5 py-0.5 text-faint hover:text-accent"><ExternalLink size={11} /></a>}
    </span>
  );
}

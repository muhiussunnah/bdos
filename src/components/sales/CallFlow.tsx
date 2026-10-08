'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Phone, Save, UserRound, CalendarClock, Link2, Search, StickyNote, MailPlus, ClipboardList, PenLine, ArrowUpRight, ArrowDownLeft, CalendarPlus, CalendarCheck } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Modal } from '@/components/ui';
import { AnchoredMenu, type MenuItem } from '@/components/Menu';
import { ComposeModal } from '@/components/ComposeModal';
import { BookMeetingModal } from '@/components/sales/Meeting';
import { sendersFrom, type SenderIdentity } from '@/lib/email/resend';
import { meetingFor, meetingOf, bookingLinkEmail, providerOf, PROVIDER_LABEL } from '@/lib/meetings';
import {
  CALL_RESULTS, DEFAULT_NEXT_WORKING_DAYS, addWorkingDays, toDateInput, toTimeInput, fromDateInputs,
  applyCallResult, setPrimaryContact, setOwner, rescheduleNext, linkThreadToLead, leadData, ownerOf, initialsOf,
  logNote, logEmail, logCallStart, callState,
} from '@/lib/sales';
import type { Lead, CallResult } from '@/lib/types';

/* ── who is doing this ─────────────────────────────────────────────────────── */

/** The salesperson's display name: the lead's owner if assigned, else the signed-in user. */
export function useSalesperson(lead?: Lead | null): { by: string; senders: SenderIdentity[]; owner: SenderIdentity | null } {
  const { profile, user, settings } = useApp();
  const senders = useMemo(() => sendersFrom(settings), [settings]);
  const owner = lead ? ownerOf(lead, senders) : null;
  const me = profile?.full_name || user.email || 'me';
  return { by: owner?.name || me, senders, owner };
}

/* ── quick date chips ──────────────────────────────────────────────────────── */

function DatePick({ date, time, onDate, onTime, required }: { date: string; time: string; onDate: (v: string) => void; onTime: (v: string) => void; required?: boolean }) {
  const quick = [
    { label: 'Tomorrow', d: addWorkingDays(new Date(), 1) },
    { label: `${DEFAULT_NEXT_WORKING_DAYS} working days`, d: addWorkingDays(new Date(), DEFAULT_NEXT_WORKING_DAYS) },
    { label: 'Next week', d: addWorkingDays(new Date(), 5) },
    { label: '2 weeks', d: addWorkingDays(new Date(), 10) },
  ];
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">Follow-up date {required && <span className="text-bad">*</span>}</div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" className="input !w-auto !py-1.5" value={date} min={toDateInput(new Date())} onChange={(e) => onDate(e.target.value)} aria-label="Follow-up date" />
        <input type="time" className="input !w-auto !py-1.5" value={time} onChange={(e) => onTime(e.target.value)} aria-label="Time (optional)" />
        <span className="text-[11px] text-faint">time optional</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {quick.map((q) => (
          <button key={q.label} type="button" onClick={() => onDate(toDateInput(q.d))}
            className={`rounded-lg border px-2 py-1 text-[11.5px] font-semibold transition ${date === toDateInput(q.d) ? 'border-accent bg-[var(--accent-soft)] text-accent' : 'border-line text-dim hover:border-line-2'}`}>
            {q.label} · {q.d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── call result ───────────────────────────────────────────────────────────── */

/**
 * After a call: pick the result, add a short note, and (when needed) the next date.
 * "Got contact details" also captures the decision maker right here.
 */
export function CallResultModal({ lead, open, onClose, onDone, initialResult, onMeeting }: {
  lead: Lead | null; open: boolean; onClose: () => void; onDone: () => void; initialResult?: CallResult | null;
  /** "Meeting booked" saved → open the booking dialog for date, time and invite */
  onMeeting?: (lead: Lead) => void;
}) {
  const { supabase } = useApp();
  const { by } = useSalesperson(lead);
  const [result, setResult] = useState<CallResult | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [c, setC] = useState({ email: '', name: '', role: '', phone: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !lead) return;
    setResult(initialResult || null); setNote('');
    setDate(toDateInput(addWorkingDays(new Date(), DEFAULT_NEXT_WORKING_DAYS))); setTime('');
    setC({ email: lead.email || '', name: lead.contact_name || '', role: lead.role || '', phone: lead.phone || '' });
  }, [open, lead, initialResult]);

  if (!lead) return null;
  const def = CALL_RESULTS.find((r) => r.key === result);
  const lastCall = leadData(lead).last_call;

  async function save() {
    if (!lead || !result || !def) return toast.error('Pick what happened on the call');
    const nextAt = def.needsDate ? fromDateInputs(date, time) : null;
    if (def.needsDate && !nextAt) return toast.error('Pick a follow-up date — a lead that needs another call is never saved without one.');
    if (result === 'contact' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim())) return toast.error('Enter the decision maker\'s email');
    setBusy(true);
    try {
      let current = lead;
      if (result === 'contact') {
        await setPrimaryContact(supabase, lead, c, by);
        current = { ...lead, email: c.email.trim().toLowerCase(), contact_name: c.name || lead.contact_name, role: c.role || lead.role, phone: c.phone || lead.phone };
      }
      await applyCallResult(supabase, current, { result, note, nextAt, by });
      toast.success(`${def.emoji} ${def.label}${nextAt ? ` · next ${new Date(nextAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}`);
      onDone(); onClose();
      if (result === 'meeting' && onMeeting) onMeeting({ ...current, stage: 'meeting' });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={`Call result · ${lead.company_name}`}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-dim">
        {lead.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 font-semibold text-ink hover:text-accent"><Phone size={12} /> {lead.phone}</a>}
        {lead.contact_name && <span>{lead.contact_name}{lead.role ? ` · ${lead.role}` : ''}</span>}
        {lastCall && <span className="text-faint">Called {new Date(lastCall.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {lastCall.by}</span>}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {CALL_RESULTS.map((r) => (
          <button key={r.key} type="button" onClick={() => setResult(r.key)}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${result === r.key ? 'border-accent bg-[var(--accent-soft)]' : 'border-line bg-surface hover:border-line-2'}`}>
            <span className="text-[20px] leading-none" aria-hidden>{r.emoji}</span>
            <span className="min-w-0"><span className="block text-[13px] font-bold text-ink">{r.label}</span><span className="block truncate text-[11px] text-faint">{r.hint}</span></span>
          </button>
        ))}
      </div>

      {result === 'contact' && (
        <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-faint"><UserRound size={12} /> Decision maker — becomes the primary contact</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="field !mb-0"><label>Primary email *</label><input className="input" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} placeholder="anna.andersson@hotel.se" /></div>
            <div className="field !mb-0"><label>Contact name</label><input className="input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="Anna Andersson" /></div>
            <div className="field !mb-0"><label>Role</label><input className="input" value={c.role} onChange={(e) => setC({ ...c, role: e.target.value })} placeholder="Hotel Manager" /></div>
            <div className="field !mb-0"><label>Phone</label><input className="input" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} placeholder="070…" /></div>
          </div>
          {lead.email && lead.email.toLowerCase() !== c.email.trim().toLowerCase() && <p className="hint !mb-0 mt-2">{lead.email} stays in the history — new emails go to the primary email.</p>}
        </div>
      )}

      {def?.needsDate && <div className="mt-3"><DatePick date={date} time={time} onDate={setDate} onTime={setTime} required /></div>}

      <div className="field mt-3 !mb-0">
        <label>Short note (optional)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value.slice(0, 160))} placeholder="Reception gave me Anna's email. She is the Hotel Manager." />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-faint">Logged as {by} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="flex gap-2">
          <button onClick={onClose} disabled={busy} className="btn btn-ghost">Cancel</button>
          <button onClick={save} disabled={busy || !result} className="btn btn-accent">{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button>
        </div>
      </div>
    </Modal>
  );
}

/* ── primary contact ───────────────────────────────────────────────────────── */

export function PrimaryContactModal({ lead, open, onClose, onDone }: { lead: Lead | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const { supabase } = useApp();
  const { by } = useSalesperson(lead);
  const [c, setC] = useState({ email: '', name: '', role: '', phone: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open && lead) setC({ email: lead.email || '', name: lead.contact_name || '', role: lead.role || '', phone: lead.phone || '' }); }, [open, lead]);
  if (!lead) return null;
  const prev = leadData(lead).prev_emails || [];

  async function save() {
    if (!lead) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim())) return toast.error('Enter a valid primary email');
    setBusy(true);
    try { await setPrimaryContact(supabase, lead, c, by); toast.success('Primary contact saved — new emails go there'); onDone(); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={`Primary contact · ${lead.company_name}`}>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="field !mb-0 sm:col-span-2"><label>Primary email *</label><input className="input" autoFocus value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} placeholder="anna.andersson@hotel.se" /></div>
        <div className="field !mb-0"><label>Contact name</label><input className="input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="Anna Andersson" /></div>
        <div className="field !mb-0"><label>Role</label><input className="input" value={c.role} onChange={(e) => setC({ ...c, role: e.target.value })} placeholder="Hotel Manager" /></div>
        <div className="field !mb-0 sm:col-span-2"><label>Phone</label><input className="input" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} placeholder="070…" /></div>
      </div>
      <p className="hint mt-2">All future emails go to the primary email. {lead.email && lead.email.toLowerCase() !== c.email.trim().toLowerCase() ? `${lead.email} is kept in the contact history.` : ''}</p>
      {prev.length > 0 && <p className="text-[11.5px] text-faint">Earlier addresses: {prev.join(', ')}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} disabled={busy} className="btn btn-ghost">Cancel</button>
        <button onClick={save} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save as primary contact</button>
      </div>
    </Modal>
  );
}

/* ── reschedule ────────────────────────────────────────────────────────────── */

export function RescheduleModal({ lead, open, onClose, onDone }: { lead: Lead | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const { supabase } = useApp();
  const { by } = useSalesperson(lead);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open || !lead) return;
    const cur = lead.next_action_at ? new Date(lead.next_action_at) : addWorkingDays(new Date(), DEFAULT_NEXT_WORKING_DAYS);
    setDate(toDateInput(cur)); setTime(lead.next_action_at && (cur.getHours() !== 9 || cur.getMinutes() !== 0) ? toTimeInput(cur) : '');
  }, [open, lead]);
  if (!lead) return null;
  async function save() {
    if (!lead) return;
    const iso = fromDateInputs(date, time);
    if (!iso) return toast.error('Pick a date');
    setBusy(true);
    try { await rescheduleNext(supabase, lead, iso, by); toast.success(`Next call: ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`); onDone(); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={`Next call · ${lead.company_name}`}>
      <DatePick date={date} time={time} onDate={setDate} onTime={setTime} required />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} disabled={busy} className="btn btn-ghost">Cancel</button>
        <button onClick={save} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={15} className="animate-spin" /> : <CalendarClock size={15} />} Save date</button>
      </div>
    </Modal>
  );
}

/* ── owner badge ───────────────────────────────────────────────────────────── */

const OWNER_COLORS = ['#7C3AED', '#2563EB', '#16A34A', '#E08C1F', '#DB2777', '#0891B2'];

/** Initials of the salesperson who owns the lead; click to assign. */
export function OwnerBadge({ lead, onChange, size = 26 }: { lead: Lead; onChange: () => void; size?: number }) {
  const { supabase } = useApp();
  const { senders, owner } = useSalesperson(lead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const idx = owner ? Math.max(0, senders.findIndex((s) => s.id === owner.id)) : -1;
  const items = [
    ...senders.map((s) => ({ label: `${s.name} · ${s.email}`, icon: <span className="text-[10px] font-extrabold">{initialsOf(s.name)}</span>, run: async () => { try { await setOwner(supabase, lead, s); onChange(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } } })),
    ...(owner ? [{ label: 'No owner', danger: true, run: async () => { try { await setOwner(supabase, lead, null); onChange(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } } }] : []),
  ];
  return (
    <>
      <button ref={ref} type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} title={owner ? `Owner: ${owner.name} — click to change` : 'Assign an owner (salesperson)'}
        className={`grid flex-none place-items-center rounded-full text-[10.5px] font-extrabold transition hover:scale-105 ${owner ? 'text-white' : 'border border-dashed border-line-2 text-faint'}`}
        style={{ width: size, height: size, background: owner ? OWNER_COLORS[idx % OWNER_COLORS.length] : 'transparent' }}>
        {owner ? initialsOf(owner.name) : '+'}
      </button>
      <AnchoredMenu anchor={ref.current} items={items.length ? items : [{ label: 'Add senders in Settings → Email', run: () => {} }]} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/* ── link an unlinked conversation to a lead ───────────────────────────────── */

export function LinkLeadModal({ open, onClose, onDone, projectId, messageIds, counterpart }: {
  open: boolean; onClose: () => void; onDone: () => void; projectId: string; messageIds: string[]; counterpart: string;
}) {
  const { supabase } = useApp();
  const { by } = useSalesperson(null);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Lead[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (open) { setQ(counterpart.split('@')[1]?.split('.')[0] || ''); } }, [open, counterpart]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const needle = q.trim();
      let query = supabase.from('leads').select('*').eq('project_id', projectId).order('updated_at', { ascending: false }).limit(12);
      if (needle) query = query.or(`company_name.ilike.%${needle}%,email.ilike.%${needle}%,contact_name.ilike.%${needle}%,website.ilike.%${needle}%`);
      const { data } = await query;
      setRows((data as Lead[]) || []);
    }, 200);
    return () => clearTimeout(t);
  }, [open, q, projectId, supabase]);

  async function pick(l: Lead) {
    setBusy(l.id);
    try { await linkThreadToLead(supabase, messageIds, counterpart, l, by); toast.success(`Linked to ${l.company_name} · ${counterpart} is now the primary email`); onDone(); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not link'); }
    finally { setBusy(null); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Link this conversation to a lead">
      <p className="mb-3 text-[12.5px] text-dim">{counterpart} replied from an address that is not on any lead. Pick the company — the reply joins its history and this address becomes the primary email (the old one is kept).</p>
      <div className="mb-2 flex items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-2">
        <Search size={14} className="text-faint" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Company, email, website…" className="w-full bg-transparent text-[13px] outline-none text-ink" />
      </div>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-line">
        {rows.length === 0 && <div className="p-4 text-center text-[12.5px] text-faint">No leads match.</div>}
        {rows.map((l) => (
          <button key={l.id} onClick={() => pick(l)} disabled={!!busy} className="flex w-full items-center gap-3 border-t border-line px-3 py-2.5 text-left first:border-t-0 hover:bg-surface-2">
            <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold text-ink">{l.company_name}</div><div className="truncate text-[11.5px] text-faint">{[l.contact_name, l.email].filter(Boolean).join(' · ') || 'no contact yet'}</div></div>
            {busy === l.id ? <Loader2 size={14} className="animate-spin text-accent" /> : <Link2 size={14} className="text-faint" />}
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ── log a note ────────────────────────────────────────────────────────────── */

export function LogNoteModal({ lead, open, onClose, onDone }: { lead: Lead | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const { supabase } = useApp();
  const { by } = useSalesperson(lead);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setText(''); }, [open, lead]);
  if (!lead) return null;
  async function save() {
    if (!lead) return;
    setBusy(true);
    try { await logNote(supabase, lead, text, by); toast.success('Note saved'); onDone(); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  }
  const stamp = `${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${by}`;
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={`Note · ${lead.company_name}`}>
      <textarea className="input min-h-[96px]" autoFocus maxLength={300} value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') save(); }}
        placeholder="Short note — e.g. Reception says Anna is back Monday." />
      <div className="mt-1 flex items-center justify-between text-[11.5px] text-faint"><span><StickyNote size={11} className="mr-1 inline" />{stamp}</span><span>{text.length}/300 · Ctrl+Enter saves</span></div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} disabled={busy} className="btn btn-ghost">Cancel</button>
        <button onClick={save} disabled={busy || !text.trim()} className="btn btn-accent">{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save note</button>
      </div>
    </Modal>
  );
}

/* ── log an email that happened outside Klientic ───────────────────────────── */

export function LogEmailModal({ lead, open, onClose, onDone }: { lead: Lead | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const { supabase } = useApp();
  const { by } = useSalesperson(lead);
  const [direction, setDirection] = useState<'outbound' | 'inbound'>('outbound');
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const d = new Date(); d.setSeconds(0, 0);
    setDirection('outbound'); setSubject(''); setNote(''); setWhen(`${toDateInput(d)}T${toTimeInput(d)}`);
  }, [open, lead]);
  if (!lead) return null;
  async function save() {
    if (!lead) return;
    setBusy(true);
    try {
      const at = when ? new Date(when).toISOString() : undefined;
      await logEmail(supabase, lead, { direction, subject, note, at }, by);
      toast.success(direction === 'outbound' ? 'Email logged — it is in the conversation history' : 'Reply logged — it is in the conversation history');
      onDone(); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={`Log an email · ${lead.company_name}`}>
      <p className="mb-3 text-[12.5px] text-dim">For email that happened outside Klientic — sent from Outlook, forwarded by a colleague, read on the phone. It joins the conversation history{lead.email ? ` with ${lead.email}` : ''}.</p>
      <div className="mb-3 inline-flex rounded-[11px] border border-line bg-surface-2 p-[3px]">
        {([['outbound', 'I sent them an email', <ArrowUpRight key="o" size={13} />], ['inbound', 'They emailed me', <ArrowDownLeft key="i" size={13} />]] as const).map(([k, label, icon]) => (
          <button key={k} type="button" onClick={() => setDirection(k)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition ${direction === k ? 'bg-ink text-bg' : 'text-dim'}`}>{icon}{label}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="field !mb-0"><label>Subject / what it was about *</label><input className="input" autoFocus value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Offer PDF + video, as discussed" /></div>
        <div className="field !mb-0"><label>When</label><input type="datetime-local" className="input !w-auto" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
      </div>
      <div className="field mt-3 !mb-0"><label>Short note (optional)</label><textarea className="input min-h-[72px]" value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))} placeholder="Sent the 9-page offer. Asked for a call next week." /></div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-faint">Logged by {by}</span>
        <div className="flex gap-2">
          <button onClick={onClose} disabled={busy} className="btn btn-ghost">Cancel</button>
          <button onClick={save} disabled={busy || !subject.trim()} className="btn btn-accent">{busy ? <Loader2 size={15} className="animate-spin" /> : <MailPlus size={15} />} Log email</button>
        </div>
      </div>
    </Modal>
  );
}

/* ── one hook that gives every view the same actions ───────────────────────── */

/**
 * usage:  const log = useLeadLog(refresh);
 *         <ThreeDot items={[...log.items(lead), …]} />   …   {log.modals}
 * `items(lead)` = Call · Log a note · Log an email · Edit primary contact;
 * `items(lead, true)` adds Log call result + Change next date (follow-up queue).
 */
export function useLeadLog(onChange: () => void) {
  const { supabase, settings, project } = useApp();
  const { by: me, senders } = useSalesperson(null);
  const [result, setResult] = useState<Lead | null>(null);
  const [note, setNote] = useState<Lead | null>(null);
  const [email, setEmail] = useState<Lead | null>(null);
  const [contact, setContact] = useState<Lead | null>(null);
  const [date, setDate] = useState<Lead | null>(null);
  const [book, setBook] = useState<Lead | null>(null);
  const [bookingMail, setBookingMail] = useState<{ lead: Lead; subject: string; html: string; fromId: string | null } | null>(null);

  /** Compose prefilled with the salesperson's booking-page link. */
  function sendBookingLink(lead: Lead) {
    const ownerId = leadData(lead).owner || null;
    const cfg = meetingFor(settings?.data, senders, ownerId);
    if (!cfg.bookingUrl) { toast.error('Add your booking page link in Settings → Meetings first'); return; }
    if (!lead.email) { toast.error('This lead has no email address'); return; }
    const sender = (ownerId && senders.find((s) => s.id === ownerId)) || senders.find((s) => s.isDefault) || senders[0];
    const mail = bookingLinkEmail({
      lang: (project?.outreach_language || 'en').slice(0, 2), firstName: lead.contact_name?.split(/\s+/)[0] || null,
      link: cfg.bookingUrl, senderName: sender?.name || me, videoLabel: cfg.roomUrl ? PROVIDER_LABEL[providerOf(cfg.roomUrl)] : undefined,
    });
    setBookingMail({ lead, subject: mail.subject, html: mail.html, fromId: sender?.id || null });
  }

  async function startCall(lead: Lead) {
    if (callState(lead) === 'pending') { setResult(lead); return; } // last call still needs its result
    const by = ownerOf(lead, senders)?.name || me;
    try { await logCallStart(supabase, lead, by); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not log the call'); return; }
    const tel = lead.phone ? lead.phone.replace(/[^\d+]/g, '') : '';
    if (tel) window.location.href = `tel:${tel}`;
    onChange();
    setResult(lead);
  }

  const items = (lead: Lead, full = false): MenuItem[] => {
    const m = meetingOf(lead);
    const booked = m && m.status === 'scheduled';
    return [
      { label: lead.phone ? `Call ${lead.phone}` : 'Log a call', icon: <Phone size={14} />, run: () => startCall(lead) },
      ...(full ? [{ label: 'Log call result', icon: <ClipboardList size={14} />, run: () => setResult(lead) }] : []),
      { label: booked ? 'Reschedule meeting' : 'Book meeting', icon: booked ? <CalendarCheck size={14} /> : <CalendarPlus size={14} />, run: () => setBook(lead) },
      { label: 'Send booking link', icon: <Link2 size={14} />, run: () => sendBookingLink(lead) },
      { label: 'Log a note', icon: <StickyNote size={14} />, run: () => setNote(lead) },
      { label: 'Log an email', icon: <MailPlus size={14} />, run: () => setEmail(lead) },
      { label: 'Edit primary contact', icon: <PenLine size={14} />, run: () => setContact(lead) },
      ...(full ? [{ label: 'Change next date', icon: <CalendarClock size={14} />, run: () => setDate(lead) }] : []),
    ];
  };

  const modals = (
    <>
      <CallResultModal lead={result} open={!!result} onClose={() => setResult(null)} onDone={onChange} onMeeting={(l) => setBook(l)} />
      <LogNoteModal lead={note} open={!!note} onClose={() => setNote(null)} onDone={onChange} />
      <LogEmailModal lead={email} open={!!email} onClose={() => setEmail(null)} onDone={onChange} />
      <PrimaryContactModal lead={contact} open={!!contact} onClose={() => setContact(null)} onDone={onChange} />
      <RescheduleModal lead={date} open={!!date} onClose={() => setDate(null)} onDone={onChange} />
      <BookMeetingModal lead={book} open={!!book} onClose={() => setBook(null)} onDone={onChange} />
      <ComposeModal open={!!bookingMail} lead={bookingMail?.lead || null} initialSubject={bookingMail?.subject} initialHtml={bookingMail?.html} initialFromId={bookingMail?.fromId}
        onClose={() => setBookingMail(null)} onSent={onChange} />
    </>
  );

  return { items, modals, startCall, sendBookingLink, openBook: setBook, openResult: setResult, openNote: setNote, openEmail: setEmail, openContact: setContact, openDate: setDate };
}

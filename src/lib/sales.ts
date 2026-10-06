import type { SupabaseClient } from '@supabase/supabase-js';
import type { Lead, LeadData, CallResult, Stage } from '@/lib/types';
import type { SenderIdentity } from '@/lib/email/resend';

/* ────────────────────────────────────────────────────────────────────────────
 * The salesperson's call loop:
 *   CALL → pick a result → short note → the system schedules the next action.
 * State lives in the lead row (stage, next_action_at, contact fields) and in
 * leads.data (owner, attempts, last call / result). Call tasks go to `tasks`
 * so they surface in Today's tasks; every step is written to activity_log.
 * ──────────────────────────────────────────────────────────────────────────── */

export const CALL_RESULTS: { key: CallResult; label: string; emoji: string; hint: string; needsDate: boolean }[] = [
  { key: 'meeting', label: 'Meeting booked', emoji: '📅', hint: 'Moves the lead to Meeting booked', needsDate: false },
  { key: 'contact', label: 'Got contact details', emoji: '👤', hint: 'Save the decision maker, then plan the next step', needsDate: true },
  { key: 'call_again', label: 'Call again', emoji: '🔁', hint: 'Pick when — it lands in Today\'s tasks that day', needsDate: true },
  { key: 'no_answer', label: 'No answer', emoji: '📵', hint: 'Pick when to try again', needsDate: true },
  { key: 'not_interested', label: 'Not interested', emoji: '❌', hint: 'Moves the lead to Disqualified', needsDate: false },
];
export const RESULT_LABEL = Object.fromEntries(CALL_RESULTS.map((r) => [r.key, r.label])) as Record<CallResult, string>;
export const RESULT_EMOJI = Object.fromEntries(CALL_RESULTS.map((r) => [r.key, r.emoji])) as Record<CallResult, string>;

export const DEFAULT_NEXT_WORKING_DAYS = 3;

/* ── reading ─────────────────────────────────────────────────────────────── */

export function leadData(l: Lead): LeadData {
  return l.data && typeof l.data === 'object' ? l.data : {};
}

/** Attempts so far: explicit counter, else derived from the follow-up stage / step. */
export function attemptsOf(l: Lead): number {
  const d = leadData(l);
  if (typeof d.attempts === 'number') return d.attempts;
  const m = /^followup(\d)$/.exec(l.stage);
  return m ? Math.max(parseInt(m[1], 10), l.followup_step || 0) : l.followup_step || 0;
}

export function followupStage(attempts: number): Stage {
  return `followup${Math.min(3, Math.max(1, attempts))}` as Stage;
}

/** "Anna Svensson · Hotel Manager" or null when only the general contact is known. */
export function decisionMaker(l: Lead): string | null {
  if (!l.contact_name) return null;
  return l.role ? `${l.contact_name} · ${l.role}` : l.contact_name;
}

export function ownerOf(l: Lead, senders: SenderIdentity[]): SenderIdentity | null {
  const id = leadData(l).owner;
  return id ? senders.find((s) => s.id === id) || null : null;
}

export function initialsOf(name?: string | null): string {
  const parts = (name || '').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

/* ── dates ───────────────────────────────────────────────────────────────── */

/** n working days after `from` (Mon–Fri), at 09:00 local time. */
export function addWorkingDays(from: Date, n: number): Date {
  const d = new Date(from);
  d.setHours(9, 0, 0, 0);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

export const toDateInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const toTimeInput = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Combine a yyyy-mm-dd and an optional HH:MM (default 09:00) into an ISO string. */
export function fromDateInputs(date: string, time?: string): string | null {
  if (!date) return null;
  const d = new Date(`${date}T${time || '09:00'}:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export type Due = 'overdue' | 'today' | 'upcoming' | 'none';

export function dueOf(iso?: string | null, now = new Date()): Due {
  if (!iso) return 'none';
  const t = new Date(iso);
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  if (t < start) return 'overdue';
  if (t <= end) return 'today';
  return 'upcoming';
}

export const DUE_COLOR: Record<Due, string> = { overdue: 'var(--red)', today: 'var(--amber)', upcoming: 'var(--dim)', none: 'var(--faint)' };
export const DUE_SOFT: Record<Due, string> = { overdue: 'var(--red-soft)', today: 'var(--amber-soft)', upcoming: 'var(--border)', none: 'transparent' };

export function fmtDay(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const due = dueOf(iso, now);
  if (due === 'today') return 'today';
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return 'tomorrow';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** "NEXT: Call today" / "OVERDUE: Call 2 Oct" / "NEXT: Call 8 Oct" — the one line a salesperson needs. */
export function nextLabel(l: Lead, now = new Date()): { text: string; due: Due } {
  const iso = l.next_action_at;
  const due = dueOf(iso, now);
  if (!iso || due === 'none') return { text: '', due: 'none' };
  const d = leadData(l);
  const verb = l.stage === 'contacted' || l.stage === 'new' || d.last_action ? 'Call' : 'Follow up';
  const day = fmtDay(iso, now);
  // only show a clock time when the salesperson picked one (automated sequences carry arbitrary times)
  const chosen = d.last_action?.next_at === iso;
  const t = new Date(iso);
  const withTime = chosen && (t.getHours() !== 9 || t.getMinutes() !== 0) ? ` ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
  return { text: `${due === 'overdue' ? 'OVERDUE' : 'NEXT'}: ${verb} ${day}${withTime}`, due };
}

/** "Called 2 Oct · Got Anna's email" */
export function lastActionLabel(l: Lead): string | null {
  const d = leadData(l);
  const a = d.last_action;
  if (a) {
    const when = new Date(a.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${RESULT_EMOJI[a.result]} ${RESULT_LABEL[a.result]} · ${when}${a.note ? ` · “${a.note}”` : ''}${a.by ? ` · ${a.by}` : ''}`;
  }
  if (d.last_call) return `📞 Called ${new Date(d.last_call.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · result not logged`;
  if (l.last_contacted_at) return `✉️ Email sent ${new Date(l.last_contacted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  return null;
}

/** Call-button state for the card. */
export type CallState = 'fresh' | 'pending' | 'scheduled' | 'done';
export function callState(l: Lead): CallState {
  const d = leadData(l);
  if (!d.last_call && !d.last_action) return 'fresh';
  if (d.last_call && (!d.last_action || d.last_call.at > d.last_action.at)) return 'pending';
  if (d.last_action && (d.last_action.result === 'call_again' || d.last_action.result === 'no_answer' || d.last_action.result === 'contact') && l.next_action_at) return 'scheduled';
  return 'done';
}

/* ── writing ─────────────────────────────────────────────────────────────── */

const MIGRATION_HINT = 'Database update needed: run supabase/migrations/20261006_lead_data.sql in Supabase → SQL Editor (adds leads.data).';
function explain(e: { message?: string } | null): string {
  const m = e?.message || 'Save failed';
  return /column .*data.* does not exist|'data' column/i.test(m) ? MIGRATION_HINT : m;
}

async function log(supabase: SupabaseClient, lead: Lead, kind: string, message: string, meta: Record<string, unknown>) {
  await supabase.from('activity_log').insert({ owner_id: lead.owner_id, project_id: lead.project_id, kind, message, meta: { leadId: lead.id, ...meta } });
}

/** CALL pressed: remember who called and when (the result is logged right after). */
export async function logCallStart(supabase: SupabaseClient, lead: Lead, by: string): Promise<LeadData> {
  const d = leadData(lead);
  const at = new Date().toISOString();
  const data: LeadData = { ...d, calls: (d.calls || 0) + 1, last_call: { at, by } };
  const { error } = await supabase.from('leads').update({ data, updated_at: at }).eq('id', lead.id);
  if (error) throw new Error(explain(error));
  await log(supabase, lead, 'call', `Called ${lead.company_name} · ${by}`, { by, at, phase: 'start' });
  return data;
}

/** Replace the general address with the decision maker. The old address is kept in data.prev_emails and the history. */
export async function setPrimaryContact(supabase: SupabaseClient, lead: Lead, c: { email: string; name?: string; role?: string; phone?: string }, by: string): Promise<void> {
  const email = c.email.trim().toLowerCase();
  const d = leadData(lead);
  const prev = new Set(d.prev_emails || []);
  const old = (lead.email || '').trim().toLowerCase();
  if (old && old !== email) prev.add(old);
  prev.delete(email);
  const data: LeadData = { ...d, prev_emails: [...prev] };
  const patch = { email, contact_name: c.name?.trim() || lead.contact_name, role: c.role?.trim() || lead.role, phone: c.phone?.trim() || lead.phone, data, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('leads').update(patch).eq('id', lead.id);
  if (error) throw new Error(explain(error));
  await log(supabase, lead, 'contact', `${lead.company_name}: primary contact → ${patch.contact_name || email} <${email}>${old && old !== email ? ` (was ${old})` : ''}`, { by, email, was: old || null, name: patch.contact_name, role: patch.role, phone: patch.phone });
}

export async function setOwner(supabase: SupabaseClient, lead: Lead, owner: SenderIdentity | null): Promise<void> {
  const data: LeadData = { ...leadData(lead), owner: owner?.id || undefined };
  const { error } = await supabase.from('leads').update({ data, updated_at: new Date().toISOString() }).eq('id', lead.id);
  if (error) throw new Error(explain(error));
  await log(supabase, lead, 'owner', `${lead.company_name}: owner → ${owner?.name || 'nobody'}`, { owner: owner?.id || null });
}

/** Just move the next call date (from the follow-up list). Keeps the task in sync. */
export async function rescheduleNext(supabase: SupabaseClient, lead: Lead, nextAt: string, by: string): Promise<void> {
  const { error } = await supabase.from('leads').update({ next_action_at: nextAt, updated_at: new Date().toISOString() }).eq('id', lead.id);
  if (error) throw new Error(explain(error));
  await syncCallTask(supabase, lead, nextAt, `Rescheduled by ${by}`);
  await log(supabase, lead, 'call', `${lead.company_name}: next call moved to ${fmtDay(nextAt)}`, { by, nextAt });
}

/** One open call task per lead, due when the next call is planned. */
async function syncCallTask(supabase: SupabaseClient, lead: Lead, nextAt: string | null, reason: string) {
  await supabase.from('tasks').delete().eq('lead_id', lead.id).eq('status', 'open').eq('type', 'call');
  if (!nextAt) return;
  await supabase.from('tasks').insert({
    project_id: lead.project_id, owner_id: lead.owner_id, lead_id: lead.id, type: 'call', priority: 'A',
    title: `Call ${lead.company_name}`, reason, due_at: nextAt, suggested_next_step: 'Call, then log the result on the card.',
  });
}

export interface CallResultInput {
  result: CallResult;
  note?: string;
  /** required for call_again / no_answer / contact */
  nextAt?: string | null;
  by: string;
}

/**
 * Apply a call result. Rules (from the client's playbook):
 *   Meeting booked → Meeting booked · Not interested → Disqualified
 *   Call again / No answer / Got contact details → Follow-up with a scheduled next call (attempt +1)
 */
export async function applyCallResult(supabase: SupabaseClient, lead: Lead, input: CallResultInput): Promise<void> {
  const now = new Date().toISOString();
  const d = leadData(lead);
  const note = input.note?.trim() || undefined;
  const needsDate = input.result === 'call_again' || input.result === 'no_answer' || input.result === 'contact';
  if (needsDate && !input.nextAt) throw new Error('Pick a follow-up date — a lead that needs another call is never saved without one.');

  const patch: Record<string, unknown> = { updated_at: now, last_contacted_at: now };
  let attempts = attemptsOf(lead);
  if (input.result === 'meeting') { patch.stage = 'meeting'; patch.next_action_at = null; }
  else if (input.result === 'not_interested') { patch.stage = 'lost'; patch.next_action_at = null; }
  else {
    attempts += 1;
    patch.stage = followupStage(attempts);
    patch.followup_step = Math.min(3, attempts);
    patch.next_action_at = input.nextAt;
  }
  const data: LeadData = { ...d, attempts, last_action: { at: now, result: input.result, note, by: input.by, next_at: needsDate ? input.nextAt : null } };
  patch.data = data;

  const { error } = await supabase.from('leads').update(patch).eq('id', lead.id);
  if (error) throw new Error(explain(error));
  await syncCallTask(supabase, lead, needsDate ? input.nextAt! : null, note ? `${RESULT_LABEL[input.result]} — ${note}` : RESULT_LABEL[input.result]);
  await log(supabase, lead, 'call', `${lead.company_name}: ${RESULT_LABEL[input.result]}${note ? ` — ${note}` : ''}${needsDate && input.nextAt ? ` · next ${fmtDay(input.nextAt)}` : ''}`,
    { by: input.by, result: input.result, note: note || null, nextAt: needsDate ? input.nextAt : null, attempt: attempts });
}

/** A reply was answered: an Outreach-sent / New lead becomes Follow-up with the next touch planned. */
export async function afterReply(supabase: SupabaseClient, lead: Lead, by: string): Promise<void> {
  if (lead.stage !== 'contacted' && lead.stage !== 'new') return;
  const attempts = attemptsOf(lead) + 1;
  const nextAt = addWorkingDays(new Date(), DEFAULT_NEXT_WORKING_DAYS).toISOString();
  const data: LeadData = { ...leadData(lead), attempts };
  const now = new Date().toISOString();
  const { error } = await supabase.from('leads').update({ stage: followupStage(attempts), followup_step: Math.min(3, attempts), next_action_at: nextAt, last_contacted_at: now, data, updated_at: now }).eq('id', lead.id);
  if (error) throw new Error(explain(error));
  await syncCallTask(supabase, lead, nextAt, 'You replied — check back');
  await log(supabase, lead, 'call', `${lead.company_name}: replied · follow-up ${fmtDay(nextAt)}`, { by, nextAt, attempt: attempts, via: 'reply' });
}

/** Attach an unlinked conversation to a lead; the replier's address becomes the primary email. */
export async function linkThreadToLead(supabase: SupabaseClient, messageIds: string[], counterpart: string, lead: Lead, by: string): Promise<void> {
  if (messageIds.length) {
    const { error } = await supabase.from('messages').update({ lead_id: lead.id }).in('id', messageIds);
    if (error) throw new Error(error.message);
  }
  if (counterpart && counterpart.includes('@') && counterpart.toLowerCase() !== (lead.email || '').toLowerCase()) {
    await setPrimaryContact(supabase, lead, { email: counterpart }, by);
  }
  await log(supabase, lead, 'contact', `${lead.company_name}: conversation with ${counterpart} linked`, { by, counterpart, messages: messageIds.length });
}

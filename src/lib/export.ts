import { stageLabel } from '@/lib/pipeline';
import type { Lead, Message } from '@/lib/types';
import type { Thread } from '@/lib/threads';

/* ────────────────────────────────────────────────────────────────────────────
 * CSV export helpers. Every list in the app exports exactly what is on screen
 * (current filters, search and date range), all pages — not just the visible one.
 * ──────────────────────────────────────────────────────────────────────────── */

type Cell = string | number | null | undefined;

function esc(v: Cell): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build and download a CSV. A UTF-8 BOM makes Excel read å/ä/ö correctly. */
export function downloadCsv(filename: string, header: string[], rows: Cell[][]) {
  const csv = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dateStr = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '');
const plain = (s?: string | null) => (s || '').replace(/\s+/g, ' ').trim();

/** klientic-<what>-<project>-<range>-<today>.csv */
export function csvName(what: string, project: string | undefined, range: string) {
  return [`klientic-${slug(what)}`, project ? slug(project) : '', slug(range), new Date().toISOString().slice(0, 10)].filter(Boolean).join('-') + '.csv';
}

export const LEAD_HEADER = ['Company', 'Website', 'Industry', 'Location', 'Contact', 'Role', 'Email', 'Phone', 'Fit', 'Opportunity', 'Priority', 'Stage', 'Source', 'Tags', 'Added', 'Last contacted', 'Next action', 'Reason', 'Notes'];
export function leadRow(l: Lead): Cell[] {
  return [l.company_name, l.website, l.industry, l.location, l.contact_name, l.role, l.email, l.phone, l.fit_score, l.opportunity_score, l.priority,
    stageLabel(l.stage), l.source, (l.tags || []).join(' | '), dateStr(l.created_at), dateStr(l.last_contacted_at), dateStr(l.next_action_at), plain(l.reason), plain(l.notes)];
}
export function exportLeads(leads: Lead[], what: string, project: string | undefined, range: string) {
  downloadCsv(csvName(what, project, range), LEAD_HEADER, leads.map(leadRow));
}

export const MESSAGE_HEADER = ['Date', 'Direction', 'Status', 'To', 'From', 'Subject', 'Company', 'Contact', 'Lead email', 'Category', 'Body'];
export function messageRow(m: Message, lead?: Lead | null): Cell[] {
  return [dateStr(m.sent_at || m.created_at), m.direction === 'outbound' ? 'Sent' : 'Received', m.status, m.to_email, m.from_email, m.subject,
    lead?.company_name, lead?.contact_name, lead?.email, m.category, plain(m.body)];
}
export function exportMessages(msgs: Message[], leadById: Record<string, Lead>, what: string, project: string | undefined, range: string) {
  downloadCsv(csvName(what, project, range), MESSAGE_HEADER, msgs.map((m) => messageRow(m, m.lead_id ? leadById[m.lead_id] : null)));
}

export const THREAD_HEADER = ['Company', 'Email', 'Contact', 'Phone', 'Stage', 'Messages', 'From them', 'Last message', 'Last from', 'Last subject', 'Last message text', 'Your turn'];
export function threadRow(t: Thread): Cell[] {
  return [t.lead?.company_name || '', t.counterpart, t.lead?.contact_name, t.lead?.phone, t.lead ? stageLabel(t.lead.stage) : '', t.messages.length, t.inboundCount,
    dateStr(t.last.sent_at || t.last.created_at), t.last.direction === 'inbound' ? 'Them' : 'You', t.last.subject, plain(t.last.body).slice(0, 500), t.theirTurn ? 'Yes' : 'No'];
}
export function exportThreads(threads: Thread[], what: string, project: string | undefined, range: string) {
  downloadCsv(csvName(what, project, range), THREAD_HEADER, threads.map(threadRow));
}

import type { Message, Lead } from '@/lib/types';

/** One conversation: every message exchanged with a lead (or, unlinked, with an address). */
export interface Thread {
  key: string;
  leadId: string | null;
  lead: Lead | null;
  counterpart: string;          // the other side's email
  messages: Message[];          // oldest → newest
  last: Message;
  first: Message;
  inboundCount: number;
  outboundCount: number;
  lastInbound: Message | null;
  /** true when the latest message came from them — it's our turn */
  theirTurn: boolean;
}

function counterpartOf(m: Message): string {
  const raw = m.direction === 'inbound' ? m.from_email : m.to_email;
  const first = String(raw || '').split(/[,;]/)[0].trim().toLowerCase();
  const angle = first.match(/<([^>]+)>/);
  return angle ? angle[1] : first;
}

export function buildThreads(messages: Message[], leadById: Record<string, Lead>): Thread[] {
  const map = new Map<string, Message[]>();
  for (const m of messages) {
    const key = m.lead_id ? `lead:${m.lead_id}` : `addr:${counterpartOf(m)}`;
    (map.get(key) || map.set(key, []).get(key)!).push(m);
  }
  const threads: Thread[] = [];
  for (const [key, list] of map) {
    const sorted = [...list].sort((a, b) => stamp(a) - stamp(b));
    const last = sorted[sorted.length - 1];
    const leadId = last.lead_id || null;
    const lead = leadId ? leadById[leadId] || null : null;
    const inbound = sorted.filter((m) => m.direction === 'inbound');
    threads.push({
      key, leadId, lead,
      counterpart: lead?.email || counterpartOf(last) || '',
      messages: sorted, last, first: sorted[0],
      inboundCount: inbound.length, outboundCount: sorted.length - inbound.length,
      lastInbound: inbound.length ? inbound[inbound.length - 1] : null,
      theirTurn: last.direction === 'inbound',
    });
  }
  return threads.sort((a, b) => stamp(b.last) - stamp(a.last));
}

export function stamp(m: Message): number {
  return new Date(m.sent_at || m.created_at).getTime();
}

/* ── date ranges (shared by Leads, Companies, Outreach and Inbox) ─────────────── */
export type RangeKey = 'all' | '7d' | '30d' | 'year' | 'lastyear' | 'custom';
export const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'year', label: 'This year' },
  { key: 'lastyear', label: 'Last year' },
  { key: 'custom', label: 'Custom…' },
];

/** A picked range; `from`/`to` are yyyy-mm-dd and only used when key = custom. */
export interface DateFilter { key: RangeKey; from?: string; to?: string }
export const ALL_TIME: DateFilter = { key: 'all' };

export function isRangeKey(v: unknown): v is RangeKey {
  return typeof v === 'string' && RANGES.some((r) => r.key === v);
}

export function rangeBounds(f: RangeKey | DateFilter, now = new Date()): { from: number; to: number } {
  const key = typeof f === 'string' ? f : f.key;
  const y = now.getFullYear();
  switch (key) {
    case '7d': return { from: now.getTime() - 7 * 86400000, to: Infinity };
    case '30d': return { from: now.getTime() - 30 * 86400000, to: Infinity };
    case 'year': return { from: new Date(y, 0, 1).getTime(), to: Infinity };
    case 'lastyear': return { from: new Date(y - 1, 0, 1).getTime(), to: new Date(y, 0, 1).getTime() - 1 };
    case 'custom': {
      const c: Partial<DateFilter> = typeof f === 'string' ? {} : f;
      const from = c.from ? new Date(`${c.from}T00:00:00`).getTime() : -Infinity;
      const to = c.to ? new Date(`${c.to}T23:59:59.999`).getTime() : Infinity;
      return { from: Number.isNaN(from) ? -Infinity : from, to: Number.isNaN(to) ? Infinity : to };
    }
    default: return { from: -Infinity, to: Infinity };
  }
}

/** Short human label, also used in export file names ("last-30-days", "2026-01-01 to 2026-03-31"). */
export function rangeLabel(f: DateFilter): string {
  if (f.key === 'custom') return `${f.from || 'start'} to ${f.to || 'today'}`;
  return RANGES.find((r) => r.key === f.key)?.label || 'All time';
}

export function inRange(iso: string | null | undefined, b: { from: number; to: number }): boolean {
  if (!iso) return b.from === -Infinity;
  const t = new Date(iso).getTime();
  return t >= b.from && t <= b.to;
}

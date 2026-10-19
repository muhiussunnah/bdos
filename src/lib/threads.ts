import type { Message, Lead } from '@/lib/types';

/** One conversation: every message exchanged with a lead (or, unlinked, with an address). */
export interface Thread {
  key: string;
  leadId: string | null;
  lead: Lead | null;
  counterpart: string;          // the other side's email
  messages: Message[];          // oldest → newest, duplicates shown once
  /** every stored message incl. duplicates — use for delete / link */
  raw: Message[];
  /** message id → how many extra copies of it were folded away */
  copies: Record<string, number>;
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
    const raw = [...list].sort((a, b) => stamp(a) - stamp(b));
    const { kept: sorted, copies } = foldCopies(raw);
    const last = sorted[sorted.length - 1];
    const leadId = last.lead_id || null;
    const lead = leadId ? leadById[leadId] || null : null;
    const inbound = sorted.filter((m) => m.direction === 'inbound');
    threads.push({
      key, leadId, lead,
      counterpart: lead?.email || counterpartOf(last) || '',
      messages: sorted, raw, copies, last, first: sorted[0],
      inboundCount: inbound.length, outboundCount: sorted.length - inbound.length,
      lastInbound: inbound.length ? inbound[inbound.length - 1] : null,
      theirTurn: last.direction === 'inbound',
    });
  }
  // newest activity first; a drip email scheduled for later counts as "now", not the future
  const now = Date.now();
  return threads.sort((a, b) => Math.min(stamp(b.last), now) - Math.min(stamp(a.last), now));
}

export function stamp(m: Message): number {
  return new Date(m.sent_at || m.scheduled_at || m.created_at).getTime();
}

/**
 * The same email stored twice — a reply that arrived and was also logged by hand,
 * one email sent twice by a double click, two forwarded copies — is shown once
 * with a "×2" mark. Same direction + same new text (quoted history ignored)
 * within a week (a day for our own sends); short texts must share the subject too.
 */
function foldCopies(sorted: Message[]): { kept: Message[]; copies: Record<string, number> } {
  const kept: { m: Message; text: string }[] = [];
  const copies: Record<string, number> = {};
  for (const m of sorted) {
    const text = splitQuoted(m.body).fresh.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 400);
    // a hand-logged copy is often a shortened paste of the real reply → compare as prefixes
    const prev = text && kept.find((k) => {
      if (k.m.direction !== m.direction || !k.text) return false;
      const gap = stamp(m) - stamp(k.m);
      if (Math.min(k.text.length, text.length) < 40) {
        return k.text === text && String(k.m.subject || '').toLowerCase() === String(m.subject || '').toLowerCase() && gap <= 3600000;
      }
      return (k.text.startsWith(text) || text.startsWith(k.text)) && gap <= (m.direction === 'outbound' ? 86400000 : 7 * 86400000);
    });
    if (prev) { copies[prev.m.id] = (copies[prev.m.id] || 0) + 1; continue; }
    kept.push({ m, text });
  }
  return { kept: kept.map((k) => k.m), copies };
}

/**
 * Split an email body into what they wrote now and the quoted history under it
 * (Outlook "Från: … Skickat: …", Gmail "Den … skrev …:", "> " lines, separators).
 */
export function splitQuoted(body: string | null | undefined): { fresh: string; quoted: string } {
  const text = String(body || '').replace(/\r\n?/g, '\n');
  const markers = [
    /^[ \t]*_{8,}[ \t]*$/m,
    /^[ \t]*-{2,}\s*(original message|ursprungligt meddelande|originalmeddelande|forwarded message|vidarebefordrat meddelande|ursprüngliche nachricht|videresendt melding)\s*-{2,}/im,
    /^[ \t]*\*?(from|från|fra|von|lähettäjä)\s*:\*?[ \t]+\S[^\n]*\n(?:[^\n]*\n){0,3}?[ \t]*\*?(sent|skickat|sendt|gesendet|date|datum|to|till|an|subject|ämne|betreff)\s*:/im,
    // "On … Albin <a@b> wrote:" / "Den … skrev Albin <\na@b>:" — the attribution may wrap onto a second line
    /^[ \t]*(on|den|am|le|op)\s[^\n]{3,250}?(?:\n[^\n]{0,160}?)?\s(wrote|skrev|schrieb|a écrit|schreef)\s*:?[ \t]*$/im,
    /^[ \t]*(on|den|am|le|op)\s[^\n]{3,250}?\s(wrote|skrev|schrieb|a écrit|schreef)\s[^\n]*(?:\n[^\n]{0,200})?:[ \t]*$/im,
    /^[^\n]{0,60}\d{4}[^\n]{0,120}\s(skrev|wrote)\s[^\n]{0,200}(?:\n[^\n]{0,200})?:[ \t]*$/im,
    /^[ \t]*>/m,
  ];
  let cut = -1;
  for (const re of markers) {
    const m = re.exec(text);
    if (m && (cut < 0 || m.index < cut)) cut = m.index;
  }
  if (cut <= 0) return { fresh: text.trim(), quoted: '' };
  const fresh = text.slice(0, cut).trim();
  return fresh ? { fresh, quoted: text.slice(cut).trim() } : { fresh: text.trim(), quoted: '' };
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

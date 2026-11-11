/**
 * Email health: how the account's sending is doing — volume per day (Resend's Free plan stops
 * at 100 a day across every sender), bounces, spam complaints, replies.
 *
 * Two sources:
 *  - Klientic's own records: every email ever sent and every reply, so this is the lifetime view.
 *    Bounces / complaints here are only the ones Resend told us about (webhook or a check).
 *  - Resend's list of sent emails with each one's latest event. Resend keeps 30 days, so this is
 *    the exact, recent view — and catches bounces Klientic never heard about.
 */

export const norm = (v: string | null | undefined) => {
  const s = String(v || '').trim().toLowerCase();
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim();
};

/** Bounce notices ("Undeliverable", "Mail Delivery Subsystem") that came back as mail. */
const NDR_FROM = /(mailer-daemon|postmaster|mail-daemon|microsoftexchange[0-9a-f]{8,}|mail delivery (sub)?system)/i;
const NDR_SUBJECT = /(undeliverable|undelivered|delivery status notification|delivery (has )?failed|delivery failure|mail delivery failed|returned mail|failure notice|olevererbar|kunde inte levereras|leverans(en)? misslyckades|ej levererat|unzustellbar|non remis)/i;
/** Out-of-office and other automatic answers. */
const AUTO_SUBJECT = /(automatic reply|auto[- ]?reply|autosvar|automatiskt svar|out of office|frånvaro|abwesenheit|réponse automatique|^auto:|autoreply|jag är (ledig|på semester|tjänstledig|föräldraledig))/i;

export type InboundKind = 'reply' | 'bounce_notice' | 'auto' | 'system';

export function inboundKind(m: { from_email?: string | null; subject?: string | null; system?: string | null }): InboundKind {
  if (m.system) return 'system';
  const from = String(m.from_email || ''), subject = String(m.subject || '');
  if (NDR_FROM.test(from) || NDR_SUBJECT.test(subject)) return 'bounce_notice';
  if (AUTO_SUBJECT.test(subject)) return 'auto';
  return 'reply';
}

/** "YYYY-MM-DD" in Swedish time, so a day matches the client's day. */
const DAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' });
export const dayOf = (iso: string) => DAY.format(new Date(iso));

/** Resend `last_event` values that mean the email went out and reached the server. */
export const DELIVERED_EVENTS = ['delivered', 'opened', 'clicked', 'complained'];
/** Not sent (yet): queued in Resend, or called off. */
export const NOT_OUT_EVENTS = ['scheduled', 'canceled', 'queued'];

export interface ResendTally {
  total: number;
  events: Record<string, number>;
  byFrom: Record<string, Record<string, number>>;
  /** bounced / complained emails Klientic has not recorded yet (Klientic message ids) */
  unrecorded: { id: string; event: string; to: string }[];
  oldest: string | null;
  newest: string | null;
}

export const emptyTally = (): ResendTally => ({ total: 0, events: {}, byFrom: {}, unrecorded: [], oldest: null, newest: null });

export function mergeTally(a: ResendTally, b: ResendTally): ResendTally {
  const events = { ...a.events };
  for (const [k, v] of Object.entries(b.events)) events[k] = (events[k] || 0) + v;
  const byFrom: ResendTally['byFrom'] = JSON.parse(JSON.stringify(a.byFrom));
  for (const [f, ev] of Object.entries(b.byFrom)) {
    byFrom[f] = byFrom[f] || {};
    for (const [k, v] of Object.entries(ev)) byFrom[f][k] = (byFrom[f][k] || 0) + v;
  }
  const seen = new Set(a.unrecorded.map((u) => u.id));
  const minIso = (x: string | null, y: string | null) => (!x ? y : !y ? x : x < y ? x : y);
  const maxIso = (x: string | null, y: string | null) => (!x ? y : !y ? x : x > y ? x : y);
  return {
    total: a.total + b.total, events, byFrom,
    unrecorded: [...a.unrecorded, ...b.unrecorded.filter((u) => !seen.has(u.id))],
    oldest: minIso(a.oldest, b.oldest), newest: maxIso(a.newest, b.newest),
  };
}

/** Rates over emails that actually went out. */
export function resendRates(t: ResendTally) {
  const n = (k: string) => t.events[k] || 0;
  const out = t.total - NOT_OUT_EVENTS.reduce((s, k) => s + n(k), 0);
  const delivered = DELIVERED_EVENTS.reduce((s, k) => s + n(k), 0);
  const pct = (x: number) => (out ? (x / out) * 100 : 0);
  return {
    out, delivered,
    deliveredPct: pct(delivered), bouncePct: pct(n('bounced')), complaintPct: pct(n('complained')),
    delayed: n('delivery_delayed'), failed: n('failed') + n('suppressed'),
    opened: n('opened') + n('clicked'), pending: NOT_OUT_EVENTS.reduce((s, k) => s + n(k), 0),
  };
}

/** Green / amber / red against Resend's limits (bounce < 4 %, complaints < 0.08 %). */
export function bounceTone(pct: number): 'ok' | 'warn' | 'bad' { return pct >= 4 ? 'bad' : pct >= 2 ? 'warn' : 'ok'; }
export function complaintTone(pct: number): 'ok' | 'warn' | 'bad' { return pct >= 0.08 ? 'bad' : pct >= 0.04 ? 'warn' : 'ok'; }

/* ------------------------------------------------------------------ the lifetime report */

export interface SenderRow { sender: string; sent: number; bounced: number; complained: number; replies: number }
export interface ProjectRow { id: string; name: string; sent: number; leadsEmailed: number; leadsReplied: number; bounced: number }
export interface MonthRow { month: string; sent: number; replies: number; bounced: number }

export interface HealthReport {
  generatedAt: string;
  firstSent: string | null;
  sent: number;
  recipients: number;
  queued: number;
  sendErrors: number;
  cancelled: number;
  bounced: number;
  softBounced: number;
  complained: number;
  replies: number;
  leadsEmailed: number;
  leadsReplied: number;
  autoReplies: number;
  bounceNotices: number;
  unsubscribed: number;
  notInterested: number;
  positive: number;
  blockedLeads: number;
  days: { sendingDays: number; avgPerDay: number; busiest: { day: string; sent: number } | null; over100: number; last7: { day: string; sent: number }[] };
  senders: SenderRow[];
  projects: ProjectRow[];
  months: MonthRow[];
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { auth, bad, ok, logActivity } from '@/lib/api';
import { fetchAll } from '@/lib/fetchAll';
import { resolveEmail } from '@/lib/email/resend';
import { applyDeliveryProblem, resendLastEvent, type SentMessage } from '@/lib/deliverability';
import {
  norm, inboundKind, dayOf, emptyTally,
  type HealthReport, type ResendTally, type SenderRow, type ProjectRow, type MonthRow,
} from '@/lib/emailHealth';

export const runtime = 'edge';

/**
 * Email health for the whole account (every project, every sender).
 *   { part: 'klientic' }            → lifetime report from Klientic's own records
 *   { part: 'resend', after? }      → one slice (≤ 800 emails) of Resend's last-30-days history;
 *                                     the client keeps calling with `next` until it is null
 *   { part: 'apply', ids }          → record bounces / complaints Resend knows and Klientic missed
 *                                     (same handling as the bounce webhook: stop emailing them)
 */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;
  const body = await req.json().catch(() => ({})) as { part?: string; after?: string | null; ids?: string[] };

  if (body.part === 'resend') return resendSlice(supabase, userId, body.after || null);
  if (body.part === 'apply') return applyMissing(supabase, userId, body.ids || []);
  return lifetime(supabase, userId);
}

type DB = SupabaseClient;

interface OutRow {
  id: string; project_id: string; lead_id: string | null; status: string;
  from_email: string | null; to_email: string | null; provider_message_id: string | null;
  sent_at: string | null; scheduled_at: string | null; created_at: string;
  delivery: string | null; cancelled: string | null;
}
interface InRow {
  id: string; project_id: string; lead_id: string | null; from_email: string | null; to_email: string | null;
  subject: string | null; category: string | null; created_at: string; system: string | null;
}

async function lifetime(supabase: DB, userId: string) {
  const [outs, ins, projects, blocked] = await Promise.all([
    fetchAll<OutRow>((a, b) => supabase.from('messages')
      .select('id, project_id, lead_id, status, from_email, to_email, provider_message_id, sent_at, scheduled_at, created_at, delivery:ai_meta->>delivery, cancelled:ai_meta->>cancelled')
      .eq('owner_id', userId).eq('direction', 'outbound').order('created_at').order('id').range(a, b), 200000),
    fetchAll<InRow>((a, b) => supabase.from('messages')
      .select('id, project_id, lead_id, from_email, to_email, subject, category, created_at, system:ai_meta->>system')
      .eq('owner_id', userId).eq('direction', 'inbound').order('created_at').order('id').range(a, b), 200000),
    supabase.from('projects').select('id, name').eq('owner_id', userId),
    fetchAll<{ id: string }>((a, b) => supabase.from('leads').select('id').eq('owner_id', userId)
      .not('data->email_status', 'is', null).order('id').range(a, b), 100000),
  ]);

  const r: HealthReport = {
    generatedAt: new Date().toISOString(), firstSent: null,
    sent: 0, recipients: 0, queued: 0, sendErrors: 0, cancelled: 0,
    bounced: 0, softBounced: 0, complained: 0,
    replies: 0, leadsEmailed: 0, leadsReplied: 0, autoReplies: 0, bounceNotices: 0,
    unsubscribed: 0, notInterested: 0, positive: 0, blockedLeads: blocked.length,
    days: { sendingDays: 0, avgPerDay: 0, busiest: null, over100: 0, last7: [] },
    senders: [], projects: [], months: [],
  };

  const recipients = new Set<string>();
  const perDay = new Map<string, number>();
  const senders = new Map<string, SenderRow>();
  const months = new Map<string, MonthRow>();
  const proj = new Map<string, { sent: number; bounced: number; emailed: Set<string>; replied: Set<string> }>();
  const P = (id: string) => { let p = proj.get(id); if (!p) proj.set(id, p = { sent: 0, bounced: 0, emailed: new Set(), replied: new Set() }); return p; };
  const S = (addr: string) => { let s = senders.get(addr); if (!s) senders.set(addr, s = { sender: addr, sent: 0, bounced: 0, complained: 0, replies: 0 }); return s; };
  const M = (iso: string) => { const k = dayOf(iso).slice(0, 7); let m = months.get(k); if (!m) months.set(k, m = { month: k, sent: 0, replies: 0, bounced: 0 }); return m; };
  const emailedLeads = new Set<string>();

  for (const o of outs) {
    if (o.status === 'draft') continue;
    if (o.cancelled === 'true') { r.cancelled++; continue; }
    if (o.status === 'scheduled') { r.queued++; continue; }
    const problem = o.delivery === 'bounced' || o.delivery === 'complained';
    if (o.status === 'failed' && !problem) { r.sendErrors++; continue; }
    if (o.status !== 'sent' && !problem) continue;

    const at = o.sent_at || o.scheduled_at || o.created_at;
    r.sent++;
    if (!r.firstSent || at < r.firstSent) r.firstSent = at;
    if (o.to_email) recipients.add(norm(o.to_email));
    const d = dayOf(at); perDay.set(d, (perDay.get(d) || 0) + 1);
    const s = S(norm(o.from_email) || 'unknown'); s.sent++;
    const m = M(at); m.sent++;
    const p = P(o.project_id); p.sent++;
    if (o.lead_id) { p.emailed.add(o.lead_id); emailedLeads.add(o.lead_id); }
    if (o.delivery === 'bounced') { r.bounced++; s.bounced++; m.bounced++; p.bounced++; }
    if (o.delivery === 'complained') { r.complained++; s.complained++; }
    if (o.delivery === 'soft_bounce') r.softBounced++;
  }

  const repliedLeads = new Set<string>();
  for (const i of ins) {
    const kind = inboundKind(i);
    if (kind === 'system') continue;
    if (kind === 'bounce_notice') { r.bounceNotices++; continue; }
    if (kind === 'auto') { r.autoReplies++; continue; }
    if (!i.lead_id) continue;              // mail that is not from a lead (newsletters, services…)
    r.replies++;
    repliedLeads.add(i.lead_id);
    P(i.project_id).replied.add(i.lead_id);
    M(i.created_at).replies++;
    const to = norm(i.to_email);
    if (to && senders.has(to)) S(to).replies++;
    if (i.category === 'unsubscribe') r.unsubscribed++;
    if (i.category === 'not_interested') r.notInterested++;
    if (['positive', 'interested', 'meeting_request', 'wants_info'].includes(i.category || '')) r.positive++;
  }

  r.recipients = recipients.size;
  r.leadsEmailed = emailedLeads.size;
  r.leadsReplied = [...repliedLeads].filter((id) => emailedLeads.has(id)).length;

  const dayCounts = [...perDay.entries()];
  r.days.sendingDays = dayCounts.length;
  r.days.avgPerDay = dayCounts.length ? Math.round(r.sent / dayCounts.length) : 0;
  r.days.over100 = dayCounts.filter(([, n]) => n > 100).length;
  const top = dayCounts.sort((a, b) => b[1] - a[1])[0];
  r.days.busiest = top ? { day: top[0], sent: top[1] } : null;
  for (let k = 6; k >= 0; k--) {
    const day = dayOf(new Date(Date.now() - k * 86400000).toISOString());
    r.days.last7.push({ day, sent: perDay.get(day) || 0 });
  }

  const names = new Map(((projects.data || []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
  r.projects = [...proj.entries()].map(([id, p]) => ({
    id, name: names.get(id) || 'Deleted project', sent: p.sent, bounced: p.bounced,
    leadsEmailed: p.emailed.size, leadsReplied: [...p.replied].filter((x) => p.emailed.has(x)).length,
  })).filter((p) => p.sent > 0).sort((a, b) => b.sent - a.sent);
  r.senders = [...senders.values()].sort((a, b) => b.sent - a.sent);
  r.months = [...months.values()].filter((m) => m.sent || m.replies).sort((a, b) => b.month.localeCompare(a.month));

  return ok(r);
}

interface ResendListItem { id: string; from?: string; to?: string[] | string; created_at?: string; last_event?: string }
const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function resendSlice(supabase: DB, userId: string, after: string | null) {
  const { apiKey } = await resolveEmail(supabase, userId);
  if (!apiKey) return bad('No Resend key saved under Settings → Email.', 428);

  const t: ResendTally = emptyTally();
  const problems: { resendId: string; event: string; to: string }[] = [];
  let cursor = after, more = true;

  for (let page = 0; page < 8 && more; page++) {
    const url = `https://api.resend.com/emails?limit=100${cursor ? `&after=${encodeURIComponent(cursor)}` : ''}`;
    let res: Response | null = null;
    for (let tryNo = 0; tryNo < 3; tryNo++) {
      res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (res.status !== 429) break;
      await wait(1500);
    }
    if (!res || !res.ok) {
      const j = await res?.json().catch(() => ({})) as { message?: string; name?: string } | undefined;
      if (res?.status === 401 || res?.status === 403 || j?.name === 'restricted_api_key') {
        return bad('The saved Resend key can only send, not read history. Create a "Full access" key in Resend and save it under Settings → Email to see the 30-day check.', 403);
      }
      return bad(`Resend: ${j?.message || `HTTP ${res?.status}`}`, 502);
    }
    const j = await res.json() as { data?: ResendListItem[]; has_more?: boolean };
    const items = j.data || [];
    for (const it of items) {
      const ev = it.last_event || 'unknown';
      const from = norm(it.from) || 'unknown';
      t.total++;
      t.events[ev] = (t.events[ev] || 0) + 1;
      t.byFrom[from] = t.byFrom[from] || {};
      t.byFrom[from][ev] = (t.byFrom[from][ev] || 0) + 1;
      if (it.created_at) {
        if (!t.oldest || it.created_at < t.oldest) t.oldest = it.created_at;
        if (!t.newest || it.created_at > t.newest) t.newest = it.created_at;
      }
      if (ev === 'bounced' || ev === 'complained') {
        problems.push({ resendId: it.id, event: ev, to: norm(Array.isArray(it.to) ? it.to[0] : it.to) });
      }
    }
    more = !!j.has_more && items.length > 0;
    cursor = items.length ? items[items.length - 1].id : null;
    if (more) await wait(600); // stay under Resend's per-second API limit
  }

  // which of those problems does Klientic not know about yet?
  if (problems.length) {
    const { data: msgs } = await supabase.from('messages')
      .select('id, provider_message_id, delivery:ai_meta->>delivery')
      .eq('owner_id', userId).in('provider_message_id', problems.map((p) => p.resendId));
    const byResend = new Map(((msgs || []) as { id: string; provider_message_id: string; delivery: string | null }[]).map((m) => [m.provider_message_id, m]));
    for (const p of problems) {
      const m = byResend.get(p.resendId);
      if (m && m.delivery !== 'bounced' && m.delivery !== 'complained') t.unrecorded.push({ id: m.id, event: p.event, to: p.to });
    }
  }

  return ok({ tally: t, next: more ? cursor : null });
}

async function applyMissing(supabase: DB, userId: string, ids: string[]) {
  const list = [...new Set(ids)].slice(0, 60);
  if (!list.length) return ok({ applied: 0, actions: {} });
  const { apiKey } = await resolveEmail(supabase, userId);
  if (!apiKey) return bad('No Resend key saved under Settings → Email.', 428);

  const { data } = await supabase.from('messages')
    .select('id, owner_id, lead_id, project_id, to_email, ai_meta, provider_message_id')
    .eq('owner_id', userId).eq('direction', 'outbound').in('id', list);
  const actions: Record<string, number> = {};
  let applied = 0;
  for (const m of (data || []) as (SentMessage & { provider_message_id: string | null })[]) {
    const known = (m.ai_meta as { delivery?: string } | null)?.delivery;
    if (!m.provider_message_id || known === 'bounced' || known === 'complained') continue;
    const ev = await resendLastEvent(apiKey, m.provider_message_id); // ask again, never act on a stale list
    if (ev !== 'bounced' && ev !== 'complained') continue;
    const a = await applyDeliveryProblem(supabase, m, { kind: ev, address: m.to_email, apiKey });
    actions[a] = (actions[a] || 0) + 1;
    applied++;
    await wait(350);
  }
  if (applied) {
    await logActivity(supabase, userId, null, 'email', `Email health: recorded ${applied} bounce${applied === 1 ? '' : 's'} / spam complaint${applied === 1 ? '' : 's'} that Resend reported`, { actions });
  }
  return ok({ applied, actions });
}

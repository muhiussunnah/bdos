import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAll } from '@/lib/fetchAll';

/**
 * Which project (and lead) does an incoming reply belong to?
 *
 * People often answer from another address than the one we wrote to
 * (kommun@sater.se → malin.lilja-altorn@sater.se), so an exact address match
 * is only the first of several signals, strongest first:
 *   1. a lead with exactly that address (or one it replaced: data.prev_emails)
 *   2. an email we sent to that address (also mail sent without a lead)
 *   3. a lead address quoted in the reply ("Till: kommun@sater.se")
 *   4. a lead on the same organisation domain (never gmail / outlook / …)
 *   5. the subject of an email we sent ("Sv: Bolla en idé med Albin")
 * When several leads qualify, the one whose outreach has the same subject and
 * went out from the address that received the reply wins.
 * Nothing found → the caller falls back to the default project.
 */

export interface RouteLead { id: string; project_id: string; email: string | null; website: string | null; last_contacted_at: string | null; prev?: string[] | null }
export interface RouteOut { lead_id: string | null; project_id: string; to_email: string | null; from_email: string | null; subject: string | null; sent_at?: string | null; created_at: string }
export interface RouteReply { sender: string; subject: string | null; body: string | null; receivedAt: string | null; own: string[] }
export type RouteHow = 'email' | 'sent' | 'quoted' | 'domain' | 'subject';
export interface Route { leadId: string | null; projectId: string | null; how: RouteHow | null }

// ── address helpers ─────────────────────────────────────────────────────────

export function norm(v: string | null | undefined): string {
  const s = String(v || '').trim().toLowerCase();
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().replace(/^mailto:/, '');
}

/** "A <a@x.se>, b@y.se" → ['a@x.se', 'b@y.se'] */
export function addrList(v: string | null | undefined): string[] {
  return String(v || '').split(/[,;]/).map(norm).filter((a) => a.includes('@'));
}

export function domainOf(email: string | null | undefined): string {
  return norm(email).split('@')[1] || '';
}

export function hostOf(website: string | null | undefined): string {
  return String(website || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#:]/)[0].replace(/^www\./, '');
}

/** The organisation part of a host: mail.sater.se → sater.se, x.co.uk → x.co.uk */
export function baseDomain(host: string): string {
  const parts = host.toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const sld = parts[parts.length - 2], tld = parts[parts.length - 1];
  const n = tld.length === 2 && /^(co|com|org|net|ac|gov|edu|or|ne|go|nhs|ltd|plc)$/.test(sld) ? 3 : 2;
  return parts.slice(-n).join('.');
}

/** Shared mailbox providers — a domain match there says nothing about the organisation. */
const FREE_MAIL = new Set([
  'gmail', 'googlemail', 'hotmail', 'outlook', 'live', 'msn', 'yahoo', 'ymail', 'icloud', 'me', 'mac', 'aol', 'gmx', 'web',
  'mail', 'email', 'proton', 'protonmail', 'pm', 'zoho', 'yandex', 'fastmail', 'hey', 'tutanota', 'qq', '163', 'naver',
  'telia', 'bredband', 'bredband2', 'comhem', 'spray', 'passagen', 'bahnhof', 'tele2', 'ownit', 'swipnet', 'glocalnet', 'onmicrosoft',
]);
export function isFreeMail(base: string): boolean {
  return !base || FREE_MAIL.has(base.split('.')[0]);
}

export function extractEmails(text: string | null | undefined): string[] {
  const found = String(text || '').toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b/g) || [];
  return [...new Set(found.map((e) => e.replace(/\.+$/, '')))];
}

/**
 * Subject without reply prefixes and ticket tags, for comparing:
 * "Sv: [Spam] Bolla en idé med Albin. [2026KC42325]" → "bolla en idé med albin"
 */
export function subjectBase(s: string | null | undefined): string {
  let t = String(s || '').toLowerCase().replace(/\[[^\]]*\]/g, ' ').replace(/#[^#\s]*#/g, ' ');
  let prev: string;
  do {
    prev = t;
    t = t.trim().replace(/^(re|sv|svar|aw|antw|vs|vb|fw|fwd|tr|wg|ang|ref|automatic reply|autosvar|automatiskt svar|autoreply|auto)\s*:\s*/i, '');
  } while (t !== prev);
  return t.replace(/\s+/g, ' ').replace(/[\s.:!?-]+$/, '').trim();
}

/** Does a reply subject belong to an outbound subject? (also "Tack för … angående <subject>") */
function subjectHit(replyBase: string, outBase: string): boolean {
  return outBase.length >= 5 && (replyBase === outBase || replyBase.includes(outBase));
}

// ── routing ─────────────────────────────────────────────────────────────────

function push<T>(map: Map<string, T[]>, key: string, v: T) {
  const list = map.get(key);
  if (!list) map.set(key, [v]);
  else if (!list.includes(v)) list.push(v);
}
const outAt = (o: RouteOut) => o.sent_at || o.created_at || '';

export type RoutingIndex = ReturnType<typeof buildRoutingIndex>;

/** Precompute lookups once; route many replies against it (bulk re-sort) or one (webhook). */
export function buildRoutingIndex(leads: RouteLead[], outs: RouteOut[]) {
  const leadById = new Map(leads.map((l) => [l.id, l]));
  const byEmail = new Map<string, RouteLead[]>();
  const byDomain = new Map<string, RouteLead[]>();
  const byTenant = new Map<string, RouteLead[]>(); // "ovanaker" for ovanaker.mail.onmicrosoft.com
  for (const l of leads) {
    const addrs = [l.email, ...(Array.isArray(l.prev) ? l.prev : [])].map(norm).filter((a) => a.includes('@'));
    addrs.forEach((a) => push(byEmail, a, l));
    const doms = new Set(addrs.map((a) => baseDomain(domainOf(a))).filter((d) => !isFreeMail(d)));
    const w = hostOf(l.website);
    if (w && !isFreeMail(baseDomain(w))) doms.add(baseDomain(w));
    doms.forEach((d) => { push(byDomain, d, l); push(byTenant, d.split('.')[0], l); });
  }
  const outsByLead = new Map<string, RouteOut[]>();
  const outsByAddr = new Map<string, RouteOut[]>();
  const outSubjects: { o: RouteOut; base: string }[] = [];
  for (const o of outs) {
    if (o.lead_id) push(outsByLead, o.lead_id, o);
    addrList(o.to_email).forEach((a) => push(outsByAddr, a, o));
    const base = subjectBase(o.subject);
    if (base.length >= 5) outSubjects.push({ o, base });
  }
  return { leadById, byEmail, byDomain, byTenant, outsByLead, outsByAddr, outSubjects };
}

export function routeReply(r: RouteReply, ix: RoutingIndex): Route {
  const sender = norm(r.sender);
  const own = new Set(r.own.map(norm));
  const ownDomains = new Set([...own].map((e) => baseDomain(domainOf(e))).filter(Boolean));
  const replyBase = subjectBase(r.subject);
  const receivedAt = norm(r.receivedAt);

  const score = (l: RouteLead) => {
    const os = ix.outsByLead.get(l.id) || [];
    let s = os.length ? 2 : 0;
    if (replyBase && os.some((o) => subjectHit(replyBase, subjectBase(o.subject)))) s += 8;
    if (receivedAt && os.some((o) => norm(o.from_email) === receivedAt)) s += 3;
    const last = os.reduce((m, o) => (outAt(o) > m ? outAt(o) : m), '');
    return { lead: l, s, last: last || l.last_contacted_at || '' };
  };
  const ranked = (cands: RouteLead[]) => cands.map(score).sort((a, b) => b.s - a.s || (b.last > a.last ? 1 : b.last < a.last ? -1 : 0));
  const pickOut = (os: RouteOut[]) => {
    const hit = os.filter((o) => replyBase && subjectHit(replyBase, subjectBase(o.subject)));
    return [...(hit.length ? hit : os)].sort((a, b) => (outAt(b) > outAt(a) ? 1 : -1))[0];
  };
  const viaOut = (o: RouteOut, how: RouteHow): Route => {
    const l = o.lead_id ? ix.leadById.get(o.lead_id) : undefined;
    return { leadId: l?.id || null, projectId: l?.project_id || o.project_id, how };
  };

  // 1. a lead with exactly this address
  const exact = ix.byEmail.get(sender);
  if (exact?.length) { const best = ranked(exact)[0].lead; return { leadId: best.id, projectId: best.project_id, how: 'email' }; }

  // 2. we wrote to this address (maybe without saving a lead)
  const sentTo = ix.outsByAddr.get(sender);
  if (sentTo?.length) return viaOut(pickOut(sentTo), 'sent');

  // 3. a lead address quoted in the reply ("Från: Albin … Till: kommun@sater.se")
  const quoted = extractEmails(r.body).filter((e) => e !== sender && !own.has(e) && !ownDomains.has(baseDomain(domainOf(e))));
  const quotedLeads = [...new Set(quoted.flatMap((e) => ix.byEmail.get(e) || []))];
  if (quotedLeads.length) { const best = ranked(quotedLeads)[0].lead; return { leadId: best.id, projectId: best.project_id, how: 'quoted' }; }
  const quotedOuts = quoted.flatMap((e) => ix.outsByAddr.get(e) || []);
  if (quotedOuts.length) return viaOut(pickOut(quotedOuts), 'quoted');

  // 4. same organisation (sater.se, or the Microsoft 365 tenant "ovanaker")
  const host = domainOf(sender);
  const dom = baseDomain(host);
  const tenant = /\.onmicrosoft\.com$/.test(host) ? host.split('.')[0] : '';
  if (!ownDomains.has(dom) && (tenant || !isFreeMail(dom))) {
    const same = (tenant ? ix.byTenant.get(tenant) : ix.byDomain.get(dom)) || [];
    if (same.length) {
      const list = ranked(same);
      const [a, b] = list;
      if (a.s > 0 && (!b || a.s > b.s)) return { leadId: a.lead.id, projectId: a.lead.project_id, how: 'domain' };
      const top = list.filter((x) => x.s === a.s);
      const projects = new Set(top.map((x) => x.lead.project_id));
      if (projects.size === 1) return { leadId: top.length === 1 && a.s > 0 ? a.lead.id : null, projectId: a.lead.project_id, how: 'domain' };
    }
  }

  // 5. the subject of an email we sent — only when it points at a single project
  if (replyBase.length >= 5) {
    let hits = ix.outSubjects.filter((x) => subjectHit(replyBase, x.base)).map((x) => x.o);
    const fromHere = receivedAt ? hits.filter((o) => norm(o.from_email) === receivedAt) : [];
    if (fromHere.length) hits = fromHere;
    const projects = new Set(hits.map((o) => o.project_id));
    if (projects.size === 1) return { leadId: null, projectId: hits[0].project_id, how: 'subject' };
  }

  return { leadId: null, projectId: null, how: null };
}

// ── loaders ─────────────────────────────────────────────────────────────────

const LEAD_COLS = 'id, project_id, email, website, last_contacted_at, prev:data->prev_emails';
const OUT_COLS = 'lead_id, project_id, to_email, from_email, subject, sent_at, created_at';
const likeEsc = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Everything the owner has — for re-sorting many replies at once. */
export async function loadRoutingIndex(supabase: SupabaseClient, ownerId: string): Promise<RoutingIndex> {
  const [leads, outs] = await Promise.all([
    fetchAll<RouteLead>((a, b) => supabase.from('leads').select(LEAD_COLS).eq('owner_id', ownerId).order('id').range(a, b), 50000),
    fetchAll<RouteOut>((a, b) => supabase.from('messages').select(OUT_COLS).eq('owner_id', ownerId).eq('direction', 'outbound').order('created_at').order('id').range(a, b), 50000),
  ]);
  return buildRoutingIndex(leads, outs);
}

/** Only the candidates one reply can match — a handful of small queries (webhook). */
export async function routeOne(supabase: SupabaseClient, ownerId: string, r: RouteReply): Promise<Route> {
  const sender = norm(r.sender);
  const own = new Set(r.own.map(norm));
  const ownDomains = new Set([...own].map((e) => baseDomain(domainOf(e))));
  const quoted = extractEmails(r.body).filter((e) => e !== sender && !own.has(e) && !ownDomains.has(baseDomain(domainOf(e)))).slice(0, 40);
  const host = domainOf(sender);
  const dom = baseDomain(host);
  const tenant = /\.onmicrosoft\.com$/.test(host) ? host.split('.')[0] : '';
  const orgKey = !ownDomains.has(dom) && (tenant || !isFreeMail(dom)) ? (tenant ? `${tenant}.` : dom) : '';
  const base = subjectBase(r.subject);

  const leadsQ = () => supabase.from('leads').select(LEAD_COLS).eq('owner_id', ownerId);
  const outsQ = () => supabase.from('messages').select(OUT_COLS).eq('owner_id', ownerId).eq('direction', 'outbound');
  type Res<T> = PromiseLike<{ data: T[] | null }>;
  const none = Promise.resolve({ data: [] as never[] });
  const [exact, prev, sent, qLeads, qOuts, domEmail, domSite, subj, recent] = await Promise.all([
    leadsQ().ilike('email', likeEsc(sender)).limit(50) as Res<RouteLead>,
    leadsQ().filter('data->prev_emails', 'cs', JSON.stringify([sender])).limit(50) as Res<RouteLead>,
    outsQ().ilike('to_email', `%${likeEsc(sender)}%`).order('created_at', { ascending: false }).limit(100) as Res<RouteOut>,
    quoted.length ? leadsQ().in('email', quoted).limit(200) as Res<RouteLead> : none,
    quoted.length ? outsQ().in('to_email', quoted).order('created_at', { ascending: false }).limit(200) as Res<RouteOut> : none,
    orgKey ? leadsQ().ilike('email', tenant ? `%@${likeEsc(orgKey)}%` : `%${likeEsc(orgKey)}`).limit(300) as Res<RouteLead> : none,
    orgKey ? leadsQ().ilike('website', `%${likeEsc(orgKey)}%`).limit(300) as Res<RouteLead> : none,
    base.length >= 5 ? outsQ().ilike('subject', `%${likeEsc(base)}%`).order('created_at', { ascending: false }).limit(500) as Res<RouteOut> : none,
    // "Tack för att du kontaktat oss angående <our subject>" contains our subject — check recent sends too
    base.length >= 5 ? outsQ().order('created_at', { ascending: false }).limit(1000) as Res<RouteOut> : none,
  ]);

  const leadMap = new Map<string, RouteLead>();
  for (const l of [...(exact.data || []), ...(prev.data || []), ...(qLeads.data || []), ...(domEmail.data || []), ...(domSite.data || [])]) leadMap.set(l.id, l);
  const leads = [...leadMap.values()];
  // the outreach history of every candidate, for ranking
  const ids = leads.map((l) => l.id).slice(0, 300);
  const { data: leadOuts } = ids.length ? await outsQ().in('lead_id', ids).limit(2000) : { data: [] };
  const outs = [...(sent.data || []), ...(qOuts.data || []), ...(subj.data || []), ...(recent.data || []), ...((leadOuts as RouteOut[] | null) || [])];
  return routeReply(r, buildRoutingIndex(leads, outs));
}

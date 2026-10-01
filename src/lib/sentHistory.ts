import type { SupabaseClient } from '@supabase/supabase-js';
import type { Lead } from '@/lib/types';

/**
 * "Who did we already email?" — shared by Send to a list and Compose so the
 * same address is never emailed twice by accident. Built from the project's
 * sent outbound messages, indexed by recipient address and by lead.
 */

/** One email that already went out (light row — the body is fetched when someone opens it). */
export interface SentRow {
  id: string;
  lead_id: string | null;
  to_email: string | null;
  subject: string | null;
  from_email: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface SentHistory {
  /** lower-cased recipient address → emails sent to it, newest first */
  byEmail: Map<string, SentRow[]>;
  /** lead id → emails sent to that lead, newest first */
  byLead: Map<string, SentRow[]>;
}

export const EMPTY_HISTORY: SentHistory = { byEmail: new Map(), byLead: new Map() };

const PAGE = 1000;
const COLS = 'id,lead_id,to_email,subject,from_email,sent_at,created_at';

export const sentTime = (r: SentRow) => new Date(r.sent_at || r.created_at).getTime();

/** Compose stores several recipients as "a@x.com, b@y.com". */
const splitEmails = (v?: string | null) =>
  (v || '').split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter((s) => s.includes('@'));

function push(map: Map<string, SentRow[]>, key: string, row: SentRow) {
  const list = map.get(key);
  if (list) list.push(row); else map.set(key, [row]);
}

/** Every sent email of a project (paged past Supabase's 1000-row cap). */
export async function loadSentHistory(supabase: SupabaseClient, projectId: string): Promise<SentHistory> {
  const h: SentHistory = { byEmail: new Map(), byLead: new Map() };
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase.from('messages').select(COLS)
      .eq('project_id', projectId).eq('direction', 'outbound').eq('status', 'sent')
      .order('created_at', { ascending: false }).range(from, from + PAGE - 1);
    const rows = (data as SentRow[] | null) || [];
    for (const r of rows) {
      splitEmails(r.to_email).forEach((e) => push(h.byEmail, e, r));
      if (r.lead_id) push(h.byLead, r.lead_id, r);
    }
    if (rows.length < PAGE) break;
  }
  return h;
}

/** Emails already sent to this lead and/or address, newest first. */
export function historyFor(h: SentHistory, who: { id?: string | null; email?: string | null }): SentRow[] {
  const seen = new Set<string>();
  const out: SentRow[] = [];
  const add = (rows?: SentRow[]) => rows?.forEach((r) => { if (!seen.has(r.id)) { seen.add(r.id); out.push(r); } });
  if (who.id) add(h.byLead.get(who.id));
  if (who.email) add(h.byEmail.get(who.email.trim().toLowerCase()));
  return out.sort((a, b) => sentTime(b) - sentTime(a));
}

/** Targeted lookup for one recipient (Compose has no reason to load the whole project). */
export async function loadHistoryFor(
  supabase: SupabaseClient, projectId: string, who: { leadId?: string | null; email?: string | null },
): Promise<SentRow[]> {
  const base = () => supabase.from('messages').select(COLS)
    .eq('project_id', projectId).eq('direction', 'outbound').eq('status', 'sent')
    .order('created_at', { ascending: false }).limit(50);
  const seen = new Set<string>();
  const out: SentRow[] = [];
  const take = (rows: SentRow[] | null) => rows?.forEach((r) => { if (!seen.has(r.id)) { seen.add(r.id); out.push(r); } });
  if (who.leadId) { const { data } = await base().eq('lead_id', who.leadId); take(data as SentRow[] | null); }
  const email = (who.email || '').trim().toLowerCase();
  if (email) { const { data } = await base().ilike('to_email', `%${email}%`); take(data as SentRow[] | null); }
  return out.sort((a, b) => sentTime(b) - sentTime(a));
}

/**
 * Older manual sends with follow-ups switched off left the lead in "New" even
 * though an email went out. Move every such lead to Contacted (once) so the
 * New list only holds people nobody has written to. Returns the fixed leads.
 */
export async function repairContactedLeads(supabase: SupabaseClient, leads: Lead[], h: SentHistory): Promise<Map<string, Lead>> {
  const fixed = new Map<string, Lead>();
  const stale = leads
    .filter((l) => l.stage === 'new' && (l.last_contacted_at || historyFor(h, l).length > 0))
    .slice(0, 200);
  for (let i = 0; i < stale.length; i += 10) {
    await Promise.all(stale.slice(i, i + 10).map(async (l) => {
      const last = historyFor(h, l)[0];
      const now = new Date().toISOString();
      const patch = {
        stage: 'contacted' as const, followup_step: 0,
        last_contacted_at: l.last_contacted_at || last?.sent_at || last?.created_at || now,
        updated_at: now,
      };
      const { error } = await supabase.from('leads').update(patch).eq('id', l.id);
      if (!error) fixed.set(l.id, { ...l, ...patch });
    }));
  }
  return fixed;
}

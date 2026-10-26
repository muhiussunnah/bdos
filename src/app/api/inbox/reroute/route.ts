import { auth, bad, ok, logActivity } from '@/lib/api';
import { fetchAll } from '@/lib/fetchAll';
import { sendersFrom } from '@/lib/email/resend';
import { loadRoutingIndex, routeReply, norm, addrList, type RouteHow } from '@/lib/replyRouting';

export const runtime = 'edge';

interface InMsg { id: string; project_id: string; lead_id: string | null; from_email: string | null; to_email: string | null; subject: string | null; body: string | null; created_at: string }

/**
 * Put replies that landed in the wrong project's Inbox where they belong.
 *
 * Before 1.3.1 a reply was only matched on the exact lead address; anything
 * else (malin@sater.se answering mail sent to kommun@sater.se) fell into the
 * default project. This runs the same routing the webhook now uses over every
 * reply that is not linked to a lead, and moves linked replies that sit in
 * another project than their lead. Nothing is deleted; replies with no match
 * stay where they are.
 */
export async function POST() {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  let index, unlinked: InMsg[], linked: { id: string; project_id: string; lead_id: string; from_email: string | null; created_at: string }[];
  try {
    [index, unlinked, linked] = await Promise.all([
      loadRoutingIndex(supabase, userId),
      fetchAll<InMsg>((a, b) => supabase.from('messages').select('id, project_id, lead_id, from_email, to_email, subject, body, created_at')
        .eq('owner_id', userId).eq('direction', 'inbound').is('lead_id', null).order('created_at').order('id').range(a, b), 20000),
      fetchAll<{ id: string; project_id: string; lead_id: string; from_email: string | null; created_at: string }>((a, b) => supabase.from('messages').select('id, project_id, lead_id, from_email, created_at')
        .eq('owner_id', userId).eq('direction', 'inbound').not('lead_id', 'is', null).order('created_at').order('id').range(a, b), 50000),
    ]);
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'Could not read messages', 500);
  }

  const { data: settings } = await supabase.from('user_settings').select('from_name, from_email, data').eq('owner_id', userId).maybeSingle();
  const own = sendersFrom(settings).map((s) => s.email.toLowerCase());

  // group the updates: one query per (lead, project)
  const groups = new Map<string, { lead_id?: string; project_id: string; ids: string[] }>();
  const add = (patch: { lead_id?: string; project_id: string }, id: string) => {
    const k = `${patch.lead_id || ''}|${patch.project_id}`;
    (groups.get(k) || groups.set(k, { ...patch, ids: [] }).get(k)!).ids.push(id);
  };

  let linkedNow = 0, moved = 0, followed = 0;
  const how: Partial<Record<RouteHow, number>> = {};
  // where each conversation partner belongs — our own answers to them (sent after their first
  // reply, without a lead) follow. from = the project the reply was moved out of; null = any,
  // the partner is linked to a lead. Earlier emails to the same address are left alone.
  const partner = new Map<string, { patch: { lead_id?: string; project_id: string }; from: string | null; after: string }>();
  for (const m of unlinked) {
    if (!m.from_email) continue;
    const r = routeReply({ sender: m.from_email, subject: m.subject, body: m.body, receivedAt: m.to_email, own: [...own, ...(m.to_email ? [m.to_email] : [])] }, index);
    if (!r.how || !r.projectId) continue;
    if (!r.leadId && r.projectId === m.project_id) continue;
    if (r.leadId) linkedNow++;
    if (r.projectId !== m.project_id) moved++;
    how[r.how] = (how[r.how] || 0) + 1;
    const patch = r.leadId ? { lead_id: r.leadId, project_id: r.projectId } : { project_id: r.projectId };
    add(patch, m.id);
    const k = norm(m.from_email);
    const had = partner.get(k);
    if (!had || m.created_at < had.after) partner.set(k, { patch, from: m.project_id, after: m.created_at });
  }
  for (const m of linked) {
    const lead = index.leadById.get(m.lead_id);
    const k = norm(m.from_email);
    if (!lead || !k) continue;
    const had = partner.get(k);
    if (!had) partner.set(k, { patch: { lead_id: lead.id, project_id: lead.project_id }, from: null, after: m.created_at });
    else if (had.from === null && m.created_at < had.after) had.after = m.created_at;
  }
  if (partner.size) {
    const answers = await fetchAll<{ id: string; project_id: string; to_email: string | null; created_at: string }>((a, b) => supabase.from('messages').select('id, project_id, to_email, created_at')
      .eq('owner_id', userId).eq('direction', 'outbound').is('lead_id', null).order('created_at').order('id').range(a, b), 50000).catch(() => []);
    for (const o of answers) {
      const p = partner.get(addrList(o.to_email)[0] || '');
      if (p && o.created_at >= p.after && (p.from === null || p.from === o.project_id)) { followed++; add(p.patch, o.id); }
    }
  }
  // linked replies stored under another project than their lead
  for (const m of linked) {
    const lead = index.leadById.get(m.lead_id);
    if (lead && lead.project_id !== m.project_id) { moved++; add({ project_id: lead.project_id }, m.id); }
  }

  for (const g of groups.values()) {
    const { ids, ...patch } = g;
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from('messages').update(patch).in('id', ids.slice(i, i + 200));
      if (error) return bad(`Re-sort stopped: ${error.message}`, 500);
    }
  }

  if (linkedNow || moved || followed) {
    await logActivity(supabase, userId, null, 'inbox', `Sorted replies into the right projects: ${moved} moved, ${linkedNow} linked to their lead`, { moved, linked: linkedNow, answers: followed, how });
  }
  return ok({ checked: unlinked.length, moved, linked: linkedNow, answers: followed, how });
}

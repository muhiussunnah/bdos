import type { SupabaseClient } from '@supabase/supabase-js';
import { attemptsOf, followupStage } from '@/lib/sales';
import type { Lead, LeadData } from '@/lib/types';

/** After a manual email to a lead in the queue, the next action moves one week out. */
export const DAYS_AFTER_MANUAL_EMAIL = 7;

const QUEUE_STAGES = ['contacted', 'followup1', 'followup2', 'followup3'];

/**
 * One place for "we just emailed this lead" (compose, reply, send-to-a-list):
 *   new            → Outreach sent (+ the agent's first follow-up date when asked for)
 *   queue stages   → Follow-up · attempt +1, next action = send time + 7 days, call task re-synced
 *   anything else  → last contact + history only
 * Works before the leads.data migration too (falls back to a patch without `data`).
 */
export async function touchLeadAfterEmail(supabase: SupabaseClient, lead: Lead, o: {
  at?: string; subject: string; by: string; startFollowups?: boolean; followUpDays?: number[];
}): Promise<{ next_action_at: string | null; stage: string }> {
  const at = o.at || new Date().toISOString();
  const now = new Date().toISOString();
  const d: LeadData = (lead.data && typeof lead.data === 'object' ? lead.data : {}) as LeadData;
  const data: LeadData = { ...d, last_activity: { at, kind: 'email', text: o.subject.slice(0, 200), by: o.by } };
  const patch: Record<string, unknown> = { last_contacted_at: at, updated_at: now };
  let next: string | null = lead.next_action_at;
  let stage: string = lead.stage;

  if (lead.stage === 'new') {
    const days = o.followUpDays?.length ? o.followUpDays : [3, 7, 21];
    stage = 'contacted';
    next = o.startFollowups ? new Date(new Date(at).getTime() + days[0] * 86400000).toISOString() : null;
    patch.stage = stage; patch.followup_step = 0; patch.next_action_at = next;
  } else if (QUEUE_STAGES.includes(lead.stage)) {
    const attempts = attemptsOf(lead) + 1;
    data.attempts = attempts;
    stage = followupStage(attempts);
    next = new Date(new Date(at).getTime() + DAYS_AFTER_MANUAL_EMAIL * 86400000).toISOString();
    patch.stage = stage; patch.followup_step = Math.min(3, attempts); patch.next_action_at = next;
    // keep the single open call task on the new date
    await supabase.from('tasks').delete().eq('lead_id', lead.id).eq('status', 'open').eq('type', 'call');
    await supabase.from('tasks').insert({
      project_id: lead.project_id, owner_id: lead.owner_id, lead_id: lead.id, type: 'call', priority: 'A',
      title: `Follow up ${lead.company_name}`, reason: `Emailed ${new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — check for a reply, then call`,
      due_at: next, suggested_next_step: 'Call, then log the result on the card.',
    });
  }

  const { error } = await supabase.from('leads').update({ ...patch, data }).eq('id', lead.id);
  if (error) {
    // leads.data not migrated yet → still move the dates
    const { error: e2 } = await supabase.from('leads').update(patch).eq('id', lead.id);
    if (e2) throw new Error(e2.message);
  }
  return { next_action_at: next, stage };
}

/** "Albin Sandqvist <albin@…>" → "Albin Sandqvist" */
export function senderName(from: string): string {
  const m = from.match(/^\s*"?([^"<]+?)"?\s*</);
  return (m ? m[1] : from.split('@')[0]).trim();
}

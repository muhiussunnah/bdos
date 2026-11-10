import type { SupabaseClient } from '@supabase/supabase-js';
import { patchSettingsData } from '@/lib/settingsData';
import type { Lead, LeadData } from '@/lib/types';

/**
 * Who may let the agent email a lead by itself.
 *
 * Two locks, both must be open before an AI follow-up goes out:
 *   1. the account switch (user_settings.data.automation.followups, Autopilot page) — OFF by default
 *   2. the lead was opted in when it was emailed ("Let the agent run automated follow-ups
 *      after this email", or the agent's own sequence) — leads.data.auto_followups
 * A lead in the call loop (next action +7 days after a manual email) is never emailed by the
 * agent just because its date is due.
 */
export interface Automation { followups?: boolean }

export function automationOf(settingsData: unknown): Automation {
  const a = (settingsData as { automation?: Automation } | null | undefined)?.automation;
  return a && typeof a === 'object' ? a : {};
}

export function agentFollowupsOn(settingsData: unknown): boolean {
  return automationOf(settingsData).followups === true;
}

export function optedIn(lead: Pick<Lead, 'data'>): boolean {
  return (lead.data as LeadData | null | undefined)?.auto_followups === true;
}

/** Turn the account switch on / off (merges into user_settings.data). */
export async function setAgentFollowups(supabase: SupabaseClient, ownerId: string, on: boolean): Promise<void> {
  await patchSettingsData(supabase, ownerId, (cur) => ({ automation: { ...automationOf(cur), followups: on } }));
}

import { auth, bad, ok, logActivity } from '@/lib/api';
import { resolveAI, knowledgeFor } from '@/lib/ai/resolve';
import { resolveEmail, sendEmail, textToHtml } from '@/lib/email/resend';
import { completeJSON } from '@/lib/ai/providers';
import { outreachPrompt } from '@/lib/ai/prompts';
import type { Project, Lead, Stage } from '@/lib/types';

export const runtime = 'edge';

/** Runs every due follow-up for a project: generates + sends the next step. */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const { projectId, dryRun } = await req.json().catch(() => ({}));
  if (!projectId) return bad('projectId is required');

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) return bad('Project not found', 404);
  const P = project as Project;

  const nowIso = new Date().toISOString();
  const { data: due } = await supabase
    .from('leads').select('*')
    .eq('project_id', projectId)
    .in('stage', ['contacted', 'followup1', 'followup2'])
    .lte('next_action_at', nowIso)
    .not('email', 'is', null)
    .limit(20);

  const leads = (due as Lead[]) || [];
  if (!leads.length) return ok({ processed: 0, results: [], message: 'No follow-ups due.' });
  if (dryRun) return ok({ processed: 0, due: leads.length, results: leads.map((l) => ({ company: l.company_name })) });

  const [ai, knowledge, email] = await Promise.all([
    resolveAI(supabase, userId, P.ai_model),
    knowledgeFor(supabase, projectId),
    resolveEmail(supabase, userId),
  ]);
  if (!ai.apiKey) return bad('No AI provider key.', 428);
  if (!email.apiKey) return bad('No Resend key.', 428);

  const days = P.follow_up_days?.length ? P.follow_up_days : [3, 7, 21];
  const results: { company: string; ok: boolean; error?: string }[] = [];

  for (const lead of leads) {
    const step = Math.min(lead.followup_step + 1, 3);
    try {
      const { system, user } = outreachPrompt(P, lead, step, knowledge);
      const draft = await completeJSON<{ subject: string; body: string }>({
        ...ai, system, messages: [{ role: 'user', content: user }], temperature: 0.85, maxTokens: 900,
      });
      const sent = await sendEmail({ to: lead.email!, subject: draft.subject, html: textToHtml(draft.body), text: draft.body, from: email.from, apiKey: email.apiKey });

      await supabase.from('messages').insert({
        lead_id: lead.id, project_id: projectId, owner_id: userId, direction: 'outbound',
        subject: draft.subject, body: draft.body, status: 'sent', to_email: lead.email,
        from_email: email.from, provider_message_id: sent.id, sent_at: new Date().toISOString(),
      });

      const nextGap = days[step];
      const nextAction = typeof nextGap === 'number' ? new Date(Date.now() + nextGap * 86400000).toISOString() : null;
      await supabase.from('leads').update({
        stage: `followup${step}` as Stage, followup_step: step,
        last_contacted_at: new Date().toISOString(), next_action_at: nextAction,
      }).eq('id', lead.id);

      results.push({ company: lead.company_name, ok: true });
    } catch (e) {
      results.push({ company: lead.company_name, ok: false, error: e instanceof Error ? e.message : 'failed' });
    }
  }

  const sentCount = results.filter((r) => r.ok).length;
  await logActivity(supabase, userId, projectId, 'followup', `Sent ${sentCount} automated follow-ups`);
  return ok({ processed: sentCount, results });
}

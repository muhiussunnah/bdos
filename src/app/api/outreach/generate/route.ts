import { auth, bad, ok } from '@/lib/api';
import { resolveAI, knowledgeFor } from '@/lib/ai/resolve';
import { completeJSON } from '@/lib/ai/providers';
import { outreachPrompt } from '@/lib/ai/prompts';
import type { Project, Lead } from '@/lib/types';

export const runtime = 'edge';

export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const { leadId, step } = await req.json().catch(() => ({}));
  if (!leadId) return bad('leadId is required');

  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (!lead) return bad('Lead not found', 404);
  const { data: project } = await supabase.from('projects').select('*').eq('id', (lead as Lead).project_id).single();
  if (!project) return bad('Project not found', 404);

  const [ai, knowledge] = await Promise.all([
    resolveAI(supabase, userId, (project as Project).ai_model),
    knowledgeFor(supabase, (lead as Lead).project_id),
  ]);
  if (!ai.apiKey) return bad('No AI provider key. Add one in Settings → AI Providers.', 428);

  const followStep = typeof step === 'number' ? step : (lead as Lead).followup_step;
  const { system, user } = outreachPrompt(project as Project, lead as Lead, followStep, knowledge);

  try {
    const draft = await completeJSON<{ subject: string; body: string }>({
      ...ai, system, messages: [{ role: 'user', content: user }], temperature: 0.85, maxTokens: 900,
    });
    return ok({ subject: draft.subject, body: draft.body, step: followStep });
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'AI request failed', 502);
  }
}

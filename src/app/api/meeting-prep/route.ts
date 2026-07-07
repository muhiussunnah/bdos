import { auth, bad, ok } from '@/lib/api';
import { resolveAI, knowledgeFor } from '@/lib/ai/resolve';
import { completeJSON } from '@/lib/ai/providers';
import { meetingPrepPrompt } from '@/lib/ai/prompts';
import type { Project, Lead } from '@/lib/types';

export const runtime = 'edge';

export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const { leadId } = await req.json().catch(() => ({}));
  if (!leadId) return bad('leadId is required');

  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (!lead) return bad('Lead not found', 404);
  const { data: project } = await supabase.from('projects').select('*').eq('id', (lead as Lead).project_id).single();

  const [ai, knowledge] = await Promise.all([
    resolveAI(supabase, userId, (project as Project)?.ai_model),
    knowledgeFor(supabase, (lead as Lead).project_id),
  ]);
  if (!ai.apiKey) return bad('No AI provider key. Add one in Settings → AI Providers.', 428);

  const { system, user } = meetingPrepPrompt(project as Project, lead as Lead, knowledge);
  try {
    const prep = await completeJSON({
      ...ai, system, messages: [{ role: 'user', content: user }], temperature: 0.5, maxTokens: 1200,
    });
    return ok({ prep });
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'AI request failed', 502);
  }
}

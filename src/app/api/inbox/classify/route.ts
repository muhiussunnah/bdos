import { auth, bad, ok, logActivity } from '@/lib/api';
import { resolveAI, knowledgeFor } from '@/lib/ai/resolve';
import { completeJSON } from '@/lib/ai/providers';
import { classifyPrompt } from '@/lib/ai/prompts';
import type { Project, Lead, ReplyCategory } from '@/lib/types';

export const runtime = 'edge';

interface Classification {
  category: ReplyCategory;
  confidence: number;
  needs_human: boolean;
  summary: string;
  draft: { subject: string; body: string } | null;
}

export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  // the body can only be read once
  const input = await req.json().catch(() => ({})) as { messageId?: string; leadId?: string; text?: string; projectId?: string };
  let { messageId } = input;
  const { leadId, text } = input;
  let { projectId } = input;
  let fromEmail: string | null = null;
  // a reply logged against a lead belongs to that lead's project
  if (!messageId && leadId) {
    const { data: l } = await supabase.from('leads').select('project_id, email').eq('id', leadId).maybeSingle();
    if (l?.project_id) projectId = l.project_id;
    fromEmail = l?.email || null;
  }

  // If given raw text, first store it as an inbound message.
  if (!messageId) {
    if (!text || !projectId) return bad('messageId, or (text + projectId), required');
    const { data: created, error } = await supabase.from('messages').insert({
      project_id: projectId, owner_id: userId, lead_id: leadId || null,
      direction: 'inbound', body: text, status: 'received', from_email: fromEmail, ai_meta: { manual: true, logged: true },
    }).select().single();
    if (error) return bad(error.message, 500);
    messageId = created.id;
  }

  const { data: msg } = await supabase.from('messages').select('*').eq('id', messageId).single();
  if (!msg) return bad('Message not found', 404);

  const { data: lead } = msg.lead_id
    ? await supabase.from('leads').select('*').eq('id', msg.lead_id).single()
    : { data: null };
  const { data: project } = await supabase.from('projects').select('*').eq('id', msg.project_id).single();

  const [ai, knowledge] = await Promise.all([
    resolveAI(supabase, userId, (project as Project)?.ai_model),
    knowledgeFor(supabase, msg.project_id),
  ]);
  if (!ai.apiKey) return bad('No AI provider key. Add one in Settings → AI Providers.', 428);

  const { system, user } = classifyPrompt(project as Project, (lead as Lead) || null, msg.body || '', knowledge);

  let c: Classification;
  try {
    c = await completeJSON<Classification>({
      ...ai, system, messages: [{ role: 'user', content: user }], temperature: 0.3, maxTokens: 900,
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'AI request failed', 502);
  }

  await supabase.from('messages').update({
    category: c.category, needs_human: c.needs_human,
    ai_meta: { ...((msg.ai_meta as Record<string, unknown>) || {}), confidence: c.confidence, summary: c.summary, draft: c.draft },
  }).eq('id', messageId);

  // A positive/meeting reply nudges the lead forward.
  if (lead && ['positive', 'interested', 'meeting_request'].includes(c.category)) {
    await supabase.from('leads').update({
      stage: c.category === 'meeting_request' ? 'meeting' : 'positive',
      next_action_at: null,
    }).eq('id', msg.lead_id);
  }

  await logActivity(supabase, userId, msg.project_id, 'inbox', `Reply classified: ${c.category}`, { messageId });
  return ok({ messageId, ...c });
}

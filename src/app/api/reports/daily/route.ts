import { auth, bad, ok } from '@/lib/api';
import { resolveAI } from '@/lib/ai/resolve';
import { completeJSON } from '@/lib/ai/providers';
import { reportPrompt } from '@/lib/ai/prompts';
import type { Project, Lead } from '@/lib/types';

export const runtime = 'edge';

export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const { projectId } = await req.json().catch(() => ({}));
  if (!projectId) return bad('projectId is required');

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) return bad('Project not found', 404);

  const since = new Date(Date.now() - 86400000).toISOString();
  const [{ data: leads }, { data: msgs }] = await Promise.all([
    supabase.from('leads').select('*').eq('project_id', projectId),
    supabase.from('messages').select('direction,status,category,created_at').eq('project_id', projectId).gte('created_at', since),
  ]);

  const L = (leads as Lead[]) || [];
  const M = msgs || [];
  const metrics = {
    leads_total: L.length,
    leads_today: L.filter((l) => l.created_at >= since).length,
    contacted: L.filter((l) => l.stage !== 'new').length,
    emails_sent: M.filter((m) => m.direction === 'outbound' && m.status === 'sent').length,
    replies: M.filter((m) => m.direction === 'inbound').length,
    positive: L.filter((l) => ['positive', 'meeting', 'closed'].includes(l.stage)).length,
    meetings: L.filter((l) => l.stage === 'meeting').length,
    needs_action: L.filter((l) => l.next_action_at && l.next_action_at <= new Date().toISOString()).length,
  };

  const hot = [...L]
    .sort((a, b) => b.opportunity_score + b.fit_score - (a.opportunity_score + a.fit_score))
    .slice(0, 6);

  const ai = await resolveAI(supabase, userId, (project as Project).ai_model);
  let summary = 'AI summary unavailable (add a provider key in Settings).';
  let top: { company: string; reason: string }[] = hot.slice(0, 5).map((l) => ({ company: l.company_name, reason: l.reason || 'High combined score' }));

  if (ai.apiKey) {
    try {
      const { system, user } = reportPrompt(project as Project, metrics, hot);
      const r = await completeJSON<{ summary: string; top_opportunities: { company: string; reason: string }[] }>({
        ...ai, system, messages: [{ role: 'user', content: user }], temperature: 0.5, maxTokens: 900,
      });
      summary = r.summary;
      if (r.top_opportunities?.length) top = r.top_opportunities;
    } catch { /* keep fallback */ }
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: saved } = await supabase.from('reports').upsert({
    project_id: projectId, owner_id: userId, report_date: today,
    metrics, summary, top_opportunities: top,
  }, { onConflict: 'project_id,report_date' }).select().maybeSingle();

  return ok({ report: saved || { metrics, summary, top_opportunities: top, report_date: today } });
}

import { auth, bad, ok, logActivity } from '@/lib/api';
import { resolveAI, knowledgeFor } from '@/lib/ai/resolve';
import { completeJSON } from '@/lib/ai/providers';
import { discoveryPrompt, describeGeo } from '@/lib/ai/prompts';
import { priorityFromScores } from '@/lib/utils';
import { isEmail } from '@/lib/csv';
import type { Project } from '@/lib/types';

export const runtime = 'edge';

interface Found {
  company_name: string; website?: string; industry?: string; location?: string;
  contact_name?: string; role?: string; email?: string; phone?: string;
  linkedin_url?: string; reason?: string; fit_score?: number; opportunity_score?: number;
}

export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const body = await req.json().catch(() => ({})) as {
    projectId?: string; category?: string; categories?: string[]; area?: string;
    country?: string; region?: string; subcity?: string; count?: number;
  };
  const { projectId, count = 10 } = body;
  // accept the new structured shape and the old {category, area} one
  const categories = (Array.isArray(body.categories) ? body.categories : String(body.category || '').split(','))
    .map((c) => String(c).trim()).filter(Boolean).slice(0, 20);
  const geo = body.country || body.region || body.subcity
    ? { country: body.country?.trim(), region: body.region?.trim(), subcity: body.subcity?.trim() }
    : { region: body.area?.trim() };
  const area = describeGeo(geo);
  const category = categories.join(', ');
  if (!projectId || !categories.length) return bad('projectId and at least one category / keyword are required');

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) return bad('Project not found', 404);

  const [ai, knowledge] = await Promise.all([
    resolveAI(supabase, userId, (project as Project).ai_model),
    knowledgeFor(supabase, projectId),
  ]);
  if (!ai.apiKey) return bad('No AI provider key. Add one in Settings → AI Providers.', 428);

  const n = Math.min(Math.max(Number(count) || 10, 1), 25);
  const { system, user } = discoveryPrompt(project as Project, categories, geo, n, knowledge);

  let result: { leads: Found[] };
  try {
    result = await completeJSON<{ leads: Found[] }>({
      ...ai, system, messages: [{ role: 'user', content: user }], temperature: 0.8, maxTokens: 2600,
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'AI request failed', 502);
  }

  // email is mandatory — a lead we cannot email is not a lead. Also skip addresses already in the project.
  const { data: existing } = await supabase.from('leads').select('email').eq('project_id', projectId).not('email', 'is', null);
  const seen = new Set((existing || []).map((r) => String(r.email).toLowerCase()));
  const found = result.leads || [];
  const withEmail = found.filter((l) => {
    const e = String(l.email || '').trim().toLowerCase();
    if (!isEmail(e) || /example\.com$|@test\.|@email\.com$|noreply|no-reply/i.test(e)) return false;
    if (seen.has(e)) return false;
    seen.add(e); l.email = e;
    return true;
  });
  const droppedNoEmail = found.length - withEmail.length;

  const rows = withEmail.slice(0, n).map((l) => {
    const fit = clamp(l.fit_score);
    const opp = clamp(l.opportunity_score);
    return {
      project_id: projectId, owner_id: userId,
      company_name: l.company_name || 'Unknown',
      website: l.website || null, industry: l.industry || null, location: l.location || (area !== 'anywhere' ? area : null),
      contact_name: l.contact_name || null, role: l.role || null, email: l.email || null,
      phone: l.phone || null, linkedin_url: l.linkedin_url || null, reason: l.reason || null,
      fit_score: fit, opportunity_score: opp, priority: priorityFromScores(fit, opp),
      stage: 'new', source: 'ai_discovery',
      tags: categories.length > 1 && l.industry ? [l.industry] : categories.slice(0, 1),
    };
  });
  if (!rows.length) {
    return bad(found.length
      ? `The agent found ${found.length} organisations but none with a usable email address (or they are already in your pipeline). Try a broader area or different niches.`
      : 'No leads returned — try a broader category.', 502);
  }

  const { data: inserted, error } = await supabase.from('leads').insert(rows).select();
  if (error) return bad(error.message, 500);

  await logActivity(supabase, userId, projectId, 'discovery', `Found ${inserted?.length} ${category} leads in ${area || 'region'}`, { droppedNoEmail });
  return ok({ leads: inserted, count: inserted?.length || 0, droppedNoEmail });
}

function clamp(n?: number) {
  const v = Math.round(Number(n) || 0);
  return Math.min(100, Math.max(0, v));
}

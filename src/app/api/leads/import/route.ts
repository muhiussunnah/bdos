import { auth, bad, ok, logActivity } from '@/lib/api';
import { isEmail } from '@/lib/csv';

export const runtime = 'edge';

interface IncomingLead {
  company_name?: string; contact_name?: string; email?: string; website?: string; phone?: string;
  role?: string; industry?: string; location?: string; linkedin_url?: string; notes?: string;
}

const MAX_ROWS = 2000;

/**
 * Bulk-import leads from a user-supplied list (CSV upload / paste).
 * - Requires a company name or an email per row (company falls back to the email domain).
 * - Skips rows whose email already exists in the project (returned as `skipped`).
 * - Imported leads enter the pipeline as `new`, exactly like AI-found ones, so
 *   automated outreach and follow-ups treat them the same way.
 */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const { projectId, leads, tag } = await req.json().catch(() => ({})) as { projectId?: string; leads?: IncomingLead[]; tag?: string };
  if (!projectId) return bad('projectId is required');
  if (!Array.isArray(leads) || !leads.length) return bad('No leads to import');
  if (leads.length > MAX_ROWS) return bad(`Import at most ${MAX_ROWS} rows at a time`);

  const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).single();
  if (!project) return bad('Project not found', 404);

  const clean = (v?: string) => (typeof v === 'string' ? v.trim().slice(0, 500) : '') || null;

  // existing emails in this project -> dedupe
  const { data: existing } = await supabase.from('leads').select('email').eq('project_id', projectId).not('email', 'is', null);
  const seen = new Set((existing || []).map((r) => String(r.email).toLowerCase()));

  const rows: Record<string, unknown>[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const tags = tag ? [tag.trim()].filter(Boolean) : [];

  leads.forEach((l, i) => {
    const email = clean(l.email)?.toLowerCase() || null;
    if (email && !isEmail(email)) { skipped.push({ row: i + 1, reason: `Invalid email "${email}"` }); return; }
    let company = clean(l.company_name);
    if (!company && email) company = email.split('@')[1].replace(/\.[a-z]+$/i, '');
    if (!company) { skipped.push({ row: i + 1, reason: 'No company or email' }); return; }
    if (email && seen.has(email)) { skipped.push({ row: i + 1, reason: `Duplicate: ${email}` }); return; }
    if (email) seen.add(email);
    let website = clean(l.website);
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    rows.push({
      project_id: projectId, owner_id: userId, source: 'import',
      company_name: company, contact_name: clean(l.contact_name), email, website,
      phone: clean(l.phone), role: clean(l.role), industry: clean(l.industry), location: clean(l.location),
      linkedin_url: clean(l.linkedin_url), notes: clean(l.notes),
      fit_score: 50, opportunity_score: 50, priority: 'B', stage: 'new', tags,
    });
  });

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error, data } = await supabase.from('leads').insert(chunk).select('id');
    if (error) return bad(`Import failed after ${inserted} rows: ${error.message}`, 500);
    inserted += data?.length || 0;
  }

  if (inserted) await logActivity(supabase, userId, projectId, 'import', `Imported ${inserted} leads from a custom list`, { skipped: skipped.length });
  return ok({ inserted, skipped });
}

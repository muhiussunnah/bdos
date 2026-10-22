import { auth, bad, ok, logActivity } from '@/lib/api';
import { isEmail, isPhone, phoneKey } from '@/lib/csv';
import { fetchAll, MAX_LEADS_PER_PROJECT } from '@/lib/fetchAll';
import { verifyEmails, type EmailVerdict } from '@/lib/emailCheck';
import { blockedAddresses, problemLabel } from '@/lib/deliverability';

export const runtime = 'edge';

interface IncomingLead {
  company_name?: string; contact_name?: string; email?: string; website?: string; phone?: string;
  role?: string; industry?: string; location?: string; linkedin_url?: string; notes?: string;
}

const MAX_ROWS = MAX_LEADS_PER_PROJECT;

/**
 * Bulk-import leads from a user-supplied list (CSV upload / paste).
 * - Requires a company name or an email per row (company falls back to the email domain).
 * - Checks every email first (lib/emailCheck.ts, `verify: false` turns it off): fake,
 *   mistyped, throw-away and dead-domain addresses never enter the pipeline. The row
 *   is still imported without the email when it has a phone (keep = contact) or a
 *   company (keep = all); provider typos (gmial.com) are fixed.
 * - Addresses that bounced / marked us as spam before are left out too.
 * - Skips rows whose email already exists in the project (returned as `skipped`).
 * - Imported leads enter the pipeline as `new`, exactly like AI-found ones, so
 *   automated outreach and follow-ups treat them the same way.
 */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const { projectId, leads, tag, verify = true, keep: keepIn, offset: offsetIn } = await req.json().catch(() => ({})) as {
    projectId?: string; leads?: IncomingLead[]; tag?: string; verify?: boolean;
    /** what to do with a row whose email is bad: contact = keep it when it has a phone, email = drop it, all = keep it */
    keep?: 'contact' | 'email' | 'all';
    /** row number of the first lead (the modal sends big lists in chunks) */
    offset?: number;
  };
  const keep = keepIn === 'email' || keepIn === 'all' ? keepIn : 'contact';
  const offset = Math.max(0, Math.floor(Number(offsetIn) || 0));
  if (!projectId) return bad('projectId is required');
  if (!Array.isArray(leads) || !leads.length) return bad('No leads to import');
  if (leads.length > MAX_ROWS) return bad(`Import at most ${MAX_ROWS} rows at a time`);

  const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).single();
  if (!project) return bad('Project not found', 404);

  const clean = (v?: string) => (typeof v === 'string' ? v.trim().slice(0, 500) : '') || null;

  // existing emails / phone numbers in this project -> dedupe (all of them, not just the first 1000)
  let existing: { email: string | null; phone: string | null }[];
  try {
    existing = await fetchAll<{ email: string | null; phone: string | null }>((a, b) => supabase.from('leads').select('id, email, phone').eq('project_id', projectId).order('id').range(a, b), MAX_LEADS_PER_PROJECT + 1000);
  } catch (e) { return bad(e instanceof Error ? e.message : 'Could not read existing leads', 500); }
  const seen = new Set(existing.map((r) => String(r.email || '').toLowerCase()).filter(Boolean));
  const seenPhone = new Set(existing.map((r) => phoneKey(r.phone)).filter((k) => k.length >= 6));
  const room = Math.max(0, MAX_LEADS_PER_PROJECT - existing.length);
  if (!room) return bad(`This project already has ${existing.length} leads — the limit is ${MAX_LEADS_PER_PROJECT}. Delete old leads or use another project.`, 409);

  const rows: Record<string, unknown>[] = [];
  const skipped: { row: number; reason: string }[] = [];
  /** rows imported without their (bad) email */
  const cleaned: { row: number; reason: string }[] = [];
  /** provider typos fixed (gmial.com → gmail.com) */
  const fixed: { row: number; from: string; to: string }[] = [];
  const tags = tag ? [tag.trim()].filter(Boolean) : [];

  // check every address up front: shape, fakes, throw-away, typos, does the domain take mail
  const rawEmails = leads.map((l) => clean(l.email)?.toLowerCase() || null);
  const verdicts: Map<string, EmailVerdict> = verify ? await verifyEmails(rawEmails, { budgetMs: 14000 }) : new Map();
  const blocked = await blockedAddresses(supabase, userId, rawEmails.filter((e): e is string => !!e)).catch(() => new Map());
  let unchecked = 0;

  leads.forEach((l, i) => {
    const row = offset + i + 1;
    let email = rawEmails[i];
    let dropped: string | null = null;
    if (email) {
      const v: EmailVerdict = verify ? verdicts.get(email) || { email, ok: true } : isEmail(email) ? { email, ok: true } : { email: null, ok: false, reason: `Invalid email "${email}"` };
      const problem = v.ok && v.email ? blocked.get(v.email) : undefined;
      if (!v.ok || problem) dropped = v.reason || `${email}: ${problemLabel(problem!)} before`;
      else {
        if (v.fixedFrom && v.email && v.email !== email) fixed.push({ row, from: email, to: v.email });
        if (v.unchecked) unchecked++;
        email = v.email;
      }
    }
    if (dropped) {
      // a bad address never enters the pipeline; the row itself stays when it is still useful
      const usable = keep === 'all' ? !!clean(l.company_name) : keep === 'contact' ? isPhone(l.phone) : false;
      if (!usable) { skipped.push({ row, reason: dropped }); return; }
      email = null;
    }
    let company = clean(l.company_name);
    if (!company && email) company = email.split('@')[1].replace(/\.[a-z]+$/i, '');
    if (!company) { skipped.push({ row, reason: 'No company or email' }); return; }
    if (email && seen.has(email)) { skipped.push({ row, reason: `Duplicate: ${email}` }); return; }
    const phone = clean(l.phone);
    const pk = phoneKey(phone);
    // phone-only rows are deduped on the number (same company, different formatting)
    if (!email && pk.length >= 6 && seenPhone.has(pk)) { skipped.push({ row, reason: `Duplicate phone: ${phone}` }); return; }
    if (rows.length >= room) { skipped.push({ row, reason: `Project limit of ${MAX_LEADS_PER_PROJECT} leads reached` }); return; }
    if (dropped) cleaned.push({ row, reason: `${dropped} — imported without the email` });
    if (email) seen.add(email);
    if (pk.length >= 6) seenPhone.add(pk);
    let website = clean(l.website);
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    rows.push({
      project_id: projectId, owner_id: userId, source: 'import',
      company_name: company, contact_name: clean(l.contact_name), email, website,
      phone, role: clean(l.role), industry: clean(l.industry), location: clean(l.location),
      linkedin_url: clean(l.linkedin_url),
      notes: dropped ? [clean(l.notes), `Email removed on import: ${dropped}`].filter(Boolean).join('\n') : clean(l.notes),
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

  const badEmails = skipped.filter((s) => !/^(Duplicate|No company|Project limit)/.test(s.reason)).length + cleaned.length;
  if (inserted) await logActivity(supabase, userId, projectId, 'import', `Imported ${inserted} leads from a custom list${badEmails ? ` · ${badEmails} bad emails removed` : ''}`, { skipped: skipped.length, badEmails, fixed: fixed.length });
  return ok({ inserted, skipped, cleaned, fixed, checked: { verify, badEmails, fixed: fixed.length, unchecked } });
}

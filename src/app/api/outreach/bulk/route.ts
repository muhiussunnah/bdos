import { auth, bad, ok, logActivity } from '@/lib/api';
import { resolveEmail, sendEmail, textToHtml, attachmentsFromForm } from '@/lib/email/resend';
import { isEmail, renderTemplate, recipientVars } from '@/lib/csv';
import type { Project, Lead } from '@/lib/types';

export const runtime = 'edge';

interface Recipient { email: string; name?: string | null; company?: string | null; role?: string | null; website?: string | null; leadId?: string | null }
interface Payload { projectId: string; subject: string; body: string; recipients: Recipient[]; startFollowups?: boolean; batchId?: string }

const MAX_PER_REQUEST = 25;

/**
 * Manual bulk send to a custom list (CSV rows or selected leads).
 * The client sends recipients in chunks (max 25 per request) so one edge
 * invocation never runs long. Subject/body support {{name}}, {{first_name}},
 * {{company}}, {{email}}, {{role}}, {{website}} and {{key|fallback}}.
 * multipart/form-data: payload (JSON string), files[]?
 */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const form = await req.formData().catch(() => null);
  if (!form) return bad('Expected multipart form data');
  let payload: Payload;
  try { payload = JSON.parse(String(form.get('payload') || '{}')); }
  catch { return bad('Invalid payload'); }

  const { projectId, subject, body, startFollowups = true, batchId } = payload;
  const recipients = Array.isArray(payload.recipients) ? payload.recipients : [];
  if (!projectId) return bad('projectId is required');
  if (!subject?.trim() || !body?.trim()) return bad('Subject and body are required');
  if (!recipients.length) return bad('No recipients');
  if (recipients.length > MAX_PER_REQUEST) return bad(`Send at most ${MAX_PER_REQUEST} recipients per request`);

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) return bad('Project not found', 404);
  const P = project as Project;

  const { apiKey, from } = await resolveEmail(supabase, userId);
  if (!apiKey) return bad('No Resend key. Add it in Settings → Email.', 428);

  let attachments;
  try { attachments = await attachmentsFromForm(form); }
  catch (e) { return bad(e instanceof Error ? e.message : 'Bad attachment', 413); }

  // hydrate any linked leads in one query
  const leadIds = recipients.map((r) => r.leadId).filter((x): x is string => !!x);
  const leadMap = new Map<string, Lead>();
  if (leadIds.length) {
    const { data } = await supabase.from('leads').select('*').in('id', leadIds).eq('project_id', projectId);
    (data as Lead[] || []).forEach((l) => leadMap.set(l.id, l));
  }

  const days = P.follow_up_days?.length ? P.follow_up_days : [3, 7, 21];
  const attachmentNames = (attachments || []).map((a) => a.filename);
  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const r of recipients) {
    const email = String(r.email || '').trim().toLowerCase();
    if (!isEmail(email)) { results.push({ email, ok: false, error: 'Invalid email' }); continue; }
    const lead = r.leadId ? leadMap.get(r.leadId) || null : null;
    const vars = recipientVars({
      email, name: r.name ?? lead?.contact_name, company: r.company ?? lead?.company_name,
      role: r.role ?? lead?.role, website: r.website ?? lead?.website,
    });
    const subj = renderTemplate(subject, vars);
    const text = renderTemplate(body, vars);
    const base = {
      lead_id: lead?.id || null, project_id: projectId, owner_id: userId, direction: 'outbound' as const,
      subject: subj, body: text, to_email: email, from_email: from,
      ai_meta: { manual: true, mode: 'bulk', batchId: batchId || null, attachments: attachmentNames },
    };
    try {
      const sent = await sendEmail({ to: email, subject: subj, html: textToHtml(text), text, from, apiKey, attachments });
      await supabase.from('messages').insert({ ...base, status: 'sent', provider_message_id: sent.id, sent_at: new Date().toISOString() });
      if (lead) {
        const now = new Date().toISOString();
        const patch: Record<string, unknown> = { last_contacted_at: now, updated_at: now };
        if (startFollowups && lead.stage === 'new') {
          patch.stage = 'contacted'; patch.followup_step = 0;
          patch.next_action_at = new Date(Date.now() + days[0] * 86400000).toISOString();
        }
        await supabase.from('leads').update(patch).eq('id', lead.id);
      }
      results.push({ email, ok: true });
    } catch (e) {
      await supabase.from('messages').insert({ ...base, status: 'failed' });
      results.push({ email, ok: false, error: e instanceof Error ? e.message : 'Send failed' });
    }
  }

  const sentCount = results.filter((x) => x.ok).length;
  if (sentCount) await logActivity(supabase, userId, projectId, 'outreach', `Bulk-sent ${sentCount} manual emails`, { batchId, manual: true });
  return ok({ sent: sentCount, failed: results.length - sentCount, results });
}

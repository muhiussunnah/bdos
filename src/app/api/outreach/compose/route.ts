import { auth, bad, ok, logActivity } from '@/lib/api';
import { resolveEmail, sendEmail, textToHtml, attachmentsFromForm, parseAddressList } from '@/lib/email/resend';
import { isEmail } from '@/lib/csv';
import type { Project, Lead } from '@/lib/types';

export const runtime = 'edge';

/**
 * Manual, Gmail-style send: To / Cc / Bcc / Subject / Body / attachments.
 * multipart/form-data fields:
 *   projectId, to, cc?, bcc?, subject, body, leadId?, saveLead? ("1"),
 *   company?, contactName?, startFollowups? ("1"), files[]?
 */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const form = await req.formData().catch(() => null);
  if (!form) return bad('Expected multipart form data');
  const s = (k: string) => String(form.get(k) ?? '').trim();

  const projectId = s('projectId');
  const to = parseAddressList(s('to'));
  const cc = parseAddressList(s('cc'));
  const bcc = parseAddressList(s('bcc'));
  const subject = s('subject');
  const body = s('body');
  let leadId = s('leadId') || null;
  const saveLead = s('saveLead') === '1';
  const startFollowups = s('startFollowups') === '1';

  if (!projectId) return bad('projectId is required');
  if (!to.length) return bad('Add at least one recipient');
  const badAddr = [...to, ...cc, ...bcc].find((a) => !isEmail(a));
  if (badAddr) return bad(`"${badAddr}" is not a valid email address`);
  if (!subject) return bad('Subject is required');
  if (!body) return bad('Message body is empty');

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) return bad('Project not found', 404);
  const P = project as Project;

  const { apiKey, from } = await resolveEmail(supabase, userId);
  if (!apiKey) return bad('No Resend key. Add it in Settings → Email.', 428);

  let attachments;
  try { attachments = await attachmentsFromForm(form); }
  catch (e) { return bad(e instanceof Error ? e.message : 'Bad attachment', 413); }

  // optionally create a lead for a brand-new recipient
  if (!leadId && saveLead) {
    const primary = to[0].toLowerCase();
    const { data: dup } = await supabase.from('leads').select('id').eq('project_id', projectId).ilike('email', primary).maybeSingle();
    if (dup) leadId = dup.id;
    else {
      const company = s('company') || primary.split('@')[1].replace(/\.[a-z]+$/i, '');
      const { data: created } = await supabase.from('leads').insert({
        project_id: projectId, owner_id: userId, source: 'manual', company_name: company,
        contact_name: s('contactName') || null, email: primary, fit_score: 50, opportunity_score: 50, priority: 'B', stage: 'new',
      }).select('id').single();
      leadId = created?.id || null;
    }
  }

  let lead: Lead | null = null;
  if (leadId) {
    const { data } = await supabase.from('leads').select('*').eq('id', leadId).single();
    lead = (data as Lead) || null;
    if (lead && lead.project_id !== projectId) return bad('Lead belongs to another project');
  }

  const meta = { manual: true, mode: 'compose', cc, bcc, attachments: (attachments || []).map((a) => a.filename) };
  const base = {
    lead_id: lead?.id || null, project_id: projectId, owner_id: userId, direction: 'outbound' as const,
    subject, body, to_email: to.join(', '), from_email: from, ai_meta: meta,
  };

  let providerId: string | null = null;
  try {
    const sent = await sendEmail({ to, cc, bcc, subject, html: textToHtml(body), text: body, from, apiKey, attachments });
    providerId = sent.id;
  } catch (e) {
    await supabase.from('messages').insert({ ...base, status: 'failed' });
    return bad(e instanceof Error ? e.message : 'Send failed', 502);
  }

  await supabase.from('messages').insert({ ...base, status: 'sent', provider_message_id: providerId, sent_at: new Date().toISOString() });

  if (lead) {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { last_contacted_at: now, updated_at: now };
    if (startFollowups && lead.stage === 'new') {
      const days = P.follow_up_days?.length ? P.follow_up_days : [3, 7, 21];
      patch.stage = 'contacted';
      patch.followup_step = 0;
      patch.next_action_at = new Date(Date.now() + days[0] * 86400000).toISOString();
    }
    await supabase.from('leads').update(patch).eq('id', lead.id);
  }

  await logActivity(supabase, userId, projectId, 'outreach', `Sent a manual email to ${lead?.company_name || to[0]}`, { leadId: lead?.id, manual: true });
  return ok({ sent: true, provider_message_id: providerId, leadId: lead?.id || null });
}

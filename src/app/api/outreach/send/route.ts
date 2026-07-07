import { auth, bad, ok, logActivity } from '@/lib/api';
import { resolveEmail, sendEmail, textToHtml } from '@/lib/email/resend';
import type { Project, Lead, Stage } from '@/lib/types';

export const runtime = 'edge';

export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const { leadId, subject, body, step = 0 } = await req.json().catch(() => ({}));
  if (!leadId || !subject || !body) return bad('leadId, subject and body are required');

  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (!lead) return bad('Lead not found', 404);
  const L = lead as Lead;
  if (!L.email) return bad('This lead has no email address.', 422);

  const { data: project } = await supabase.from('projects').select('*').eq('id', L.project_id).single();
  const P = project as Project;

  const { apiKey, from } = await resolveEmail(supabase, userId);
  if (!apiKey) return bad('No Resend key. Add it in Settings → Email.', 428);

  let providerId: string | null = null;
  try {
    const sent = await sendEmail({ to: L.email, subject, html: textToHtml(body), text: body, from, apiKey });
    providerId = sent.id;
  } catch (e) {
    await supabase.from('messages').insert({
      lead_id: leadId, project_id: L.project_id, owner_id: userId, direction: 'outbound',
      subject, body, status: 'failed', to_email: L.email, from_email: from,
    });
    return bad(e instanceof Error ? e.message : 'Send failed', 502);
  }

  await supabase.from('messages').insert({
    lead_id: leadId, project_id: L.project_id, owner_id: userId, direction: 'outbound',
    subject, body, status: 'sent', to_email: L.email, from_email: from,
    provider_message_id: providerId, sent_at: new Date().toISOString(),
  });

  // advance the pipeline + schedule the next follow-up
  const days = P?.follow_up_days?.length ? P.follow_up_days : [3, 7, 21];
  const nextGap = days[step]; // days until the follow-up AFTER this send
  const nextAction = typeof nextGap === 'number'
    ? new Date(Date.now() + nextGap * 86400000).toISOString()
    : null;
  const stage: Stage = step === 0 ? 'contacted' : (`followup${Math.min(step, 3)}` as Stage);

  await supabase.from('leads').update({
    stage, followup_step: step, last_contacted_at: new Date().toISOString(),
    next_action_at: nextAction, updated_at: new Date().toISOString(),
  }).eq('id', leadId);

  await logActivity(supabase, userId, L.project_id, 'outreach',
    `${step === 0 ? 'Sent outreach' : `Sent follow-up #${step}`} to ${L.company_name}`, { leadId });

  return ok({ sent: true, provider_message_id: providerId, stage, next_action_at: nextAction });
}

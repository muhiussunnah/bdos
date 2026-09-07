import { auth, bad, ok, logActivity } from '@/lib/api';
import { resolveEmail, sendEmail, textToHtml } from '@/lib/email/resend';
import type { Lead } from '@/lib/types';

export const runtime = 'edge';

/** Send a reply to an inbound message and mark it handled. */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const { messageId, subject, body } = await req.json().catch(() => ({}));
  if (!messageId || !subject || !body) return bad('messageId, subject and body are required');

  const { data: inbound } = await supabase.from('messages').select('*').eq('id', messageId).single();
  if (!inbound) return bad('Message not found', 404);

  const { data: lead } = inbound.lead_id
    ? await supabase.from('leads').select('*').eq('id', inbound.lead_id).single()
    : { data: null };
  const to = (lead as Lead)?.email || inbound.from_email;
  if (!to) return bad('No recipient address for this reply.', 422);

  // reply from whichever of the user's identities received the message (falls back to the default)
  const resolved = await resolveEmail(supabase, userId);
  const apiKey = resolved.apiKey;
  const receivedBy = String(inbound.to_email || '').trim().toLowerCase();
  const match = receivedBy ? resolved.senders.find((s) => s.email.trim().toLowerCase() === receivedBy) : null;
  const from = match ? `${match.name} <${match.email}>` : resolved.from;
  if (!apiKey) return bad('No Resend key. Add it in Settings → Email.', 428);

  try {
    const sent = await sendEmail({ to, subject, html: textToHtml(body), text: body, from, apiKey });
    await supabase.from('messages').insert({
      lead_id: inbound.lead_id, project_id: inbound.project_id, owner_id: userId, direction: 'outbound',
      subject, body, status: 'sent', to_email: to, from_email: from,
      provider_message_id: sent.id, sent_at: new Date().toISOString(),
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'Send failed', 502);
  }

  await supabase.from('messages').update({ handled: true }).eq('id', messageId);
  await logActivity(supabase, userId, inbound.project_id, 'inbox', `Replied to ${(lead as Lead)?.company_name || to}`);
  return ok({ sent: true });
}

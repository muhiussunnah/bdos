import { auth, bad, ok } from '@/lib/api';
import { resolveEmail, cancelScheduledEmail } from '@/lib/email/resend';

export const runtime = 'edge';

/**
 * Cancel drip-fed emails that Resend has not sent yet.
 * Body: { messageIds: string[] } — only the caller's `scheduled` messages are touched.
 * Cancelled rows are marked failed ("cancelled") so the caller can delete or keep them.
 */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.messageIds) ? body.messageIds.filter((x: unknown) => typeof x === 'string').slice(0, 500) : [];
  if (!ids.length) return bad('messageIds required');

  const { data } = await supabase.from('messages').select('id,provider_message_id,scheduled_at').in('id', ids).eq('owner_id', userId).eq('status', 'scheduled');
  const rows = (data as { id: string; provider_message_id: string | null; scheduled_at: string | null }[] | null) || [];
  if (!rows.length) return ok({ cancelled: 0, skipped: ids.length });

  const { apiKey } = await resolveEmail(supabase, userId, null);
  if (!apiKey) return bad('No Resend key. Add it in Settings → Email.', 428);

  let cancelled = 0;
  for (const r of rows) {
    const done = r.provider_message_id ? await cancelScheduledEmail(apiKey, r.provider_message_id).catch(() => false) : false;
    // already gone out (or unknown to Resend): leave it; otherwise mark cancelled
    if (!done) continue;
    await supabase.from('messages').update({ status: 'failed', ai_meta: { cancelled: true, scheduled_at: r.scheduled_at } }).eq('id', r.id);
    cancelled++;
  }
  return ok({ cancelled, skipped: ids.length - cancelled });
}

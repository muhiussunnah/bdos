import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Drip-fed emails are handed to Resend with a `scheduled_at`; Resend sends them
 * on time without any cron on our side. Rows stay `status: 'scheduled'` until
 * their time has passed — this promotes them to `sent` (sent_at = scheduled_at)
 * so lists, counts and threads treat them as delivered. Cheap; run on page load.
 */
export async function promoteScheduled(supabase: SupabaseClient, ownerId: string): Promise<number> {
  const now = new Date().toISOString();
  const { data } = await supabase.from('messages').select('id,scheduled_at').eq('owner_id', ownerId)
    .eq('status', 'scheduled').lte('scheduled_at', now).limit(500);
  const rows = (data as { id: string; scheduled_at: string }[] | null) || [];
  for (const r of rows) await supabase.from('messages').update({ status: 'sent', sent_at: r.scheduled_at }).eq('id', r.id);
  return rows.length;
}

export const DRIP_OPTIONS = [3, 5, 10, 15, 30] as const;

/** "1h 40m" / "35 min" for a drip of `count` emails every `minutes`. */
export function dripDuration(count: number, minutes: number): string {
  const total = Math.max(0, count - 1) * minutes;
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60), m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** When the last email of a drip goes out. */
export function dripEndsAt(count: number, minutes: number, start = Date.now()): Date {
  return new Date(start + Math.max(0, count - 1) * minutes * 60000);
}

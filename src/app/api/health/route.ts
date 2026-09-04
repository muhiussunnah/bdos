import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness check + database keep-alive.
 *
 * Runs a tiny real query against Postgres so the Supabase project registers
 * activity every day (free-tier projects are paused after 7 idle days, which
 * makes every auth call fail with "Failed to fetch"). Wired to a daily Vercel
 * cron in vercel.json; also safe to hit manually to check backend status.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    if (error) throw error;
    return NextResponse.json({
      ok: true,
      database: 'up',
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, database: 'down', error: message, checkedAt: new Date().toISOString() },
      { status: 503 }
    );
  }
}

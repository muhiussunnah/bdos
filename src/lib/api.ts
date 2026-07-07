import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Ctx {
  supabase: SupabaseClient;
  userId: string;
}

/** Resolve the signed-in user for an API route, or return a 401 response. */
export async function auth(): Promise<Ctx | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return { supabase, userId: user.id };
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

export async function logActivity(
  supabase: SupabaseClient,
  ownerId: string,
  projectId: string | null,
  kind: string,
  message: string,
  meta: Record<string, unknown> = {}
) {
  await supabase.from('activity_log').insert({ owner_id: ownerId, project_id: projectId, kind, message, meta });
}

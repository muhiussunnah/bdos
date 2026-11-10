import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Change some keys of user_settings.data without losing the others.
 * Reads the stored value first (another tab or page may have saved since this one loaded),
 * merges, writes. `columns` are plain user_settings columns saved in the same update.
 */
export async function patchSettingsData(
  supabase: SupabaseClient,
  ownerId: string,
  patch: Record<string, unknown> | ((current: Record<string, unknown>) => Record<string, unknown>),
  columns: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const { data: row, error: readError } = await supabase.from('user_settings').select('data').eq('owner_id', ownerId).maybeSingle();
  if (readError) throw new Error(readError.message);
  const current = (row?.data as Record<string, unknown>) || {};
  const data = { ...current, ...(typeof patch === 'function' ? patch(current) : patch) };
  const { error } = await supabase.from('user_settings').update({ ...columns, data }).eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
  return data;
}

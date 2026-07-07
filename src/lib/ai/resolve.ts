import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProviderKey } from '@/lib/constants';

const ENV_FALLBACK: Record<ProviderKey, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_AI_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
};

export interface ResolvedAI {
  provider: ProviderKey;
  model: string;
  apiKey: string;
}

/** Figure out which provider/model/key to use for this user (their keys first, env fallback). */
export async function resolveAI(
  supabase: SupabaseClient,
  ownerId: string,
  projectModel?: string | null
): Promise<ResolvedAI> {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('default_provider, default_model')
    .eq('owner_id', ownerId)
    .maybeSingle();

  const provider = (settings?.default_provider as ProviderKey) || 'openai';
  const model = projectModel || settings?.default_model || 'gpt-4o-mini';

  const { data: secret } = await supabase
    .from('user_secrets')
    .select('api_key')
    .eq('owner_id', ownerId)
    .eq('provider', provider)
    .maybeSingle();

  const apiKey = secret?.api_key || ENV_FALLBACK[provider] || '';
  return { provider, model, apiKey };
}

/** Concatenated knowledge-base text for a project, capped for the context window. */
export async function knowledgeFor(
  supabase: SupabaseClient,
  projectId: string,
  cap = 8000
): Promise<string> {
  const { data } = await supabase
    .from('knowledge_documents')
    .select('title, content')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (!data?.length) return '';
  let out = '';
  for (const d of data) {
    const chunk = `### ${d.title}\n${d.content || ''}\n`;
    if (out.length + chunk.length > cap) break;
    out += chunk;
  }
  return out.trim();
}

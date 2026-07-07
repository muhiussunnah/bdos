import { auth, bad, ok } from '@/lib/api';
import { complete } from '@/lib/ai/providers';
import type { ProviderKey } from '@/lib/constants';

export const runtime = 'edge';

export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;

  const { provider, model, apiKey } = await req.json().catch(() => ({}));
  if (!provider || !model || !apiKey) return bad('provider, model and apiKey are required');

  try {
    const out = await complete({
      provider: provider as ProviderKey, model, apiKey,
      messages: [{ role: 'user', content: 'Reply with exactly the word: ok' }],
      maxTokens: 8, temperature: 0,
    });
    return ok({ ok: true, sample: out.trim().slice(0, 40) });
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'Test failed', 502);
  }
}

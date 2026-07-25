import type { ProviderKey } from '@/lib/constants';

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompleteOpts {
  provider: ProviderKey;
  model: string;
  apiKey: string;
  system?: string;
  messages: ChatMsg[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

/**
 * One unified completion call across every supported provider. Uses each
 * vendor's REST endpoint directly so it runs anywhere fetch is available
 * (Node, edge, Cloudflare Workers).
 */
export async function complete(opts: CompleteOpts): Promise<string> {
  const { provider, model, apiKey } = opts;
  if (!apiKey) throw new Error(`Missing API key for ${provider}. Add it in Settings → AI Providers.`);

  switch (provider) {
    case 'openai':
    case 'openrouter':
      return openaiStyle(opts);
    case 'anthropic':
      return anthropic(opts);
    case 'google':
      return google(opts);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function openaiStyle({ provider, model, apiKey, system, messages, temperature, maxTokens, json }: CompleteOpts) {
  const base = provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';
  const msgs: ChatMsg[] = system ? [{ role: 'system', content: system }, ...messages] : messages;
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(provider === 'openrouter'
        ? { 'HTTP-Referer': 'https://klientic.com', 'X-Title': 'Klientic' }
        : {}),
    },
    body: JSON.stringify({
      model,
      messages: msgs,
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens ?? 1600,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`${provider} error ${res.status}: ${await safeText(res)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function anthropic({ model, apiKey, system, messages, temperature, maxTokens }: CompleteOpts) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens ?? 1600,
      temperature: temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(`anthropic error ${res.status}: ${await safeText(res)}`);
  const data = await res.json();
  return data.content?.map((c: { text?: string }) => c.text || '').join('') ?? '';
}

async function google({ model, apiKey, system, messages, temperature, maxTokens }: CompleteOpts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { temperature: temperature ?? 0.7, maxOutputTokens: maxTokens ?? 1600 },
    }),
  });
  if (!res.ok) throw new Error(`google error ${res.status}: ${await safeText(res)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ?? '';
}

async function safeText(res: Response) {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return res.statusText;
  }
}

/** Completion that forces a JSON object and parses it (tolerant of code fences). */
export async function completeJSON<T>(opts: CompleteOpts): Promise<T> {
  const raw = await complete({ ...opts, json: opts.provider === 'openai' || opts.provider === 'openrouter' });
  return parseJSON<T>(raw);
}

export function parseJSON<T>(raw: string): T {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const first = s.search(/[[{]/);
  const lastObj = s.lastIndexOf('}');
  const lastArr = s.lastIndexOf(']');
  const last = Math.max(lastObj, lastArr);
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s) as T;
}

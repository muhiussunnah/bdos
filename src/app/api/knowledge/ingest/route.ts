import { auth, bad, ok } from '@/lib/api';

export const runtime = 'edge';

/** Fetch a URL server-side and store a cleaned text snapshot in the knowledge base. */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const { projectId, url, title } = await req.json().catch(() => ({}));
  if (!projectId || !url) return bad('projectId and url are required');

  let text = '';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Klientic-bot' } });
    const html = await res.text();
    text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000);
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'Could not fetch URL', 502);
  }
  if (!text) return bad('No readable text found at that URL', 422);

  const { data, error } = await supabase.from('knowledge_documents').insert({
    project_id: projectId, owner_id: userId,
    title: title || new URL(url).hostname, kind: 'website', source_url: url,
    content: text, tokens: Math.round(text.length / 4),
  }).select().single();
  if (error) return bad(error.message, 500);
  return ok({ doc: data });
}

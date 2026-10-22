import { auth, bad, ok } from '@/lib/api';
import { verifyEmails } from '@/lib/emailCheck';
import { blockedAddresses, problemLabel } from '@/lib/deliverability';

export const runtime = 'edge';

/**
 * Check up to 50 addresses without saving anything (used by "Add lead").
 * → { results: [{ input, ok, email, reason?, fixedFrom?, unchecked? }] }
 */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const { emails } = await req.json().catch(() => ({})) as { emails?: unknown };
  const list = (Array.isArray(emails) ? emails : []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean).slice(0, 50);
  if (!list.length) return bad('emails[] required');

  const [verdicts, blocked] = await Promise.all([
    verifyEmails(list, { budgetMs: 6000 }),
    blockedAddresses(supabase, userId, list).catch(() => new Map()),
  ]);
  return ok({
    results: list.map((input) => {
      const v = verdicts.get(input) || { email: input, ok: true };
      const p = v.ok && v.email ? blocked.get(v.email) : undefined;
      return p ? { input, ok: false, email: null, reason: `${v.email}: ${problemLabel(p)} on ${p.at.slice(0, 10)}` } : { input, ...v };
    }),
  });
}

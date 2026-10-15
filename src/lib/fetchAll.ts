/**
 * Supabase (PostgREST) returns at most 1000 rows per request, so anything that
 * needs a whole project — leads, messages — is read page by page with .range().
 * Always give the query a stable order (e.g. created_at + id): rows inserted in one
 * import share the same created_at, and paging on a tie would skip or repeat rows.
 */

/** Leads one project can hold and show. */
export const MAX_LEADS_PER_PROJECT = 5000;
/** Messages loaded for inbox / outreach views. */
export const MAX_MESSAGES = 10000;

const PAGE = 1000;

type Page = PromiseLike<{ data: unknown; error: { message: string } | null }>;

/** usage: fetchAll<Lead>((from, to) => supabase.from('leads').select('*').eq(…).order(…).order('id').range(from, to)) */
export async function fetchAll<T>(page: (from: number, to: number) => Page, max = MAX_LEADS_PER_PROJECT): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const to = Math.min(from + PAGE, max) - 1;
    const { data, error } = await page(from, to);
    if (error) throw new Error(error.message);
    const rows = (data as T[] | null) || [];
    out.push(...rows);
    if (rows.length < to - from + 1) break;
  }
  return out;
}

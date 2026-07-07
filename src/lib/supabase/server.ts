import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/** Request-scoped client that reads the signed-in user from cookies. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // called from a Server Component — safe to ignore, middleware refreshes.
        }
      },
    },
  });
}

/** Service-role client for privileged server work (bypasses RLS). Never import in client code. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ANON;
  return createServerClient(URL, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Refreshes the auth session cookie and guards the /app + /admin areas. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // If Supabase isn't configured yet, let everything through (setup mode).
  if (!URL || !ANON) return response;

  const path0 = request.nextUrl.pathname;

  // Robustness: an auth link may land on the site root (e.g. `/?code=...`) if
  // the Supabase Site URL / redirect list isn't tuned. Route any stray code
  // through the callback so confirm / recovery / magic links still work.
  const code = request.nextUrl.searchParams.get('code');
  if (code && !path0.startsWith('/auth/callback')) {
    const type = request.nextUrl.searchParams.get('type');
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    url.search = '';
    url.searchParams.set('code', code);
    url.searchParams.set('next', type === 'recovery' ? '/auth/reset' : '/app/dashboard');
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith('/app') || path.startsWith('/admin');

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (path === '/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/app/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

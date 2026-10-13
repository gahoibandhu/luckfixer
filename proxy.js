// proxy.js (Next.js 16 name for middleware) — keeps the Supabase login cookie fresh for PAGE requests.
// Without it the access token (~1 hour) is only refreshed when something happens to ask for it, and a refreshed token written during a
// server render is lost.
// Cost control (important when Supabase is slow): getSession() reads the token from the cookie and only calls Supabase when it is about
// to expire, so a normal request does NO network call here; the refresh is capped at 2s so a stalled auth service can never hold a page.
// API routes are NOT matched: they call supabase.auth.getUser() themselves and can write refreshed cookies from the route handler.
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function proxy(request) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    await Promise.race([supabase.auth.getSession(), new Promise(resolve => setTimeout(resolve, 2000))]);
  } catch { /* never block a page because the refresh failed */ }

  response.headers.set('Cache-Control', 'private, no-store');   // signed-in pages must never sit in a CDN
  return response;
}

export const config = {
  matcher: ['/login', '/auth/:path*', '/chat/:path*', '/profile/:path*', '/kundli/:path*', '/milan/:path*',
            '/numerology/:path*', '/remedies/:path*', '/support/:path*', '/admin/:path*'],
};

// proxy.js (Next.js 16 name for middleware) — keeps the Supabase login cookie fresh.
// Without this, the access token (~1 hour) is only refreshed when some page or API call happens to ask for it,
// and a refreshed token written during a server request is lost. This runs BEFORE the page, refreshes the
// token if needed and writes the new cookies back onto the response.
// The matcher is deliberately narrow: public pages (panchang, rashifal, aarti...) skip it, so they stay static and fast.
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
    // getClaims() verifies the token (locally when the project uses asymmetric keys) and triggers the refresh.
    if (typeof supabase.auth.getClaims === 'function') await supabase.auth.getClaims();
    else await supabase.auth.getUser();
  } catch { /* never block a page because the refresh failed */ }

  // Signed-in pages must never be cached by a CDN. (API routes keep whatever caching they set themselves.)
  if (!request.nextUrl.pathname.startsWith('/api/')) response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/login', '/auth/:path*', '/chat/:path*', '/profile/:path*', '/kundli/:path*', '/milan/:path*',
            '/numerology/:path*', '/remedies/:path*', '/support/:path*', '/admin/:path*', '/api/((?!public|geocode|icon|warmup|cron).*)'],
};

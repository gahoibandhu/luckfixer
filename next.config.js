/** @type {import('next').NextConfig} */

// Pages that are rendered on the server for every request (they read ?query params and "today in IST").
// None of them depends on who is logged in or on cookies, so Vercel's CDN may keep a copy for a few minutes.
// `Vercel-CDN-Cache-Control` only tells Vercel's CDN; browsers still get the app's normal Cache-Control, so nothing changes
// client-side. Today's date is the only thing that moves, hence the short lifetime: after IST midnight a cached copy can show
// the previous day for at most this many seconds.
const CDN_SECONDS = 300;
const PUBLIC_DYNAMIC_PAGES = [
  '/panchang', '/panchang/:date', '/rashifal', '/rashifal/:sign',
  '/tyohar', '/ekadashi', '/pradosh', '/purnima', '/amavasya', '/sankashti',
];

const nextConfig = {
  // No 'output: export' — Vercel supports full Next.js SSR + API routes natively

  // The calendar used to be one page driven by ?v=&y=&m=&t= (an endless set of URLs). It is now /calendar/<year>/<month>.
  // Old links keep working; they are answered by the router itself, without running any page code.
  async redirects() {
    const Y = { type: 'query', key: 'y', value: '(?<y>202[6-8])' };
    return [
      { source: '/calendar', has: [Y, { type: 'query', key: 'm', value: '(?<m>1[0-2]|[1-9])' }], destination: '/calendar/:y/:m', permanent: true },
      { source: '/calendar', has: [Y], destination: '/calendar/:y/1', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        // Service worker itself must never be cached by the browser —
        // otherwise a future update to sw.js could take a long time to
        // reach users, contradicting the whole "always auto-updates"
        // point of this PWA setup.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        // Logos and icons are referenced on every page. Files in /public default to "max-age=0", which makes the browser
        // re-check each of them on every page view (an extra request per image). A day in the browser, with a week of
        // background-refresh, keeps them current while removing those requests.
        source: '/brand/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      {
        // linked from every page; as a /public file it defaulted to "max-age=0", i.e. one request per page view just to ask "changed?"
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      ...PUBLIC_DYNAMIC_PAGES.map(source => ({
        source,
        headers: [{ key: 'Vercel-CDN-Cache-Control', value: `s-maxage=${CDN_SECONDS}` }],
      })),
    ];
  },
};

module.exports = nextConfig;

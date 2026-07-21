/** @type {import('next').NextConfig} */
const nextConfig = {
  // No 'output: export' — Vercel supports full Next.js SSR + API routes natively

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
    ];
  },
};

module.exports = nextConfig;

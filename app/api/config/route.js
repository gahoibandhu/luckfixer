// app/api/config/route.js
// Public, read-only site config for client components (e.g. Header).
// Only exposes non-sensitive display values — never reuse this route
// for anything that needs admin auth.

import { getBotDisplayName } from '@/lib/app-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const botName = await getBotDisplayName();
  // same for every visitor and rarely changed: a few minutes on the CDN (and a minute in the browser) instead of one function run per chat-page load
  return Response.json({ botName }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } });
}

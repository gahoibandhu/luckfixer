// app/api/config/route.js
// Public, read-only site config for client components (e.g. Header).
// Only exposes non-sensitive display values — never reuse this route
// for anything that needs admin auth.

import { getBotDisplayName } from '@/lib/app-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const botName = await getBotDisplayName();
  return Response.json({ botName });
}

// POST /api/public/sky — no login. Body: { dob:'YYYY-MM-DD', time:'HH:MM'|null, lat, lng }
// Returns Moon rashi/nakshatra/pada (and Lagna + Mars houses when a time is given). Nothing is stored.
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { cleanBirth, skyFor } from '@/lib/public-birth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!rateLimit('sky:' + clientIp(req), 20)) return Response.json({ error: 'Too many requests — please wait a minute.' }, { status: 429 });
  let body; try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }); }
  const birth = cleanBirth(body);
  if (birth.error) return Response.json({ error: birth.error }, { status: 400 });
  try {
    const { factSheet, ...sky } = await skyFor(birth);
    return Response.json(sky);
  } catch (e) {
    console.warn('[public/sky]', e.message);
    return Response.json({ error: 'Calculation service is busy — please try again in a minute.' }, { status: 503 });
  }
}

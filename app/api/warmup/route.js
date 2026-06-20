// app/api/warmup/route.js
// Fire-and-forget ping to Render ephemeris service to wake it up
// before user submits a kundli. Called silently from profile page.
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.EPHEMERIS_SERVICE_URL;
  if (!url) return Response.json({ status: 'no-url' });

  try {
    // Non-blocking ping — don't await, just fire
    fetch(url.replace(/\/$/, '') + '/', { signal: AbortSignal.timeout(3000) })
      .catch(() => {}); // ignore errors
  } catch {}

  return Response.json({ status: 'pinged' });
}

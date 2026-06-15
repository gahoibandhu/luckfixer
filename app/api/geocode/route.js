// app/api/geocode/route.js
// Server-side proxy to OpenStreetMap Nominatim (free, no API key)
// Avoids browser CORS / User-Agent restrictions

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || !query.trim()) {
    return Response.json({ error: 'Missing query' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      {
        headers: {
          'User-Agent': 'Luckfixer2.0/1.0 (astrology app)',
          'Accept-Language': 'en',
        },
      }
    );

    if (!res.ok) {
      return Response.json({ error: 'Geocoding service error' }, { status: 502 });
    }

    const results = await res.json();

    if (!results || results.length === 0) {
      return Response.json({ found: false, results: [] });
    }

    return Response.json({
      found: true,
      results: results.map(r => ({
        latitude:  parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        display_name: r.display_name,
      })),
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

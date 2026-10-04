// lib/rashifal.js — SERVER-ONLY daily rashifal built from real sky data.
//
// Method (shown to readers on the page): Chandra gochar — the Moon's position counted from each
// Moon sign (rashi), using the Moon's sign at ~06:00 and ~20:00 IST so a sign change during the day
// is covered. No AI is involved: the text comes from the reviewed table in lib/public-content.js, so
// each day's page differs by real data (Moon sign, nakshatra, tithi, weekday) and costs nothing to run.
import { getPlanetPositions } from '@/lib/astro-facts';
import { CHANDRA_GOCHAR, VAAR, TITHI_NAMES, RASHIS } from '@/lib/public-content';

const DELHI = { lat: 28.6139, lng: 77.2090 };   // sky is the same for India at sign level
const cache = globalThis.__rashifalCache || (globalThis.__rashifalCache = new Map());

export function todayIST() {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  return { iso: ist.toISOString().slice(0, 10), weekday: ist.getUTCDay() };
}

const planet = (list, name) => list.find(p => p.name === name);
const signOf = (deg) => Math.floor((((deg % 360) + 360) % 360) / 30);

/** Moon / Sun facts for the given IST date. Returns { ok:false } when the ephemeris service is unreachable. */
export async function getDailyContext() {
  const { iso, weekday } = todayIST();
  if (cache.has(iso)) return cache.get(iso);
  try {
    const [am, pm] = await Promise.all([
      getPlanetPositions(iso, '06:00', DELHI.lat, DELHI.lng, 'lahiri', true),
      getPlanetPositions(iso, '20:00', DELHI.lat, DELHI.lng, 'lahiri', true),
    ]);
    const moonAm = planet(am.planets, 'Moon'), moonPm = planet(pm.planets, 'Moon'), sunAm = planet(am.planets, 'Sun');
    const diff = (((moonAm.degree - sunAm.degree) % 360) + 360) % 360;
    const tithiNo = Math.floor(diff / 12);                       // 0..29
    const ctx = {
      ok: true, iso, weekday,
      moonAmSign: signOf(moonAm.degree), moonPmSign: signOf(moonPm.degree),
      moonNakshatra: moonAm.nakshatra,
      paksha: tithiNo < 15 ? 'shukla' : 'krishna',
      tithi: TITHI_NAMES[tithiNo % 15],
    };
    cache.set(iso, ctx);
    if (cache.size > 5) cache.delete(cache.keys().next().value);   // keep the map tiny
    return ctx;
  } catch (e) {
    console.warn('[Rashifal] ephemeris unavailable:', e.message);
    return { ok: false, iso, weekday };
  }
}

const houseFrom = (rashiIdx, moonSign) => ((moonSign - rashiIdx + 12) % 12) + 1;

/** One rashi's reading for the day. */
export function buildRashifal(slug, ctx) {
  const r = RASHIS.find(x => x.slug === slug);
  if (!r || !ctx?.ok) return null;
  const h1 = houseFrom(r.idx, ctx.moonAmSign);
  const changes = ctx.moonPmSign !== ctx.moonAmSign;
  const h2 = changes ? houseFrom(r.idx, ctx.moonPmSign) : null;
  const g1 = CHANDRA_GOCHAR[h1], g2 = h2 ? CHANDRA_GOCHAR[h2] : null;
  const vaar = VAAR[ctx.weekday];
  const rank = { good: 3, mixed: 2, careful: 1 };
  const tone = g2 ? (rank[g1.tone] <= rank[g2.tone] ? g1.tone : g2.tone) : g1.tone;   // be cautious if the day changes
  return { rashi: r, house: h1, house2: h2, g1, g2, tone, stars: rank[tone] + 1, vaar };
}

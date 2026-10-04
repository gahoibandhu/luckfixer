// lib/public-birth.js — validation + sky lookup shared by the public no-login API routes.
// Nothing here is stored: birth details are used for the calculation and discarded.
import { getPlanetPositions } from '@/lib/astro-facts';

export function cleanBirth(b) {
  if (!b || typeof b !== 'object') return { error: 'Missing birth details' };
  const dob = String(b.dob || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return { error: 'Date of birth must be YYYY-MM-DD' };
  const y = Number(dob.slice(0, 4));
  if (y < 1900 || dob > new Date().toISOString().slice(0, 10)) return { error: 'Date of birth is out of range' };
  const time = b.time ? String(b.time) : null;
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { error: 'Time must be HH:MM (24-hour, IST)' };
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { error: 'Place of birth is required' };
  return { dob, time, lat, lng };
}

const sg = (deg) => Math.floor((((deg % 360) + 360) % 360) / 30);
const nk = (deg) => Math.floor((((deg % 360) + 360) % 360) / (360 / 27));
const pl = (list, n) => list.find(p => p.name === n);

/** Moon (+ Lagna and Mars when a time is given) for one person. Birth time is read as IST. */
export async function skyFor(birth) {
  const { dob, time, lat, lng } = birth;
  const main = await getPlanetPositions(dob, time || '12:00', lat, lng, 'lahiri', true);
  const moon = pl(main.planets, 'Moon'), mars = pl(main.planets, 'Mars');
  const out = {
    moon: { signIdx: sg(moon.degree), nakIdx: nk(moon.degree), pada: moon.pada, inSign: moon.inSign },
    sun: { signIdx: sg(pl(main.planets, 'Sun').degree) },
    timeKnown: !!time,
    moonSignChoices: null,
    lagnaSignIdx: null, marsHouseFromLagna: null, marsHouseFromMoon: null,
    factSheet: { planets: main.planets, lagna: main.lagna },
  };
  out.marsHouseFromMoon = ((sg(mars.degree) - out.moon.signIdx + 12) % 12) + 1;
  if (time) {
    out.lagnaSignIdx = sg(main.lagna.degree);
    out.marsHouseFromLagna = ((sg(mars.degree) - out.lagnaSignIdx + 12) % 12) + 1;
  } else {
    // No time: the Moon changes sign about every 2.3 days, so check whether it changed during that day.
    try {
      const [a, b] = await Promise.all([
        getPlanetPositions(dob, '00:01', lat, lng, 'lahiri', true),
        getPlanetPositions(dob, '23:59', lat, lng, 'lahiri', true),
      ]);
      const sa = sg(pl(a.planets, 'Moon').degree), sb = sg(pl(b.planets, 'Moon').degree);
      if (sa !== sb) out.moonSignChoices = [sa, sb];
    } catch { /* optional refinement only */ }
  }
  return out;
}

// lib/rashifal.js — daily rashifal built ENTIRELY from the exact panchang tables (no network, no AI):
//   * the Moon's sign through the civil day (with the exact minute it changes sign),
//   * tithi and nakshatra at Delhi sunrise with their end times, Rahu Kaal and Abhijit muhurta.
// Method = Chandra gochar: the house of today's Moon counted from each rashi, read from the reviewed tables in
// lib/rashifal-content.js. If the Moon changes sign during the day, both parts of the day are given.
import { civilMoonSegments, buildPanchang, inRange } from '@/lib/panchang-engine';
import { CITIES } from '@/lib/panchang';
import { CHANDRA_GOCHAR, VAAR, RASHIS } from '@/lib/public-content';
import { DOMAIN_STARS, DOMAINS, DOMAIN_TEXT, NAK_CAT, TITHI_CAT } from '@/lib/rashifal-content';
import { UPAY } from '@/lib/vaar-upay';

export function todayIST() {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  return { iso: ist.toISOString().slice(0, 10), weekday: ist.getUTCDay() };
}

/** Sky facts for a date (default: today, IST). `ok:false` outside the generated range (2026-2028). */
export async function getDailyContext(iso) {
  const today = todayIST();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso : today.iso;
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const segs = inRange(y) ? civilMoonSegments(y, m, d) : null;
  const pc = inRange(y) ? buildPanchang(y, m, d, CITIES[0]) : null;
  if (!segs || !pc) return { ok: false, iso: date, weekday };
  const tithiIdx = pc.tithi[0].idx, nakIdx = pc.nakshatra[0].idx;
  return {
    ok: true, iso: date, weekday, moonSegs: segs,
    moonAmSign: segs[0].idx, moonPmSign: segs[segs.length - 1].idx,         // kept for older callers
    tithi: { ...pc.tithi[0].label, idx: tithiIdx, end: pc.tithi[0].end, cat: TITHI_CAT[(((tithiIdx % 15) + 15) % 15) % 5] },
    nakshatra: { ...pc.nakshatra[0].label, idx: nakIdx, end: pc.nakshatra[0].end, cat: NAK_CAT[nakIdx] },
    yoga: pc.yoga[0].label, rahukaal: pc.rahukaal, abhijit: pc.abhijit, sunrise: pc.sunrise, sunset: pc.sunset,
    vaar: VAAR[weekday], upay: UPAY[weekday],
  };
}

const houseFrom = (rashiIdx, moonSign) => ((moonSign - rashiIdx + 12) % 12) + 1;
const RANK = { good: 3, mixed: 2, careful: 1 };

/** One rashi's reading for the day. */
export function buildRashifal(slug, ctx) {
  const r = RASHIS.find(x => x.slug === slug);
  if (!r || !ctx?.ok) return null;
  const parts = ctx.moonSegs.map(sg => {
    const house = houseFrom(r.idx, sg.idx), g = CHANDRA_GOCHAR[house];
    return { moonSign: sg.idx, from: sg.from, to: sg.to, house, g, text: DOMAIN_TEXT[house], stars: DOMAIN_STARS[house] };
  });
  // the part of the day that lasts longest is the "main" reading
  const main = parts.reduce((a, b) => ((b.to - b.from) > (a.to - a.from) ? b : a), parts[0]);
  const tone = parts.reduce((t, p) => (RANK[p.g.tone] < RANK[t] ? p.g.tone : t), main.g.tone);   // be cautious if any part is careful
  const overall = Math.round(main.stars.reduce((a, b) => a + b, 0) / 4);
  const second = parts.length > 1 ? parts.find(p => p !== main) : null;
  return {
    rashi: r, parts, main, second, tone, stars: RANK[tone] + 1, overall,
    house: main.house, g1: main.g, g2: second ? second.g : null, house2: second ? second.house : null,   // older callers
    vaar: ctx.vaar,
  };
}
export { DOMAINS };

// lib/panchang-engine.js — one city + one date -> a complete panchang, from the exact transition tables
// (lib/panchang-data.js, generated with Swiss Ephemeris) and city-specific sunrise/sunset (lib/panchang.js).
// Pure functions, no network. All clock values are IST minutes from midnight; `dayOff` says 0 = same date, 1 = next date.
import { PANCHANG_TABLES, PANCHANG_EPOCH_UTC, PANCHANG_RANGE } from '@/lib/panchang-data';
import { dayTimings, sunrise, YOGAS } from '@/lib/panchang';
import { RASHIS } from '@/lib/public-content';
import { NAKSHATRAS } from '@/lib/baby-names';

const TITHI = [
  ['प्रतिपदा','Pratipada'],['द्वितीया','Dwitiya'],['तृतीया','Tritiya'],['चतुर्थी','Chaturthi'],['पंचमी','Panchami'],['षष्ठी','Shashthi'],['सप्तमी','Saptami'],
  ['अष्टमी','Ashtami'],['नवमी','Navami'],['दशमी','Dashami'],['एकादशी','Ekadashi'],['द्वादशी','Dwadashi'],['त्रयोदशी','Trayodashi'],['चतुर्दशी','Chaturdashi'],
];
export function tithiName(i) {                      // i = 0..29
  if (i === 14) return { hi: 'पूर्णिमा', en: 'Purnima', paksha: 'shukla' };
  if (i === 29) return { hi: 'अमावस्या', en: 'Amavasya', paksha: 'krishna' };
  const k = i % 15;
  return { hi: TITHI[k][0], en: TITHI[k][1], paksha: i < 15 ? 'shukla' : 'krishna' };
}
const MOVABLE = [['बव','Bava'],['बालव','Balava'],['कौलव','Kaulava'],['तैतिल','Taitila'],['गर','Gara'],['वणिज','Vanija'],['विष्टि (भद्रा)','Vishti (Bhadra)']];
const FIXED = { 0: ['किंस्तुघ्न','Kimstughna'], 57: ['शकुनि','Shakuni'], 58: ['चतुष्पद','Chatushpada'], 59: ['नाग','Naga'] };
export function karanaName(i) {                      // i = 0..59
  const f = FIXED[i] || MOVABLE[(i - 1) % 7];
  return { hi: f[0], en: f[1] };
}

const T = PANCHANG_TABLES;
const cols = (name) => { const t = T[name], n = t.length / 2; return { n, m: (k) => t[2 * k], i: (k) => t[2 * k + 1] }; };
const dayMin = (y, m, d) => (Date.UTC(y, m - 1, d) - PANCHANG_EPOCH_UTC) / 60000;       // minutes at 00:00 UTC of that date

/** the element running at utcMin: { idx, startMin, endMin } (startMin may be before the table when out of range) */
function at(name, utcMin) {
  const c = cols(name);
  let lo = 0, hi = c.n - 1, k = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (c.m(mid) <= utcMin) { k = mid; lo = mid + 1; } else hi = mid - 1; }
  if (k < 0 || k >= c.n - 1) return null;            // before / after the generated range
  return { idx: c.i(k), startMin: c.m(k), endMin: c.m(k + 1), k };
}
/** every segment of `name` that overlaps [fromUtc, toUtc] */
function segments(name, fromUtc, toUtc) {
  const c = cols(name), out = [];
  let cur = at(name, fromUtc);
  while (cur && cur.startMin < toUtc) {
    out.push({ idx: cur.idx, start: cur.startMin, end: cur.endMin });
    if (cur.endMin >= toUtc) break;
    cur = at(name, cur.endMin + 0.5);
  }
  return out;
}

const pad = (n) => String(n).padStart(2, '0');
function toLocal(utcMin, y, m, d) {                  // -> { min (IST minutes from midnight of the page date), dayOff }
  const local = utcMin - dayMin(y, m, d) + 330;
  return { min: ((local % 1440) + 1440) % 1440, dayOff: Math.floor(local / 1440) };
}

export const inRange = (y) => y >= PANCHANG_RANGE[0] && y <= PANCHANG_RANGE[1];

export function buildPanchang(y, m, d, city) {
  if (!inRange(y)) return null;
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const dt = dayTimings(y, m, d, weekday, city.lat, city.lng);
  const nd = new Date(Date.UTC(y, m - 1, d + 1));
  const nextSr = sunrise(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate(), city.lat, city.lng) + 1440;   // minutes from today's midnight
  const toUtc = (localMin) => dayMin(y, m, d) + localMin - 330;
  const t0 = toUtc(dt.sunrise), t1 = toUtc(nextSr);

  const seg = (name, label) => {
    const list = segments(name, t0, t1);
    if (!list.length) return null;
    return list.map(s => ({ idx: s.idx, end: toLocal(s.end, y, m, d), label: label(s.idx) }));
  };
  const tithi = seg('tithi', tithiName), nak = seg('nakshatra', (i) => NAKSHATRAS[i]), yoga = seg('yoga', (i) => YOGAS[i]);
  const karana = seg('karana', karanaName), moon = seg('moonsign', (i) => RASHIS[i]), sun = seg('sunsign', (i) => RASHIS[i]);
  if (!tithi || !nak || !yoga || !karana || !moon || !sun) return null;
  return { weekday, ...dt, nextSunrise: nextSr, tithi, nakshatra: nak, yoga, karana, moonSign: moon, sunSign: sun };
}

/** Moon-sign segments over the whole civil day (IST 00:00-24:00): [{ idx, from, to }] with exact sign-change minutes. */
export function civilMoonSegments(y, m, d) {
  if (!inRange(y)) return null;
  const t0 = dayMin(y, m, d) - 330, t1 = t0 + 1440;
  const segs = segments('moonsign', t0 + 0.001, t1);
  if (!segs.length) return null;
  return segs.map(s => ({ idx: s.idx, from: Math.max(0, s.start - t0), to: Math.min(1440, s.end - t0) }));
}

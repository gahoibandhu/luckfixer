// lib/calendar-events.js — ONE list of dated observances for the calendar pages and the ICS export.
// Sources (all computed with Swiss Ephemeris, Delhi reference, IST civil dates — see the generator scripts):
//   FESTIVAL_DATES (tithi festivals), VRATS (ekadashi / purnima / amavasya / pradosh), SANKRANTIS (sun ingress).
// Nothing is hard-coded here: if the generated data changes, the calendar follows.
import { FESTIVALS } from '@/lib/festivals';
import { FESTIVAL_DATES, FESTIVAL_RANGE } from '@/lib/festival-data';
import { VRATS, SANKRANTIS } from '@/lib/vrat-data';
import { RASHIS } from '@/lib/public-content';

export const CAL_RANGE = FESTIVAL_RANGE;                                // [2026, 2028]

export const TYPES = {
  tyohar:   { hi: 'त्योहार',  en: 'Festival',  color: '#c8831a', glyph: '🪔' },
  ekadashi: { hi: 'एकादशी',   en: 'Ekadashi',  color: '#2e7d4f', glyph: '☊' },
  pradosh:  { hi: 'प्रदोष',   en: 'Pradosh',   color: '#6a4fb3', glyph: '☽' },
  purnima:  { hi: 'पूर्णिमा', en: 'Purnima',   color: '#2f6fb8', glyph: '○' },
  amavasya: { hi: 'अमावस्या', en: 'Amavasya',  color: '#6b6b66', glyph: '●' },
  sankranti:{ hi: 'संक्रांति', en: 'Sankranti', color: '#c0462f', glyph: '☉' },
};
export const TYPE_ORDER = ['tyohar', 'ekadashi', 'pradosh', 'purnima', 'amavasya', 'sankranti'];

const addDays = (iso, n) => { const x = new Date(iso.slice(0, 10) + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const PAKSHA = { shukla: ['शुक्ल', 'Shukla'], krishna: ['कृष्ण', 'Krishna'] };

const cache = new Map();
/** All observances of a calendar year, sorted by date. Each: { date, to, type, hi, en, note?: {hi,en}, href } */
export function eventsForYear(year) {
  if (cache.has(year)) return cache.get(year);
  const ys = String(year), out = [];

  for (const f of FESTIVALS) {
    if (f.k) {
      for (const o of (FESTIVAL_DATES[f.k] || []).filter(x => x.p.startsWith(ys))) {
        let a = o.p, b = o.p;
        if (f.end) { const e = (FESTIVAL_DATES[f.end] || []).find(x => x.p >= o.p); if (e) b = e.p; }
        else if (f.span) { a = addDays(o.p, f.span[0]); b = addDays(o.p, f.span[1]); }
        out.push({ date: a, to: b, type: 'tyohar', hi: f.hi, en: f.en, href: `/tyohar?y=${year}#${f.k}` });
      }
    } else if (f.sol !== undefined) {
      for (const s of SANKRANTIS.filter(x => x.sign === f.sol && x.at.startsWith(ys))) {
        out.push({ date: s.at.slice(0, 10), to: s.at.slice(0, 10), type: 'tyohar', hi: f.hi, en: f.en, sol: true, href: `/tyohar?y=${year}` });
      }
    }
  }

  for (const v of VRATS) {
    const date = v.dates[0];
    if (!date || !date.startsWith(ys)) continue;
    const t = TYPES[v.k]; if (!t) continue;
    const p = PAKSHA[v.p];
    out.push({ date, to: date, type: v.k, hi: p ? `${t.hi} (${p[0]})` : t.hi, en: p ? `${t.en} (${p[1]})` : t.en, href: `/vrat/${v.k}` });
  }

  for (const s of SANKRANTIS.filter(x => x.at.startsWith(ys))) {
    const r = RASHIS.find(z => z.idx === s.sign);
    out.push({ date: s.at.slice(0, 10), to: s.at.slice(0, 10), type: 'sankranti', hi: `${r?.hi || ''} संक्रांति`, en: `${(r?.slug || '').replace(/^./, c => c.toUpperCase())} Sankranti`, href: '/vrat-calendar' });
  }

  // a generic monthly Sankranti is dropped on days where a named solar festival (Makar Sankranti, Vishu…) already exists
  const solDays = new Set(out.filter(e => e.sol).map(e => e.date));
  for (let i = out.length - 1; i >= 0; i--) if (out[i].type === 'sankranti' && solDays.has(out[i].date)) out.splice(i, 1);

  // the same observance can come from two sources on the same day (e.g. Makar Sankranti) — keep one
  const seen = new Set(), uniq = [];
  for (const e of out.sort((x, y) => x.date.localeCompare(y.date) || TYPE_ORDER.indexOf(x.type) - TYPE_ORDER.indexOf(y.type))) {
    const key = `${e.date}|${e.en.replace(/\s*\(.*\)/, '').toLowerCase()}`;
    if (seen.has(key)) continue; seen.add(key); uniq.push(e);
  }
  cache.set(year, uniq);
  return uniq;
}

/** events by ISO date for one year, honouring a type filter (array of type keys; empty = all) */
export function eventsByDate(year, types) {
  const map = {};
  for (const e of eventsForYear(year)) {
    if (types?.length && !types.includes(e.type)) continue;
    // multi-day festivals (Navratri, Ganesh Chaturthi…) show on every day of their span, as "start" only on the first
    let d = e.date, n = 0;
    while (d <= e.to && n < 20) { (map[d] ||= []).push({ ...e, first: d === e.date, last: d === e.to }); d = addDays(d, 1); n++; }
  }
  return map;
}
export { addDays };

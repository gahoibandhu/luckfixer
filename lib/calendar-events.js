// lib/calendar-events.js — ONE list of dated observances for the calendar pages and the ICS export.
// Sources (all computed with Swiss Ephemeris, Delhi reference, IST civil dates — see the generator scripts):
//   FESTIVAL_DATES (tithi festivals), VRATS (ekadashi / purnima / amavasya / pradosh), SANKRANTIS (sun ingress).
// Nothing is hard-coded here: if the generated data changes, the calendar follows.
import { FESTIVALS, MASIK } from '@/lib/festivals';
import { FESTIVAL_DATES, FESTIVAL_RANGE } from '@/lib/festival-data';
import { VRATS, SANKRANTIS } from '@/lib/vrat-data';
import { RASHIS } from '@/lib/public-content';
import { ekadashiOccurrences } from '@/lib/ekadashi';
import { FEST_SLUG_BY_KEY } from '@/lib/festival-pages';
import { pradoshOccurrences, purnimaOccurrences, amavasyaOccurrences } from '@/lib/vrat-series';
import { PRADOSH, PURNIMA, AMAVASYA } from '@/lib/series-content';
import { SANKASHTI } from '@/lib/sankashti-data';
import { EKADASHI } from '@/lib/ekadashi-content';

export const CAL_RANGE = FESTIVAL_RANGE;                                // [2026, 2028]

export const TYPES = {
  tyohar:   { hi: 'त्योहार',  en: 'Festival',  color: '#c8831a', glyph: '🪔' },
  ekadashi: { hi: 'एकादशी',   en: 'Ekadashi',  color: '#2e7d4f', glyph: '☊' },
  pradosh:  { hi: 'प्रदोष',   en: 'Pradosh',   color: '#6a4fb3', glyph: '☽' },
  purnima:  { hi: 'पूर्णिमा', en: 'Purnima',   color: '#2f6fb8', glyph: '○' },
  amavasya: { hi: 'अमावस्या', en: 'Amavasya',  color: '#6b6b66', glyph: '●' },
  sankranti:{ hi: 'संक्रांति', en: 'Sankranti', color: '#c0462f', glyph: '☉' },
  masik:    { hi: 'मासिक व्रत', en: 'Monthly vrat', color: '#8d6e63', glyph: '✦' },
  sankashti:{ hi: 'संकष्टी', en: 'Sankashti', color: '#d9622b', glyph: '🐘' },
};
export const TYPE_ORDER = ['tyohar', 'ekadashi', 'pradosh', 'purnima', 'amavasya', 'sankashti', 'sankranti', 'masik'];
/** does an event match a type filter (array of keys; empty = everything)? */
export const matchesTypes = (e, types) => !types?.length || types.includes(e.type) || (e.also || []).some(t => types.includes(t));

const weekdayOf0 = (iso) => new Date(iso + 'T00:00:00Z').getUTCDay();
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
        out.push({ date: a, to: b, type: 'tyohar', r: f.r, hi: f.hi, en: f.en, href: FEST_SLUG_BY_KEY[f.k] ? `/tyohar/${FEST_SLUG_BY_KEY[f.k]}` : `/tyohar?y=${year}#${f.k}` });
      }
    } else if (f.sol !== undefined) {
      for (const s of SANKRANTIS.filter(x => x.sign === f.sol && x.at.startsWith(ys))) {
        out.push({ date: s.at.slice(0, 10), to: s.at.slice(0, 10), type: 'tyohar', hi: f.hi, en: f.en, sol: true, r: f.r, href: `/tyohar?y=${year}` });
      }
    }
  }

  for (const v of VRATS) {
    const date = v.dates[0];
    if (!date || !date.startsWith(ys)) continue;
    const t = TYPES[v.k]; if (!t) continue;
    if (v.k === 'ekadashi') {
      const o = ekadashiOccurrences().find(x => x.date === date), c = o && EKADASHI[o.slug];
      if (c) { out.push({ date, to: date, type: 'ekadashi', hi: c.hi, en: c.en, href: `/ekadashi/${o.slug}` }); continue; }
    }
    if (v.k === 'pradosh') {
      const o = pradoshOccurrences().find(x => x.date === date), vr = o?.variant && PRADOSH.variants[o.variant], p = PAKSHA[v.p];
      out.push({ date, to: date, type: 'pradosh', hi: vr ? vr.hi : `प्रदोष व्रत (${p[0]})`, en: vr ? vr.en : `Pradosh Vrat (${p[1]})`, href: o?.variant ? `/pradosh/${o.variant}` : '/pradosh' }); continue;
    }
    if (v.k === 'purnima') {
      const o = purnimaOccurrences().find(x => x.date === date), c = o && PURNIMA[o.slug];
      if (c) { out.push({ date, to: date, type: 'purnima', hi: c.hi, en: c.en, href: `/purnima/${o.slug}` }); continue; }
    }
    if (v.k === 'amavasya') {
      const o = amavasyaOccurrences().find(x => x.date === date), vr = o?.variant && AMAVASYA[o.variant];
      out.push({ date, to: date, type: 'amavasya', hi: vr ? vr.hi : 'अमावस्या', en: vr ? vr.en : 'Amavasya', href: '/amavasya' }); continue;
    }
    const p = PAKSHA[v.p];
    out.push({ date, to: date, type: v.k, hi: p ? `${t.hi} (${p[0]})` : t.hi, en: p ? `${t.en} (${p[1]})` : t.en, href: `/vrat/${v.k}` });
  }

  for (const o of SANKASHTI.filter(x => x.date.startsWith(ys))) {
    const tue = weekdayOf0(o.date) === 2;
    out.push({ date: o.date, to: o.date, type: 'sankashti', hi: tue ? 'अंगारकी संकष्टी चतुर्थी' : 'संकष्टी चतुर्थी', en: tue ? 'Angarki Sankashti Chaturthi' : 'Sankashti Chaturthi', href: '/sankashti' });
  }

  for (const s of SANKRANTIS.filter(x => x.at.startsWith(ys))) {
    const r = RASHIS.find(z => z.idx === s.sign);
    out.push({ date: s.at.slice(0, 10), to: s.at.slice(0, 10), type: 'sankranti', hi: `${r?.hi || ''} संक्रांति`, en: `${(r?.slug || '').replace(/^./, c => c.toUpperCase())} Sankranti`, href: '/vrat-calendar' });
  }

  // monthly vrats (Masik Shivaratri, Kalashtami …). Skipped on the day (or a day either side) of the bigger festival they are the monthly
  // version of — Maha Shivratri, Kalabhairav Jayanti, Ganesh Chaturthi, Maha Ashtami — so one observance is not listed twice.
  for (const m of MASIK) {
    const big = new Set((m.over ? FESTIVAL_DATES[m.over] || [] : []).map(x => x.p));
    for (const o of (FESTIVAL_DATES[m.k] || []).filter(x => x.p.startsWith(ys))) {
      if (big.has(o.p) || big.has(addDays(o.p, -1)) || big.has(addDays(o.p, 1))) continue;
      out.push({ date: o.p, to: o.p, type: 'masik', hi: m.hi, en: m.en, href: `/panchang/${o.p}` });
    }
  }

  // a generic monthly Sankranti is dropped on days where a named solar festival (Makar Sankranti, Vishu…) already exists
  const solDays = new Set(out.filter(e => e.sol).map(e => e.date));
  for (let i = out.length - 1; i >= 0; i--) if (out[i].type === 'sankranti' && solDays.has(out[i].date)) out.splice(i, 1);

  // the same observance can come from two sources on the same day (e.g. Makar Sankranti) — keep one
  // An observance that is both a festival and a fast (Nirjala, Devshayani, Dev Uthani…) stays ONE event; it keeps its first type and
  // lists the others in `also`, so every filter that matches either type still finds it.
  const seen = new Map(), uniq = [];
  for (const e of out.sort((x, y) => x.date.localeCompare(y.date) || TYPE_ORDER.indexOf(x.type) - TYPE_ORDER.indexOf(y.type))) {
    const key = `${e.date}|${e.en.replace(/\s*\(.*\)/, '').toLowerCase()}`;
    const kept = seen.get(key);
    if (kept) {
      if (e.type !== kept.type && !(kept.also || []).includes(e.type)) kept.also = [...(kept.also || []), e.type];
      if (e.href.startsWith('/ekadashi/')) kept.href = e.href;            // the series page is the better destination
      continue;
    }
    seen.set(key, e); uniq.push(e);
  }
  cache.set(year, uniq);
  return uniq;
}

/** events by ISO date for one year, honouring a type filter (array of type keys; empty = all) */
export function eventsByDate(year, types) {
  const map = {};
  for (const e of eventsForYear(year)) {
    if (!matchesTypes(e, types)) continue;
    // multi-day festivals (Navratri, Ganesh Chaturthi…) show on every day of their span, as "start" only on the first
    let d = e.date, n = 0;
    while (d <= e.to && n < 20) { (map[d] ||= []).push({ ...e, first: d === e.date, last: d === e.to }); d = addDays(d, 1); n++; }
  }
  return map;
}
export { addDays };

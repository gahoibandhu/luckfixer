// lib/vrat-series.js — Pradosh, Purnima and Amavasya occurrences with their names, built from the generated vrat data.
import { VRATS } from '@/lib/vrat-data';
import { monthAt } from '@/lib/lunar-months';

export const PURNIMA_SLUGS = ['chaitra', 'vaishakha', 'jyeshtha', 'ashadha', 'shravana', 'bhadrapada', 'ashwin', 'kartik', 'margashirsha', 'pausha', 'magha', 'phalguna', 'adhik'];
export const PRADOSH_VARIANTS = { 1: 'som', 2: 'bhauma', 6: 'shani' };                 // JS weekday: Monday, Tuesday, Saturday
export const AMAVASYA_VARIANTS = { 1: 'somvati', 6: 'shani' };

export const weekdayOf = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

const cache = {};
const build = (kind, fn) => (cache[kind] ||= VRATS.filter(v => v.k === kind && v.dates?.[0]).map(fn).sort((a, b) => a.date.localeCompare(b.date)));

/** [{ date, start, end, paksha, weekday, variant: 'som'|'bhauma'|'shani'|null }] — the day of the vrat, with the Trayodashi window */
export const pradoshOccurrences = () => build('pradosh', v => ({ date: v.dates[0], start: v.start, end: v.end, paksha: v.p, weekday: weekdayOf(v.dates[0]), variant: PRADOSH_VARIANTS[weekdayOf(v.dates[0])] || null }));

/** [{ slug, monthIdx|null, adhika, date, start, end }] — slug = month name ('ashadha'...) or 'adhik' */
export const purnimaOccurrences = () => build('purnima', v => {
  const mo = monthAt(v.start);
  const slug = !mo ? null : mo.adhika ? 'adhik' : PURNIMA_SLUGS[mo.idx];
  return { slug, monthIdx: mo && !mo.adhika ? mo.idx : null, adhika: !!mo?.adhika, date: v.dates[0], start: v.start, end: v.end, paksha: v.p };
}).filter(o => o.slug);

/** [{ date, start, end, weekday, variant: 'somvati'|'shani'|null }] */
export const amavasyaOccurrences = () => build('amavasya', v => ({ date: v.dates[0], start: v.start, end: v.end, weekday: weekdayOf(v.dates[0]), variant: AMAVASYA_VARIANTS[weekdayOf(v.dates[0])] || null }));

export const purnimaOf = (slug) => purnimaOccurrences().filter(o => o.slug === slug);

// lib/calendar-month.js — the panchang of every day of one month, for the printed-calendar style month page (/calendar).
//
// Same engine and same reference as the daily panchang page (Delhi, IST): each day shows the tithi and nakshatra that are running at
// sunrise (udaya tithi — the one a Hindu calendar prints for that date), with the IST time at which that tithi ends.
// Pure and deterministic, so a month is computed once and reused.
import { buildPanchang, inRange } from '@/lib/panchang-engine';
import { CITIES } from '@/lib/panchang';

export const MON = [['जनवरी', 'January'], ['फ़रवरी', 'February'], ['मार्च', 'March'], ['अप्रैल', 'April'], ['मई', 'May'], ['जून', 'June'], ['जुलाई', 'July'], ['अगस्त', 'August'], ['सितंबर', 'September'], ['अक्टूबर', 'October'], ['नवंबर', 'November'], ['दिसंबर', 'December']];

const DELHI = CITIES.find(c => c.slug === 'delhi');
const pick = (l) => (Array.isArray(l) ? { hi: l[0], en: l[1] } : l);   // nakshatras come as [hi, en], tithis as { hi, en, paksha }
const cache = new Map();

/** [{ d, ok, idx, num, paksha, tithi: {hi,en}, tithiEnd: {min, dayOff}, nak: {hi,en} }] — one entry per day, 1..last. */
export function monthPanchang(year, month) {
  const key = year * 100 + month;
  if (cache.has(key)) return cache.get(key);
  const n = new Date(Date.UTC(year, month, 0)).getUTCDate(), out = [];
  for (let d = 1; d <= n; d++) {
    const pc = inRange(year) ? buildPanchang(year, month, d, DELHI) : null;
    if (!pc) { out.push({ d, ok: false }); continue; }
    const t = pc.tithi[0], nk = pc.nakshatra[0];
    out.push({
      d, ok: true,
      idx: t.idx,                                        // 0..29 (14 = Purnima, 29 = Amavasya)
      num: t.idx < 15 ? t.idx + 1 : t.idx - 14,          // 1..15 within the paksha
      paksha: t.label.paksha,                            // 'shukla' | 'krishna'
      tithi: { hi: t.label.hi, en: t.label.en },
      tithiEnd: t.end,                                   // { min: IST minutes from midnight, dayOff }
      nak: pick(nk.label),
    });
  }
  cache.set(key, out);
  return out;
}

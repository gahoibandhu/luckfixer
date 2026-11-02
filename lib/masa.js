// lib/masa.js — the Hindu (lunar) month and the era years of any day, read from lib/masa-data.js (generated, Delhi sunrise).
//
// Two reckonings are in use and both are shown: PURNIMANTA (the month ends at the full moon — North India, where the dark half comes first)
// and AMANTA (the month ends at the new moon — Maharashtra, Gujarat, Karnataka, Andhra and the South). The bright half has the same name in both;
// the dark half is one month apart. An extra lunar month (adhika) is flagged. Vikram Samvat and Shaka change on Chaitra Shukla Pratipada.
import { MASA_FIRST_YEAR, MASA_CODES } from '@/lib/masa-data';
import { FESTIVAL_DATES } from '@/lib/festival-data';

export const MASA_NAMES = [['चैत्र', 'Chaitra'], ['वैशाख', 'Vaishakha'], ['ज्येष्ठ', 'Jyeshtha'], ['आषाढ़', 'Ashadha'], ['श्रावण', 'Shravana'], ['भाद्रपद', 'Bhadrapada'],
  ['आश्विन', 'Ashvina'], ['कार्तिक', 'Kartika'], ['मार्गशीर्ष', 'Margashirsha'], ['पौष', 'Pausha'], ['माघ', 'Magha'], ['फाल्गुन', 'Phalguna']];

const dayIndex = (iso) => Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(MASA_FIRST_YEAR, 0, 1)) / 86400000);

/** { amanta, purnimanta, amantaAdhika, purnimantaAdhika } for a YYYY-MM-DD date, or null outside the generated years */
export function masaOn(iso) {
  const i = dayIndex(iso) * 3;
  if (i < 0 || i + 3 > MASA_CODES.length) return null;
  const f = parseInt(MASA_CODES[i + 2], 10);
  return { amanta: parseInt(MASA_CODES[i], 16), purnimanta: parseInt(MASA_CODES[i + 1], 16), amantaAdhika: !!(f & 1), purnimantaAdhika: !!(f & 2) };
}

/** Vikram Samvat and Shaka year on a date (both change on Chaitra Shukla Pratipada) */
export function samvatOn(iso) {
  const y = +iso.slice(0, 4);
  const start = ((FESTIVAL_DATES.chaitra_navratri || []).find(r => r.p.startsWith(String(y))) || {}).p;
  const after = start ? iso >= start : +iso.slice(5, 7) >= 4;
  return { vikram: y + (after ? 57 : 56), shaka: y + (after ? -78 : -79) };
}

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
function runs(list, key) {                       // [{ idx, adhika, from, to }] — consecutive days with the same month
  const out = [];
  list.forEach((x, k) => {
    const last = out[out.length - 1], d = k + 1;
    if (last && last.idx === x[key] && last.adhika === x[key + 'Adhika']) last.to = d;
    else out.push({ idx: x[key], adhika: x[key + 'Adhika'], from: d, to: d });
  });
  return out;
}

/** The lunar months a Gregorian month passes through, in both reckonings, plus the era years (more than one when the new year falls inside it) */
export function masaSegments(year, month) {
  const n = new Date(Date.UTC(year, month, 0)).getUTCDate(), days = [];
  for (let d = 1; d <= n; d++) { const m = masaOn(iso(year, month, d)); if (!m) return null; days.push(m); }
  const sv = [];
  for (let d = 1; d <= n; d++) { const s = samvatOn(iso(year, month, d)); if (!sv.length || sv[sv.length - 1].vikram !== s.vikram) { sv.push({ ...s, from: d }); } }
  return { days: n, purnimanta: runs(days, 'purnimanta'), amanta: runs(days, 'amanta'), samvat: sv };
}

// lib/lunar-months.js — which lunar month (and whether it is the adhika masa) a moment falls in. Shared by the Ekadashi and Purnima series.
// Built only from data we already ship: new moons (end of each Amavasya) and the Sun's sankranti times.
//   * a month runs new moon -> new moon; the Sun's sign at its start names it (Sun in Meena -> Chaitra, Mesha -> Vaishakha ...)
//   * a month with no sankranti inside it is the adhika masa
import { VRATS, SANKRANTIS } from '@/lib/vrat-data';

export const MONTHS = [['चैत्र', 'Chaitra'], ['वैशाख', 'Vaishakha'], ['ज्येष्ठ', 'Jyeshtha'], ['आषाढ़', 'Ashadha'], ['श्रावण', 'Shravana'], ['भाद्रपद', 'Bhadrapada'], ['आश्विन', 'Ashwin'], ['कार्तिक', 'Kartik'], ['मार्गशीर्ष', 'Margashirsha'], ['पौष', 'Pausha'], ['माघ', 'Magha'], ['फाल्गुन', 'Phalguna']];

let cached;
/** [{ a, b, idx, adhika }] — a/b = new moon times 'YYYY-MM-DD HH:MM' (IST), idx 0..11 = Chaitra..Phalguna (amanta month) */
export function lunarMonths() {
  if (cached) return cached;
  const sank = SANKRANTIS.map(s => ({ sign: s.sign, at: s.at })).sort((x, y) => x.at.localeCompare(y.at));
  // two synthetic boundaries cover the first/last partial months of the data range
  const nm = ['2025-12-20 07:00', ...VRATS.filter(v => v.k === 'amavasya').map(v => v.end), '2029-02-01 00:00'].sort();
  const months = [];
  for (let i = 0; i + 1 < nm.length; i++) {
    const a = nm[i], b = nm[i + 1];
    const before = sank.filter(s => s.at <= a);
    const signAtStart = before.length ? before[before.length - 1].sign : 8;      // Dhanu before the first record
    const inside = sank.some(s => s.at > a && s.at <= b);
    months.push({ a, b, idx: (signAtStart + 1) % 12, adhika: !inside && b < '2029-01-01' });
  }
  cached = months;
  return months;
}
/** the lunar month containing a moment ('YYYY-MM-DD HH:MM'), or undefined outside the data range */
export const monthAt = (ts) => lunarMonths().find(m => ts > m.a && ts <= m.b);

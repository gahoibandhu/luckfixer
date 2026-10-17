// lib/ekadashi.js — names every Ekadashi in the generated 2026-2028 vrat data.
// The generated data only knows "an Ekadashi falls on this date". Which of the 24 (or 26) it is depends on the lunar
// month, so we derive that from the same data: new moons (end of each Amavasya) + the Sun's sankranti times.
//   * month starts at a new moon; the Sun's sign at that moment names the month (Sun in Meena -> Chaitra, Mesha -> Vaishakha ...)
//   * a month with no sankranti inside it is the adhika masa -> Padmini (Shukla) / Parama (Krishna)
//   * Shukla Ekadashi belongs to the same amanta month; Krishna Ekadashi is named by the NEXT month (purnimanta, the
//     convention used for Ekadashi names: Papmochani = Krishna of Chaitra = Krishna of amanta Phalguna).
import { VRATS } from '@/lib/vrat-data';
import { MONTHS, monthAt } from '@/lib/lunar-months';

// [Krishna slug, Shukla slug] for Chaitra .. Phalguna (purnimanta months)
export const MONTH_TABLE = [
  ['papmochani', 'kamada'], ['varuthini', 'mohini'], ['apara', 'nirjala'], ['yogini', 'devshayani'],
  ['kamika', 'shravana-putrada'], ['aja', 'parivartini'], ['indira', 'papankusha'], ['rama', 'devutthana'],
  ['utpanna', 'mokshada'], ['saphala', 'pausha-putrada'], ['shattila', 'jaya'], ['vijaya', 'amalaki'],
];
export { MONTHS };
export const SLUGS = [...MONTH_TABLE.flat(), 'padmini', 'parama'];

let cached;
/** [{ slug, date, start, end, paksha, monthIdx|null (null = adhika), adhika }] sorted by date */
export function ekadashiOccurrences() {
  if (cached) return cached;
  const out = [];
  for (const v of VRATS) {
    if (v.k !== 'ekadashi' || !v.dates?.[0]) continue;
    const mo = monthAt(v.start);                                                 // the start of the tithi is always inside the month
    if (!mo) continue;
    let slug, monthIdx = mo.idx;
    if (mo.adhika) { slug = v.p === 'shukla' ? 'padmini' : 'parama'; monthIdx = null; }
    else if (v.p === 'shukla') slug = MONTH_TABLE[mo.idx][1];
    else slug = MONTH_TABLE[(mo.idx + 1) % 12][0];
    out.push({ slug, date: v.dates[0], start: v.start, end: v.end, paksha: v.p, monthIdx: v.p === 'krishna' && monthIdx !== null ? (monthIdx + 1) % 12 : monthIdx, adhika: mo.adhika });
  }
  cached = out.sort((x, y) => x.date.localeCompare(y.date));
  return cached;
}
export const occurrencesOf = (slug) => ekadashiOccurrences().filter(o => o.slug === slug);

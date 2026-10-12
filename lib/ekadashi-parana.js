// Pāraṇa (breaking the fast) window for an Ekadashi observed on civil date `iso` — Delhi reference.
// Rule used: break the fast on Dwadashi after sunrise and before Dwadashi ends. The first quarter of Dwadashi (Hari Vasara) is
// avoided by tradition; we show the Dwadashi end time and let the reader keep the rule. Vaishnava (Dwadashi-based) observance can differ by a day.
import { buildPanchang, inRange } from '@/lib/panchang-engine';
import { CITIES, fmt } from '@/lib/panchang';
import { addDays } from '@/lib/calendar-events';

export function paranaFor(iso) {
  const next = addDays(iso, 1);
  const [y, m, d] = next.split('-').map(Number);
  if (!inRange(y)) return null;
  const pc = buildPanchang(y, m, d, CITIES[0]);
  const dw = pc.tithi.find(s => s.idx % 15 === 11);       // Dwadashi segment on the next sunrise-to-sunrise day
  return {
    date: next,
    sunrise: fmt(pc.sunrise),
    dwadashiEnds: dw ? `${fmt(dw.end.min)}${dw.end.dayOff ? ` (+${dw.end.dayOff}d)` : ''}` : null,
    dwadashiAllDay: !dw,
  };
}

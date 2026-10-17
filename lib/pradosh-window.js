// Pradosh Kaal for a civil date (Delhi): from sunset to about 2h 24m later. Approximate by design — it moves with the city's sunset.
import { buildPanchang, inRange } from '@/lib/panchang-engine';
import { CITIES, fmt } from '@/lib/panchang';
export function pradoshWindow(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!inRange(y)) return null;
  const pc = buildPanchang(y, m, d, CITIES[0]);
  return { sunset: fmt(pc.sunset), from: fmt(pc.sunset), to: fmt(pc.sunset + 144) };
}

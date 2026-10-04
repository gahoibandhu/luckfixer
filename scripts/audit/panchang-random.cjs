const E = require('/tmp/audit-pe.cjs'), P = require('/tmp/audit-pg.cjs');
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const out = [];
for (let n = 0; n < 300; n++) {
  const y = 2026 + Math.floor(rnd() * 3), m = 1 + Math.floor(rnd() * 12), d = 1 + Math.floor(rnd() * 28), c = P.CITIES[Math.floor(rnd() * P.CITIES.length)];
  const pc = E.buildPanchang(y, m, d, c);
  if (!pc) { out.push({ none: true, y, m, d, c: c.slug }); continue; }
  out.push({ y, m, d, c: c.slug, sr: pc.sunrise, t: pc.tithi[0].idx, nk: pc.nakshatra[0].idx, yg: pc.yoga[0].idx, kr: pc.karana[0].idx, ms: pc.moonSign[0].idx, ss: pc.sunSign[0].idx });
}
console.log(JSON.stringify(out));

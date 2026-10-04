// Published reference values for DELHI, Saturday 3 Oct 2026 (several panchang sites agreed within 1-2 minutes).
const E = require('/tmp/audit-pe.cjs');
const pc = E.buildPanchang(2026, 10, 3, { lat: 28.6139, lng: 77.2090 });
const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const abs = (o) => o.min + o.dayOff * 1440;
const checks = [
  ['sunrise', pc.sunrise, hm('06:15')], ['sunset', pc.sunset, hm('18:05')],
  ['Rahu Kaal start', pc.rahukaal.from, hm('09:12')], ['Rahu Kaal end', pc.rahukaal.to, hm('10:41')],
  ['Yamaganda start', pc.yamaganda.from, hm('13:38')], ['Yamaganda end', pc.yamaganda.to, hm('15:07')],
  ['Gulika start', pc.gulika.from, hm('06:15')], ['Gulika end', pc.gulika.to, hm('07:43')],
  ['Saptami ends', abs(pc.tithi[0].end), hm('08:00')], ['Ashtami ends (next day)', abs(pc.tithi[1].end), 1440 + hm('05:52')],
  ['Ardra ends (next day)', abs(pc.nakshatra[0].end), 1440 + hm('01:30')],
  ['Variyana ends', abs(pc.yoga[0].end), hm('15:20')],
  ['Bava ends', abs(pc.karana[0].end), hm('08:00')], ['Balava ends', abs(pc.karana[1].end), hm('18:56')],
];
let bad = 0;
for (const [name, got, want] of checks) {
  const d = Math.abs(got - want); const ok = d <= 3;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'BAD'} ${name.padEnd(26)} got ${Math.round(got)} want ${want} (diff ${d.toFixed(1)} min)`);
}
if (pc.moonSign[0].label.en !== 'Gemini') { bad++; console.log('BAD moon sign'); }
if (bad) { console.log(bad + ' reference checks failed'); process.exit(1); }
console.log('reference checks passed');

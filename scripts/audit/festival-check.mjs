// Is the date that independent published 2026 calendars agree on INSIDE the range our festival page shows?
// (Range = the tithi's exact start-end days, or the usual-rule days for multi-day festivals.)
import { FESTIVAL_DATES as F } from '../../lib/festival-data.js';
import { FESTIVALS } from '../../lib/festivals.js';
const PUBLISHED = { // festival key -> date (>= 2 published calendars agree)
  holika_dahan: '2026-03-03', chaitra_navratri: '2026-03-19', maha_shivratri: '2026-02-15', akshaya_tritiya: '2026-04-19', guru_purnima: '2026-07-29',
  raksha_bandhan: '2026-08-28', janmashtami: '2026-09-04', ganesh_chaturthi: '2026-09-14', sharad_navratri: '2026-10-11', dussehra: '2026-10-20',
  karwa_chauth: '2026-10-29', dhanteras: '2026-11-06', diwali: '2026-11-08', govardhan: '2026-11-10', bhai_dooj: '2026-11-11', chhath_sandhya: '2026-11-15',
};
let bad = 0;
for (const [k, want] of Object.entries(PUBLISHED)) {
  const o = F[k].find(x => x.p.startsWith('2026'));
  const f = FESTIVALS.find(x => x.k === k);
  let a = o.s.slice(0, 10), b = o.e.slice(0, 10);
  if (f.end) { const e = F[f.end].find(x => x.p >= o.p); a = o.p; b = e ? e.p : o.p; }
  if (f.span) { const sh = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }; a = sh(o.p, f.span[0]); b = sh(o.p, f.span[1]); }
  const ok = want >= a && want <= b;
  if (!ok) bad++;
  console.log((ok ? 'ok ' : 'BAD') + ' ' + k.padEnd(20) + 'published ' + want + '  shown ' + (a === b ? a : a + ' to ' + b));
}
console.log(bad ? bad + ' mismatches' : 'all published dates fall inside the shown ranges');
process.exit(bad ? 1 : 0);

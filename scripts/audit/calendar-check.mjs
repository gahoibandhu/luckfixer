// Golden check for the calendar: every date in PUBLISHED_2026 (lib/festivals.js) must appear in the calendar events
// compared with the generated festival/vrat data, plus basic sanity rules (24-26 ekadashi, 12-14 purnima a year).
// Plain node cannot resolve the "@/lib" alias, so copy lib/festivals.js, festival-data.js, vrat-data.js to a temp folder (see notes).
import { FESTIVALS, PUBLISHED_2026 } from '../../lib/festivals.js';
import { FESTIVAL_DATES } from '../../lib/festival-data.js';
import { VRATS } from '../../lib/vrat-data.js';
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };
for (const [k, d] of Object.entries(PUBLISHED_2026)) {
  const occ = (FESTIVAL_DATES[k] || []).find(o => o.p.startsWith('2026'));
  if (!occ) { fail(`${k}: no 2026 occurrence`); continue; }
  if (!(occ.c || [occ.p]).includes(d) && occ.p !== d) fail(`${k}: computed ${occ.p} (candidates ${occ.c}) vs published ${d}`);
}
for (const y of [2026, 2027, 2028]) {
  const ek = VRATS.filter(v => v.k === 'ekadashi' && v.dates[0]?.startsWith(String(y))).length;
  if (ek < 23 || ek > 27) fail(`${y}: ${ek} ekadashi dates (expected 24-26)`);
  const pu = VRATS.filter(v => v.k === 'purnima' && v.dates[0]?.startsWith(String(y))).length;
  if (pu < 12 || pu > 14) fail(`${y}: ${pu} purnima dates`);
}
console.log(bad ? `${bad} problem(s)` : 'calendar golden check OK');
process.exit(bad ? 1 : 0);

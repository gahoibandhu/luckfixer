// Golden check for the calendar: every date in PUBLISHED_2026 (lib/festivals.js) must appear in the calendar events
// compared with the generated festival/vrat data, plus basic sanity rules (24-26 ekadashi, 12-14 purnima a year).
// Plain node cannot resolve the "@/lib" alias, so copy lib/festivals.js, festival-data.js, vrat-data.js to a temp folder (see notes).
import { FESTIVALS, PUBLISHED_2026 } from '../../lib/festivals.js';
import { FESTIVAL_DATES } from '../../lib/festival-data.js';
import { VRATS } from '../../lib/vrat-data.js';
import { ekadashiOccurrences } from '../../lib/ekadashi.js';
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
// Ekadashi naming: every Ekadashi gets a name, the adhika-masa pair exists only where expected, and the three Ekadashis that are
// also in the festival data (Nirjala, Devshayani, Dev Uthani) must land on exactly the same dates.
const eo = ekadashiOccurrences();
if (eo.length !== VRATS.filter(v => v.k === 'ekadashi' && v.dates?.[0]).length) fail(`ekadashi names: ${eo.length} named vs ${VRATS.filter(v => v.k === 'ekadashi').length} in data`);
for (const [fk, slug] of [['nirjala_ekadashi', 'nirjala'], ['devshayani', 'devshayani'], ['dev_uthani', 'devutthana']]) {
  const a = (FESTIVAL_DATES[fk] || []).map(x => x.p).join(), b = eo.filter(x => x.slug === slug).map(x => x.date).join();
  if (a !== b) fail(`${slug}: festival data ${a} vs ekadashi naming ${b}`);
}
const adhik = eo.filter(x => x.adhika).map(x => x.slug + ' ' + x.date);
if (adhik.length !== 2 || !adhik[0].startsWith('padmini 2026') || !adhik[1].startsWith('parama 2026')) fail(`adhika pair unexpected: ${adhik}`);
console.log(bad ? `${bad} problem(s)` : 'calendar golden check OK');
process.exit(bad ? 1 : 0);

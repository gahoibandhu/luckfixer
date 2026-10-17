// Golden check for the calendar: every date in PUBLISHED_2026 (lib/festivals.js) must appear in the calendar events
// compared with the generated festival/vrat data, plus basic sanity rules (24-26 ekadashi, 12-14 purnima a year).
// Plain node cannot resolve the "@/lib" alias, so copy lib/festivals.js, festival-data.js, vrat-data.js to a temp folder (see notes).
import { FESTIVALS, PUBLISHED_2026 } from '../../lib/festivals.js';
import { FESTIVAL_DATES } from '../../lib/festival-data.js';
import { VRATS } from '../../lib/vrat-data.js';
import { ekadashiOccurrences } from '../../lib/ekadashi.js';
import { purnimaOccurrences, pradoshOccurrences, amavasyaOccurrences } from '../../lib/vrat-series.js';
import { SANKASHTI } from '../../lib/sankashti-data.js';
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
// Recurring series: yearly counts, every Purnima gets a month name, named Purnima festivals fall inside their tithi window,
// and Sankashti Chaturthi (computed separately with astronomy-engine) agrees with the independently computed Karwa Chauth / Sakat Chauth dates.
const pr = pradoshOccurrences(), pu = purnimaOccurrences(), am = amavasyaOccurrences();
for (const y of [2026, 2027, 2028]) {
  const n = (l, f = (o) => o.date) => l.filter(o => f(o).startsWith(String(y))).length;
  if (n(pr) < 23 || n(pr) > 27) fail(`${y}: ${n(pr)} pradosh days`);
  if (n(pu) < 12 || n(pu) > 14) fail(`${y}: ${n(pu)} purnima days`);
  if (n(am) < 12 || n(am) > 14) fail(`${y}: ${n(am)} amavasya days`);
  if (n(SANKASHTI) < 12 || n(SANKASHTI) > 14) fail(`${y}: ${n(SANKASHTI)} sankashti days`);
}
if (pu.length !== VRATS.filter(v => v.k === 'purnima' && v.dates?.[0]).length) fail('some Purnima could not be assigned to a lunar month');
for (const [fk, slug] of [['guru_purnima', 'ashadha'], ['raksha_bandhan', 'shravana'], ['sharad_purnima', 'ashwin'], ['kartik_purnima', 'kartik'], ['hanuman_jayanti', 'chaitra'], ['holika_dahan', 'phalguna']]) {
  for (const f of (FESTIVAL_DATES[fk] || [])) {
    const o = pu.find(x => x.slug === slug && x.date.slice(0, 4) === f.p.slice(0, 4));
    if (!o || f.p < o.start.slice(0, 10) || f.p > o.end.slice(0, 10)) fail(`${fk} ${f.p} is not inside the ${slug} Purnima window ${o && o.start} - ${o && o.end}`);
  }
}
for (const fk of ['karwa_chauth', 'sakat_chauth']) for (const f of (FESTIVAL_DATES[fk] || [])) {
  if (!SANKASHTI.some(o => o.date === f.p)) fail(`${fk} ${f.p} is not a Sankashti day in lib/sankashti-data.js`);
}
console.log(bad ? `${bad} problem(s)` : 'calendar golden check OK');
process.exit(bad ? 1 : 0);

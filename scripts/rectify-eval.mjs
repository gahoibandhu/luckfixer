// scripts/rectify-eval.mjs — does rectification actually find known birth times?
//
// Usage (needs the pyswisseph service running, e.g. `cd ephemeris-service && uvicorn main:app --port 8765`):
//   EPHEMERIS_SERVICE_URL=http://localhost:8765 node scripts/rectify-eval.mjs
//   RECTIFY_TRANSITS=1 EPHEMERIS_SERVICE_URL=... node scripts/rectify-eval.mjs   # compare transit blending
//
// Add every user whose birth time you KNOW for certain to scripts/rectify-cases.json
// (true_time + their life events). For each case this reports: the rank of the TRUE Lagna
// among the 12, whether the true time falls inside a returned window, and the confidence
// the app gave. Change scoring only when the numbers across MANY cases improve —
// tuning on a single case just overfits it.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const out = '/tmp/rectify-eval.cjs';
execSync(`npx --yes esbuild lib/birth-rectification.js --bundle --platform=node --format=cjs --outfile=${out} --log-level=error`, { stdio: 'inherit' });
const require = createRequire(import.meta.url);
const { rectifyBirthTime, validateEvents } = require(out);

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const cases = JSON.parse(readFileSync(new URL('./rectify-cases.json', import.meta.url), 'utf8'));
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

for (const c of cases) {
  const v = validateEvents(c.events, c.dob);
  if (typeof v === 'string') { console.log(`${c.name}: INVALID EVENTS — ${v}`); continue; }
  for (const [label, win] of [['whole day', { mode: 'unknown' }]]) {
    const r = await rectifyBirthTime({ ...c, birth_time: null, birth_time_source: 'unknown' }, v.events, win);
    const tMin = toMin(c.true_time);
    const inWindow = r.windows.find(w => tMin >= toMin(w.start) && tMin <= toMin(w.end));
    // Which Lagna was the TRUE one? Scan just the true minute, then see where that Lagna ranked.
    const at = await rectifyBirthTime({ ...c, birth_time: null, birth_time_source: 'unknown' }, v.events, { mode: 'range', start: c.true_time, end: c.true_time });
    const trueLagnaName = at.by_lagna[0]?.lagna;
    const rank = r.lagna_ranking.findIndex(l => l.lagna === trueLagnaName) + 1;
    console.log(`${c.name} [${label}]`);
    console.log(`  confidence=${r.confidence} stability=${r.stability} events=${r.events_used} transits=${process.env.RECTIFY_TRANSITS === '1' ? 'on' : 'off'}`);
    console.log(`  top windows: ${r.windows.slice(0, 3).map(w => `${w.start}-${w.end} ${w.lagna} (${w.score})`).join(' | ')}`);
    console.log(`  TRUE ${c.true_time} (${trueLagnaName} Lagna): ${inWindow ? 'INSIDE window ' + inWindow.start + '-' + inWindow.end : 'NOT in any returned window'}; true Lagna ranked #${rank} of ${r.lagna_ranking.length}`);
  }
}

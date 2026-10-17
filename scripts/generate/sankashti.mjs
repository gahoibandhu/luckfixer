// scripts/generate/sankashti.mjs — generates lib/sankashti-data.js (run once; needs a dev-only dependency:  npm i -D astronomy-engine  then  node scripts/generate/sankashti.mjs > data.json).
// Sankashti Chaturthi for Delhi, 2026-2028: the day on which Krishna Chaturthi (tithi 19) is present at moonrise. Moon/Sun positions from astronomy-engine; tithi = floor(Moon-Sun elongation / 12).
// If the tithi falls entirely between two moonrises the day on which it covers most of the evening (sunset to midnight) is used (flag fallback). If it is present at moonrise on two days both are listed (c) and the day on which it lasts longer after moonrise is primary.
import * as A from 'astronomy-engine';
import fs from 'node:fs';
const obs = new A.Observer(28.6139, 77.2090, 216), IST = 5.5 * 3600 * 1000, H = 3600 * 1000;
const tithiAt = (ms) => Math.floor(A.MoonPhase(new Date(ms)) / 12) + 1;
const istStr = (ms) => new Date(ms + IST).toISOString().replace('T', ' ').slice(0, 16);
const istDay = (ms) => new Date(ms + IST).toISOString().slice(0, 10);
function edge(ms, dir) { const k = tithiAt(ms), step = dir * 600000; let inside = ms; while (tithiAt(inside + step) === k) inside += step; let outside = inside + step; for (let i = 0; i < 25; i++) { const mid = Math.round((inside + outside) / 2); if (tithiAt(mid) === k) inside = mid; else outside = mid; } return outside; }
function riseOf(day) { const start = new Date(Date.parse(day + 'T00:00:00Z') - IST); const r = A.SearchRiseSet(A.Body.Moon, obs, +1, start, 1.0); return r ? r.date.getTime() : null; }
function setOf(day) { const start = new Date(Date.parse(day + 'T00:00:00Z') - IST); const r = A.SearchRiseSet(A.Body.Sun, obs, -1, start, 1.0); return r ? r.date.getTime() : null; }
const addDay = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

// 1) every Krishna Chaturthi window (tithi 19) from Dec 2025 to Jan 2029
const windows = []; let t = Date.UTC(2025, 11, 1);
while (t < Date.UTC(2029, 0, 15)) {
  if (tithiAt(t) === 19) { const S = edge(t, -1), E = edge(t, +1); windows.push([S, E]); t = E + 6 * H; } else t += 6 * H;
}
// 2) for each window choose the vrat day
const out = [];
for (const [S, E] of windows) {
  const d0 = istDay(S), d1 = istDay(E); const days = []; for (let d = d0; d <= d1; d = addDay(d, 1)) days.push(d);
  const present = [];
  for (const d of days) { const r = riseOf(d); if (r && r >= S && r <= E) present.push({ d, r }); }
  let primary, cands, fallback = false, moon;
  if (present.length) {
    present.sort((a, b) => (E - b.r) - (E - a.r) || a.d.localeCompare(b.d));    // the day on which the tithi lasts longest after moonrise
    primary = present[0].d; moon = present[0].r; cands = present.map(x => x.d).sort();
  } else {
    // the tithi falls entirely between two moonrises: take the day on which it covers most of the evening (sunset -> midnight)
    let best = null;
    for (const d of days) { const ss = setOf(d); if (!ss) continue; const mid = Date.parse(d + 'T00:00:00Z') - IST + 24 * H; const ov = Math.max(0, Math.min(E, mid) - Math.max(S, ss)); if (!best || ov > best.ov) best = { d, ov }; }
    primary = best.d; cands = days.filter(d => { const ss = setOf(d); const mid = Date.parse(d + 'T00:00:00Z') - IST + 24 * H; return ss && Math.min(E, mid) - Math.max(S, ss) > 0; }); fallback = true; moon = riseOf(primary);
  }
  if (!primary.startsWith('2026') && !primary.startsWith('2027') && !primary.startsWith('2028')) continue;
  out.push({ date: primary, c: cands, moonrise: moon ? istStr(moon).slice(11) : null, start: istStr(S), end: istStr(E), fallback });
}
out.sort((a, b) => a.date.localeCompare(b.date));
fs.writeFileSync('/tmp/ast/sankashti.json', JSON.stringify(out));
console.log(out.length, 'Sankashti days |', out.filter(o => o.fallback).length, 'by the evening rule |', out.filter(o => o.c.length > 1).length, 'with two possible days');

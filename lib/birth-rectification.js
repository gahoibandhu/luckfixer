// lib/birth-rectification.js
//
// Birth-time rectification — DETERMINISTIC, no AI. Given a birth date/place, a
// time window ("I know roughly", "part of day", "no idea" = whole day) and a
// handful of dated life events, it scans every candidate birth time in the
// window, builds the Lagna + Vimshottari dasha for each, and scores how well
// the dasha running at each event date fits that event's significators.
// Candidates that behave identically are grouped into WINDOWS so the user can
// pick one (the app never silently picks a single "true" time).
//
// What it uses: Lagna sign (via the pyswisseph /rectify-scan endpoint) and the
// Moon's exact degree (which shifts the whole dasha timeline ~0.75 yr per hour
// of birth-time change). What it does NOT use yet: transit triggers (Jupiter /
// Saturn), divisional charts, or ashtakavarga. It is evidence-based narrowing,
// not proof — confidence is reported honestly and is low with few events.

import { calcVimshottari } from './vimshottari';
import { getPlanetPositions, getBirthUtcOffsetHours } from './astro-facts';

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGNS_HI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];
const SIGN_LORD = { Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon', Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars', Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter' };

// houses: relevant houses (first = primary). karaka: natural significators.
export const EVENT_TYPES = {
  marriage:        { houses:[7,2,11], karaka:(g) => g === 'female' ? ['Jupiter','Venus'] : ['Venus'], weight:1.0, hi:'विवाह',                 en:'Marriage' },
  child_birth:     { houses:[5,2,9,11], karaka:() => ['Jupiter'],            weight:1.0, hi:'संतान का जन्म',          en:'Birth of a child' },
  job_start:       { houses:[10,6,2,11], karaka:() => ['Saturn','Sun'],       weight:0.9, hi:'पहली नौकरी / काम शुरू',   en:'First job / career start' },
  promotion:       { houses:[10,11,2], karaka:() => ['Sun','Jupiter'],        weight:0.7, hi:'प्रमोशन / बड़ी तरक्की',   en:'Promotion / big career rise' },
  foreign_travel:  { houses:[12,9,3], karaka:() => ['Rahu','Saturn'],         weight:0.7, hi:'विदेश यात्रा / विदेश बसना', en:'Foreign travel / settling abroad' },
  property:        { houses:[4,11,2], karaka:() => ['Mars','Venus'],          weight:0.7, hi:'घर / जमीन खरीदना',        en:'Property purchase' },
  education:       { houses:[4,5,9], karaka:() => ['Mercury','Jupiter'],      weight:0.6, hi:'पढ़ाई पूरी / बड़ी डिग्री',  en:'Education milestone' },
  father_death:    { houses:[9,8,12], karaka:() => ['Sun','Saturn'],          weight:1.0, hi:'पिता का देहांत',          en:"Father's death" },
  mother_death:    { houses:[4,8,12], karaka:() => ['Moon','Saturn'],         weight:1.0, hi:'माता का देहांत',          en:"Mother's death" },
  accident_illness:{ houses:[6,8,12], karaka:() => ['Mars','Rahu','Saturn'],  weight:0.8, hi:'बड़ी दुर्घटना / गंभीर बीमारी', en:'Major accident / serious illness' },
  major_loss:      { houses:[12,8,6], karaka:() => ['Saturn','Rahu'],         weight:0.8, hi:'बड़ा आर्थिक नुकसान',       en:'Major financial loss' },
  separation:      { houses:[6,7,12], karaka:() => ['Mars','Rahu','Ketu','Saturn'], weight:0.8, hi:'अलगाव / तलाक',       en:'Separation / divorce' },
};

export const PART_OF_DAY = {
  subah:  [['04:00','11:59']],
  dopahar:[['12:00','16:59']],
  shaam:  [['17:00','20:59']],
  raat:   [['21:00','23:59'], ['00:00','03:59']],
};

function toMin(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function fromMin(min) { return `${String(Math.floor(min / 60)).padStart(2,'0')}:${String(min % 60).padStart(2,'0')}`; }

async function scanService(dob, lat, lng, ayanamsa, tzOffset, start, end, step) {
  const url = process.env.EPHEMERIS_SERVICE_URL;
  if (!url) throw new Error('EPHEMERIS_SERVICE_URL not configured — rectification needs the pyswisseph service');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 70000); // covers a Render cold start (30-50s)
  try {
    const res = await fetch(url.replace(/\/$/, '') + '/rectify-scan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ dob, lat, lng, ayanamsa, tz_offset: tzOffset, start, end, step_min: step }),
    });
    if (!res.ok) throw new Error('Ephemeris /rectify-scan responded ' + res.status + ' — deploy the updated main.py to Render');
    const data = await res.json();
    if (!Array.isArray(data.candidates)) throw new Error('Bad /rectify-scan response');
    return data.candidates;
  } finally { clearTimeout(timer); }
}

// calcVimshottari returns period boundaries as 'YYYY-MM-DD' strings, which
// compare correctly as plain strings — no Date math needed.
function findDashaAt(dasha, dateStr) {
  for (const md of dasha.mahadashas) {
    if (dateStr >= md.start && dateStr < md.end) {
      for (const ad of md.antarDashas) {
        if (dateStr >= ad.start && dateStr < ad.end) return { md: md.lord, ad: ad.lord };
      }
      return { md: md.lord, ad: md.lord };
    }
  }
  return null;
}

// Weight of each planet as a significator of this event, for a given Lagna.
function significatorWeights(lagnaIdx, occupantsBySign, cfg, gender) {
  const w = {};
  const add = (pl, x) => { w[pl] = Math.min(3, (w[pl] || 0) + x); };
  cfg.houses.forEach((h, i) => {
    const sign = SIGNS[(lagnaIdx + h - 1) % 12];
    add(SIGN_LORD[sign], i === 0 ? 3 : 2);
    if (i === 0) for (const pl of (occupantsBySign[sign] || [])) add(pl, 2);
  });
  for (const k of cfg.karaka(gender)) add(k, 1.5);
  return w;
}

function scoreEventAt(dasha, eventDateStr, weights) {
  const at = findDashaAt(dasha, eventDateStr);
  if (!at) return { norm: 0, md: null, ad: null };
  const wMD = weights[at.md] || 0;
  const wAD = weights[at.ad] || 0;
  let raw = 0.4 * wMD + 0.6 * wAD;      // antardasha is the closer trigger
  if (wMD > 0 && wAD > 0) raw *= 1.25;  // both levels connected = strongest
  return { norm: Math.min(1, raw / 2.5), md: at.md, ad: at.ad };
}

const MATCH_THRESHOLD = 0.4;

function evaluateCandidates(candidates, ctx) {
  const { dob, events, otherPlanetSigns, gender } = ctx;
  const wCache = new Map();
  const evalList = events.map(e => ({ ...e, cfg: EVENT_TYPES[e.type] }));
  const totalW = evalList.reduce((s, e) => s + e.cfg.weight, 0) || 1;

  return candidates.map(c => {
    const lagnaIdx = Math.floor(c.lagna / 30) % 12;
    const moonSign = SIGNS[Math.floor(c.moon / 30) % 12];
    const occupants = {};
    for (const [pl, sign] of Object.entries(otherPlanetSigns)) (occupants[sign] ||= []).push(pl);
    (occupants[moonSign] ||= []).push('Moon');

    const dasha = calcVimshottari(c.moon, dob);
    let weighted = 0;
    const per = evalList.map(e => {
      const key = `${lagnaIdx}|${moonSign}|${e.type}`;
      let weights = wCache.get(key);
      if (!weights) { weights = significatorWeights(lagnaIdx, occupants, e.cfg, gender); wCache.set(key, weights); }
      const r = scoreEventAt(dasha, e.date, weights);
      weighted += e.cfg.weight * r.norm;
      return { type: e.type, date: e.date, matched: r.norm >= MATCH_THRESHOLD, md: r.md, ad: r.ad, fit: Math.round(r.norm * 100) };
    });
    return {
      t: c.t, lagnaIdx, lagna: c.lagna,
      score: Math.round((weighted / totalW) * 1000) / 10, // 0-100, 1 decimal
      mask: per.map(p => (p.matched ? '1' : '0')).join(''),
      per,
    };
  });
}

function groupWindows(scored, step) {
  const runs = [];
  for (const c of scored) {
    const last = runs[runs.length - 1];
    if (last && last.lagnaIdx === c.lagnaIdx && last.mask === c.mask) { last.items.push(c); }
    else runs.push({ lagnaIdx: c.lagnaIdx, mask: c.mask, items: [c] });
  }
  return runs.map(r => {
    const first = r.items[0], lastI = r.items[r.items.length - 1];
    const mid = r.items[Math.floor(r.items.length / 2)];
    const startMin = toMin(first.t), endMin = Math.min(24 * 60 - 1, toMin(lastI.t) + step - 1);
    return {
      start: fromMin(startMin), end: fromMin(endMin), mid: mid.t,
      lagna: SIGNS[r.lagnaIdx], lagna_hi: SIGNS_HI[r.lagnaIdx],
      score: Math.round((r.items.reduce((s, x) => s + x.score, 0) / r.items.length) * 10) / 10,
      matched_count: r.mask.split('').filter(x => x === '1').length,
      events: mid.per,
      minutes: endMin - startMin + 1,
    };
  });
}

// ── Public API ────────────────────────────────────────────────
// kundli: { dob, latitude, longitude, ayanamsa, gender, birth_time }
// events: [{ type, date: 'YYYY-MM-DD' }]
// window: { mode: 'range'|'part'|'unknown', start?, end?, part? }
export async function rectifyBirthTime(kundli, events, window) {
  const { dob, latitude: lat, longitude: lng } = kundli;
  const ayanamsa = kundli.ayanamsa || 'lahiri';
  const gender = kundli.gender || null;

  // Which HH:MM ranges to scan
  let ranges;
  if (window?.mode === 'part' && PART_OF_DAY[window.part]) ranges = PART_OF_DAY[window.part];
  else if (window?.mode === 'range' && window.start && window.end) ranges = [[window.start, window.end]];
  else ranges = [['00:00', '23:59']];

  const totalMins = ranges.reduce((s, [a, b]) => s + (toMin(b) - toMin(a) + 1), 0);
  const step = totalMins > 720 ? 3 : 2;

  const istOffset = getBirthUtcOffsetHours(dob, lat, lng);
  const lmtOffset = lng / 15;

  // Non-Moon planets barely move in a day — fetch once at the window midpoint.
  const midMin = Math.floor((toMin(ranges[0][0]) + toMin(ranges[ranges.length - 1][1])) / 2) % (24 * 60);
  const pos = await getPlanetPositions(dob, fromMin(midMin), lat, lng, ayanamsa, true);
  const otherPlanetSigns = {};
  for (const p of pos.planets) if (p.name !== 'Moon') otherPlanetSigns[p.name] = p.sign;

  const ctx = { dob, events, otherPlanetSigns, gender };

  async function scanAll(offset) {
    let all = [];
    for (const [a, b] of ranges) all = all.concat(await scanService(dob, lat, lng, ayanamsa, offset, a, b, step));
    return all;
  }

  const candidates = await scanAll(istOffset);
  if (candidates.length === 0) throw new Error('Scan returned no candidates');
  const scored = evaluateCandidates(candidates, ctx);

  // Windows
  let windows = groupWindows(scored, step).filter(w => w.matched_count >= 1);
  windows.sort((a, b) => b.score - a.score || b.minutes - a.minutes);
  const bestScore = windows[0]?.score ?? 0;
  const top = windows.filter(w => w.score >= Math.max(25, bestScore * 0.6)).slice(0, 6);

  // Best score per Lagna (the "Lagna-level answer" for unknown-time cases)
  const byLagnaMap = {};
  for (const c of scored) {
    const cur = byLagnaMap[c.lagnaIdx];
    if (!cur || c.score > cur.score) byLagnaMap[c.lagnaIdx] = { lagna: SIGNS[c.lagnaIdx], lagna_hi: SIGNS_HI[c.lagnaIdx], score: c.score };
    const r = byLagnaMap[c.lagnaIdx];
    r.from = r.from && r.from < c.t ? r.from : c.t;
    r.to = r.to && r.to > c.t ? r.to : c.t;
  }
  const by_lagna = Object.values(byLagnaMap).sort((a, b) => b.score - a.score).slice(0, 4);

  // Confidence — honest, and capped by how much evidence there is
  const nEvents = events.length;
  const otherLagnaBest = top.find(w => w.lagna !== top[0]?.lagna)?.score ?? 0;
  const gap = bestScore - otherLagnaBest;
  let confidence = 'low', reason;
  if (nEvents < 3) reason = 'Bahut kam events — kam se kam 3-5 dijiye / Too few events (need 3-5+)';
  else if (bestScore >= 70 && gap >= 12 && nEvents >= 4) { confidence = 'high'; reason = 'Ek Lagna clearly aage hai / One Lagna is clearly ahead'; }
  else if (bestScore >= 55 && gap >= 6) { confidence = 'medium'; reason = 'Ek Lagna aage hai, par fark chhota hai / A leading Lagna, but the margin is modest'; }
  else reason = 'Kai windows lagbhag barabar fit hain — user ka judgement zaroori / Several windows fit about equally — your judgement matters';

  // Was the time the user typed probably LMT (e.g. copied from an old handwritten
  // janam-patri) rather than IST clock time? Comparing the BEST score of two full
  // scans would be meaningless (both cover the same set of charts, just shifted),
  // so instead score the exact time they gave under each interpretation.
  let lmt_check = null;
  const stated = kundli.birth_time && kundli.birth_time_source !== 'unknown' ? String(kundli.birth_time).slice(0, 5) : null;
  if (stated && /^\d{2}:\d{2}$/.test(stated) && Math.abs(istOffset - lmtOffset) > 0.05) {
    try {
      const [istPt] = evaluateCandidates(await scanService(dob, lat, lng, ayanamsa, istOffset, stated, stated, 1), ctx);
      const [lmtPt] = evaluateCandidates(await scanService(dob, lat, lng, ayanamsa, lmtOffset, stated, stated, 1), ctx);
      if (istPt && lmtPt) lmt_check = { stated_time: stated, as_ist: istPt.score, as_lmt: lmtPt.score, lmt_fits_better: lmtPt.score >= istPt.score + 12 };
    } catch (e) { lmt_check = { error: e.message }; }
  }

  return {
    basis: Math.abs(istOffset - lmtOffset) > 0.05 ? 'IST' : 'LMT',
    scanned: scored.length, step_min: step,
    window: window?.mode || 'unknown',
    confidence, confidence_reason: reason,
    by_lagna, windows: top, lmt_check,
    events_used: events.length,
    note: 'Dasha-based fit only (transits not used). Evidence for narrowing the time, not proof.',
  };
}

export function validateEvents(events, dob) {
  if (!Array.isArray(events)) return 'events must be a list';
  const clean = [];
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set();
  for (const e of events) {
    if (!e || !EVENT_TYPES[e.type]) return `Unknown event type: ${e?.type}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) return 'Each event needs a valid date';
    if (e.date <= dob) return 'Event date must be after the birth date';
    if (e.date > today) return 'Event date cannot be in the future';
    const k = e.type + e.date;
    if (seen.has(k)) continue;
    seen.add(k);
    clean.push({ type: e.type, date: e.date });
  }
  if (clean.length > 12) return 'Maximum 12 events';
  return { events: clean };
}

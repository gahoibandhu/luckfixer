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
// What it uses: Lagna sign (via the pyswisseph /rectify-scan endpoint), the Moon's
// exact degree (which shifts the whole dasha timeline ~0.75 yr per hour of
// birth-time change) AND — new — TRANSIT TRIGGERS: where Jupiter/Saturn (for
// favourable events) or Saturn/Mars/Rahu (for hard events) were on the event date,
// and whether they touched that event's houses counted from each candidate Lagna.
// Transits depend on the Lagna SIGN only, so they separate Lagnas that the dasha
// alone can't — the main weakness of dasha-only rectification. A leave-one-out
// stability check also guards against a single wrong/misremembered event.
// It is evidence-based narrowing, not proof — confidence is reported honestly.

import { calcVimshottari } from './vimshottari';
import { getPlanetPositions, getBirthUtcOffsetHours } from './astro-facts';

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGNS_HI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];
const SIGN_LORD = { Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon', Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars', Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter' };

// houses: relevant houses (first = primary). karaka: natural significators.
// lookbackDays: the typed date is the LAST step of a process that began earlier (property: booking ->
// agreement -> registry takes 2-6 months), so the event is scored on its BEST fit across
// [date - lookbackDays, date] instead of on that single day.
export const EVENT_TYPES = {
  marriage:        { houses:[7,2,11], karaka:(g) => g === 'female' ? ['Jupiter','Venus'] : ['Venus'], weight:1.0, hi:'विवाह',                 en:'Marriage' },
  child_birth:     { houses:[5,2,9,11], karaka:() => ['Jupiter'],            weight:1.0, hi:'संतान का जन्म',          en:'Birth of a child' },
  job_start:       { houses:[10,6,2,11], karaka:() => ['Saturn','Sun'],       weight:0.9, hi:'पहली नौकरी / काम शुरू',   en:'First job / career start' },
  promotion:       { houses:[10,11,2], karaka:() => ['Sun','Jupiter'],        weight:0.7, hi:'प्रमोशन / बड़ी तरक्की',   en:'Promotion / big career rise' },
  foreign_travel:  { houses:[12,9,3], karaka:() => ['Rahu','Saturn'],         weight:0.7, hi:'विदेश यात्रा / विदेश बसना', en:'Foreign travel / settling abroad' },
  property:        { houses:[4,11,2], karaka:() => ['Mars','Venus'],          weight:0.7, lookbackDays:180, hi:'घर / जमीन खरीदना',        en:'Property purchase' },
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

// ── Transit triggers ─────────────────────────────────────────────────────
// Signs a transiting planet influences = the sign it sits in + the signs it
// aspects (offsets counted from its own sign: 7th = +6, Jupiter/Rahu also 5th +4
// and 9th +8, Saturn also 3rd +2 and 10th +9, Mars also 4th +3 and 8th +7).
const ASPECT_OFFSETS = {
  Jupiter: [0, 4, 6, 8], Rahu: [0, 4, 6, 8], Ketu: [0, 4, 6, 8],
  Saturn:  [0, 2, 6, 9], Mars: [0, 3, 6, 7],
};
const POSITIVE_TRANSITERS = ['Jupiter', 'Saturn'];     // "double transit" for favourable events
const HARD_TRANSITERS     = ['Saturn', 'Mars', 'Rahu'];  // for losses / illness / separation
const HARD_EVENTS = new Set(['father_death', 'mother_death', 'accident_illness', 'major_loss', 'separation']);

function influencedSigns(planet, signIdx) {
  return new Set((ASPECT_OFFSETS[planet] || [0, 6]).map(o => (signIdx + o) % 12));
}

// transitSigns: { Jupiter: signIdx, Saturn: signIdx, ... } on the event date.
// Returns 0..1 — how strongly the transits touch this event's houses for this Lagna.
function transitFit(lagnaIdx, cfg, eventType, transitSigns) {
  const planets = HARD_EVENTS.has(eventType) ? HARD_TRANSITERS : POSITIVE_TRANSITERS;
  const primarySign = (lagnaIdx + cfg.houses[0] - 1) % 12;
  const otherSigns = cfg.houses.slice(1).map(h => (lagnaIdx + h - 1) % 12);
  let total = 0, counted = 0;
  for (const pl of planets) {
    const idx = transitSigns[pl];
    if (idx === undefined) continue;
    counted++;
    const infl = influencedSigns(pl, idx);
    if (infl.has(primarySign)) total += 1;
    else if (otherSigns.some(sg => infl.has(sg))) total += 0.5;
  }
  if (counted === 0) return null; // no transit data for this date -> don't penalise or reward
  const norm = HARD_EVENTS.has(eventType) ? Math.min(1, total / 2) : total / counted;
  // Both slow planets on the primary house together ("double transit") is the classical trigger
  return norm;
}

// Transit blending is OPT-IN (env RECTIFY_TRANSITS=1). It is astrologically standard but
// was NOT shown to help on the first real test case (see scripts/rectify-eval.mjs), so it
// stays off until enough confirmed birth times exist to validate it.
const USE_TRANSITS = process.env.RECTIFY_TRANSITS === '1';
const DASHA_SHARE = 0.65;   // dasha evidence
const TRANSIT_SHARE = 0.35; // transit evidence

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Best dasha fit over the event's look-back window (sampled every 30 days, plus the typed date).
function scoreEventWindow(dasha, eventDateStr, weights, lookbackDays) {
  let best = scoreEventAt(dasha, eventDateStr, weights);
  best = { ...best, at: eventDateStr };
  for (let back = 30; back <= (lookbackDays || 0); back += 30) {
    const d = shiftDate(eventDateStr, -back);
    const r = scoreEventAt(dasha, d, weights);
    if (r.norm > best.norm) best = { ...r, at: d };
  }
  return best;
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
  const { dob, events, otherPlanetSigns, gender, transitByEvent } = ctx;
  const wCache = new Map();
  const tCache = new Map();
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
      const r = scoreEventWindow(dasha, e.date, weights, e.cfg.lookbackDays);
      // Transit trigger depends on the Lagna sign only -> cache per (lagna, event)
      const tKey = `${lagnaIdx}|${e.type}|${e.date}`;
      let tFit = tCache.get(tKey);
      if (tFit === undefined) {
        tFit = transitByEvent ? transitFit(lagnaIdx, e.cfg, e.type, transitByEvent[e.date] || {}) : null;
        tCache.set(tKey, tFit);
      }
      const combined = tFit === null ? r.norm : DASHA_SHARE * r.norm + TRANSIT_SHARE * tFit;
      weighted += e.cfg.weight * combined;
      return {
        type: e.type, date: e.date, matched: combined >= MATCH_THRESHOLD, md: r.md, ad: r.ad,
        fit: Math.round(combined * 100), dasha_fit: Math.round(r.norm * 100), fit_date: r.at,
        transit_fit: tFit === null ? null : Math.round(tFit * 100),
      };
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

  // Jupiter / Saturn / Mars / Rahu sign on each event date (noon is fine — only the
  // SIGN matters and these move slowly). Fetched in parallel; if the service can't
  // answer for a date we simply skip transit scoring for that event.
  const transitByEvent = {};
  const uniqueDates = USE_TRANSITS ? [...new Set(events.map(e => e.date))] : [];
  await Promise.all(uniqueDates.map(async d => {
    try {
      const tp = await getPlanetPositions(d, '12:00', lat, lng, ayanamsa, true);
      const m = {};
      for (const p of tp.planets) if (['Jupiter', 'Saturn', 'Mars', 'Rahu'].includes(p.name)) m[p.name] = SIGNS.indexOf(p.sign);
      if (Object.values(m).every(v => v >= 0)) transitByEvent[d] = m;
    } catch (e) { console.warn('[Rectify] transit lookup failed for', d, e.message); }
  }));
  const transitEvents = events.filter(e => transitByEvent[e.date]).length;

  const ctx = { dob, events, otherPlanetSigns, gender, transitByEvent: USE_TRANSITS ? transitByEvent : null };

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
  // Shortlist of POSSIBLE birth times: the best window of each of the 3 best-fitting Lagnas.
  // With 4-5 events several Lagnas fit almost equally, so we offer the shortlist (each with the
  // events it explains) instead of pretending there is one answer.
  const suggestions = [];
  const seenLagna = new Set();
  for (const w of windows) {
    if (seenLagna.has(w.lagna)) continue;
    seenLagna.add(w.lagna);
    suggestions.push({ ...w, rank: suggestions.length + 1 });
    if (suggestions.length === 3) break;
  }
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
  const lagna_ranking = Object.values(byLagnaMap).sort((a, b) => b.score - a.score).map(x => ({ lagna: x.lagna, score: x.score })); // all Lagnas in the scanned window
  const by_lagna = Object.values(byLagnaMap).sort((a, b) => b.score - a.score).slice(0, 4);

  // Confidence — honest, and capped by how much evidence there is
  const nEvents = events.length;
  const otherLagnaBest = top.find(w => w.lagna !== top[0]?.lagna)?.score ?? 0;
  const gap = bestScore - otherLagnaBest;
  // Leave-one-out stability: drop each event in turn; does the same Lagna still win?
  // A single misremembered date should not be able to flip the answer.
  let stability = null;
  if (nEvents >= 3 && top.length) {
    const wts = events.map(e => EVENT_TYPES[e.type].weight);
    const topLagnaIdx = SIGNS.indexOf(top[0].lagna);
    let same = 0;
    for (let k = 0; k < nEvents; k++) {
      const denom = wts.reduce((s, w, i) => (i === k ? s : s + w), 0) || 1;
      let bestIdx = -1, bestVal = -1;
      for (const c of scored) {
        let v = 0;
        for (let i = 0; i < nEvents; i++) if (i !== k) v += wts[i] * (c.per[i].fit / 100);
        v /= denom;
        if (v > bestVal) { bestVal = v; bestIdx = c.lagnaIdx; }
      }
      if (bestIdx === topLagnaIdx) same++;
    }
    stability = Math.round((same / nEvents) * 100) / 100;
  }

  // Calibration lesson (first real test case, 4 events): with only 3-4 events several
  // Lagnas fit "perfectly" by chance, and a WRONG window can look medium-confident. So
  // the evidence bar scales with the number of events, not just the score gap.
  let confidence = 'low', reason;
  if (nEvents < 5) reason = nEvents < 3
    ? 'Bahut kam events — kam se kam 5-6 dijiye / Too few events (need 5-6+)'
    : `${nEvents} events se sirf andaaza milta hai — 5-6+ dijiye (mata-pita ka dehant, shiksha, naukri bhi) / ${nEvents} events give only an indication — add 5-6+ (parent's death, education, first job too)`;
  else if (bestScore >= 70 && gap >= 12 && nEvents >= 7 && (stability === null || stability >= 0.85)) { confidence = 'high'; reason = 'Ek Lagna clearly aage hai / One Lagna is clearly ahead'; }
  else if (bestScore >= 55 && gap >= 6 && (stability === null || stability >= 0.75)) { confidence = 'medium'; reason = 'Ek Lagna aage hai, par fark chhota hai / A leading Lagna, but the margin is modest'; }
  else reason = 'Kai windows lagbhag barabar fit hain — user ka judgement zaroori / Several windows fit about equally — your judgement matters';
  // One shaky event shouldn't carry a "high": downgrade when the winner isn't stable.
  if (stability !== null && stability < 0.67 && confidence !== 'low') {
    confidence = confidence === 'high' ? 'medium' : 'low';
    reason += ' · Ek event hatane par result badal jata hai — events dobara check karein / The result flips if one event is removed — double-check your dates';
  }

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

  // The time currently on the kundli, scored against the same events — so the shortlist can say
  // "your recorded time matches 3/5 events, Lagna ranks #2" next to the suggestions.
  let current_time = null;
  if (stated && /^\d{2}:\d{2}$/.test(stated)) {
    try {
      const [pt] = evaluateCandidates(await scanService(dob, lat, lng, ayanamsa, istOffset, stated, stated, 1), ctx);
      if (pt) {
        const lagnaName = SIGNS[pt.lagnaIdx];
        const rk = lagna_ranking.findIndex(l => l.lagna === lagnaName) + 1;
        current_time = {
          time: stated, lagna: lagnaName, lagna_hi: SIGNS_HI[pt.lagnaIdx], score: pt.score,
          matched_count: pt.mask.split('').filter(x => x === '1').length, rank: rk || null,
          lagna_count: lagna_ranking.length,
        };
      }
    } catch (e) { console.warn('[Rectify] current-time check failed:', e.message); }
  }

  return {
    basis: Math.abs(istOffset - lmtOffset) > 0.05 ? 'IST' : 'LMT',
    scanned: scored.length, step_min: step,
    window: window?.mode || 'unknown',
    confidence, confidence_reason: reason, stability,
    transit_events: transitEvents,
    by_lagna, lagna_ranking, windows: top, suggestions, current_time, lmt_check,
    events_used: events.length,
    note: 'Dasha + Jupiter/Saturn transit fit. Evidence for narrowing the time, not proof.',
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
    // Age sanity — a typo'd year (e.g. 1990 for 2009) silently ruins a scan.
    const ageYears = (new Date(e.date) - new Date(dob)) / (365.25 * 24 * 3600 * 1000);
    const minAge = { marriage: 15, child_birth: 15, job_start: 12, promotion: 15, property: 16 }[e.type];
    if (minAge && ageYears < minAge) return `${EVENT_TYPES[e.type].en}: date implies age ${ageYears.toFixed(1)} — please check the year / Is saal ke hisaab se umar bahut kam aati hai`;
    const k = e.type + e.date;
    if (seen.has(k)) continue;
    seen.add(k);
    clean.push({ type: e.type, date: e.date });
  }
  if (clean.length > 12) return 'Maximum 12 events';
  return { events: clean };
}

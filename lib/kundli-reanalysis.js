// lib/kundli-reanalysis.js
//
// The full "re-run the deterministic pipeline + AI narrative for an
// EXISTING kundli row" logic, extracted out of app/api/kundli/route.js
// so it has exactly ONE implementation. Both the user-facing
// PATCH /api/kundli route and the admin-facing
// POST /api/admin/kundlis/reanalyze route call this — previously this
// logic only existed inline in the user route, so an admin-side
// re-analyze capability would have meant copy-pasting ~60 lines and
// risking the two silently drifting apart over time (e.g. one route
// picking up a new factSheet field and the other not). This is the
// single source of truth now.
//
// Does NOT do auth/ownership checks — callers are responsible for
// verifying the caller may act on this kundli before calling this.

import { getLuckfixerResponse } from './ai-engine';
import { getBotDisplayName } from './app-config';
import { buildFactSheet, EphemerisUnavailableError } from './astro-facts';
import { buildNumerologySheet } from './numerology';
import { calcVimshottari } from './vimshottari';
import { buildSpecialistInsights } from './specialist-rules';
import { buildTransitReport } from './transit';
import { buildJaiminiSheet, crossValidate } from './jaimini';
import { detectYogas } from './yogas';
import { attachDoshaRemedies } from './remedy-plan';
import { buildAshtakavarga } from './ashtakavarga';
import { buildNakshatraSheet } from './nakshatra';
import { buildVarshaphal } from './varshaphal';
import { buildGocharPhalTimeline, buildAnnualTransitPeriods } from './gochar-phal';
import { buildSaptahikPhal } from './saptahik-phal';
import {
  buildCoreSystemPrompt, buildCoreUserPrompt,
  buildLifeDomainsSystemPrompt, buildLifeDomainsUserPrompt,
  buildAnnualTimelineSystemPrompt, buildAnnualTimelineUserPrompt,
} from './kundli-analysis-prompt';
import { createClient } from '@supabase/supabase-js';
import { getDashaAccuracyStat, getYogaAccuracyStat, getRemedyOutcomeCorrelation } from './outcome-tracking';
import { RAM_SHALAKA_ANSWERS } from './ram-shalaka';

export { EphemerisUnavailableError };

// When the birth time isn't exact (user unsure / doesn't know / rectified by
// estimate), tell the AI so it doesn't narrate Lagna- and house-based details
// with false certainty. The factSheet is JSON-stringified into every prompt,
// so a field here reaches all of them.
function attachBirthTimeNote(factSheet, source) {
  if (!source || source === 'exact') return;
  const base = {
    unknown: 'Birth time is UNKNOWN (12:00 is only a placeholder). Lagna, house placements, house lords, divisional charts and anything Lagna-dependent are PROVISIONAL — do not state them as fact. Moon-, Nakshatra- and dasha-based statements are still reliable. Mention once, briefly, that confirming the birth time (Birth-time confirmation feature) will make the reading more accurate.',
    approx: 'Birth time is APPROXIMATE. Lagna-dependent statements may be off; phrase house/Lagna-based points with appropriate hedging and suggest confirming the birth time.',
    rectified: 'Birth time was ESTIMATED by rectification from the user\'s life events (not a recorded time). Treat Lagna-dependent points as likely rather than certain.',
  };
  factSheet.birthTimeReliability = { source, instruction: base[source] || base.approx };
}



// ── "Prediction brain" feedback loop, extended to the FIRST reading ──
// migration_014/021 built site-wide accuracy stats (dasha-context and
// key-yoga level) from real outcome_tracking data, and the stated goal
// was always to "weight future predictions by historical accuracy" —
// but that only ever reached follow-up CHAT messages (see
// getDashaAccuracyStat's call site in app/api/chat/route.js). The very
// first reading someone gets at kundli-creation/reanalysis time — the
// one most likely to shape whether they trust the product at all —
// never saw any of this learned data. This closes that gap: same
// honesty-gated framing (a real aggregate, never a personal
// guarantee, and always below the minimum-sample threshold checked
// inside each getter), just applied one step earlier.
async function buildSystemPromptWithLearnedPatterns(yogas, factSheet) {
  const basePrompt = buildCoreSystemPrompt(await getBotDisplayName());

  // Read-only aggregate views — a service-role client is simplest here
  // since this function has no cookie-scoped client available (it's
  // shared by both the user-facing and admin-facing callers).
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const patternNotes = [];

  try {
    const topYogaName = yogas?.find(y => y.strength === 'high')?.name || yogas?.[0]?.name;
    const yogaStat = await getYogaAccuracyStat(supabase, topYogaName);
    if (yogaStat) {
      patternNotes.push(`${topYogaName}: humare data mein is yoga wale ${yogaStat.responded} tracked predictions me se ${yogaStat.positive} confirm hue hain (~${yogaStat.positivePct}%).`);
    }
  } catch (e) {
    console.warn('[KundliAnalysis] getYogaAccuracyStat failed (non-fatal):', e.message);
  }

  try {
    const dashaCtx = factSheet.currentDashaLordHint;
    if (dashaCtx) {
      const dashaStat = await getDashaAccuracyStat(supabase, 'career', dashaCtx);
      if (dashaStat) {
        patternNotes.push(`Dasha (${dashaCtx}): career-related tracked predictions me se ${dashaStat.positive}/${dashaStat.responded} confirm hue hain (~${dashaStat.positivePct}%).`);
      }
    }
  } catch (e) {
    console.warn('[KundliAnalysis] getDashaAccuracyStat failed (non-fatal):', e.message);
  }

  try {
    const corr = await getRemedyOutcomeCorrelation(supabase);
    if (corr) {
      patternNotes.push(`Remedy follow-through: jinhone suggested upaay poora kiya unme ${corr.tookRemedy.positivePct}% predicted outcome confirm hua, jabki jinhone nahi kiya unme ${corr.noRemedy.positivePct}%.`);
    }
  } catch (e) {
    console.warn('[KundliAnalysis] getRemedyOutcomeCorrelation failed (non-fatal):', e.message);
  }

  if (patternNotes.length === 0) return basePrompt;

  return basePrompt + `\n\n[SITE-WIDE LEARNED PATTERNS — real aggregates from tracked outcome data across all users, use ONLY where it fits naturally, NEVER as a guarantee for this specific person]\n${patternNotes.join('\n')}\nThese are observed patterns, not causation and not individual promises — weave in at most one, only if it genuinely strengthens a point you're already making, and always keep the honest/humble framing (e.g. "hamare data mein aksar dekha gaya hai ki...").`;
}

// ── Fires the 3 analysis pieces (core / life_domains / annual_timeline)
// in PARALLEL and merges them into one `content` object with the exact
// same shape the rest of the app already expects (planet_data.analysis)
// — nothing downstream (predictions_log, remedy-tracking, admin panel,
// chat context, migrate-life-domains's `!k.life_domains` check) needs
// to change. A piece that fails does NOT fail the others — its keys
// are simply left out of the merged object, so the existing "remaining"
// check in migrate-life-domains/route.js already treats it correctly
// as "still needs backfill" without any special-casing here. The
// caller shows a single "analysing your report, please wait" state for
// the whole duration (per product decision) — this function only
// returns once all 3 have settled, it doesn't stream partial results.
async function runAnalysisPieces({ full_name, dob, birth_time, birth_place, ayanamsa, gender, factSheet, numerology, vimshottari, specialist, jaimini, crossVal, yogas, ashtakavarga, nakshatra, varshaphal, gocharPhal, annualTransitPeriods, transit }) {
  const coreSystemPrompt = await buildSystemPromptWithLearnedPatterns(yogas, factSheet);
  const botName = await getBotDisplayName();

  const pieces = [
    {
      key: 'core',
      system: coreSystemPrompt,
      user: buildCoreUserPrompt({ full_name, dob, birth_time, birth_place, ayanamsa, factSheet, numerology, vimshottari, specialist, jaimini, crossVal, yogas, ashtakavarga, nakshatra, transit, gender }),
    },
    {
      key: 'life_domains',
      system: buildLifeDomainsSystemPrompt(botName),
      user: buildLifeDomainsUserPrompt({ full_name, dob, birth_time, birth_place, ayanamsa, factSheet, gender }),
    },
    {
      key: 'annual_timeline',
      system: buildAnnualTimelineSystemPrompt(botName),
      user: buildAnnualTimelineUserPrompt({ full_name, dob, birth_time, birth_place, ayanamsa, factSheet, yogas, varshaphal, gocharPhal, annualTransitPeriods }),
    },
  ];

  const settled = await Promise.allSettled(
    pieces.map(p => getLuckfixerResponse(p.system, p.user, true))
  );

  const content = {};
  const models = {};
  const pieceErrors = {};
  let fallbackUsed = false;

  settled.forEach((outcome, i) => {
    const key = pieces[i].key;
    // getLuckfixerResponse itself never rejects — on total provider
    // exhaustion it resolves with model: 'fallback' and a placeholder
    // content object (see ai-engine.js) — so a piece only reaches the
    // 'rejected' branch on a genuine unexpected throw. Either way, a
    // fallback/rejected piece contributes NO keys to `content`, so
    // those fields stay absent rather than getting saved with fake
    // placeholder text — same "no fabricated data" rule as before,
    // just scoped per-piece now instead of all-or-nothing.
    if (outcome.status === 'fulfilled' && outcome.value.model !== 'fallback') {
      Object.assign(content, outcome.value.content);
      models[key] = outcome.value.model;
      if (outcome.value.fallback_used) fallbackUsed = true;
    } else {
      const reason = outcome.status === 'fulfilled'
        ? (outcome.value.errors || []).map(e => `${e.model}: ${e.error}`.slice(0, 100)).join(' | ')
        : outcome.reason?.message;
      pieceErrors[key] = reason || 'Unknown error';
      fallbackUsed = true;
    }
  });

  return { content, models, pieceErrors, fallback_used: fallbackUsed };
}

// ── Selective regeneration — used by admin migration (and could be
// used for a future "just refresh my life_domains" user action) to
// backfill only the specific missing piece(s) for an existing kundli,
// instead of re-running (and re-spending AI budget/risk on) sections
// that already succeeded. Reuses the same deterministic pipeline as
// runFullReAnalysis (needed as prompt input regardless of which
// piece(s) are requested — it's free/fast, only the AI calls are
// costly) but only fires getLuckfixerResponse for `piecesNeeded`, then
// merges the new piece(s) into the kundli's EXISTING analysis object
// rather than replacing it wholesale — so a life_domains-only backfill
// can never wipe out a perfectly good annual_timeline (or vice versa).
export async function runSelectiveAnalysis(existingRow, piecesNeeded) {
  const { full_name, dob, birth_time, birth_place, latitude, longitude, ayanamsa, gender } = existingRow;
  const existingAnalysis = existingRow.planet_data?.analysis || {};

  const factSheet = await buildFactSheet(dob, birth_time, latitude, longitude, ayanamsa);
  attachBirthTimeNote(factSheet, existingRow.birth_time_source);
  const numerology = buildNumerologySheet(full_name, dob);
  const moon = factSheet.planets.find(p => p.name === 'Moon');
  const vimshottari = moon ? calcVimshottari(moon.degree, dob) : null;
  const specialist  = buildSpecialistInsights(factSheet, vimshottari);
  const transit     = await buildTransitReport(factSheet, latitude, longitude).catch(() => null);
  const jaimini     = buildJaiminiSheet(factSheet.planets, factSheet.lagna?.sign, factSheet.d9Chart, dob);
  const crossVal    = crossValidate(jaimini, factSheet);
  const yogas       = attachDoshaRemedies(detectYogas(factSheet.planets, factSheet.lagna?.sign, factSheet.houseLords, factSheet.d9Chart));
  const ashtakavarga = buildAshtakavarga(factSheet.planets, factSheet.lagna?.sign);
  const nakshatra   = buildNakshatraSheet(factSheet.planets, factSheet.lagna?.sign);
  const varshaphal  = buildVarshaphal(factSheet, dob);
  const gocharPhal  = buildGocharPhalTimeline(moon?.sign, ayanamsa);
  const annualTransitPeriods = buildAnnualTransitPeriods(moon?.sign, ayanamsa, varshaphal?.solarReturnDate);
  const saptahikPhal = buildSaptahikPhal(ayanamsa, factSheet?.weakestPlanet?.planet);

  const botName = await getBotDisplayName();
  const pieceDefs = {
    core: {
      system: await buildSystemPromptWithLearnedPatterns(yogas, factSheet),
      user: buildCoreUserPrompt({ full_name, dob, birth_time, birth_place, ayanamsa, factSheet, numerology, vimshottari, specialist, jaimini, crossVal, yogas, ashtakavarga, nakshatra, transit, gender }),
    },
    life_domains: {
      system: buildLifeDomainsSystemPrompt(botName),
      user: buildLifeDomainsUserPrompt({ full_name, dob, birth_time, birth_place, ayanamsa, factSheet, gender }),
    },
    annual_timeline: {
      system: buildAnnualTimelineSystemPrompt(botName),
      user: buildAnnualTimelineUserPrompt({ full_name, dob, birth_time, birth_place, ayanamsa, factSheet, yogas, varshaphal, gocharPhal, annualTransitPeriods }),
    },
  };

  const keysToRun = piecesNeeded.filter(k => pieceDefs[k]);
  const settled = await Promise.allSettled(
    keysToRun.map(k => getLuckfixerResponse(pieceDefs[k].system, pieceDefs[k].user, true))
  );

  const mergedContent = { ...existingAnalysis };
  const models = {};
  const pieceErrors = {};
  settled.forEach((outcome, i) => {
    const key = keysToRun[i];
    if (outcome.status === 'fulfilled' && outcome.value.model !== 'fallback') {
      Object.assign(mergedContent, outcome.value.content);
      models[key] = outcome.value.model;
    } else {
      const reason = outcome.status === 'fulfilled'
        ? (outcome.value.errors || []).map(e => `${e.model}: ${e.error}`.slice(0, 100)).join(' | ')
        : outcome.reason?.message;
      pieceErrors[key] = reason || 'Unknown error';
    }
  });

  // If nothing requested actually succeeded, don't write a no-op
  // "update" that overwrites factSheet/etc with freshly recomputed
  // (but identical) deterministic data for zero gain — let the caller
  // treat this as a clean failure and retry next batch.
  if (Object.keys(pieceErrors).length === keysToRun.length) {
    return { success: false, pieceErrors };
  }

  const score = mergedContent.metric_score || existingAnalysis.metric_score || 50;
  const matchingTone = score >= 60 ? 'shubh' : score >= 40 ? 'dhairya' : 'saavdhani';
  const allAnswers = Object.values(RAM_SHALAKA_ANSWERS);
  const versePool = allAnswers.filter(v => v.tone === matchingTone);
  const pool = versePool.length > 0 ? versePool : allAnswers;
  const hashSeed = `${full_name}${dob}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const picked = pool[hashSeed % pool.length];
  const closingVerse = { verse: picked.verse, source: `रामचरितमानस, ${picked.kand}` };

  return {
    success: true,
    pieceErrors,
    // Same "key:model, key:model" joined format runFullReAnalysis's
    // aiResult.model uses — lets callers log this to predictions_log
    // for the admin AI-usage dashboard (see lib/life-domains-backfill.js's
    // backfillOne) with the exact same parsing on the read side, instead
    // of background/backfill AI calls being invisible to that dashboard.
    model: Object.entries(models).map(([k, v]) => `${k}:${v}`).join(', ') || 'fallback',
    planet_data: {
      planets: factSheet.planets,
      factSheet, numerology, vimshottari, specialist, jaimini,
      crossValidation: crossVal, yogas, ashtakavarga, nakshatra, varshaphal,
      transitSnapshot: transit,
      gocharPhal, annualTransitPeriods, saptahikPhal,
      analysis: mergedContent,
      closingVerse,
    },
    luck_score: score,
    last_analysis: new Date().toISOString(),
  };
}

// existingRow: the full saved_kundlis row (full_name, dob, birth_time,
// latitude, longitude, ayanamsa, gender, birth_place, ...).
// Returns { planet_data, luck_score, last_analysis, aiResult } — the
// caller decides how to persist it (regular vs admin Supabase client).
// Throws EphemerisUnavailableError if real ephemeris data can't be
// obtained — callers should catch this specifically and surface a
// 503/retry rather than any other error.
export async function runFullReAnalysis(existingRow) {
  const { full_name, dob, birth_time, birth_place, latitude, longitude, ayanamsa, gender } = existingRow;

  const factSheet = await buildFactSheet(dob, birth_time, latitude, longitude, ayanamsa);
  attachBirthTimeNote(factSheet, existingRow.birth_time_source);

  const numerology = buildNumerologySheet(full_name, dob);
  const moon = factSheet.planets.find(p => p.name === 'Moon');
  const vimshottari = moon ? calcVimshottari(moon.degree, dob) : null;
  const specialist  = buildSpecialistInsights(factSheet, vimshottari);
  const transit     = await buildTransitReport(factSheet, latitude, longitude).catch(() => null);
  const jaimini     = buildJaiminiSheet(factSheet.planets, factSheet.lagna?.sign, factSheet.d9Chart, dob);
  const crossVal    = crossValidate(jaimini, factSheet);
  // attachDoshaRemedies adds a deterministic Hindi remedy line to any
  // challenging yoga/dosha (Mangal Dosh, Kaal Sarp, Pitru Dosh, Guru
  // Chandal, Kemadrum) — no-op for non-challenging yogas.
  const yogas       = attachDoshaRemedies(detectYogas(factSheet.planets, factSheet.lagna?.sign, factSheet.houseLords, factSheet.d9Chart));
  const ashtakavarga = buildAshtakavarga(factSheet.planets, factSheet.lagna?.sign);
  const nakshatra   = buildNakshatraSheet(factSheet.planets, factSheet.lagna?.sign);
  const varshaphal  = buildVarshaphal(factSheet, dob);
  const gocharPhal  = buildGocharPhalTimeline(moon?.sign, ayanamsa);
  const annualTransitPeriods = buildAnnualTransitPeriods(moon?.sign, ayanamsa, varshaphal?.solarReturnDate);
  const saptahikPhal = buildSaptahikPhal(ayanamsa, factSheet?.weakestPlanet?.planet);

  const { content, models, pieceErrors, fallback_used } = await runAnalysisPieces({
    full_name, dob, birth_time, birth_place, ayanamsa, gender,
    factSheet, numerology, vimshottari, specialist, jaimini, crossVal,
    yogas, ashtakavarga, nakshatra, varshaphal, gocharPhal, annualTransitPeriods, transit,
  });
  // `aiResult` keeps its old flat shape (content/model/fallback_used) so
  // every existing caller (predictions_log insert, remedy-tracking,
  // model_used column, admin AI-usage dashboard) works unchanged —
  // `model` becomes a small per-piece breakdown string instead of one
  // provider name, and `pieceErrors` is new/additive (empty object when
  // everything succeeded), so nothing that ignores it breaks.
  const aiResult = {
    content,
    model: Object.entries(models).map(([k, v]) => `${k}:${v}`).join(', ') || 'fallback',
    fallback_used,
    pieceErrors,
  };

  // ── Closing verse — deterministic, not AI-generated, so accuracy is
  // guaranteed. Picks a verified Ramcharitmanas chaupai (from the Ram
  // Shalaka answer set, lib/ram-shalaka.js) whose sentiment (shubh/
  // dhairya/saavdhani) matches this chart's overall tone, purely to
  // close the reading beautifully — never used as astrological
  // "evidence" for any claim.
  const score = aiResult.content.metric_score || 50;
  const matchingTone = score >= 60 ? 'shubh' : score >= 40 ? 'dhairya' : 'saavdhani';
  const allAnswers = Object.values(RAM_SHALAKA_ANSWERS);
  const versePool = allAnswers.filter(v => v.tone === matchingTone);
  const pool = versePool.length > 0 ? versePool : allAnswers;
  // Deterministic-but-varied pick: hash the person's name+dob so the same
  // chart always gets the same verse, but different charts likely differ.
  const hashSeed = `${full_name}${dob}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const picked = pool[hashSeed % pool.length];
  const closingVerse = { verse: picked.verse, source: `रामचरितमानस, ${picked.kand}` };

  return {
    planet_data: {
      planets: factSheet.planets,
      factSheet, numerology, vimshottari, specialist, jaimini,
      crossValidation: crossVal, yogas, ashtakavarga, nakshatra, varshaphal,
      transitSnapshot: transit,
      gocharPhal,
      annualTransitPeriods,
      saptahikPhal,
      analysis: aiResult.content,
      closingVerse,
    },
    luck_score: aiResult.content.metric_score || 50,
    last_analysis: new Date().toISOString(),
    aiResult,
  };
}

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
import { RAM_SHALAKA_ANSWERS } from './ram-shalaka';
import { buildAnalysisSystemPrompt, buildAnalysisUserPrompt } from './kundli-analysis-prompt';
import { createClient } from '@supabase/supabase-js';
import { getDashaAccuracyStat, getYogaAccuracyStat, getRemedyOutcomeCorrelation } from './outcome-tracking';

export { EphemerisUnavailableError };

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
  const basePrompt = buildAnalysisSystemPrompt(await getBotDisplayName());

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

  const systemPrompt = await buildSystemPromptWithLearnedPatterns(yogas, factSheet);
  const userPrompt = buildAnalysisUserPrompt({ full_name, dob, birth_time, birth_place, ayanamsa, factSheet, numerology, vimshottari, specialist, jaimini, crossVal, yogas, ashtakavarga, nakshatra, varshaphal, gocharPhal, annualTransitPeriods, transit, gender });

  const aiResult = await getLuckfixerResponse(systemPrompt, userPrompt, true);

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

// app/api/kundli/route.js
import { createClient } from '@/lib/supabase-server';
import { getLuckfixerResponse } from '@/lib/ai-engine';
import { buildFactSheet, EphemerisUnavailableError } from '@/lib/astro-facts';
import { buildNumerologySheet } from '@/lib/numerology';
import { calcVimshottari } from '@/lib/vimshottari';
import { buildSpecialistInsights } from '@/lib/specialist-rules';
import { buildTransitReport } from '@/lib/transit';
import { scheduleOutcomeFollowUps } from '@/lib/outcome-tracking';
import { buildJaiminiSheet, crossValidate } from '@/lib/jaimini';
import { detectYogas, formatYogasForPrompt } from '@/lib/yogas';
import { buildAshtakavarga, formatAVForPrompt } from '@/lib/ashtakavarga';
import { buildNakshatraSheet, formatNakshatraForPrompt } from '@/lib/nakshatra';
import { buildVarshaphal, formatVarshaphalForPrompt } from '@/lib/varshaphal';
import { buildGocharPhalTimeline, formatGocharPhalForPrompt, buildAnnualTransitPeriods, formatAnnualTransitPeriodsForPrompt } from '@/lib/gochar-phal';
import { buildSaptahikPhal } from '@/lib/saptahik-phal';
import { RAM_SHALAKA_ANSWERS } from '@/lib/ram-shalaka';
import { buildAnalysisSystemPrompt, buildAnalysisUserPrompt } from '@/lib/kundli-analysis-prompt';


// GET — fetch all kundlis for logged-in user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('saved_kundlis')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ kundlis: data });
}

// DELETE — permanently remove a kundli the user owns
// (predictions_log rows cascade-delete via FK; chat_sessions.kundli_id is set NULL)
export async function DELETE(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const { data: kundli } = await supabase
    .from('saved_kundlis')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();

  if (!kundli || kundli.user_id !== user.id) {
    return Response.json({ error: 'Not found or not yours' }, { status: 403 });
  }

  const { error } = await supabase.from('saved_kundlis').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}

// POST — save new kundli + run AI analysis
export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { label, full_name, dob, birth_time, birth_place, latitude, longitude, ayanamsa, gender } = body;

  if (!full_name || !dob || !birth_time || !latitude || !longitude) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!gender || !['male', 'female', 'other'].includes(gender)) {
    return Response.json({ error: 'लिंग चुनना ज़रूरी है (male/female/other)' }, { status: 400 });
  }

  // ── Deterministic core: compute the fact-sheet (exaltation, own-sign, ──
  // Vargottama, planetary war, dasha hint, remedial windows, etc.)
  // PREDICTION INTEGRITY: buildFactSheet throws EphemerisUnavailableError
  // instead of silently falling back to fabricated planetary positions —
  // caught here so we return an honest "try again" instead of saving (and
  // later narrating) a kundli built on fake data. See astro-facts.js.
  let factSheet;
  try {
    factSheet = await buildFactSheet(dob, birth_time, parseFloat(latitude), parseFloat(longitude), ayanamsa);
  } catch (e) {
    if (e instanceof EphemerisUnavailableError) {
      console.error('[Kundli] Ephemeris unavailable, refusing to save degraded kundli:', e.attempts);
      return Response.json({ error: e.message, retryable: true }, { status: 503 });
    }
    throw e;
  }
  const numerology = buildNumerologySheet(full_name, dob);
  const moon = factSheet.planets.find(p => p.name === 'Moon');
  const vimshottari = moon ? calcVimshottari(moon.degree, dob) : null;
  const specialist  = buildSpecialistInsights(factSheet, vimshottari);
  const transit     = await buildTransitReport(factSheet, parseFloat(latitude), parseFloat(longitude)).catch(() => null);
  const jaimini     = buildJaiminiSheet(factSheet.planets, factSheet.lagna?.sign, factSheet.d9Chart, dob);
  const crossVal    = crossValidate(jaimini, factSheet);
  const yogas       = detectYogas(factSheet.planets, factSheet.lagna?.sign, factSheet.houseLords, factSheet.d9Chart);
  const ashtakavarga = buildAshtakavarga(factSheet.planets, factSheet.lagna?.sign);
  const nakshatra   = buildNakshatraSheet(factSheet.planets, factSheet.lagna?.sign);
  const varshaphal  = buildVarshaphal(factSheet, dob);
  const gocharPhal  = buildGocharPhalTimeline(moon?.sign, ayanamsa);
  const annualTransitPeriods = buildAnnualTransitPeriods(moon?.sign, ayanamsa, varshaphal?.solarReturnDate);
  const saptahikPhal = buildSaptahikPhal(ayanamsa, factSheet?.weakestPlanet?.planet);

  // ── AI layer: interpret the fact-sheet, do NOT recompute positions ────
  const systemPrompt = buildAnalysisSystemPrompt();
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

  // ── Save kundli ────────────────────────────────────────────
  const { data: kundli, error } = await supabase.from('saved_kundlis').insert({
    user_id:      user.id,
    label:        label || `${full_name} — ${dob}`,
    full_name,
    dob,
    birth_time,
    birth_place,
    latitude:     parseFloat(latitude),
    longitude:    parseFloat(longitude),
    ayanamsa:     ayanamsa || 'lahiri',
    gender:       gender || null,
    planet_data: {
      planets: factSheet.planets,
      factSheet,
      numerology,
      vimshottari,
      specialist,
      jaimini,
      crossValidation: crossVal,
      yogas,
      ashtakavarga,
      nakshatra,
      varshaphal,
      transitSnapshot: transit,
      gocharPhal,
      annualTransitPeriods,
      saptahikPhal,
      analysis: aiResult.content,
      closingVerse,
    },
    luck_score:   aiResult.content.metric_score || 50,
    last_analysis: new Date().toISOString(),
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // ── Feedback loop: log this prediction for future reference ──
  const { data: predLog } = await supabase.from('predictions_log').insert({
    user_id:     user.id,
    kundli_id:   kundli.id,
    source:      'kundli_analysis',
    fact_sheet:  factSheet,
    ai_response: aiResult.content,
    model_used:  aiResult.model,
  }).select('id').single();

  // ── Outcome Tracking Loop: schedule follow-up questions ──────
  // 3 weeks from now, the system will ask the user in chat whether
  // the predicted career/marriage/health/dasha events actually happened.
  // This is our proprietary accuracy dataset — no competitor can replicate it.
  await scheduleOutcomeFollowUps(
    supabase,
    user.id,
    kundli.id,
    predLog?.id || null,
    factSheet,
    aiResult.content
  );

  return Response.json({ kundli, analysis: aiResult.content, model: aiResult.model });
}

// PATCH — re-run analysis on an EXISTING kundli with the latest AI
// schema/prompt (e.g. to pick up new fields like life_domains added
// after the kundli was originally created), without deleting and
// re-entering birth details. Same computation as POST, but UPDATEs
// the existing row instead of inserting a new one.
export async function PATCH(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { kundli_id } = await req.json();
  if (!kundli_id) return Response.json({ error: 'kundli_id required' }, { status: 400 });

  const { data: existing, error: fetchErr } = await supabase
    .from('saved_kundlis')
    .select('*')
    .eq('id', kundli_id)
    .eq('user_id', user.id) // ownership check — can't re-analyze someone else's kundli
    .maybeSingle();

  if (fetchErr || !existing) return Response.json({ error: 'कुंडली नहीं मिली' }, { status: 404 });

  const { full_name, dob, birth_time, latitude, longitude, ayanamsa, gender } = existing;

  let factSheet;
  try {
    factSheet = await buildFactSheet(dob, birth_time, latitude, longitude, ayanamsa);
  } catch (e) {
    if (e instanceof EphemerisUnavailableError) {
      console.error('[Kundli PATCH] Ephemeris unavailable, keeping existing analysis untouched:', e.attempts);
      return Response.json({ error: e.message, retryable: true }, { status: 503 });
    }
    throw e;
  }
  const numerology = buildNumerologySheet(full_name, dob);
  const moon = factSheet.planets.find(p => p.name === 'Moon');
  const vimshottari = moon ? calcVimshottari(moon.degree, dob) : null;
  const specialist  = buildSpecialistInsights(factSheet, vimshottari);
  const transit     = await buildTransitReport(factSheet, latitude, longitude).catch(() => null);
  const jaimini     = buildJaiminiSheet(factSheet.planets, factSheet.lagna?.sign, factSheet.d9Chart, dob);
  const crossVal    = crossValidate(jaimini, factSheet);
  const yogas       = detectYogas(factSheet.planets, factSheet.lagna?.sign, factSheet.houseLords, factSheet.d9Chart);
  const ashtakavarga = buildAshtakavarga(factSheet.planets, factSheet.lagna?.sign);
  const nakshatra   = buildNakshatraSheet(factSheet.planets, factSheet.lagna?.sign);
  const varshaphal  = buildVarshaphal(factSheet, dob);
  const gocharPhal  = buildGocharPhalTimeline(moon?.sign, ayanamsa);
  const annualTransitPeriods = buildAnnualTransitPeriods(moon?.sign, ayanamsa, varshaphal?.solarReturnDate);
  const saptahikPhal = buildSaptahikPhal(ayanamsa, factSheet?.weakestPlanet?.planet);

  const systemPrompt = buildAnalysisSystemPrompt();
  const userPrompt = buildAnalysisUserPrompt({ full_name, dob, birth_time, birth_place: existing.birth_place, ayanamsa, factSheet, numerology, vimshottari, specialist, jaimini, crossVal, yogas, ashtakavarga, nakshatra, varshaphal, gocharPhal, annualTransitPeriods, transit, gender });

  const aiResult = await getLuckfixerResponse(systemPrompt, userPrompt, true);

  const score = aiResult.content.metric_score || 50;
  const matchingTone = score >= 60 ? 'shubh' : score >= 40 ? 'dhairya' : 'saavdhani';
  const allAnswers = Object.values(RAM_SHALAKA_ANSWERS);
  const versePool = allAnswers.filter(v => v.tone === matchingTone);
  const pool = versePool.length > 0 ? versePool : allAnswers;
  const hashSeed = `${full_name}${dob}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const picked = pool[hashSeed % pool.length];
  const closingVerse = { verse: picked.verse, source: `रामचरितमानस, ${picked.kand}` };

  const { data: kundli, error } = await supabase.from('saved_kundlis').update({
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
  }).eq('id', kundli_id).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ kundli, analysis: aiResult.content, model: aiResult.model });
}

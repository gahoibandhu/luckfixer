// app/api/kundli/route.js
import { createClient } from '@/lib/supabase-server';
import { getLuckfixerResponse } from '@/lib/ai-engine';
import { buildFactSheet } from '@/lib/astro-facts';
import { buildNumerologySheet } from '@/lib/numerology';
import { calcVimshottari } from '@/lib/vimshottari';
import { buildSpecialistInsights } from '@/lib/specialist-rules';
import { buildTransitReport } from '@/lib/transit';

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
  const { label, full_name, dob, birth_time, birth_place, latitude, longitude, ayanamsa } = body;

  if (!full_name || !dob || !birth_time || !latitude || !longitude) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // ── Deterministic core: compute the fact-sheet (exaltation, own-sign, ──
  // Vargottama, planetary war, dasha hint, remedial windows, etc.)
  const factSheet = await buildFactSheet(dob, birth_time, parseFloat(latitude), parseFloat(longitude), ayanamsa);
  const numerology = buildNumerologySheet(full_name, dob);
  const moon = factSheet.planets.find(p => p.name === 'Moon');
  const vimshottari = moon ? calcVimshottari(moon.degree, dob) : null;
  const specialist  = buildSpecialistInsights(factSheet, vimshottari);
  const transit     = await buildTransitReport(factSheet, parseFloat(latitude), parseFloat(longitude)).catch(() => null);

  // ── AI layer: interpret the fact-sheet, do NOT recompute positions ────
  const systemPrompt = `You are Luckfixer 2.0's master analysis engine — combining classical Vedic astrology (Parashari), Lal Kitab, Nadi astrology (Bhrigu Nandi Nadi style), and Hora (planetary hour) timing systems.

CRITICAL RULES:
- You will receive a pre-computed deterministic FACT SHEET below. Do NOT recalculate degrees, dignities, Vargottama, or planetary wars — these are already correct. Your job is ONLY to interpret these facts into Hindi narrative and remedies.
- Your strongest_planet and weakest_planet fields MUST match the strongestPlanet/weakestPlanet given in the fact sheet exactly (same planet name).
- If planetaryWars is non-empty, you MUST mention it in key_yoga or analytical_insight.
- If vargottamaPlanets is non-empty, mention it as a strength point.
- For lal_kitab_analysis.timing, use the remedialWindow.window value from the weakest planet's data in the fact sheet — weave it naturally into Hindi text.
- All narrative content must be in Hindi (Devanagari), warm elder-brother tone, specific and actionable — not generic.

REMEDY DETAIL MANDATE — every single remedy field must include ALL of the following (no vague remedies):
1. कौन सा उपाय — exact action (e.g. "तांबे के लोटे में सूर्य को जल चढ़ाएं")
2. कितनी मात्रा — exact quantity (e.g. "1 लोटा ≈ 250ml", "21 काले तिल", "108 बार जाप")
3. कौन सा दिन — specific weekday (e.g. "रविवार", "शनिवार")
4. कितने दिन — duration (e.g. "लगातार 40 दिन", "7 रविवार", "3 महीने")
5. शुरू कब करें — best start (e.g. "अगले रविवार शुक्ल पक्ष की प्रथमा से", "अगली पूर्णिमा से")
6. किस समय — exact time (e.g. "सूर्योदय के 30 मिनट के भीतर", "शाम 6-7 बजे दीपक जलाने के समय")
7. दिशा — direction to face (e.g. "पूर्व दिशा में मुँह करके")
8. मंत्र — what to chant with count (e.g. "ॐ सूर्याय नमः — 11 बार", "ॐ शं शनैश्चराय नमः — 108 बार")

Return STRICT JSON only, no markdown, no backticks.`;

  const userPrompt = `Birth: ${full_name}, ${dob} ${birth_time}, ${birth_place}, Ayanamsa: ${ayanamsa}

FACT SHEET (pre-computed, authoritative — do not recalculate):
${JSON.stringify(factSheet, null, 2)}

NUMEROLOGY SHEET (pre-computed, use as-is):
${JSON.stringify(numerology, null, 2)}

VIMSHOTTARI DASHA (pre-computed, authoritative — use exact dates):
${vimshottari ? JSON.stringify(vimshottari.current, null, 2) : 'Not available'}

KEY DASHA CONTEXT:
- महादशा: ${vimshottari?.current?.mahaDasha?.lordHi} (समाप्ति: ${vimshottari?.current?.mahaDasha?.end}, ${vimshottari?.current?.mahaDasha?.daysLeft} दिन शेष)
- अंतर्दशा: ${vimshottari?.current?.antarDasha?.lordHi} (समाप्ति: ${vimshottari?.current?.antarDasha?.end}, ${vimshottari?.current?.antarDasha?.daysLeft} दिन शेष)
- प्रत्यंतर्दशा: ${vimshottari?.current?.pratyantarDasha?.lordHi} (${vimshottari?.current?.pratyantarDasha?.startLabel} से ${vimshottari?.current?.pratyantarDasha?.endLabel}, ${vimshottari?.current?.pratyantarDasha?.daysLeft} दिन शेष)

CLASSICAL YOGA PATTERNS DETECTED (use these in your analysis):
${specialist.matchedYogas.length > 0 ? specialist.matchedYogas.map(y => `• ${y}`).join('\n') : '• कोई विशेष योग नहीं मिला'}

EVENT-SPECIFIC SCORES (pre-computed — career/marriage/health with confidence + reasoning, use exactly):
${factSheet.eventScores ? JSON.stringify(factSheet.eventScores, null, 2) : 'Not available (lagna missing)'}

LAGNA (Ascendant): ${factSheet.lagna ? `${factSheet.lagna.signHi} (${factSheet.lagna.sign}), ${factSheet.lagna.nakshatra} नक्षत्र` : 'Not available'}

CURRENT TRANSIT (Gochar) AS OF TODAY (${transit?.asOf || 'N/A'}) — NOTE: this is a snapshot at analysis time, will become stale; the live chat always recomputes fresh transits, so keep this section brief:
${transit ? JSON.stringify({ headline: transit.headline, sadeSati: transit.sadeSati, saturnTransit: transit.saturnTransit?.currentSignHi, jupiterTransit: transit.jupiterTransit?.currentSignHi }, null, 2) : 'Not available'}

PAST VALIDATION QUESTIONS (include 1-2 of these in analytical_insight or dasha_hint — ask the user to confirm):
${specialist.pastValidationQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}

WEAKEST PLANET REMEDY REFERENCE (use in remedies section):
${specialist.weakestPlanetRemedy ? JSON.stringify(specialist.weakestPlanetRemedy) : 'N/A'}

IMPORTANT — remedies must cover ALL of these systems, not just Lal Kitab:
1. Vedic Jyotish remedy (mantra/gem/yantra for weakest planet — use exact mantra + count from remedy reference above)
2. Lal Kitab remedy (household object, specific action with quantity and day)
3. Nadi/Karma remedy (behavioral correction, seva with duration)
4. Numerology remedy (based on missing Lo Shu numbers and Life Path)
5. Color/Day/Direction therapy (based on weakest planet's planetary day from remedy reference)

Return this exact JSON structure:
{
  "metric_score": <0-100, use factSheet.overallScore as the base, adjust ±5 max>,
  "intensity": <"CRITICAL"|"MODERATE"|"STRONG">,
  "dominant_planet": "<Hindi name from factSheet.strongestPlanet.name>",
  "key_yoga": "<name the most significant finding: a planetaryWar, a Vargottama planet, or exaltation/debilitation>",
  "analytical_insight": "<2-3 sentence overall summary in Hindi covering the chart's central theme, referencing factSheet.strongestPlanet and factSheet.weakestPlanet>",

  "vedic_analysis": {
    "lagna_summary": "<1-2 sentences in Hindi about chart strength, MUST mention factSheet.lagna sign and nakshatra if available>",
    "strongest_planet": "<must reference factSheet.strongestPlanet.name, degree, sign, dignity in Hindi>",
    "weakest_planet": "<must reference factSheet.weakestPlanet.name, degree, sign, dignity in Hindi>",
    "dasha_hint": "<MUST reference exact Vimshottari dates: महादशा lord + end date, अंतर्दशा lord + end date, प्रत्यंतर्दशा lord + exact dates. Explain what this combination means for the person in Hindi>"
  },

  "event_scores": {
    "career": { "score": <number from factSheet.eventScores.career.score>, "confidence": <number from factSheet.eventScores.career.confidence>, "summary": "<Hindi 1-2 sentence narrative version of factSheet.eventScores.career.summary, weaving in top 1-2 supporting/opposing factors>" },
    "marriage": { "score": <number from factSheet.eventScores.marriage.score>, "confidence": <number from factSheet.eventScores.marriage.confidence>, "summary": "<Hindi 1-2 sentence narrative version of factSheet.eventScores.marriage.summary>" },
    "health": { "score": <number from factSheet.eventScores.health.score>, "confidence": <number from factSheet.eventScores.health.confidence>, "summary": "<Hindi 1-2 sentence narrative version of factSheet.eventScores.health.summary>" }
  },

  "lal_kitab_analysis": {
    "key_observation": "<1-2 sentences in Hindi identifying the chart's main Lal Kitab-style issue, based on factSheet.weakestPlanet>",
    "remedy": "<specific Lal Kitab remedy in Hindi - household/object-based action for factSheet.weakestPlanet.name>",
    "timing": "<MUST incorporate factSheet.weakestPlanet.remedialWindow.window in Hindi>",
    "chapter_reference": "<Lal Kitab chapter/principle reference>"
  },

  "nadi_analysis": {
    "karmic_theme": "<1-2 sentences in Hindi about karmic pattern based on factSheet.currentDashaLordHint and Moon nakshatra>",
    "life_area_focus": "<which life area needs attention per Nadi principles, in Hindi>",
    "nadi_remedy": "<action-oriented Nadi-style remedy in Hindi>"
  },

  "hora_analysis": {
    "ruling_planet_today": "<Hindi name of today's day-lord planet>",
    "best_activity_now": "<1 sentence in Hindi - what type of activity suits today>",
    "avoid_now": "<1 sentence in Hindi - what to avoid today, especially relevant to factSheet.weakestPlanet>"
  },

  "numerology_analysis": {
    "life_path_summary": "<2-3 sentences in Hindi about numerology.lifePathNumber and its meaning for this person>",
    "dominant_number": "<numerology.lifePathNumber as digit>",
    "expression_insight": "<1 sentence in Hindi about name vibration — numerology.expressionNumber>",
    "missing_numbers_warning": "<if numerology.loShu.missing is non-empty, mention the missing numbers and their impact in Hindi; else say 'सभी अंक संतुलित हैं'>",
    "numerology_remedy": "<specific remedy in Hindi for the missing Lo Shu number(s) or weak Life Path energy>"
  },

  "remedies": {
    "vedic": {
      "mantra": "<specific mantra in Sanskrit/Hindi for factSheet.weakestPlanet with jaap count>",
      "gem": "<recommended gemstone for factSheet.weakestPlanet, metal, and finger to wear>",
      "yantra": "<relevant yantra name if applicable>"
    },
    "lal_kitab": {
      "action": "<specific Lal Kitab household remedy for factSheet.weakestPlanet>",
      "timing": "<must incorporate factSheet.weakestPlanet.remedialWindow.window>",
      "reference": "<Lal Kitab chapter/principle>"
    },
    "nadi_karma": {
      "seva": "<specific selfless service or behavioral change, in Hindi>",
      "duration": "<how many days/weeks to practice>"
    },
    "numerology": {
      "action": "<remedy for missing Lo Shu numbers or Life Path imbalance, in Hindi>",
      "lucky_numbers": "<2-3 favorable numbers based on Life Path and Expression>"
    },
    "color_day_direction": {
      "color": "<favorable color for factSheet.weakestPlanet, in Hindi>",
      "day": "<best day of the week based on factSheet.weakestPlanet's planetary day>",
      "direction": "<favorable direction to face during remedy/meditation>"
    }
  },

  "actionable_seva_remedy": {
    "target_action": "<single most powerful combined remedy from all systems, in Hindi>",
    "target_location_type": "<where to perform it, in Hindi>",
    "karmic_logic": "<why this works for this specific chart, referencing both fact sheet and numerology, in Hindi>",
    "shastric_reference": "<combined reference to Lal Kitab / BPHS / Phaladeepika / Nadi / Ank Jyotish>"
  },

  "hora_guidance": "<1 sentence in Hindi - today's practical guidance combining hora timing>",

  "current_transit_summary": "<2-3 sentences in Hindi summarizing the CURRENT TRANSIT data above — mention Sade Sati status if relevant, and what the Saturn/Jupiter transit means for this person right now. Note this is a snapshot that will be refreshed in live chat.>"
}`;

  const aiResult = await getLuckfixerResponse(systemPrompt, userPrompt, true);

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
    planet_data:  { planets: factSheet.planets, factSheet, numerology, vimshottari, specialist, transitSnapshot: transit, analysis: aiResult.content },
    luck_score:   aiResult.content.metric_score || 50,
    last_analysis: new Date().toISOString(),
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // ── Feedback loop: log this prediction for future reference ──
  await supabase.from('predictions_log').insert({
    user_id:     user.id,
    kundli_id:   kundli.id,
    source:      'kundli_analysis',
    fact_sheet:  factSheet,
    ai_response: aiResult.content,
    model_used:  aiResult.model,
  });

  return Response.json({ kundli, analysis: aiResult.content, model: aiResult.model });
}

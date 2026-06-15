// app/api/kundli/route.js
import { createClient } from '@/lib/supabase-server';
import { getLuckfixerResponse } from '@/lib/ai-engine';
import { buildFactSheet } from '@/lib/astro-facts';

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

  // ── AI layer: interpret the fact-sheet, do NOT recompute positions ────
  const systemPrompt = `You are Luckfixer 2.0's master analysis engine — combining classical Vedic astrology (Parashari), Lal Kitab, Nadi astrology (Bhrigu Nandi Nadi style), and Hora (planetary hour) timing systems.

CRITICAL RULES:
- You will receive a pre-computed deterministic FACT SHEET below. Do NOT recalculate degrees, dignities, Vargottama, or planetary wars — these are already correct. Your job is ONLY to interpret these facts into Hindi narrative and remedies.
- Your strongest_planet and weakest_planet fields MUST match the strongestPlanet/weakestPlanet given in the fact sheet exactly (same planet name).
- If planetaryWars is non-empty, you MUST mention it in key_yoga or analytical_insight.
- If vargottamaPlanets is non-empty, mention it as a strength point.
- For lal_kitab_analysis.timing, use the remedialWindow.window value from the weakest planet's data in the fact sheet — weave it naturally into Hindi text.
- All narrative content must be in Hindi (Devanagari), warm elder-brother tone, specific and actionable — not generic.

Return STRICT JSON only, no markdown, no backticks.`;

  const userPrompt = `Birth: ${full_name}, ${dob} ${birth_time}, ${birth_place}, Ayanamsa: ${ayanamsa}

FACT SHEET (pre-computed, authoritative — do not recalculate):
${JSON.stringify(factSheet, null, 2)}

Return this exact JSON structure:
{
  "metric_score": <0-100, use factSheet.overallScore as the base, adjust ±5 max>,
  "intensity": <"CRITICAL"|"MODERATE"|"STRONG">,
  "dominant_planet": "<Hindi name from factSheet.strongestPlanet.name>",
  "key_yoga": "<name the most significant finding: a planetaryWar, a Vargottama planet, or exaltation/debilitation>",
  "analytical_insight": "<2-3 sentence overall summary in Hindi covering the chart's central theme, referencing factSheet.strongestPlanet and factSheet.weakestPlanet>",

  "vedic_analysis": {
    "lagna_summary": "<1-2 sentences in Hindi about chart strength based on factSheet>",
    "strongest_planet": "<must reference factSheet.strongestPlanet.name, degree, sign, dignity in Hindi>",
    "weakest_planet": "<must reference factSheet.weakestPlanet.name, degree, sign, dignity in Hindi>",
    "dasha_hint": "<1-2 sentences in Hindi about factSheet.currentDashaLordHint period themes, based on Moon nakshatra factSheet.moonNakshatra>"
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

  "actionable_seva_remedy": {
    "target_action": "<specific seva in Hindi, combining insights from all 4 systems, targeting factSheet.weakestPlanet>",
    "target_location_type": "<where to perform it, in Hindi>",
    "karmic_logic": "<why this remedy works for this specific chart, referencing the fact sheet data, in Hindi>",
    "shastric_reference": "<combined reference to Lal Kitab / BPHS / Phaladeepika / Nadi>"
  },

  "hora_guidance": "<1 sentence in Hindi - today's practical guidance combining hora timing>"
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
    planet_data:  { planets: factSheet.planets, factSheet, analysis: aiResult.content },
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

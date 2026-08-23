// app/api/numerology/route.js
//
// Standalone name-numerology tool — independent of any saved kundli.
// A user can check ANY name here: their own name, a company name, a
// shop/brand name, a product name, etc. Deterministic math lives in
// lib/numerology.js (analyzeStandaloneName); this route just adds an
// AI Hindi narration layer on top, the same "compute facts first,
// then let AI interpret — never let AI invent numbers" pattern used
// for kundlis (see lib/kundli-reanalysis.js).

import { createClient } from '@/lib/supabase-server';
import { analyzeStandaloneName, analyzeNameWithBirthData } from '@/lib/numerology';
import { getLuckfixerResponse } from '@/lib/ai-engine';

const CATEGORY_LABEL_HI = {
  person:  'व्यक्ति का नाम',
  company: 'कंपनी का नाम',
  shop:    'दुकान/ब्रांड का नाम',
  other:   'नाम',
};

function buildSystemPrompt(linkedToKundli, moonNakshatra) {
  return `You are Luckfixer 2.0's numerology (अंक ज्योतिष) advisor for name checks — a person's own name, a company name, a shop/brand name, or any other name someone wants evaluated.

CRITICAL RULES:
- You will receive a pre-computed deterministic NUMEROLOGY DATA object below. Do NOT invent your own numbers, meanings, or spelling variants — only narrate what's given, in warm, plain Hindi.
- If category is 'company' or 'shop', frame the narrative around business energy (ग्राहक आकर्षण, विश्वसनीयता, वित्तीय स्थिरता) rather than personal-life themes.
- If category is 'person', frame it around personal energy, career, and relationships.
${linkedToKundli ? `- This check is LINKED to the person's own saved kundli, so referenceLifePath, soulUrgeNumber, personalityNumber, birthDayNumber and loShu are all computed from their REAL birth date — treat this as authoritative, complete birth data, not a guess. Weave in one line naturally connecting the name-number picture to their birth data (e.g. life path vs compound number harmony).${moonNakshatra ? ` Their Moon nakshatra is ${moonNakshatra} — you may mention it briefly ONLY if it naturally strengthens the correction advice, never force it.` : ''}` : `- No birth data is linked for this check — referenceLifePath will be null; give the reading purely from the name's own numbers, and don't claim any Life-Path comparison that wasn't given.`}
- If numerologyData.correction?.needsCorrection is true, clearly recommend numerologyData.correction.topSuggestions[0].spelling as a better-balanced alternative and explain briefly why (its compound meaning). Never suggest a completely different name — only the small spelling tweak given.
- If needsCorrection is false, reassure the user the current spelling is already numerologically sound.
- Keep it concise: 4-6 short sentences total, plain Hindi/Hinglish, no bullet lists, no markdown.
- Do NOT make predictions about specific future events, money amounts, or guaranteed outcomes — numerology here is interpretive guidance, not a guarantee.

Return STRICT JSON only, no markdown, no backticks, matching:
{
  "summary": "<3-5 sentence warm Hindi narrative covering the compound number's meaning and overall energy of this name>",
  "verdict": "<one of: 'शुभ' | 'सामान्य' | 'सुधार सुझाया गया'>",
  "correction_advice": "<if correction.needsCorrection is true: 1-2 sentences recommending the suggested spelling and why; else: '' >"
}`;
}

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, category, reference_dob, kundli_id } = body;

  if (!name || !name.trim()) {
    return Response.json({ error: 'नाम दर्ज करें' }, { status: 400 });
  }
  const cat = ['person', 'company', 'shop', 'other'].includes(category) ? category : 'person';
  const trimmedName = name.trim();

  // ── Optional: link to one of the user's saved kundlis ───────────
  // When linked, we already have a COMPLETE numerology sheet computed
  // at kundli-creation time (buildNumerologySheet, saved on
  // saved_kundlis.planet_data.numerology) — reuse it directly when the
  // name being checked is still their own kundli name (exact reuse,
  // guaranteed consistent with the rest of their chart). If they're
  // checking a different spelling/name while linked, or just gave a
  // reference_dob, recompute the full sheet against that dob so the
  // reading still gets the deeper (soul urge / personality / Lo Shu)
  // picture instead of the bare compound-number-only version.
  let effectiveDob = reference_dob || null;
  let moonNakshatra = null;
  let linkedKundli = null;

  if (kundli_id) {
    const { data: k } = await supabase
      .from('saved_kundlis')
      .select('id, full_name, dob, planet_data')
      .eq('id', kundli_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (k) {
      linkedKundli = k;
      effectiveDob = effectiveDob || k.dob;
      moonNakshatra = k.planet_data?.factSheet?.moonNakshatra || null;
    }
  }

  // ── Deterministic core (no AI, no network) ─────────────────────
  let numerologyData;
  if (linkedKundli && trimmedName.toLowerCase() === (linkedKundli.full_name || '').trim().toLowerCase() && linkedKundli.planet_data?.numerology) {
    // Exact reuse — same name, same dob, already computed for the kundli.
    const sheet = linkedKundli.planet_data.numerology;
    numerologyData = {
      name: trimmedName,
      chaldean: sheet.chaldean,
      pythagoreanExpression: { number: sheet.expressionNumber, meaning: sheet.expressionMeaning },
      referenceLifePath: sheet.lifePathNumber,
      correction: sheet.nameCorrection,
      soulUrgeNumber: sheet.soulUrgeNumber, soulUrgeMeaning: sheet.soulUrgeMeaning,
      personalityNumber: sheet.personalityNumber, personalityMeaning: sheet.personalityMeaning,
      birthDayNumber: sheet.birthDayNumber, birthDayMeaning: sheet.birthDayMeaning,
      loShu: sheet.loShu,
    };
  } else if (effectiveDob) {
    numerologyData = analyzeNameWithBirthData(trimmedName, effectiveDob);
  } else {
    numerologyData = analyzeStandaloneName(trimmedName, null);
  }

  // ── AI narrative layer ──────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(!!linkedKundli, moonNakshatra);
  const userPrompt = `नाम की श्रेणी: ${CATEGORY_LABEL_HI[cat]}
नाम: ${trimmedName}
${linkedKundli ? `(यह जांच उपयोगकर्ता की सेव कुंडली "${linkedKundli.full_name}" से लिंक है — birth data पूरा और authoritative है)` : ''}

NUMEROLOGY DATA (pre-computed, authoritative — do not recalculate):
${JSON.stringify(numerologyData, null, 2)}`;

  const aiResult = await getLuckfixerResponse(systemPrompt, userPrompt, true);

  // ── Log the query (own record, RLS-protected) ────────────────────
  const { data: saved } = await supabase.from('numerology_queries').insert({
    user_id:         user.id,
    name_queried:    trimmedName,
    category:        cat,
    reference_dob:   effectiveDob || null,
    kundli_id:       linkedKundli?.id || null,
    numerology_data: numerologyData,
    ai_narrative:    aiResult.content,
    model_used:      aiResult.model,
  }).select('id, created_at').single();

  return Response.json({
    id: saved?.id || null,
    name: trimmedName,
    category: cat,
    linkedKundliId: linkedKundli?.id || null,
    numerology: numerologyData,
    narrative: aiResult.content,
    model: aiResult.model,
  });
}

// GET — a user's own past numerology queries (history), most recent first
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('numerology_queries')
    .select('id, name_queried, category, numerology_data, ai_narrative, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ queries: data });
}

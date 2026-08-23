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
import { analyzeStandaloneName } from '@/lib/numerology';
import { getLuckfixerResponse } from '@/lib/ai-engine';

const CATEGORY_LABEL_HI = {
  person:  'व्यक्ति का नाम',
  company: 'कंपनी का नाम',
  shop:    'दुकान/ब्रांड का नाम',
  other:   'नाम',
};

function buildSystemPrompt() {
  return `You are Luckfixer 2.0's numerology (अंक ज्योतिष) advisor for standalone name checks — a person's own name, a company name, a shop/brand name, or any other name someone wants evaluated. This is INDEPENDENT of any birth chart.

CRITICAL RULES:
- You will receive a pre-computed deterministic NUMEROLOGY DATA object below (Chaldean compound number, its classical auspicious/inauspicious meaning, Pythagorean expression number, and — if the name needs correction — pre-generated spelling suggestions). Do NOT invent your own numbers, meanings, or spelling variants — only narrate what's given, in warm, plain Hindi.
- If category is 'company' or 'shop', frame the narrative around business energy (ग्राहक आकर्षण, विश्वसनीयता, वित्तीय स्थिरता) rather than personal-life themes.
- If category is 'person', frame it around personal energy, career, and relationships.
- If numerologyData.correction.needsCorrection is true, clearly recommend numerologyData.correction.topSuggestions[0].spelling as a better-balanced alternative and explain briefly why (its compound meaning). Never suggest a completely different name — only the small spelling tweak given.
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
  const { name, category, reference_dob } = body;

  if (!name || !name.trim()) {
    return Response.json({ error: 'नाम दर्ज करें' }, { status: 400 });
  }
  const cat = ['person', 'company', 'shop', 'other'].includes(category) ? category : 'person';

  // ── Deterministic core (no AI, no network) ─────────────────────
  const numerologyData = analyzeStandaloneName(name.trim(), reference_dob || null);

  // ── AI narrative layer ──────────────────────────────────────────
  const systemPrompt = buildSystemPrompt();
  const userPrompt = `नाम की श्रेणी: ${CATEGORY_LABEL_HI[cat]}
नाम: ${name.trim()}

NUMEROLOGY DATA (pre-computed, authoritative — do not recalculate):
${JSON.stringify(numerologyData, null, 2)}`;

  const aiResult = await getLuckfixerResponse(systemPrompt, userPrompt, true);

  // ── Log the query (own record, RLS-protected) ────────────────────
  const { data: saved } = await supabase.from('numerology_queries').insert({
    user_id:         user.id,
    name_queried:    name.trim(),
    category:        cat,
    reference_dob:   reference_dob || null,
    numerology_data: numerologyData,
    ai_narrative:    aiResult.content,
    model_used:      aiResult.model,
  }).select('id, created_at').single();

  return Response.json({
    id: saved?.id || null,
    name: name.trim(),
    category: cat,
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

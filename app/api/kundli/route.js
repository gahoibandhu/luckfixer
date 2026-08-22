// app/api/kundli/route.js
import { createClient } from '@/lib/supabase-server';
import { EphemerisUnavailableError, runFullReAnalysis } from '@/lib/kundli-reanalysis';
import { scheduleOutcomeFollowUps } from '@/lib/outcome-tracking';


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

  // ── Deterministic core + AI narrative — see lib/kundli-reanalysis.js ──
  // (shared with PATCH and the admin re-analyze route, single source of
  // truth). PREDICTION INTEGRITY: throws EphemerisUnavailableError instead
  // of silently falling back to fabricated planetary positions — caught
  // here so we return an honest "try again" instead of ever saving (and
  // later narrating) a kundli built on fake data. See astro-facts.js.
  let result;
  try {
    result = await runFullReAnalysis({
      full_name, dob, birth_time, birth_place,
      latitude: parseFloat(latitude), longitude: parseFloat(longitude),
      ayanamsa: ayanamsa || 'lahiri', gender,
    });
  } catch (e) {
    if (e instanceof EphemerisUnavailableError) {
      console.error('[Kundli] Ephemeris unavailable, refusing to save degraded kundli:', e.attempts);
      return Response.json({ error: e.message, retryable: true }, { status: 503 });
    }
    throw e;
  }
  const factSheet = result.planet_data.factSheet;
  const aiResult = result.aiResult;

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
    planet_data:  result.planet_data,
    luck_score:   result.luck_score,
    last_analysis: result.last_analysis,
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

// NOTE: There is deliberately no user-facing PATCH (re-analyze) endpoint
// here anymore. Re-analysis is admin-only now — see
// app/api/admin/kundlis/reanalyze/route.js, which uses the same
// lib/kundli-reanalysis.js core logic but is triggered centrally from
// the admin "Migrations" tab rather than exposed to individual users
// (a per-kundli "पुनः विश्लेषण" button existed briefly and was removed
// because it confused users, not because the capability itself was
// wrong — admin-triggered bulk re-analysis remains the right way to
// refresh stale kundlis).

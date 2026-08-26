// app/api/kundli/route.js
import { createClient } from '@/lib/supabase-server';
import { EphemerisUnavailableError, runFullReAnalysis } from '@/lib/kundli-reanalysis';
import { scheduleOutcomeFollowUps } from '@/lib/outcome-tracking';
import { logRemedyPlan } from '@/lib/remedy-tracking';


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

  // ── Remedy tracking: log the deterministic remedy plan so the user ──
  // can revisit and check off remedies later (see lib/remedy-tracking.js)
  await logRemedyPlan(supabase, {
    userId:     user.id,
    kundliId:   kundli.id,
    source:     'kundli_analysis',
    remedyPlan: factSheet.remedyPlan,
    yogas:      result.planet_data.yogas,
  });

  return Response.json({ kundli, analysis: aiResult.content, model: aiResult.model });
}

// PATCH — edit an existing kundli the user owns.
//
// Two distinct paths, chosen by what actually changed:
//   1. Label-only edit — no birth data touched, so nothing about the
//      chart could possibly change. Instant, no recompute, free.
//   2. full_name/dob/birth_time/birth_place/latitude/longitude/ayanamsa
//      edit — the chart itself may now be different, so this reruns
//      the EXACT same deterministic + AI pipeline as a brand-new
//      kundli (runFullReAnalysis — the single source of truth also
//      used by POST above and the admin bulk-reanalyze route).
//      gender is intentionally NOT re-askable here — see set-gender
//      endpoint; if gender needs to change, prefer that route so the
//      "never guess already-lived facts" audit trail stays intact.
//
// NOTE: this reintroduces a user-facing "पुनः विश्लेषण"-equivalent
// capability (previously removed as a standalone button — see git
// history) but as an explicit, opt-in *consequence of editing birth
// data* rather than an unexplained button, which was the actual
// source of user confusion the earlier removal was fixing.
export async function PATCH(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, label, full_name, dob, birth_time, birth_place, latitude, longitude, ayanamsa } = body;
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  // Ownership check — never trust the client, always verify server-side
  const { data: existing } = await supabase
    .from('saved_kundlis')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!existing || existing.user_id !== user.id) {
    return Response.json({ error: 'Not found or not yours' }, { status: 403 });
  }

  const birthFieldsChanged = (
    (full_name !== undefined && full_name !== existing.full_name) ||
    (dob !== undefined && dob !== existing.dob) ||
    (birth_time !== undefined && birth_time !== existing.birth_time) ||
    (birth_place !== undefined && birth_place !== existing.birth_place) ||
    (latitude !== undefined && parseFloat(latitude) !== existing.latitude) ||
    (longitude !== undefined && parseFloat(longitude) !== existing.longitude) ||
    (ayanamsa !== undefined && ayanamsa !== existing.ayanamsa)
  );

  // ── Path 1: label-only — instant, no recompute ─────────────────
  if (!birthFieldsChanged) {
    const { data: kundli, error } = await supabase
      .from('saved_kundlis')
      .update({ label: label ?? existing.label })
      .eq('id', id)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ kundli, reanalyzed: false });
  }

  // ── Path 2: birth data changed — full recompute + AI re-analysis ─
  const merged = {
    full_name:   full_name ?? existing.full_name,
    dob:         dob ?? existing.dob,
    birth_time:  birth_time ?? existing.birth_time,
    birth_place: birth_place ?? existing.birth_place,
    latitude:    latitude !== undefined ? parseFloat(latitude) : existing.latitude,
    longitude:   longitude !== undefined ? parseFloat(longitude) : existing.longitude,
    ayanamsa:    ayanamsa ?? existing.ayanamsa,
    gender:      existing.gender, // never changed via this route
  };

  let result;
  try {
    result = await runFullReAnalysis(merged);
  } catch (e) {
    if (e instanceof EphemerisUnavailableError) {
      console.error('[Kundli PATCH] Ephemeris unavailable, refusing to save degraded kundli:', e.attempts);
      return Response.json({ error: e.message, retryable: true }, { status: 503 });
    }
    throw e;
  }

  const { data: kundli, error } = await supabase
    .from('saved_kundlis')
    .update({
      label:         label ?? existing.label,
      full_name:     merged.full_name,
      dob:           merged.dob,
      birth_time:    merged.birth_time,
      birth_place:   merged.birth_place,
      latitude:      merged.latitude,
      longitude:     merged.longitude,
      ayanamsa:      merged.ayanamsa,
      planet_data:   result.planet_data,
      luck_score:    result.luck_score,
      last_analysis: result.last_analysis,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // ── Same feedback-loop logging as a fresh kundli — a materially
  // different chart deserves its own predictions_log entry ──────────
  const factSheet = result.planet_data.factSheet;
  const aiResult = result.aiResult;
  const { data: predLog } = await supabase.from('predictions_log').insert({
    user_id:     user.id,
    kundli_id:   kundli.id,
    source:      'kundli_edit_reanalysis',
    fact_sheet:  factSheet,
    ai_response: aiResult.content,
    model_used:  aiResult.model,
  }).select('id').single();

  await scheduleOutcomeFollowUps(
    supabase,
    user.id,
    kundli.id,
    predLog?.id || null,
    factSheet,
    aiResult.content
  );

  // ── Remedy tracking: birth data changed, so the remedy plan may ──
  // have changed too — log the (possibly new) deterministic remedies.
  // Dedup inside logRemedyPlan means unchanged remedies aren't duplicated.
  await logRemedyPlan(supabase, {
    userId:     user.id,
    kundliId:   kundli.id,
    source:     'kundli_analysis',
    remedyPlan: factSheet.remedyPlan,
    yogas:      result.planet_data.yogas,
  });

  return Response.json({ kundli, analysis: aiResult.content, model: aiResult.model, reanalyzed: true });
}

// app/api/kundli/route.js
import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { after } from 'next/server';
import { EphemerisUnavailableError, runFullReAnalysis } from '@/lib/kundli-reanalysis';
import { scheduleOutcomeFollowUps } from '@/lib/outcome-tracking';
import { logRemedyPlan } from '@/lib/remedy-tracking';
import { missingPiecesFromFullRow, backfillOne } from '@/lib/life-domains-backfill';


// GET — fetch all kundlis for logged-in user
// How much the stored birth_time can be trusted — kept in step with the existing
// birth_time_confidence column (migration_005) so the past-validation warning
// logic and the new birth_time_source column never disagree.
const TIME_SOURCES = ['exact', 'approx', 'unknown', 'rectified'];
const TIME_SOURCE_CONFIDENCE = { exact: 100, rectified: 80, approx: 60, unknown: 30 };

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

  // ── On-view auto-heal: if any of THIS user's own kundlis are missing
  // life_domains/annual_timeline (most likely because they were created
  // while a provider was having a bad moment — see lib/ai-engine.js),
  // kick off a background backfill for them the moment the user looks
  // at their profile, so it's often already fixed by their next visit
  // instead of sitting incomplete until the daily cron sweep or an
  // admin notices. after() runs once this response has already been
  // sent, so it adds zero latency to this GET — the user never waits
  // on it. Capped to 2 kundlis per page load (not all of them) so one
  // profile view with several old incomplete kundlis doesn't fire a
  // pile of concurrent AI calls at once; any leftover gets picked up
  // on their next visit or by the cron either way.
  const incomplete = (data || [])
    .map(row => ({ row, pieces: missingPiecesFromFullRow(row) }))
    .filter(k => k.pieces.length > 0)
    .slice(0, 2);

  if (incomplete.length > 0) {
    after(async () => {
      const adminDb = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      for (const { row, pieces } of incomplete) {
        const result = await backfillOne(adminDb, row, pieces, 'on_view_backfill');
        if (result.status === 'error') {
          console.warn(`[OnViewBackfill] ${result.name} (${result.id}) failed: ${result.error}`);
        }
      }
    });
  }

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
  const lang = body.lang === 'en' ? 'en' : 'hi';   // app language -> language of the written analysis
  const birth_time_source = TIME_SOURCES.includes(body.birth_time_source) && body.birth_time_source !== 'rectified' ? body.birth_time_source : 'exact';

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
      ayanamsa: ayanamsa || 'lahiri', gender, birth_time_source, lang,
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
    birth_time_source,
    birth_time_confidence: TIME_SOURCE_CONFIDENCE[birth_time_source],
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
  const { id, label, full_name, dob, birth_time, birth_place, latitude, longitude, ayanamsa, rectification_choice } = body;
  const lang = body.lang === 'en' ? 'en' : 'hi';
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  const newSource = TIME_SOURCES.includes(body.birth_time_source) ? body.birth_time_source : null;

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

  // ── Path 0: regenerate the written analysis in the chosen language ──
  // Birth data is untouched; the chart is recomputed deterministically (same result)
  // and only the AI narrative is re-written in `lang`. Triggered by the
  // "Regenerate in English / Hinglish" button on the Kundli page.
  if (body.regenerate_lang && !birthFieldsChanged) {
    let result;
    try {
      result = await runFullReAnalysis({ ...existing, lang, birth_time_source: existing.birth_time_source ?? 'exact' });
    } catch (e) {
      if (e instanceof EphemerisUnavailableError) return Response.json({ error: e.message, retryable: true }, { status: 503 });
      throw e;
    }
    // Never replace a good analysis with an empty one if every AI piece failed.
    if (!result.aiResult?.content || Object.keys(result.aiResult.content).length === 0) {
      return Response.json({ error: 'AI is busy right now — please try again in a minute.', retryable: true }, { status: 503 });
    }
    const { data: kundli, error } = await supabase
      .from('saved_kundlis')
      .update({ planet_data: result.planet_data, luck_score: result.luck_score, last_analysis: result.last_analysis })
      .eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ kundli, reanalyzed: true, lang });
  }

  // ── Path 1: label-only — instant, no recompute ─────────────────
  if (!birthFieldsChanged) {
    const { data: kundli, error } = await supabase
      .from('saved_kundlis')
      .update({
        label: label ?? existing.label,
        ...(newSource ? { birth_time_source: newSource, birth_time_confidence: TIME_SOURCE_CONFIDENCE[newSource] } : {}),
      })
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
    birth_time_source: newSource ?? existing.birth_time_source ?? 'exact',
    lang,
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
      birth_time_source: merged.birth_time_source,
      birth_time_confidence: TIME_SOURCE_CONFIDENCE[merged.birth_time_source] ?? 100,
      ...(rectification_choice ? { rectification: { ...(existing.rectification || {}), chosen: { ...rectification_choice, applied_at: new Date().toISOString() } } } : {}),
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

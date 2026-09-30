// app/api/kundli/rectify/route.js
//
// POST { kundli_id, events:[{type,date}], window:{mode:'range'|'part'|'unknown', start?, end?, part?} }
// Runs the deterministic birth-time rectification scan for one of the caller's own
// kundlis and returns candidate WINDOWS for the user to choose from. It does NOT
// change the kundli's birth time — applying a choice goes through PATCH /api/kundli
// (birth_time + birth_time_source:'rectified'), which reuses the existing full
// re-analysis pipeline.

import { createClient } from '@/lib/supabase-server';
import { rectifyBirthTime, validateEvents, PART_OF_DAY } from '@/lib/birth-rectification';

export const dynamic = 'force-dynamic';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const { kundli_id, events, window } = body || {};
  if (!kundli_id) return Response.json({ error: 'kundli_id required' }, { status: 400 });

  // Ownership check — never trust the client
  const { data: kundli } = await supabase.from('saved_kundlis').select('*').eq('id', kundli_id).maybeSingle();
  if (!kundli || kundli.user_id !== user.id) return Response.json({ error: 'Not found or not yours' }, { status: 403 });
  if (kundli.latitude == null || kundli.longitude == null) return Response.json({ error: 'Kundli mein latitude/longitude missing hai' }, { status: 400 });

  const v = validateEvents(events, kundli.dob);
  if (typeof v === 'string') return Response.json({ error: v }, { status: 400 });
  if (v.events.length < 2) return Response.json({ error: 'Kam se kam 2 events chahiye (3-5+ se behtar result milta hai)' }, { status: 400 });

  // Validate the time window
  let win = { mode: 'unknown' };
  if (window?.mode === 'part') {
    if (!PART_OF_DAY[window.part]) return Response.json({ error: 'Invalid part of day' }, { status: 400 });
    win = { mode: 'part', part: window.part };
  } else if (window?.mode === 'range') {
    if (!HHMM.test(window.start || '') || !HHMM.test(window.end || '') || window.end < window.start) {
      return Response.json({ error: 'Time range galat hai (start end se pehle hona chahiye, same din ke andar)' }, { status: 400 });
    }
    win = { mode: 'range', start: window.start, end: window.end };
  }

  let result;
  try {
    result = await rectifyBirthTime(kundli, v.events, win);
  } catch (e) {
    console.error('[Rectify] failed:', e.message);
    const unavailable = /EPHEMERIS_SERVICE_URL|rectify-scan|aborted|fetch failed/i.test(e.message);
    return Response.json({
      error: unavailable
        ? 'Calculation service abhi available nahi hai (server jag raha ho sakta hai). 1 minute baad dobara try karein.'
        : 'Rectification chalane mein problem aayi.',
      retryable: unavailable,
    }, { status: unavailable ? 503 : 500 });
  }

  // Remember the events + a compact summary (non-fatal if the columns aren't migrated yet)
  try {
    await supabase.from('saved_kundlis').update({
      life_events: v.events,
      rectification: {
        ran_at: new Date().toISOString(), window: win, confidence: result.confidence,
        by_lagna: result.by_lagna, windows: result.windows.map(w => ({ start: w.start, end: w.end, lagna: w.lagna, score: w.score, matched_count: w.matched_count })),
      },
    }).eq('id', kundli_id);
  } catch (e) {
    console.warn('[Rectify] could not save events (run migration_024?):', e.message);
  }

  return Response.json({ result, events: v.events });
}

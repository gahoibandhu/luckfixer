// lib/life-domains-backfill.js
//
// Single source of truth for "find kundlis missing life_domains/
// annual_timeline and backfill just those pieces" — used by THREE
// callers that all need the exact same logic, so it lives here once
// instead of drifting across copies:
//   1. app/api/admin/migrate-life-domains/route.js — admin-triggered
//      manual batch ("अगला बैच" button)
//   2. app/api/cron/complete-analysis/route.js — scheduled automatic
//      healer, so a gap left by a transient provider outage doesn't
//      sit there until an admin happens to notice
//   3. app/api/kundli/route.js's GET — fires a background backfill for
//      the CURRENT user's own incomplete kundli(s) the moment they load
//      their profile, via Next's after(), so by their next visit it's
//      often already fixed without them ever seeing anything missing
//
// A kundli is "missing" if it lacks life_domains, annual_timeline, or
// both — one AI re-run backfills only whichever piece(s) are absent
// (see lib/kundli-reanalysis.js's runSelectiveAnalysis), never the
// whole analysis.

import { runSelectiveAnalysis } from './kundli-reanalysis';

// For the narrow `id, life_domains, annual_timeline` projection used by
// admin/cron listing queries (Postgres JSON-path select, not a full row).
export function missingPiecesFromProjection(row) {
  const missing = [];
  if (!row.life_domains) missing.push('life_domains');
  if (!row.annual_timeline) missing.push('annual_timeline');
  return missing;
}

// For a FULL saved_kundlis row (planet_data.analysis nested) — used by
// the on-view trigger, which already has the full row in hand from the
// user's own GET /api/kundli and shouldn't issue a second query just to
// re-check in the narrow shape.
export function missingPiecesFromFullRow(row) {
  const analysis = row.planet_data?.analysis || {};
  const missing = [];
  if (!analysis.life_domains) missing.push('life_domains');
  if (!analysis.annual_timeline) missing.push('annual_timeline');
  return missing;
}

// Regenerates `pieces` for ONE existing kundli row and writes the
// result. Returns a small status object — 'ok' (all requested pieces
// saved), 'partial' (some saved, some still missing), or 'error' (none
// saved, all providers failed for every requested piece) — the same
// three states the admin panel already knows how to render.
export async function backfillOne(adminDb, existingRow, pieces) {
  try {
    const result = await runSelectiveAnalysis(existingRow, pieces);

    if (!result.success) {
      const detail = Object.entries(result.pieceErrors).map(([k, v]) => `${k} — ${v}`).join(' | ');
      return { id: existingRow.id, name: existingRow.full_name, status: 'error', error: `All AI providers failed for: ${pieces.join(', ')}. ${detail}` };
    }

    await adminDb.from('saved_kundlis').update({
      planet_data: result.planet_data,
      luck_score: result.luck_score,
      last_analysis: result.last_analysis,
    }).eq('id', existingRow.id);

    if (Object.keys(result.pieceErrors).length > 0) {
      return { id: existingRow.id, name: existingRow.full_name, status: 'partial', error: `Saved ${pieces.filter(p => !result.pieceErrors[p]).join(', ')}; still missing ${Object.keys(result.pieceErrors).join(', ')}.` };
    }

    return { id: existingRow.id, name: existingRow.full_name, status: 'ok' };
  } catch (e) {
    return { id: existingRow.id, name: existingRow.full_name, status: 'error', error: e.message };
  }
}

// How many kundlis, of the total, are still missing at least one piece.
export async function getMissingCounts(adminDb) {
  const { data: kundlis } = await adminDb
    .from('saved_kundlis')
    .select('id, life_domains:planet_data->analysis->life_domains, annual_timeline:planet_data->analysis->annual_timeline');
  const remaining = (kundlis || []).filter(k => missingPiecesFromProjection(k).length > 0);
  return { total: kundlis?.length || 0, remaining: remaining.length, migrated: (kundlis?.length || 0) - remaining.length };
}

// Finds up to `batchSize` incomplete kundlis (oldest-missing first isn't
// tracked, so this is just DB order) and backfills each CONCURRENTLY —
// not one-by-one. Serially, several kundlis each exhausting their full
// provider chain could blow past the route's function timeout, killing
// the request mid-flight with no result returned at all. Parallel caps
// worst case at ~1 kundli's worst case regardless of batch size.
export async function runBackfillBatch(adminDb, batchSize) {
  const { data: idCheck } = await adminDb
    .from('saved_kundlis')
    .select('id, life_domains:planet_data->analysis->life_domains, annual_timeline:planet_data->analysis->annual_timeline');
  const toMigrate = (idCheck || [])
    .map(k => ({ id: k.id, pieces: missingPiecesFromProjection(k) }))
    .filter(k => k.pieces.length > 0)
    .slice(0, batchSize);

  if (toMigrate.length === 0) return { processed: 0, results: [] };

  const { data: kundlis } = await adminDb.from('saved_kundlis').select('*').in('id', toMigrate.map(k => k.id));
  const piecesById = Object.fromEntries(toMigrate.map(k => [k.id, k.pieces]));

  const results = await Promise.all(
    (kundlis || []).map(existing => backfillOne(adminDb, existing, piecesById[existing.id]))
  );

  return { processed: results.length, results };
}

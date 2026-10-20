// lib/kundli-status.js
//
// One cheap answer to "which kundlis still need a backfill?" — shared by the admin panel,
// the daily cron (complete-analysis) and the admin "अगला बैच" loop.
//
// Before: every caller did `select id, planet_data from saved_kundlis` (the WHOLE table incl. the big JSON) and counted in JavaScript.
// The admin page alone did that 3x on every load, and the batch loop 2x per batch. That was ~74% of database time (see
// supabase/migration_028) and is what made the Supabase dashboard stall.
// Now: ONE Postgres function (kundli_migration_overview) returns only small id lists, and the result is cached for 30 s per server
// instance so the three admin cards share a single scan.
//
// If migration_028 has not been run yet, this falls back to the old behaviour but with narrow JSON-path projections (still
// better than select(planet_data)), so deploying the code before the SQL never breaks the admin panel.

import { abortAfter } from '@/lib/supabase-fetch';

const TTL_MS = 30_000;
let cache = null;
let cacheAt = 0;
let inflight = null;
let warnedLegacy = false;

export function invalidateKundliOverview() { cache = null; cacheAt = 0; }

const piecesOf = (flags) => [flags.life_domains && 'life_domains', flags.annual_timeline && 'annual_timeline'].filter(Boolean);

function fromRpc(d) {
  return {
    total: Number(d.total) || 0,
    lagnaMissingIds: d.lagna_missing_ids || [],
    supportChainIds: d.support_chain_ids || [],
    analysisMissing: (d.analysis_missing || []).map(r => ({ id: r.id, pieces: piecesOf(r) })),
    source: 'rpc',
  };
}

// Fallback (migration_028 not applied): page through narrow JSON-path projections, 1000 rows at a time (PostgREST caps a single response at 1000 rows).
async function legacyOverview(adminDb) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await adminDb
      .from('saved_kundlis')
      .select('id, lagna:planet_data->factSheet->lagna, sc:planet_data->factSheet->supportChain, rp:planet_data->factSheet->remedyPlan, ld:planet_data->analysis->life_domains, tl:planet_data->analysis->annual_timeline')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + 999)
      .abortSignal(abortAfter(20000));
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return {
    total: rows.length,
    lagnaMissingIds: rows.filter(r => !r.lagna).map(r => r.id),
    supportChainIds: rows.filter(r => r.lagna && (!r.sc || !r.rp)).map(r => r.id),
    analysisMissing: rows
      .map(r => ({ id: r.id, pieces: piecesOf({ life_domains: !r.ld, annual_timeline: !r.tl }) }))
      .filter(r => r.pieces.length > 0),
    source: 'legacy',
  };
}

/** { total, lagnaMissingIds[], supportChainIds[], analysisMissing: [{ id, pieces[] }] } — cached 30 s per instance. */
export async function getKundliOverview(adminDb, { fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cacheAt < TTL_MS) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      let ov;
      const { data, error } = await adminDb.rpc('kundli_migration_overview').abortSignal(abortAfter(20000));
      if (!error && data) {
        ov = fromRpc(data);
      } else {
        if (!warnedLegacy) { warnedLegacy = true; console.warn('[kundli-status] kundli_migration_overview() not available (' + (error?.message || 'no data') + ') — run supabase/migration_028_kundli_migration_overview.sql. Using the slower fallback.'); }
        ov = await legacyOverview(adminDb);
      }
      cache = ov; cacheAt = Date.now();
      return ov;
    } finally { inflight = null; }
  })();
  return inflight;
}

/** After a batch: drop the rows that are now complete from the cached list, so the status call right after it needs no new scan. */
export function markAnalysisDone(ids) {
  if (!cache) return;
  const done = new Set(ids);
  cache = { ...cache, analysisMissing: cache.analysisMissing.filter(r => !done.has(r.id)) };
  cacheAt = Date.now();
}

/** Fetch full rows for a list of ids in small chunks (never an unbounded select('*')). */
export async function fetchKundlisByIds(adminDb, ids, chunk = 25) {
  const out = [];
  for (let i = 0; i < ids.length; i += chunk) {
    const { data, error } = await adminDb.from('saved_kundlis').select('*').in('id', ids.slice(i, i + chunk));
    if (error) throw new Error(error.message);
    out.push(...(data || []));
  }
  return out;
}

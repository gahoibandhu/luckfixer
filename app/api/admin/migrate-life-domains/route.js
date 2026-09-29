// app/api/admin/migrate-life-domains/route.js
//
// Admin-triggered batch backfill: re-runs AI analysis for existing
// kundlis missing either the life_domains schema OR the newer
// annual_timeline (birthday-bound transit periods) schema — so users
// never have to click anything themselves. A kundli is "remaining" if
// it's missing life_domains, annual_timeline, or both.
//
// Regenerates ONLY the specific missing piece(s) per kundli (via
// lib/kundli-reanalysis.js's runSelectiveAnalysis), not the whole
// analysis — a kundli missing just life_domains no longer also
// re-spends an AI call re-generating an annual_timeline it already
// has. This also means a single-piece failure only ever needs that one
// piece retried, not the whole kundli. Unlike migrate-kundlis/route.js
// (deterministic-only, free), this DOES call the AI, so it's
// rate-limited to a small batch per request — the admin panel calls
// this repeatedly ("अगला बैच") until GET reports zero remaining.
import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { runSelectiveAnalysis } from '@/lib/kundli-reanalysis';

export const dynamic = 'force-dynamic';
const BATCH_SIZE = 5; // small on purpose — AI calls are the slow/costly part

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function missingPieces(k) {
  const missing = [];
  if (!k.life_domains) missing.push('life_domains');
  if (!k.annual_timeline) missing.push('annual_timeline');
  return missing;
}

// GET — how many kundlis still need migrating
export async function GET() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const adminDb = getSupabaseAdmin();
  // Narrow JSON-path projection — Postgres extracts just these nested
  // fields server-side, so we're not pulling the (often large) full
  // planet_data blob over the wire just to check two boolean-ish flags.
  const { data: kundlis } = await adminDb
    .from('saved_kundlis')
    .select('id, life_domains:planet_data->analysis->life_domains, annual_timeline:planet_data->analysis->annual_timeline');
  const remaining = (kundlis || []).filter(k => missingPieces(k).length > 0);

  return Response.json({ total: kundlis?.length || 0, remaining: remaining.length, migrated: (kundlis?.length || 0) - remaining.length });
}

// POST — process one batch (BATCH_SIZE kundlis)
export async function POST() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const adminDb = getSupabaseAdmin();

  // Two-step: first a narrow query to find WHICH kundlis need migrating
  // (cheap), then fetch full rows only for the small batch we'll
  // actually process — instead of pulling every kundli's full
  // planet_data blob just to filter most of it away in JS.
  const { data: idCheck } = await adminDb
    .from('saved_kundlis')
    .select('id, life_domains:planet_data->analysis->life_domains, annual_timeline:planet_data->analysis->annual_timeline');
  const toMigrateIds = (idCheck || [])
    .map(k => ({ id: k.id, pieces: missingPieces(k) }))
    .filter(k => k.pieces.length > 0)
    .slice(0, BATCH_SIZE);

  if (toMigrateIds.length === 0) {
    return Response.json({ processed: 0, results: [] });
  }

  const { data: kundlis } = await adminDb.from('saved_kundlis').select('*').in('id', toMigrateIds.map(k => k.id));
  const piecesById = Object.fromEntries(toMigrateIds.map(k => [k.id, k.pieces]));

  // Processed CONCURRENTLY, not one-by-one. Serially, a batch of 5 where
  // several kundlis exhaust all providers on their missing piece(s)
  // could take 5× a single piece's worst case — past this route's
  // function timeout, so Vercel kills the request mid-flight and the
  // admin panel's "चल रहा है..." button never resolves (no error, no
  // result — just stuck, since the fetch never returns). Running the
  // batch in parallel caps worst case at ~1× regardless of batch size.
  const results = await Promise.all((kundlis || []).map(async (existing) => {
    try {
      const pieces = piecesById[existing.id];
      const result = await runSelectiveAnalysis(existing, pieces);

      // Bug this fixes (still applies per-piece now): when every AI
      // provider fails for a piece, getLuckfixerResponse doesn't throw
      // — runSelectiveAnalysis reports it in pieceErrors and, only if
      // EVERY requested piece failed, returns success:false instead of
      // writing anything. That avoids both destroying a kundli's
      // existing good analysis AND leaving it looking "processed" while
      // still missing the field — the original infinite-loop bug.
      if (!result.success) {
        const detail = Object.entries(result.pieceErrors).map(([k, v]) => `${k} — ${v}`).join(' | ');
        return { id: existing.id, name: existing.full_name, status: 'error', error: `All AI providers failed for: ${pieces.join(', ')} — will retry next batch. ${detail}` };
      }

      await adminDb.from('saved_kundlis').update({
        planet_data: result.planet_data,
        luck_score: result.luck_score,
        last_analysis: result.last_analysis,
      }).eq('id', existing.id);

      // Partial success (e.g. life_domains landed, annual_timeline's
      // provider chain failed) still counts as 'ok' for the piece(s)
      // that DID save — the next GET's remaining-count will correctly
      // still flag this kundli for just the piece that's still missing.
      if (Object.keys(result.pieceErrors).length > 0) {
        return { id: existing.id, name: existing.full_name, status: 'partial', error: `Saved ${pieces.filter(p => !result.pieceErrors[p]).join(', ')}; still missing ${Object.keys(result.pieceErrors).join(', ')} — will retry next batch.` };
      }

      return { id: existing.id, name: existing.full_name, status: 'ok' };
    } catch (e) {
      return { id: existing.id, name: existing.full_name, status: 'error', error: e.message };
    }
  }));

  return Response.json({ processed: results.length, results });
}

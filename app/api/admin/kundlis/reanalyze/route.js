// app/api/admin/kundlis/reanalyze/route.js
//
// Admin-triggered BULK full re-analysis — runs the complete
// deterministic pipeline + AI narrative for existing kundlis, bypassing
// the per-user ownership check that the regular PATCH /api/kundli route
// enforces (an admin needs to be able to do this for ANY user's
// kundli, not just their own).
//
// Uses the exact same lib/kundli-reanalysis.js logic as the user-facing
// re-analyze button — same single source of truth, just invoked in
// bulk by an admin instead of one at a time by each kundli's owner.
// This is the "complete fix" — it also picks up the varshaphal
// solar-return date-anchoring fix (मासिक tab), not just supportChain/
// remedyPlan. Costs one AI call per kundli, so it's deliberately
// batched (accepts explicit ids, processed sequentially) rather than
// an unbounded "reanalyze everything at once" that could time out or
// burn through AI quota in one request.

import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { runFullReAnalysis, EphemerisUnavailableError } from '@/lib/kundli-reanalysis';
import { logRemedyPlan } from '@/lib/remedy-tracking';

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { ids } = await req.json().catch(() => ({}));
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: 'ids (array) required — select specific kundlis to re-analyze, in batches, rather than the whole table in one request' }, { status: 400 });
  }
  if (ids.length > 25) {
    return Response.json({ error: 'एक बार में अधिकतम 25 — बड़ी संख्या को कई batches में बाँटें ताकि request timeout न हो' }, { status: 400 });
  }

  const adminDb = getSupabaseAdmin();
  const results = { succeeded: [], failed: [], retryable: [] };

  for (const id of ids) {
    try {
      const { data: existing, error: fetchErr } = await adminDb
        .from('saved_kundlis')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr || !existing) {
        results.failed.push({ id, error: fetchErr?.message || 'not found' });
        continue;
      }

      const result = await runFullReAnalysis(existing);

      const { error: updateErr } = await adminDb
        .from('saved_kundlis')
        .update({ planet_data: result.planet_data, luck_score: result.luck_score, last_analysis: result.last_analysis })
        .eq('id', id);

      if (updateErr) {
        results.failed.push({ id, error: updateErr.message });
      } else {
        results.succeeded.push(id);
        // ── Remedy tracking gap fix: the regular user-facing PATCH ──
        // /api/kundli route logs remedies, but this admin bulk path
        // updates saved_kundlis directly and was skipping it — meaning
        // any kundli only ever touched via bulk re-analyze never got
        // its remedies into "मेरे उपाय". adminDb is a service-role
        // client here, so it can insert for any user_id regardless of
        // RLS (needed since this loop touches many different users).
        try {
          await logRemedyPlan(adminDb, {
            userId:     existing.user_id,
            kundliId:   id,
            source:     'kundli_analysis',
            remedyPlan: result.planet_data?.factSheet?.remedyPlan,
            yogas:      result.planet_data?.yogas,
          });
        } catch (e) {
          console.warn('[Admin Reanalyze] remedy logging failed (non-fatal):', e.message);
        }
      }
    } catch (e) {
      if (e instanceof EphemerisUnavailableError) {
        results.retryable.push({ id, error: e.message }); // transient — try again in a later batch
      } else {
        results.failed.push({ id, error: e.message });
      }
    }
  }

  return Response.json(results);
}

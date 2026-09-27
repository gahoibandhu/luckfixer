// app/api/admin/prediction-brain/route.js
// Read-only visibility into the accuracy-feedback loop (migration_014/
// 015/021): which dasha combinations, yogas, and the remedy-vs-no-
// remedy split are actually tracking as accurate across real user
// outcomes. Same aggregate-only views the AI itself reads from — this
// just surfaces them to the admin panel so the "learning" is visible
// instead of invisible background plumbing.

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export const dynamic = 'force-dynamic';

const MIN_SAMPLE = 8; // same honesty-gate threshold used by the getters in lib/outcome-tracking.js

export async function GET() {
  const supabase = await createServerClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const adminDb = getSupabaseAdmin();

  const [{ data: dashaRows }, { data: yogaRows }, { data: remedyRows }] = await Promise.all([
    adminDb.from('dasha_accuracy_stats').select('*'),
    adminDb.from('yoga_accuracy_stats').select('*'),
    adminDb.from('remedy_outcome_correlation').select('*'),
  ]);

  const withPct = rows => (rows || [])
    .filter(r => (r.responded || 0) >= MIN_SAMPLE)
    .map(r => ({ ...r, positivePct: Math.round((r.positive / r.responded) * 100) }))
    .sort((a, b) => b.responded - a.responded);

  const remedy = (remedyRows || []).length === 2 ? {
    tookRemedy: remedyRows.find(r => r.took_remedy === true),
    noRemedy: remedyRows.find(r => r.took_remedy === false),
  } : null;

  return Response.json({
    dasha: withPct(dashaRows).slice(0, 10),
    yoga: withPct(yogaRows).slice(0, 10),
    remedy,
    minSample: MIN_SAMPLE,
    totalTracked: (dashaRows || []).reduce((s, r) => s + (r.responded || 0), 0),
  });
}

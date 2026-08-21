// app/api/admin/kundlis/route.js
//
// Admin visibility into ALL kundlis' data-freshness — so migration is
// triggered centrally from the admin panel, not left to individual
// users to notice a stale reading and act on it themselves.

import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET — list every kundli with data-freshness flags: does it have a
// lagna at all (oldest rows might not), does it have supportChain/
// remedyPlan (this session's feature), and when was it last analyzed
// (a kundli analyzed before the varshaphal date-anchoring fix will
// have a stale/broken मासिक tab until it's re-analyzed).
export async function GET() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const adminDb = getSupabaseAdmin();
  const { data: kundlis, error } = await adminDb
    .from('saved_kundlis')
    .select('id, user_id, full_name, dob, gender, last_analysis, planet_data')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = (kundlis || []).map(k => {
    const fs = k.planet_data?.factSheet;
    return {
      id: k.id,
      full_name: k.full_name,
      dob: k.dob,
      gender: k.gender,
      last_analysis: k.last_analysis,
      hasLagna: !!fs?.lagna,
      hasSupportChain: !!(fs?.supportChain && fs?.remedyPlan),
      engineUsed: fs?.engineUsed || null,
    };
  });

  return Response.json({
    total: rows.length,
    needsGender: rows.filter(r => !r.gender).length,
    needsSupportChainOnly: rows.filter(r => r.hasLagna && !r.hasSupportChain).length,
    needsFullRebuild: rows.filter(r => !r.hasLagna).length,
    kundlis: rows,
  });
}

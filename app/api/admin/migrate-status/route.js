// app/api/admin/migrate-status/route.js
//
// GET — all three backfill cards of the admin panel (lagna / support-chain / life_domains) in ONE request and ONE
// database-side check (lib/kundli-status.js). The admin page used to call three routes on every load, and each one
// pulled the whole saved_kundlis table including planet_data.
import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getKundliOverview } from '@/lib/kundli-status';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const adminDb = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const ov = await getKundliOverview(adminDb);
  const remaining = ov.analysisMissing.length;
  return Response.json({
    lagna:        { total: ov.total, needsMigration: ov.lagnaMissingIds.length },
    supportChain: { total: ov.total, needsMigration: ov.supportChainIds.length },
    lifeDomains:  { total: ov.total, remaining, migrated: ov.total - remaining },
  });
}

// app/api/admin/features/route.js
//
// Feature-adoption dashboard data. Before this route (and
// migration_012 + the logging calls in milan/route.js and
// ram-shalaka/log/route.js), the admin panel had visibility into
// chat and numerology usage but ZERO signal on Kundli Milan or Ram
// Shalaka — they simply wrote nothing to the database. This is the
// "micro data" gap: knowing 40 chats happened today tells you
// nothing about whether people are actually finding/using the other
// 3 tools on the site.

import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const adminSupabase = getSupabaseAdmin();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: numerologyTotal }, { count: numerology7d },
    { count: kundliTotal }, { count: kundli7d },
    { count: chatSessionsTotal }, { count: chatSessions7d },
    { data: usageLogRows },
  ] = await Promise.all([
    adminSupabase.from('numerology_queries').select('*', { count: 'exact', head: true }),
    adminSupabase.from('numerology_queries').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    adminSupabase.from('saved_kundlis').select('*', { count: 'exact', head: true }),
    adminSupabase.from('saved_kundlis').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    adminSupabase.from('chat_sessions').select('*', { count: 'exact', head: true }),
    adminSupabase.from('chat_sessions').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    // feature_usage_log covers milan + ram_shalaka (migration_012) —
    // pulled once and split in JS since it's a small table by nature
    // (one row per reading/match, not per message).
    adminSupabase.from('feature_usage_log').select('feature, created_at').gte('created_at', thirtyDaysAgo),
  ]);

  function splitCounts(feature) {
    const rows = (usageLogRows || []).filter(r => r.feature === feature);
    return {
      total7d: rows.filter(r => r.created_at >= sevenDaysAgo).length,
      total30d: rows.length,
    };
  }

  const milan = splitCounts('milan');
  const ramShalaka = splitCounts('ram_shalaka');

  // All-time totals for milan/ram_shalaka aren't available from a
  // 30-day-windowed query — fetch those as separate head-counts.
  const [{ count: milanTotal }, { count: ramShalakaTotal }] = await Promise.all([
    adminSupabase.from('feature_usage_log').select('*', { count: 'exact', head: true }).eq('feature', 'milan'),
    adminSupabase.from('feature_usage_log').select('*', { count: 'exact', head: true }).eq('feature', 'ram_shalaka'),
  ]);

  return Response.json({
    features: [
      { key: 'chat',        label: 'Chat Sessions',   total: chatSessionsTotal || 0, last7d: chatSessions7d || 0 },
      { key: 'kundli',      label: 'Kundli बनी',       total: kundliTotal || 0,       last7d: kundli7d || 0 },
      { key: 'numerology',  label: 'अंक ज्योतिष',       total: numerologyTotal || 0,   last7d: numerology7d || 0 },
      { key: 'milan',       label: 'कुंडली मिलान',      total: milanTotal || 0,        last7d: milan.total7d },
      { key: 'ram_shalaka', label: 'राम शलाका',        total: ramShalakaTotal || 0,   last7d: ramShalaka.total7d },
    ],
  });
}

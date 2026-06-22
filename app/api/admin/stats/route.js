// app/api/admin/stats/route.js
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

  // Total user count
  const { count: totalUsers } = await adminSupabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });

  // Total kundlis saved
  const { count: totalKundlis } = await adminSupabase
    .from('saved_kundlis')
    .select('*', { count: 'exact', head: true });

  // Today's usage across all users
  const today = new Date().toISOString().split('T')[0];
  const { data: todayUsage } = await adminSupabase
    .from('usage_log')
    .select('chat_count, free_mins_used, total_tokens')
    .eq('log_date', today);

  const todayTotals = (todayUsage || []).reduce((acc, row) => ({
    chats: acc.chats + (row.chat_count || 0),
    mins:  acc.mins + parseFloat(row.free_mins_used || 0),
    tokens: acc.tokens + (row.total_tokens || 0),
  }), { chats: 0, mins: 0, tokens: 0 });

  // Active users today (had at least 1 chat)
  const activeToday = (todayUsage || []).filter(r => r.chat_count > 0).length;

  // Last 7 days usage trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: weekUsage } = await adminSupabase
    .from('usage_log')
    .select('log_date, chat_count, free_mins_used')
    .gte('log_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('log_date', { ascending: true });

  // Aggregate by date
  const dailyMap = {};
  (weekUsage || []).forEach(row => {
    if (!dailyMap[row.log_date]) dailyMap[row.log_date] = { date: row.log_date, chats: 0, mins: 0, users: 0 };
    dailyMap[row.log_date].chats += row.chat_count || 0;
    dailyMap[row.log_date].mins  += parseFloat(row.free_mins_used || 0);
    dailyMap[row.log_date].users += 1;
  });
  const weekTrend = Object.values(dailyMap);

  // Plan config
  const { data: plan } = await adminSupabase
    .from('plan_config')
    .select('*')
    .eq('plan_name', 'free')
    .single();

  // Recent users
  const { data: recentUsers } = await adminSupabase
    .from('user_profiles')
    .select('id, full_name, email, mobile, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  // Outcome tracking aggregate (all users combined for admin view)
  const { data: outcomeRows } = await adminSupabase
    .from('outcome_tracking')
    .select('outcome')
    .not('outcome', 'is', null);

  const outcomeStats = outcomeRows ? {
    total_tracked: outcomeRows.length,
    confirmed:  outcomeRows.filter(r => r.outcome === 'confirmed').length,
    denied:     outcomeRows.filter(r => r.outcome === 'denied').length,
    partial:    outcomeRows.filter(r => r.outcome === 'partial').length,
    accuracy_pct: outcomeRows.length > 0
      ? Math.round(outcomeRows.filter(r => ['confirmed','partial'].includes(r.outcome)).length / outcomeRows.length * 100)
      : null,
  } : null;

  return Response.json({
    totalUsers: totalUsers || 0,
    totalKundlis: totalKundlis || 0,
    activeToday,
    today: todayTotals,
    weekTrend,
    plan,
    recentUsers: recentUsers || [],
    outcomeStats,
  });
}

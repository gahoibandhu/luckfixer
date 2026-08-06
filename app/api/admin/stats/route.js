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
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // ── PERFORMANCE FIX ─────────────────────────────────────────
  // Previously these 7 queries ran sequentially (await one at a time),
  // meaning total load time = sum of every query's round-trip latency.
  // None of these queries depend on each other's results, so running
  // them in parallel via Promise.all cuts admin panel load time down
  // to roughly the SLOWEST single query instead of the sum of all 7 —
  // this was the main cause of the admin panel feeling slow.
  const [
    { count: totalUsers },
    { count: totalKundlis },
    { data: todayUsage },
    { data: weekUsage },
    { data: plan },
    { data: recentUsers },
    { data: outcomeRows },
    { data: modelRows },
  ] = await Promise.all([
    adminSupabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    adminSupabase.from('saved_kundlis').select('*', { count: 'exact', head: true }),
    adminSupabase.from('usage_log').select('chat_count, free_mins_used, total_tokens').eq('log_date', today),
    adminSupabase.from('usage_log').select('log_date, chat_count, free_mins_used').gte('log_date', sevenDaysAgo.toISOString().split('T')[0]).order('log_date', { ascending: true }),
    adminSupabase.from('plan_config').select('*').eq('plan_name', 'free').single(),
    adminSupabase.from('user_profiles').select('id, full_name, email, mobile, created_at').order('created_at', { ascending: false }).limit(20),
    adminSupabase.from('outcome_tracking').select('outcome').not('outcome', 'is', null),
    // ── Model usage breakdown (last 7 days) — surfaces exactly how often
    // Gemini (primary) vs weaker fallback providers (SambaNova/OpenRouter/
    // HuggingFace/Groq) are actually answering chats. If quality feels
    // poor, this number tells you whether it's because most real traffic
    // is landing on Gemini's free-tier rate limit and silently falling
    // back to a weaker model that doesn't follow the system prompt as
    // reliably — rather than guessing from anecdotal chat transcripts.
    adminSupabase.from('chat_messages').select('model_used').eq('role', 'assistant').gte('created_at', sevenDaysAgo.toISOString()).not('model_used', 'is', null),
  ]);

  const modelBreakdown = {};
  (modelRows || []).forEach(r => {
    const key = r.model_used || 'unknown';
    modelBreakdown[key] = (modelBreakdown[key] || 0) + 1;
  });
  const modelBreakdownTotal = (modelRows || []).length;
  const modelBreakdownList = Object.entries(modelBreakdown)
    .map(([model, count]) => ({ model, count, pct: modelBreakdownTotal > 0 ? Math.round(count / modelBreakdownTotal * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  const todayTotals = (todayUsage || []).reduce((acc, row) => ({
    chats: acc.chats + (row.chat_count || 0),
    mins:  acc.mins + parseFloat(row.free_mins_used || 0),
    tokens: acc.tokens + (row.total_tokens || 0),
  }), { chats: 0, mins: 0, tokens: 0 });

  const activeToday = (todayUsage || []).filter(r => r.chat_count > 0).length;

  const dailyMap = {};
  (weekUsage || []).forEach(row => {
    if (!dailyMap[row.log_date]) dailyMap[row.log_date] = { date: row.log_date, chats: 0, mins: 0, users: 0 };
    dailyMap[row.log_date].chats += row.chat_count || 0;
    dailyMap[row.log_date].mins  += parseFloat(row.free_mins_used || 0);
    dailyMap[row.log_date].users += 1;
  });
  const weekTrend = Object.values(dailyMap);

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
    modelBreakdown: modelBreakdownList,
  });
}

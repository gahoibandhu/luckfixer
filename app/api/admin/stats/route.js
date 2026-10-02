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

  // ── Resilient loading ─────────────────────────────────────────
  // Every query below runs in parallel, each with its own 9s abort and its own
  // error capture. One slow or failing query (e.g. Postgres 57014 "statement
  // timeout") used to silently blank its part of the dashboard — and the
  // dashboard just looked broken. Now the rest still loads, and the response
  // carries `warnings` naming exactly what failed so the admin panel can say so.
  const warnings = [];
  async function run(label, makeQuery) {
    try {
      const r = await makeQuery().abortSignal(AbortSignal.timeout(9000));
      if (r.error) { console.error(`[Admin stats] ${label}:`, r.error.message); warnings.push(label); return { data: null, count: null }; }
      return r;
    } catch (e) {
      console.error(`[Admin stats] ${label}:`, e.message);
      warnings.push(label);
      return { data: null, count: null };
    }
  }
  const countOf = (table, col, val) => run(`${table} count`, () => {
    let q = adminSupabase.from(table).select('*', { count: 'exact', head: true });
    if (col) q = val === null ? q.not(col, 'is', null) : q.eq(col, val);
    return q;
  });
  const weekStartDate = sevenDaysAgo.toISOString().split('T')[0];

  const [
    { count: totalUsers },
    { count: totalKundlis },
    { data: todayUsage },
    { data: weekUsage },
    { data: plan },
    { data: recentUsers },
    modelRpc,
    // outcome tracking + remedy engagement: exact COUNTs instead of downloading
    // every row (the API silently caps row downloads at 1000, so those numbers
    // were also wrong once the tables grew past that).
    { count: oTotal }, { count: oConfirmed }, { count: oDenied }, { count: oPartial }, { count: oSkipped },
    { count: rTotal }, { count: rDone }, { count: rPending }, { count: rSkipped },
    { data: aiLogRows },
  ] = await Promise.all([
    run('user_profiles count', () => adminSupabase.from('user_profiles').select('*', { count: 'exact', head: true })),
    run('saved_kundlis count', () => adminSupabase.from('saved_kundlis').select('*', { count: 'exact', head: true })),
    run('usage today', () => adminSupabase.from('usage_log').select('user_id, chat_count, free_mins_used, total_tokens').eq('log_date', today)),
    run('usage 7 days', () => adminSupabase.from('usage_log').select('log_date, chat_count, free_mins_used, total_tokens').gte('log_date', weekStartDate).order('log_date', { ascending: true })),
    run('plan config', () => adminSupabase.from('plan_config').select('*').eq('plan_name', 'free').single()),
    run('recent users', () => adminSupabase.from('user_profiles').select('id, full_name, email, mobile, created_at').order('created_at', { ascending: false }).limit(20)),
    // Model usage breakdown (last 7 days): chat replies + background AI calls
    // (kundli creation / reanalysis / backfill), aggregated INSIDE Postgres by
    // admin_model_breakdown() (migration_026) — only a handful of rows come back.
    run('model breakdown (run migration_026)', () => adminSupabase.rpc('admin_model_breakdown', { since: sevenDaysAgo.toISOString() })),
    countOf('outcome_tracking', 'outcome', null),
    countOf('outcome_tracking', 'outcome', 'confirmed'),
    countOf('outcome_tracking', 'outcome', 'denied'),
    countOf('outcome_tracking', 'outcome', 'partial'),
    countOf('outcome_tracking', 'outcome', 'skipped'),
    countOf('user_remedies'),
    countOf('user_remedies', 'status', 'done'),
    countOf('user_remedies', 'status', 'pending'),
    countOf('user_remedies', 'status', 'skipped'),
    // AI token ledger for every non-chat feature (migration_027). Bounded to 7 days.
    run('ai usage ledger (run migration_027)', () => adminSupabase.from('ai_usage_log').select('feature, tokens_est, created_at').gte('created_at', sevenDaysAgo.toISOString()).limit(10000)),
  ]);

  // Sum rows per model name (the same model can appear in both the chat and background halves).
  const modelBreakdown = {};
  (modelRpc?.data || []).forEach(r => {
    const key = (r.model || 'unknown').trim() || 'unknown';
    modelBreakdown[key] = (modelBreakdown[key] || 0) + Number(r.cnt || 0);
  });
  const modelBreakdownTotal = Object.values(modelBreakdown).reduce((a, b) => a + b, 0);
  const modelBreakdownList = Object.entries(modelBreakdown)
    .map(([model, count]) => ({ model, count, pct: modelBreakdownTotal > 0 ? Math.round(count / modelBreakdownTotal * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  const todayTotals = (todayUsage || []).reduce((acc, row) => ({
    chats: acc.chats + (row.chat_count || 0),
    mins:  acc.mins + parseFloat(row.free_mins_used || 0),
    tokens: acc.tokens + (row.total_tokens || 0),
  }), { chats: 0, mins: 0, tokens: 0 });

  const activeToday = (todayUsage || []).filter(r => r.chat_count > 0).length;

  // ── AI tokens by feature (today + 7 days) ─────────────────────────
  // Chat comes from usage_log (already counted); everything else from ai_usage_log.
  // Previously the dashboard showed ONLY chat tokens, so kundli analysis, numerology
  // etc. were invisible. Values are estimates (characters / 4).
  const todayStartIso = today + 'T00:00:00';
  const aiByFeature = {};
  (aiLogRows || []).forEach(r => {
    const f = aiByFeature[r.feature] || (aiByFeature[r.feature] = { feature: r.feature, today: 0, week: 0, calls: 0 });
    f.week += r.tokens_est || 0; f.calls += 1;
    if (r.created_at >= todayStartIso) f.today += r.tokens_est || 0;
  });
  const chatWeekTokens = (weekUsage || []).reduce((n, r) => n + (r.total_tokens || 0), 0);
  const aiUsageByFeature = [
    { feature: 'chat', today: todayTotals.tokens, week: chatWeekTokens, calls: (weekUsage || []).reduce((n, r) => n + (r.chat_count || 0), 0) },
    ...Object.values(aiByFeature),
  ].sort((a, b) => b.week - a.week);

  // ── Real signed-in "visitors" today ──────────────────────────
  // activeToday (above) only counts people who actually SENT a chat
  // message — it misses someone who logged in, browsed their kundli
  // or profile, and left without chatting. Supabase Auth's
  // last_sign_in_at is the ground-truth signal for "opened the app
  // today" regardless of what they did once inside.
  //
  // PERFORMANCE FIX: this used to page through listUsers sequentially
  // (await one page, decide whether to fetch the next, repeat) — on
  // an account with a few thousand users that's several sequential
  // round-trips to the slowest API in this whole route, all on the
  // critical path of the tab that loads by default. totalUsers is
  // already known from the Promise.all above, so the exact page count
  // needed can be computed upfront and every page fetched in parallel
  // instead of one at a time.
  let todayVisitors = 0;
  let totalAuthUsers = 0;
  try {
    const perPage = 1000;
    const maxPages = 10; // safety cap — 10,000 users
    const pagesNeeded = Math.min(Math.max(Math.ceil((totalUsers || 0) / perPage), 1), maxPages);
    const pageResults = await Promise.all(
      Array.from({ length: pagesNeeded }, (_, i) => adminSupabase.auth.admin.listUsers({ page: i + 1, perPage }))
    );
    for (const { data: pageData, error: pageErr } of pageResults) {
      if (pageErr || !pageData?.users?.length) continue;
      totalAuthUsers += pageData.users.length;
      todayVisitors += pageData.users.filter(u => u.last_sign_in_at && u.last_sign_in_at.slice(0, 10) === today).length;
    }
  } catch (e) {
    console.error('[Admin stats] listUsers error (non-fatal):', e.message);
  }

  // ── Per-user usage today — "token kisne kitna use kiya" ──────
  // Sorted by token spend so the heaviest users (or a runaway bug on
  // one account) are immediately visible, not buried in an average.
  const todayUserIds = [...new Set((todayUsage || []).map(r => r.user_id).filter(Boolean))];
  let todayUsersDetailed = [];
  if (todayUserIds.length > 0) {
    const { data: profiles } = await adminSupabase
      .from('user_profiles').select('id, full_name, email').in('id', todayUserIds);
    const profileById = {};
    (profiles || []).forEach(p => { profileById[p.id] = p; });
    todayUsersDetailed = (todayUsage || [])
      .map(r => ({
        user_id: r.user_id,
        full_name: profileById[r.user_id]?.full_name || '',
        email: profileById[r.user_id]?.email || '(unknown)',
        chats: r.chat_count || 0,
        mins: parseFloat((r.free_mins_used || 0).toFixed ? r.free_mins_used.toFixed(2) : r.free_mins_used || 0),
        tokens: r.total_tokens || 0,
      }))
      .sort((a, b) => b.tokens - a.tokens);
  }

  const dailyMap = {};
  (weekUsage || []).forEach(row => {
    if (!dailyMap[row.log_date]) dailyMap[row.log_date] = { date: row.log_date, chats: 0, mins: 0, tokens: 0, users: 0 };
    dailyMap[row.log_date].chats  += row.chat_count || 0;
    dailyMap[row.log_date].mins   += parseFloat(row.free_mins_used || 0);
    dailyMap[row.log_date].tokens += row.total_tokens || 0;
    dailyMap[row.log_date].users  += 1;
  });
  const weekTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Same honesty gate as the personal track-record shown in chat
  // (MIN_TRACKED_FOR_DISPLAY in app/api/chat/route.js) — a handful of
  // early responses would otherwise show a falsely precise 0%/100%.
  const MIN_RESPONDED_FOR_ADMIN_ACCURACY = 5;
  const responded = Math.max(0, (oTotal || 0) - (oSkipped || 0));
  const outcomeStats = oTotal !== null && oTotal !== undefined ? {
    total_tracked: oTotal || 0,
    confirmed: oConfirmed || 0,
    denied:    oDenied || 0,
    partial:   oPartial || 0,
    accuracy_pct: responded >= MIN_RESPONDED_FOR_ADMIN_ACCURACY
      ? Math.round(((oConfirmed || 0) + (oPartial || 0)) / responded * 100)
      : null,
  } : null;

  const remedyStats = rTotal !== null && rTotal !== undefined ? {
    total_given:   rTotal || 0,
    done:          rDone || 0,
    pending:       rPending || 0,
    skipped:       rSkipped || 0,
    completion_pct: rTotal > 0 ? Math.round((rDone || 0) / rTotal * 100) : null,
  } : null;

  return Response.json({
    totalUsers: totalUsers || 0,
    totalAuthUsers,
    totalKundlis: totalKundlis || 0,
    activeToday,
    todayVisitors,
    today: todayTotals,
    todayUsersDetailed,
    weekTrend,
    plan,
    recentUsers: recentUsers || [],
    outcomeStats,
    remedyStats,
    modelBreakdown: modelBreakdownList,
    aiUsageByFeature,
    warnings: [...new Set(warnings)],
  });
}

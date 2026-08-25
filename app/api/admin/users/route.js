// app/api/admin/users/route.js
//
// Full user list for the admin panel's Users tab — every user (not
// just the last 20, as Overview's "recent users" showed), each with
// real per-user micro-stats: total kundlis, lifetime chats/tokens,
// numerology/milan/ram-shalaka usage, first/last seen. Supports a
// simple email/name search since scrolling a flat list stops being
// usable past a few dozen users.

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

export async function GET(req) {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const adminSupabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get('search') || '').trim().toLowerCase();

  let profileQuery = adminSupabase
    .from('user_profiles')
    .select('id, full_name, email, mobile, created_at')
    .order('created_at', { ascending: false })
    .limit(500); // safety cap — see note in features route about scaling further if needed

  if (search) {
    // Simple ilike search across name + email — good enough at this
    // user-base scale; move to a proper search index if this ever
    // needs to scale past a few thousand users.
    profileQuery = profileQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data: profiles, error } = await profileQuery;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const userIds = (profiles || []).map(p => p.id);
  if (userIds.length === 0) return Response.json({ users: [] });

  const [
    { data: kundliRows },
    { data: usageRows },
    { data: numerologyRows },
    { data: featureRows },
    { data: sessionRows },
  ] = await Promise.all([
    adminSupabase.from('saved_kundlis').select('user_id').in('user_id', userIds),
    adminSupabase.from('usage_log').select('user_id, chat_count, free_mins_used, total_tokens, log_date').in('user_id', userIds),
    adminSupabase.from('numerology_queries').select('user_id').in('user_id', userIds),
    adminSupabase.from('feature_usage_log').select('user_id, feature').in('user_id', userIds),
    adminSupabase.from('chat_sessions').select('user_id, updated_at').in('user_id', userIds),
  ]);

  // ── Aggregate everything in JS (a handful of batched queries above,
  // instead of N+1 queries per user) ──────────────────────────────
  const kundliCount = {};
  (kundliRows || []).forEach(r => { kundliCount[r.user_id] = (kundliCount[r.user_id] || 0) + 1; });

  const usageTotals = {};
  let lastActiveDate = {};
  (usageRows || []).forEach(r => {
    if (!usageTotals[r.user_id]) usageTotals[r.user_id] = { chats: 0, mins: 0, tokens: 0 };
    usageTotals[r.user_id].chats += r.chat_count || 0;
    usageTotals[r.user_id].mins += parseFloat(r.free_mins_used || 0);
    usageTotals[r.user_id].tokens += r.total_tokens || 0;
    if (!lastActiveDate[r.user_id] || r.log_date > lastActiveDate[r.user_id]) lastActiveDate[r.user_id] = r.log_date;
  });

  const numerologyCount = {};
  (numerologyRows || []).forEach(r => { numerologyCount[r.user_id] = (numerologyCount[r.user_id] || 0) + 1; });

  const milanCount = {}, ramShalakaCount = {};
  (featureRows || []).forEach(r => {
    if (r.feature === 'milan') milanCount[r.user_id] = (milanCount[r.user_id] || 0) + 1;
    if (r.feature === 'ram_shalaka') ramShalakaCount[r.user_id] = (ramShalakaCount[r.user_id] || 0) + 1;
  });

  const lastSessionAt = {};
  (sessionRows || []).forEach(r => {
    if (!lastSessionAt[r.user_id] || r.updated_at > lastSessionAt[r.user_id]) lastSessionAt[r.user_id] = r.updated_at;
  });

  const users = (profiles || []).map(p => ({
    id: p.id,
    full_name: p.full_name || '',
    email: p.email,
    mobile: p.mobile || '',
    signed_up: p.created_at,
    kundlis: kundliCount[p.id] || 0,
    total_chats: usageTotals[p.id]?.chats || 0,
    total_mins: parseFloat((usageTotals[p.id]?.mins || 0).toFixed(1)),
    total_tokens: usageTotals[p.id]?.tokens || 0,
    numerology_queries: numerologyCount[p.id] || 0,
    milan_uses: milanCount[p.id] || 0,
    ram_shalaka_uses: ramShalakaCount[p.id] || 0,
    last_active: lastSessionAt[p.id] || lastActiveDate[p.id] || null,
  }));

  // Most active first by default (total lifetime tokens) — surfaces
  // power users / potential abuse immediately instead of a plain
  // signup-date list.
  users.sort((a, b) => b.total_tokens - a.total_tokens);

  return Response.json({ users, count: users.length });
}

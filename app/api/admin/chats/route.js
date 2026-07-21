// app/api/admin/chats/route.js
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
  const sessionId = searchParams.get('sessionId');

  if (sessionId) {
    const { data: messages, error } = await adminSupabase
      .from('chat_messages')
      .select('id, role, content, model_used, tokens_used, created_at')
      .eq('session_id', sessionId)
      .order('id', { ascending: true });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ messages });
  }

  const showDeleted = searchParams.get('deleted') === 'true';

  let query = adminSupabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at, user_id, kundli_id, deleted_by_user, deleted_at')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (showDeleted) {
    query = query.eq('deleted_by_user', true);
  } else {
    query = query.or('deleted_by_user.is.null,deleted_by_user.eq.false');
  }

  const { data: sessions, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // ── PERFORMANCE FIX ──────────────────────────────────────────
  // Previously this did an N+1 query pattern: for EACH session (up to
  // 50), it fired 2 separate queries (profile lookup + message count),
  // meaning up to 100 concurrent queries just to render one admin page.
  // Now we batch: 1 query for ALL relevant profiles, 1 query for ALL
  // relevant message rows (session_id only, counted in JS) — 2 queries
  // total instead of up to 100, regardless of how many sessions exist.
  const sessionIds = (sessions || []).map(s => s.id);
  const userIds = [...new Set((sessions || []).map(s => s.user_id).filter(Boolean))];

  const [{ data: profiles }, { data: msgRows }] = await Promise.all([
    userIds.length > 0
      ? adminSupabase.from('user_profiles').select('id, email, full_name').in('id', userIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length > 0
      ? adminSupabase.from('chat_messages').select('session_id').in('session_id', sessionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));
  const countMap = {};
  (msgRows || []).forEach(m => { countMap[m.session_id] = (countMap[m.session_id] || 0) + 1; });

  const enriched = (sessions || []).map(s => {
    const profile = profileMap.get(s.user_id);
    return {
      ...s,
      user_email: profile?.email || 'unknown',
      user_name:  profile?.full_name || '',
      message_count: countMap[s.id] || 0,
    };
  });

  // Default view: hide empty sessions (legacy safety net)
  const filtered = showDeleted ? enriched : enriched.filter(s => s.message_count > 0);

  return Response.json({ sessions: filtered });
}

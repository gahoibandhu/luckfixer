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

    // Kundli details for this session, shown alongside the messages so
    // the admin doesn't have to cross-reference a separate page to see
    // what chart the conversation was actually about.
    const { data: sessionRow } = await adminSupabase
      .from('chat_sessions')
      .select('kundli_id')
      .eq('id', sessionId)
      .maybeSingle();

    let kundli = null;
    if (sessionRow?.kundli_id) {
      const { data: k } = await adminSupabase
        .from('saved_kundlis')
        .select('id, label, full_name, dob, birth_time, birth_place, luck_score, ayanamsa')
        .eq('id', sessionRow.kundli_id)
        .maybeSingle();
      kundli = k || null;
    }

    return Response.json({ messages, kundli });
  }

  const showDeleted = searchParams.get('deleted') === 'true';
  const dateFilter = searchParams.get('date'); // 'YYYY-MM-DD', filters by updated_at day

  let query = adminSupabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at, user_id, kundli_id, deleted_by_user, deleted_at')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (showDeleted) {
    query = query.eq('deleted_by_user', true);
  } else {
    query = query.or('deleted_by_user.is.null,deleted_by_user.eq.false');
  }

  if (dateFilter) {
    const dayStart = `${dateFilter}T00:00:00.000Z`;
    const dayEnd = `${dateFilter}T23:59:59.999Z`;
    query = query.gte('updated_at', dayStart).lte('updated_at', dayEnd);
  }

  const { data: sessions, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // ── PERFORMANCE FIX ──────────────────────────────────────────
  // Previously this did an N+1 query pattern: for EACH session (up to
  // 50), it fired 2 separate queries (profile lookup + message count),
  // meaning up to 100 concurrent queries just to render one admin page.
  // Now we batch: 1 query for ALL relevant profiles, 1 query for ALL
  // relevant message rows (session_id only, counted in JS), 1 query for
  // ALL relevant kundlis — 3 queries total instead of up to 150,
  // regardless of how many sessions exist.
  const sessionIds = (sessions || []).map(s => s.id);
  const userIds = [...new Set((sessions || []).map(s => s.user_id).filter(Boolean))];
  const kundliIds = [...new Set((sessions || []).map(s => s.kundli_id).filter(Boolean))];

  const [{ data: profiles }, { data: msgRows }, { data: kundlis }] = await Promise.all([
    userIds.length > 0
      ? adminSupabase.from('user_profiles').select('id, email, full_name').in('id', userIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length > 0
      ? adminSupabase.from('chat_messages').select('session_id').in('session_id', sessionIds)
      : Promise.resolve({ data: [] }),
    kundliIds.length > 0
      ? adminSupabase.from('saved_kundlis').select('id, full_name, dob, birth_place, luck_score').in('id', kundliIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));
  const kundliMap = new Map((kundlis || []).map(k => [k.id, k]));
  const countMap = {};
  (msgRows || []).forEach(m => { countMap[m.session_id] = (countMap[m.session_id] || 0) + 1; });

  const enriched = (sessions || []).map(s => {
    const profile = profileMap.get(s.user_id);
    const kundli = s.kundli_id ? kundliMap.get(s.kundli_id) : null;
    return {
      ...s,
      user_email: profile?.email || 'unknown',
      user_name:  profile?.full_name || '',
      message_count: countMap[s.id] || 0,
      kundli_name: kundli?.full_name || null,
      kundli_dob: kundli?.dob || null,
      kundli_place: kundli?.birth_place || null,
      kundli_luck_score: kundli?.luck_score ?? null,
    };
  });

  // Default view: hide empty sessions (legacy safety net)
  const filtered = showDeleted ? enriched : enriched.filter(s => s.message_count > 0);

  return Response.json({ sessions: filtered });
}

// app/api/admin/user-detail/route.js
//
// Full drill-down for ONE user — everything the Users-tab list can't
// fit in a row. This is the actual "micro data" view: click any user
// and see exactly what they've done on the site, not just aggregate
// counts.

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

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

  const adminSupabase = getSupabaseAdmin();

  const [
    { data: profile },
    { data: kundlis },
    { data: sessions },
    { data: usageRows },
    { data: numerologyRows },
    { data: featureRows },
    { data: ratingRows },
    { data: feedbackRows },
  ] = await Promise.all([
    adminSupabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
    adminSupabase.from('saved_kundlis').select('id, label, full_name, dob, birth_time, birth_place, luck_score, ayanamsa, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    adminSupabase.from('chat_sessions').select('id, title, kundli_id, created_at, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(20),
    adminSupabase.from('usage_log').select('log_date, chat_count, free_mins_used, total_tokens').eq('user_id', userId).order('log_date', { ascending: false }),
    adminSupabase.from('numerology_queries').select('id, name_queried, category, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    adminSupabase.from('feature_usage_log').select('feature, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    adminSupabase.from('feature_ratings').select('feature, stars, comment, created_at').eq('user_id', userId),
    adminSupabase.from('user_feedback').select('rating, section, correction_note, created_at').eq('user_id', userId),
  ]);

  if (!profile) return Response.json({ error: 'User not found' }, { status: 404 });

  const usageTotals = (usageRows || []).reduce((acc, r) => ({
    chats: acc.chats + (r.chat_count || 0),
    mins: acc.mins + parseFloat(r.free_mins_used || 0),
    tokens: acc.tokens + (r.total_tokens || 0),
  }), { chats: 0, mins: 0, tokens: 0 });

  const milanUses = (featureRows || []).filter(r => r.feature === 'milan');
  const ramShalakaUses = (featureRows || []).filter(r => r.feature === 'ram_shalaka');

  return Response.json({
    profile,
    kundlis: kundlis || [],
    sessions: sessions || [],
    usage: {
      totals: {
        chats: usageTotals.chats,
        mins: parseFloat(usageTotals.mins.toFixed(1)),
        tokens: usageTotals.tokens,
      },
      byDay: usageRows || [],
      activeDays: (usageRows || []).filter(r => r.chat_count > 0).length,
      firstActive: (usageRows || []).length ? usageRows[usageRows.length - 1].log_date : null,
      lastActive: (usageRows || []).length ? usageRows[0].log_date : null,
    },
    numerology: numerologyRows || [],
    milanUses,
    ramShalakaUses,
    ratings: ratingRows || [],
    feedback: feedbackRows || [],
  });
}

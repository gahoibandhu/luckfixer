// app/api/admin/features/users/route.js
//
// "Click a feature card -> see WHO used it." Returns the users behind a feature
// count on the admin dashboard, with how many times each used it and when last.
//
//   GET ?feature=numerology | kundli | chat | milan | ram_shalaka
//   GET ?feature=ai:kundli_analysis | ai:numerology      (AI-token ledger, per user)
//   GET ?feature=ai:chat                                  (chat tokens, from usage_log)
//
// Every group is aggregated in JS from a bounded row fetch (max 5000 rows), which is
// plenty for the user counts this app has; `truncated` tells the UI if it ever isn't.

import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ROW_CAP = 5000;

// feature key -> { table, userCol, timeCol, filter?, tokensCol? }
const SOURCES = {
  numerology:  { table: 'numerology_queries', userCol: 'user_id', timeCol: 'created_at' },
  kundli:      { table: 'saved_kundlis',      userCol: 'user_id', timeCol: 'created_at' },
  chat:        { table: 'chat_sessions',      userCol: 'user_id', timeCol: 'created_at' },
  milan:       { table: 'feature_usage_log',  userCol: 'user_id', timeCol: 'created_at', filter: ['feature', 'milan'] },
  ram_shalaka: { table: 'feature_usage_log',  userCol: 'user_id', timeCol: 'created_at', filter: ['feature', 'ram_shalaka'] },
};

export async function GET(req) {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const feature = new URL(req.url).searchParams.get('feature') || '';
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let rows = [];
  let userCol = 'user_id', timeCol = 'created_at', tokensCol = null;

  if (feature.startsWith('ai:')) {
    const key = feature.slice(3);
    if (key === 'chat') {
      // usage_log is one row per user per day
      const { data, error } = await db.from('usage_log')
        .select('user_id, log_date, chat_count, total_tokens').gt('total_tokens', 0)
        .order('log_date', { ascending: false }).limit(ROW_CAP);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      rows = (data || []).map(r => ({ user_id: r.user_id, created_at: r.log_date, tokens: r.total_tokens || 0, n: r.chat_count || 1 }));
    } else {
      const { data, error } = await db.from('ai_usage_log')
        .select('user_id, tokens_est, created_at').eq('feature', key)
        .order('created_at', { ascending: false }).limit(ROW_CAP);
      if (error) return Response.json({ error: error.message + ' (run supabase/migration_027_ai_usage_log.sql)' }, { status: 500 });
      rows = (data || []).map(r => ({ user_id: r.user_id, created_at: r.created_at, tokens: r.tokens_est || 0, n: 1 }));
    }
    tokensCol = true;
  } else {
    const src = SOURCES[feature];
    if (!src) return Response.json({ error: 'Unknown feature' }, { status: 400 });
    let q = db.from(src.table).select(`${src.userCol}, ${src.timeCol}`).order(src.timeCol, { ascending: false }).limit(ROW_CAP);
    if (src.filter) q = q.eq(src.filter[0], src.filter[1]);
    const { data, error } = await q;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    rows = (data || []).map(r => ({ user_id: r[src.userCol], created_at: r[src.timeCol], tokens: 0, n: 1 }));
  }

  // group by user
  const byUser = new Map();
  for (const r of rows) {
    const key = r.user_id || 'unknown';
    const g = byUser.get(key) || { user_id: r.user_id, count: 0, tokens: 0, last_at: null };
    g.count += r.n;
    g.tokens += r.tokens;
    if (!g.last_at || r.created_at > g.last_at) g.last_at = r.created_at;
    byUser.set(key, g);
  }

  const ids = [...byUser.keys()].filter(k => k !== 'unknown');
  const profileById = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data: profs } = await db.from('user_profiles').select('id, full_name, email').in('id', ids.slice(i, i + 200));
    (profs || []).forEach(p => { profileById[p.id] = p; });
  }

  const users = [...byUser.values()]
    .map(g => ({
      user_id: g.user_id,
      full_name: profileById[g.user_id]?.full_name || '',
      email: profileById[g.user_id]?.email || '(unknown user)',
      count: g.count,
      tokens: g.tokens,
      last_at: g.last_at,
    }))
    .sort((a, b) => (tokensCol ? b.tokens - a.tokens : b.count - a.count));

  return Response.json({ feature, users, truncated: rows.length >= ROW_CAP });
}

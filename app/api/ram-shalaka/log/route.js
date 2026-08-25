// app/api/ram-shalaka/log/route.js
//
// Ram Shalaka is otherwise fully client-side (lib/ram-shalaka.js runs
// entirely in the browser) — this is its only server touchpoint,
// existing purely so the admin panel has SOME visibility into how
// often it's used (previously: zero). Fire-and-forget from the
// client; failure here should never block the reading itself.

import { createClient } from '@/lib/supabase-server';

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tone = ['shubh', 'dhairya', 'saavdhani'].includes(body?.tone) ? body.tone : null;
  const mode = ['wheel', 'grid'].includes(body?.mode) ? body.mode : null;

  try {
    await supabase.from('feature_usage_log').insert({
      user_id: user.id,
      feature: 'ram_shalaka',
      meta: { tone, mode },
    });
  } catch (e) {
    console.error('[Ram Shalaka] usage log error (non-fatal):', e.message);
  }

  return Response.json({ ok: true });
}

// app/api/ratings/route.js
//
// Generic, open-to-all rating API — reused across the whole site.
// Table feature_ratings (migration_010) already supports arbitrary
// "feature" scoping (one rating per user per feature, unique on
// user_id+feature — re-rating just updates it). Default feature is
// 'overall' (the site-wide rating shown on the profile page and
// after a chat session). Pass ?feature=numerology (or any other tag)
// to scope it to a specific tool instead.
//
// RLS on feature_ratings: "Anyone can read" (USING true) — every
// signed-in user sees every rating + the aggregate average, exactly
// like a public app-store review section. Writes are restricted to
// your own row.

import { createClient } from '@/lib/supabase-server';

const DEFAULT_FEATURE = 'overall';

export async function GET(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const feature = searchParams.get('feature') || DEFAULT_FEATURE;

  const { data, error } = await supabase
    .from('feature_ratings')
    .select('id, user_id, stars, comment, created_at')
    .eq('feature', feature)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const count = data.length;
  const average = count ? parseFloat((data.reduce((s, r) => s + r.stars, 0) / count).toFixed(2)) : 0;
  const myRating = data.find(r => r.user_id === user.id) || null;

  return Response.json({
    feature,
    average,
    count,
    myRating: myRating ? { stars: myRating.stars, comment: myRating.comment } : null,
    recent: data.slice(0, 20).map(r => ({ stars: r.stars, comment: r.comment, created_at: r.created_at })),
  });
}

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const feature = body.feature || DEFAULT_FEATURE;
  const { stars, comment } = body;

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return Response.json({ error: '1 से 5 के बीच स्टार दें' }, { status: 400 });
  }

  const { error } = await supabase.from('feature_ratings').upsert({
    user_id: user.id,
    feature,
    stars,
    comment: comment?.trim() || null,
  }, { onConflict: 'user_id,feature' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

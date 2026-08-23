// app/api/ratings/route.js
//
// Generic rating API — reused across the whole site. Table
// feature_ratings (migration_010) supports arbitrary "feature" scoping
// (one rating per user per feature, unique on user_id+feature —
// re-rating just updates it). Default feature is 'overall' (the
// site-wide rating shown on the profile page and after a chat
// session). Pass ?feature=numerology (or any other tag) to scope it
// to a specific tool instead.
//
// PRIVACY (migration_011): the 1-5 star SCORE is public — everyone
// sees the average + count, app-store style, via the feature_ratings_public
// view (no comment, no user_id). The written comment is PRIVATE — only
// the author (their own myRating) and admins (see /api/admin/feedback)
// can read it. RLS on the base table now only allows reading your own row.

import { createClient } from '@/lib/supabase-server';

const DEFAULT_FEATURE = 'overall';

export async function GET(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const feature = searchParams.get('feature') || DEFAULT_FEATURE;

  const [{ data: agg, error: aggError }, { data: mine, error: mineError }] = await Promise.all([
    supabase.from('feature_ratings_public').select('average, count').eq('feature', feature).maybeSingle(),
    supabase.from('feature_ratings').select('stars, comment').eq('feature', feature).eq('user_id', user.id).maybeSingle(),
  ]);

  if (aggError) return Response.json({ error: aggError.message }, { status: 500 });
  if (mineError) return Response.json({ error: mineError.message }, { status: 500 });

  return Response.json({
    feature,
    average: agg?.average || 0,
    count: agg?.count || 0,
    myRating: mine ? { stars: mine.stars, comment: mine.comment } : null,
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

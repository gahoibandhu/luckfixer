// app/api/admin/feedback/route.js
//
// Admin-only view of everything users have written privately:
// 1) feature_ratings.comment — the free-text note attached to a star
//    rating (migration_011 made this private; the star SCORE itself
//    is still public via feature_ratings_public / /api/ratings).
// 2) user_feedback.correction_note — the 👍/👎 + optional correction
//    text left on a specific kundli's analysis (already private via
//    RLS since migration_002; just wasn't surfaced in the admin UI).
//
// Both were always meant to be seen only by the person who wrote them
// and the Luckfixer team — this route is the "team" side of that.

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

  const [{ data: ratingRows }, { data: feedbackRows }, { data: users }] = await Promise.all([
    adminSupabase.from('feature_ratings')
      .select('id, user_id, feature, stars, comment, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    adminSupabase.from('user_feedback')
      .select('id, user_id, prediction_id, rating, section, correction_note, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    adminSupabase.from('user_profiles').select('id, email, full_name'),
  ]);

  const emailById = {};
  (users || []).forEach(u => { emailById[u.id] = u.full_name ? `${u.full_name} <${u.email}>` : u.email; });

  const ratings = (ratingRows || []).map(r => ({
    id: r.id,
    feature: r.feature,
    stars: r.stars,
    comment: r.comment,
    created_at: r.created_at,
    user: emailById[r.user_id] || r.user_id,
  }));

  const feedback = (feedbackRows || []).map(f => ({
    id: f.id,
    rating: f.rating,
    section: f.section,
    correction_note: f.correction_note,
    created_at: f.created_at,
    user: emailById[f.user_id] || f.user_id,
  }));

  return Response.json({
    ratings,
    ratingsWithComment: ratings.filter(r => r.comment),
    feedback,
    feedbackWithNote: feedback.filter(f => f.correction_note),
    summary: {
      totalRatings: ratings.length,
      totalComments: ratings.filter(r => r.comment).length,
      totalFeedback: feedback.length,
      thumbsUp: feedback.filter(f => f.rating === 'up').length,
      thumbsDown: feedback.filter(f => f.rating === 'down').length,
    },
  });
}

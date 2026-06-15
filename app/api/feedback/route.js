// app/api/feedback/route.js
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { kundli_id, rating, section, correction_note } = body;

  if (!rating || !['up','down'].includes(rating)) {
    return Response.json({ error: 'Invalid rating' }, { status: 400 });
  }

  // Find the most recent prediction_log entry for this kundli
  let predictionId = null;
  if (kundli_id) {
    const { data: pred } = await supabase
      .from('predictions_log')
      .select('id')
      .eq('kundli_id', kundli_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    predictionId = pred?.id || null;
  }

  const { error } = await supabase.from('user_feedback').insert({
    user_id: user.id,
    prediction_id: predictionId,
    rating,
    section: section || 'overall',
    correction_note: correction_note || null,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

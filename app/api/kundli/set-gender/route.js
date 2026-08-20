// app/api/kundli/set-gender/route.js
//
// Narrow, cheap endpoint for retroactively setting gender on kundlis
// saved before gender became mandatory at creation time. Deliberately
// separate from the PATCH /api/kundli re-analyze route — that route
// re-runs the full deterministic engine + calls the AI (costs money/
// quota); this one just updates a single column so old users aren't
// forced through a full re-analysis just to add gender.
import { createClient } from '@/lib/supabase-server';

export async function PATCH(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { kundli_id, gender } = await req.json();
  if (!kundli_id) return Response.json({ error: 'kundli_id required' }, { status: 400 });
  if (!gender || !['male', 'female', 'other'].includes(gender)) {
    return Response.json({ error: 'लिंग चुनना ज़रूरी है (male/female/other)' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('saved_kundlis')
    .update({ gender })
    .eq('id', kundli_id)
    .eq('user_id', user.id) // ownership check
    .select('id, gender')
    .maybeSingle();

  if (error || !data) return Response.json({ error: error?.message || 'कुंडली नहीं मिली' }, { status: 404 });
  return Response.json({ success: true, kundli: data });
}

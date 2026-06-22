// app/api/milan/route.js
// Kundli Milan (compatibility matching) — POST with two kundli IDs
// Returns Ashtakoot Guna Milan score + Jaimini cross-check

import { createClient } from '@/lib/supabase-server';
import { calcKundliMilan } from '@/lib/kundli-milan';

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { kundliId1, kundliId2, label1, label2 } = await req.json();
  if (!kundliId1 || !kundliId2) {
    return Response.json({ error: 'दोनों कुंडली ID आवश्यक हैं' }, { status: 400 });
  }

  // Fetch both kundlis — user must own at least one of them
  const [{ data: k1 }, { data: k2 }] = await Promise.all([
    supabase.from('saved_kundlis').select('*').eq('id', kundliId1).maybeSingle(),
    supabase.from('saved_kundlis').select('*').eq('id', kundliId2).maybeSingle(),
  ]);

  if (!k1 || !k2) {
    return Response.json({ error: 'एक या दोनों कुंडली नहीं मिलीं' }, { status: 404 });
  }

  const result = calcKundliMilan(k1.planet_data?.factSheet, k2.planet_data?.factSheet);

  if (!result) {
    return Response.json({ error: 'मिलान के लिए चंद्र नक्षत्र डेटा उपलब्ध नहीं — कुंडली migrate करें' }, { status: 422 });
  }

  return Response.json({
    boy:    { id: k1.id, label: label1 || k1.label || k1.full_name },
    girl:   { id: k2.id, label: label2 || k2.label || k2.full_name },
    milan:  result,
  });
}

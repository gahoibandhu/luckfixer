// app/api/milan/route.js
// Kundli Milan (compatibility matching) — POST with two kundli IDs
// Returns Ashtakoot Guna Milan score + Jaimini cross-check

import { createClient } from '@/lib/supabase-server';
import { calcKundliMilan } from '@/lib/kundli-milan';
import { logMilanRemedies } from '@/lib/remedy-tracking';

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { kundliId1, kundliId2, label1, label2 } = await req.json();
  if (!kundliId1 || !kundliId2) {
    return Response.json({ error: 'दोनों कुंडली ID आवश्यक हैं' }, { status: 400 });
  }

  // Fetch both kundlis — SECURITY: both must belong to the requesting
  // user. The Milan UI only ever offers a user's own saved_kundlis in
  // both dropdowns (see app/milan/page.jsx), so this matches actual
  // usage — and closes an IDOR where any authenticated user could
  // previously pass ANY kundliId (someone else's private birth data)
  // and get back a full compatibility readout for it.
  const [{ data: k1 }, { data: k2 }] = await Promise.all([
    supabase.from('saved_kundlis').select('*').eq('id', kundliId1).eq('user_id', user.id).maybeSingle(),
    supabase.from('saved_kundlis').select('*').eq('id', kundliId2).eq('user_id', user.id).maybeSingle(),
  ]);

  if (!k1 || !k2) {
    return Response.json({ error: 'एक या दोनों कुंडली नहीं मिलीं, या आपकी नहीं हैं' }, { status: 404 });
  }

  const result = calcKundliMilan(k1.planet_data?.factSheet, k2.planet_data?.factSheet);

  if (!result) {
    return Response.json({ error: 'मिलान के लिए चंद्र नक्षत्र डेटा उपलब्ध नहीं — कुंडली migrate करें' }, { status: 422 });
  }

  // Log usage (non-fatal if it fails) — Milan previously wrote nothing
  // to the database at all, so the admin panel had zero visibility
  // into how often this feature was actually used. See migration_012.
  try {
    await supabase.from('feature_usage_log').insert({
      user_id: user.id,
      feature: 'milan',
      meta: { total_score: result.totalScore ?? null },
    });
  } catch (e) {
    console.error('[Milan] usage log error (non-fatal):', e.message);
  }

  // ── Remedy tracking: any doshas found get logged against both ──
  // kundlis (both belong to this user — see the ownership check above)
  // so they show up in the same "मेरे उपाय" checklist as everything else.
  if (result.doshas?.length) {
    await Promise.all([
      logMilanRemedies(supabase, { userId: user.id, kundliId: k1.id, doshas: result.doshas }),
      logMilanRemedies(supabase, { userId: user.id, kundliId: k2.id, doshas: result.doshas }),
    ]);
  }

  return Response.json({
    boy:    { id: k1.id, label: label1 || k1.label || k1.full_name },
    girl:   { id: k2.id, label: label2 || k2.label || k2.full_name },
    milan:  result,
  });
}

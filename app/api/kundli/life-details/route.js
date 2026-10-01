// app/api/kundli/life-details/route.js
// PATCH { kundli_id, marital_status?, children_status?, skip?: 'marital'|'children', clear?: ['marital'|'children'] }
// Saves what the user tapped (chat chips or Profile page) for ONE of their own kundlis.
// Changing the answer later just overwrites it; `clear` removes it entirely.

import { createClient } from '@/lib/supabase-server';
import { MARITAL_VALUES, CHILDREN_VALUES } from '@/lib/life-details';

export const dynamic = 'force-dynamic';

export async function PATCH(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let b;
  try { b = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  if (!b?.kundli_id) return Response.json({ error: 'kundli_id required' }, { status: 400 });

  const { data: row } = await supabase
    .from('saved_kundlis').select('id, user_id, life_prompts_skipped').eq('id', b.kundli_id).maybeSingle();
  if (!row || row.user_id !== user.id) return Response.json({ error: 'Not found or not yours' }, { status: 403 });

  const update = {};
  if (b.marital_status !== undefined) {
    if (!MARITAL_VALUES.includes(b.marital_status)) return Response.json({ error: 'Invalid marital_status' }, { status: 400 });
    update.marital_status = b.marital_status;
  }
  if (b.children_status !== undefined) {
    if (!CHILDREN_VALUES.includes(b.children_status)) return Response.json({ error: 'Invalid children_status' }, { status: 400 });
    update.children_status = b.children_status;
  }
  for (const f of Array.isArray(b.clear) ? b.clear : []) {
    if (f === 'marital') update.marital_status = null;
    if (f === 'children') update.children_status = null;
  }
  if (b.skip === 'marital' || b.skip === 'children') {
    update.life_prompts_skipped = { ...(row.life_prompts_skipped || {}), [b.skip]: new Date().toISOString() };
  }
  if (Object.keys(update).length === 0) return Response.json({ error: 'Nothing to update' }, { status: 400 });

  const { data, error } = await supabase
    .from('saved_kundlis').update(update).eq('id', b.kundli_id)
    .select('id, marital_status, children_status, life_prompts_skipped').single();
  if (error) return Response.json({ error: error.message, hint: 'migration_025 run kiya?' }, { status: 500 });
  return Response.json({ success: true, kundli: data });
}

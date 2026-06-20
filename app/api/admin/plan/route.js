// app/api/admin/plan/route.js
// Admin endpoint to update free tier config.
// Accepts either: logged-in admin user (cookie session) OR x-admin-secret header (for curl/external use)

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function isAuthorized(req) {
  // Option 1: secret header (for curl/external automation)
  const secret = req.headers.get('x-admin-secret');
  if (secret && secret === process.env.ADMIN_SECRET) return true;

  // Option 2: logged-in admin user (cookie session, for admin panel UI)
  const supabase = await createServerClient();
  const admin = await requireAdmin(supabase);
  return !!admin;
}

export const dynamic = 'force-dynamic';

// GET — read current config
export async function GET(req) {
  if (!(await isAuthorized(req))) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('plan_config').select('*').order('id');
  return Response.json({ plans: data });
}

// PATCH — update plan config (live, no redeploy needed)
export async function PATCH(req) {
  if (!(await isAuthorized(req))) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { plan_name = 'free', free_mins_day, free_chats_day, charge_per_min } = body;

  const updateData = {
    updated_at: new Date().toISOString(),
    updated_by: 'admin',
  };
  if (free_mins_day  !== undefined) updateData.free_mins_day   = free_mins_day;
  if (free_chats_day !== undefined) updateData.free_chats_day  = free_chats_day;
  if (charge_per_min !== undefined) updateData.charge_per_min  = charge_per_min;
  if (body.plan_type !== undefined) updateData.plan_type       = body.plan_type;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('plan_config')
    .update(updateData)
    .eq('plan_name', plan_name)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, plan: data });
}

// app/api/admin/config/route.js
// Admin endpoint to read/update general site config (app_config table).
// Accepts either: logged-in admin user (cookie session) OR x-admin-secret header.

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { invalidateAppConfigCache } from '@/lib/app-config';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function isAuthorized(req) {
  const secret = req.headers.get('x-admin-secret');
  if (secret && secret === process.env.ADMIN_SECRET) return true;

  const supabase = await createServerClient();
  const admin = await requireAdmin(supabase);
  return !!admin;
}

export const dynamic = 'force-dynamic';

// GET — read all config key/value pairs
export async function GET(req) {
  if (!(await isAuthorized(req))) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('app_config').select('*').order('key');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ config: data });
}

// PATCH — upsert one or more config keys (live, no redeploy needed)
// Body: { bot_display_name: "AI Pandit" } — any known key works the same way.
export async function PATCH(req) {
  if (!(await isAuthorized(req))) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const entries = Object.entries(body).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return Response.json({ error: 'No config values provided' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const rows = entries.map(([key, value]) => ({
    key,
    value: String(value).trim(),
    updated_at: new Date().toISOString(),
    updated_by: 'admin',
  }));

  const { data, error } = await supabase.from('app_config').upsert(rows, { onConflict: 'key' }).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  invalidateAppConfigCache();
  return Response.json({ success: true, config: data });
}

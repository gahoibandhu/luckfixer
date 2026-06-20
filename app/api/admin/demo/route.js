// app/api/admin/demo/route.js
// Admin: manage demo users (unlimited access for testing)
import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET — list all demo users with their profile info
export async function GET(req) {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const adminDb = getSupabaseAdmin();
  const { data: demos } = await adminDb
    .from('demo_users')
    .select('*')
    .order('created_at', { ascending: false });

  // Enrich with emails
  const enriched = await Promise.all((demos || []).map(async d => {
    const { data: profile } = await adminDb
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', d.user_id)
      .maybeSingle();
    return { ...d, email: profile?.email, full_name: profile?.full_name };
  }));

  return Response.json({ users: enriched });
}

// POST — add a user to demo plan by email
export async function POST(req) {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { email, note, expires_at } = await req.json();
  if (!email) return Response.json({ error: 'email required' }, { status: 400 });

  const adminDb = getSupabaseAdmin();

  // Find user by email
  const { data: profile } = await adminDb
    .from('user_profiles')
    .select('id, email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (!profile) {
    return Response.json({ error: `User not found: ${email}. User must have logged in at least once.` }, { status: 404 });
  }

  const { error } = await adminDb
    .from('demo_users')
    .upsert({
      user_id:     profile.id,
      assigned_by: admin.email,
      note:        note || null,
      expires_at:  expires_at || null,
    }, { onConflict: 'user_id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, user: profile });
}

// DELETE — remove demo access
export async function DELETE(req) {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

  const adminDb = getSupabaseAdmin();
  await adminDb.from('demo_users').delete().eq('user_id', userId);

  return Response.json({ success: true });
}

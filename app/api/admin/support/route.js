// app/api/admin/support/route.js
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export const dynamic = 'force-dynamic';

// GET — list messages, optionally filtered by ?type=feedback|support
export async function GET(req) {
  const supabase = await createServerClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  const adminDb = getSupabaseAdmin();
  let query = adminDb.from('support_messages').select('*').order('created_at', { ascending: false }).limit(200);
  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ messages: data || [] });
}

// PATCH — reply to a support ticket (sets status='answered') or just
// change status (e.g. close a feedback item / a resolved ticket).
export async function PATCH(req) {
  const supabase = await createServerClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, adminReply, status } = body;
  if (!id) return Response.json({ error: 'id zaroori hai' }, { status: 400 });

  const update = {};
  if (adminReply !== undefined) {
    update.admin_reply = adminReply;
    update.admin_reply_at = new Date().toISOString();
    update.status = 'answered';
  }
  if (status) update.status = status;

  const adminDb = getSupabaseAdmin();
  const { data, error } = await adminDb.from('support_messages').update(update).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, item: data });
}

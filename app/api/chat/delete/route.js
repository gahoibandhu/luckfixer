// app/api/chat/delete/route.js
//
// User delete  -> soft delete: chat_sessions.deleted_by_user = true.
//                 Hidden from the user's own session list AND from the
//                 admin's default Chat Audit view. Messages are kept
//                 untouched so admin can review them under the separate
//                 "Deleted" filter if needed for record management.
//
// Admin delete -> hard delete: messages + session row permanently removed.

import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function DELETE(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const isAdminDelete = searchParams.get('adminDelete') === 'true';

  if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });

  const adminSupabase = getSupabaseAdmin();

  if (isAdminDelete) {
    const admin = await requireAdmin(supabase);
    if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    await adminSupabase.from('chat_messages').delete().eq('session_id', sessionId);
    await adminSupabase.from('chat_sessions').delete().eq('id', sessionId);

    return Response.json({ success: true, deleted: 'permanent' });
  }

  const { data: session } = await adminSupabase
    .from('chat_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .single();

  if (!session || session.user_id !== user.id) {
    return Response.json({ error: 'Session not found or not yours' }, { status: 403 });
  }

  await adminSupabase.from('chat_sessions')
    .update({ deleted_by_user: true, deleted_at: new Date().toISOString() })
    .eq('id', sessionId);

  return Response.json({ success: true, deleted: 'soft' });
}

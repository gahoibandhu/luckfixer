// app/api/support/route.js
// User-facing feedback/support endpoint. Shared by the /support page
// for both "type=feedback" (one-way) and "type=support" (ticket-style,
// admin_reply visible once answered) submissions.

import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET — the current user's own messages, newest first
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ messages: data || [] });
}

// POST — submit feedback or a support message
export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { type, subject, message } = body;

  if (!type || !['feedback', 'support'].includes(type)) {
    return Response.json({ error: 'type feedback ya support hona chahiye' }, { status: 400 });
  }
  if (!message || !message.trim()) {
    return Response.json({ error: 'संदेश खाली नहीं हो सकता' }, { status: 400 });
  }
  if (message.length > 2000) {
    return Response.json({ error: 'संदेश बहुत लंबा है (2000 अक्षर तक)' }, { status: 400 });
  }

  const { data, error } = await supabase.from('support_messages').insert({
    user_id: user.id,
    email: user.email,
    type,
    subject: subject?.trim() || null,
    message: message.trim(),
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, item: data });
}

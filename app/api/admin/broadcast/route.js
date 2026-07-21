// app/api/admin/broadcast/route.js
// Admin-only: send a broadcast email to all (or filtered) users,
// encouraging them to log in / come back / see a new feature.

import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendBroadcastEmail } from '@/lib/notifications';

export async function POST(req) {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { subject, headline, bodyText, ctaLabel, ctaUrl, audience } = body;

  if (!subject || !bodyText) {
    return Response.json({ error: 'subject aur bodyText zaroori hain' }, { status: 400 });
  }

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // audience: 'all' (default) | 'active_30d' (logged in / active in last 30 days)
  let query = adminDb.from('user_profiles').select('email, created_at');

  if (audience === 'active_30d') {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    // usage_log has per-day activity; join isn't trivial via the JS client,
    // so we do a simple two-step: get recent active user_ids, then filter.
    const { data: recentUsage } = await adminDb
      .from('usage_log')
      .select('user_id')
      .gte('log_date', cutoff.split('T')[0]);
    const activeIds = [...new Set((recentUsage || []).map(r => r.user_id))];
    if (activeIds.length === 0) {
      return Response.json({ sent: 0, failed: 0, note: 'Koi active user nahi mila pichhle 30 din mein' });
    }
    query = adminDb.from('user_profiles').select('email').in('id', activeIds);
  }

  const { data: users, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const recipients = (users || []).map(u => u.email).filter(Boolean);
  if (recipients.length === 0) {
    return Response.json({ sent: 0, failed: 0, note: 'Koi recipient nahi mila' });
  }

  const result = await sendBroadcastEmail({
    recipients,
    subject,
    headline,
    bodyText,
    ctaLabel,
    ctaUrl,
  });

  return Response.json({
    totalRecipients: recipients.length,
    ...result,
  });
}

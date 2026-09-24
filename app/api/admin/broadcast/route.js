// app/api/admin/broadcast/route.js
// Admin-only: send a broadcast email to all / active / specific users,
// encouraging them to log in / come back / see a new feature.
// Also logs every broadcast to broadcast_log for history/summary view.

import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendBroadcastEmail } from '@/lib/notifications';

function getAdminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET — two modes:
//   ?q=search-term   -> user search results, for picking specific recipients
//   (no params)       -> broadcast history for the admin panel summary view
export async function GET(req) {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const adminDb = getAdminDb();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (q !== null) {
    const term = q.trim();
    if (term.length < 2) return Response.json({ users: [] });

    const { data, error } = await adminDb
      .from('user_profiles')
      .select('id, email, full_name')
      .or(`email.ilike.%${term}%,full_name.ilike.%${term}%`)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ users: data || [] });
  }

  const { data, error } = await adminDb
    .from('broadcast_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ history: data || [] });
}

export async function POST(req) {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { subject, headline, bodyText, ctaLabel, ctaUrl, audience, userIds } = body;

  if (!subject || !bodyText) {
    return Response.json({ error: 'subject aur bodyText zaroori hain' }, { status: 400 });
  }

  if (audience === 'specific' && (!Array.isArray(userIds) || userIds.length === 0)) {
    return Response.json({ error: 'specific audience ke liye kam se kam ek user chuno' }, { status: 400 });
  }

  const adminDb = getAdminDb();

  // audience: 'all' (default) | 'active_30d' | 'specific' (explicit userIds list)
  let query = adminDb.from('user_profiles').select('email, created_at');

  if (audience === 'active_30d') {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentUsage } = await adminDb
      .from('usage_log')
      .select('user_id')
      .gte('log_date', cutoff.split('T')[0]);
    const activeIds = [...new Set((recentUsage || []).map(r => r.user_id))];
    if (activeIds.length === 0) {
      return Response.json({ sent: 0, failed: 0, note: 'Koi active user nahi mila pichhle 30 din mein' });
    }
    query = adminDb.from('user_profiles').select('email').in('id', activeIds);
  } else if (audience === 'specific') {
    query = adminDb.from('user_profiles').select('email').in('id', userIds);
  }

  const { data: users, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const recipients = (users || []).map(u => u.email).filter(Boolean);
  if (recipients.length === 0) {
    return Response.json({ sent: 0, failed: 0, note: 'Koi recipient nahi mila' });
  }

  // Hard guard: beyond this, a synchronous send risks hitting the 60s
  // function timeout mid-batch (see rate-limit note below) and losing
  // visibility into how far it actually got. Reject upfront with a
  // clear message rather than let it silently run out of time.
  const MAX_SYNC_RECIPIENTS = 550;
  if (recipients.length > MAX_SYNC_RECIPIENTS) {
    return Response.json({
      error: `${recipients.length} recipients bahut zyada hai ek broadcast ke liye (max ${MAX_SYNC_RECIPIENTS} abhi). Audience ko छोटे groups mein baant kar bhejein, ya "specific users" se batch karein.`,
    }, { status: 400 });
  }

  // Safety note: at a strict 10 emails/second rate limit, a single call
  // can handle roughly 550-600 recipients before Vercel's 60s function
  // timeout (Hobby plan max). For larger user bases in the future, this
  // will need to move to a background job (e.g. queued + cron-processed)
  // rather than one synchronous request.
  //
  // Robustness: log a row BEFORE sending starts (status='sending'), not
  // after — so if the function does get killed mid-send by the timeout,
  // there's still a visible record with the right total_recipients
  // instead of the whole attempt silently vanishing.
  let logRow = null;
  try {
    const { data } = await adminDb.from('broadcast_log').insert({
      subject,
      headline: headline || null,
      body_text: bodyText,
      cta_label: ctaLabel || null,
      cta_url: ctaUrl || null,
      audience: audience || 'all',
      total_recipients: recipients.length,
      sent_count: 0,
      failed_count: 0,
      sent_by: admin.email,
      status: 'sending',
    }).select().single();
    logRow = data;
  } catch (e) {
    console.warn('[Broadcast] Failed to write pre-send log row (non-fatal):', e.message);
  }

  const result = await sendBroadcastEmail({
    recipients,
    subject,
    headline,
    bodyText,
    ctaLabel,
    ctaUrl,
  });

  // Update the same row now that sending has actually finished —
  // best-effort, non-fatal if it fails.
  try {
    if (logRow) {
      await adminDb.from('broadcast_log').update({
        sent_count: result.sent || 0,
        failed_count: result.failed || 0,
        status: 'completed',
      }).eq('id', logRow.id);
    } else {
      // Pre-send insert failed earlier — fall back to a single
      // after-the-fact insert so this broadcast isn't left unlogged.
      await adminDb.from('broadcast_log').insert({
        subject,
        headline: headline || null,
        body_text: bodyText,
        cta_label: ctaLabel || null,
        cta_url: ctaUrl || null,
        audience: audience || 'all',
        total_recipients: recipients.length,
        sent_count: result.sent || 0,
        failed_count: result.failed || 0,
        sent_by: admin.email,
        status: 'completed',
      });
    }
  } catch (e) {
    console.warn('[Broadcast] Failed to update history (non-fatal):', e.message);
  }

  return Response.json({
    totalRecipients: recipients.length,
    ...result,
  });
}

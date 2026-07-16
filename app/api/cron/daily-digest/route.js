// app/api/cron/daily-digest/route.js
//
// Runs once daily via Vercel Cron (configured in vercel.json).
// Two jobs:
//   1. Find due outcome_tracking rows where asked_at IS NULL and
//      follow_up_at <= now, but user hasn't opened the app to see
//      the in-chat version — email them as a backup engagement channel.
//   2. Check each user's kundlis for notable transit changes since
//      last checked snapshot, and alert if something meaningful shifted.
//
// Protected by CRON_SECRET header so it can't be triggered externally.

import { createClient } from '@supabase/supabase-js';
import { sendOutcomeFollowUpEmail, sendTransitAlertEmail, isNotableTransitChange } from '@/lib/notifications';
import { buildTransitReport } from '@/lib/transit';

export async function GET(req) {
  // ── Auth check — only Vercel Cron (or manual admin trigger) can hit this ──
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const results = { outcomeEmails: 0, transitEmails: 0, errors: [] };

  // ── Job 1: Outcome follow-up emails ──────────────────────────
  try {
    const now = new Date().toISOString();
    const { data: dueFollowUps } = await supabase
      .from('outcome_tracking')
      .select('*, saved_kundlis(full_name), user_profiles(email, full_name)')
      .is('outcome', null)
      .is('asked_at', null)
      .lte('follow_up_at', now)
      .limit(50); // batch limit per run

    for (const followUp of dueFollowUps || []) {
      const email = followUp.user_profiles?.email;
      const name = followUp.user_profiles?.full_name || followUp.saved_kundlis?.full_name;
      if (!email) continue;

      try {
        await sendOutcomeFollowUpEmail(email, name, followUp);
        await supabase.from('outcome_tracking')
          .update({ asked_at: new Date().toISOString() })
          .eq('id', followUp.id);
        results.outcomeEmails++;
      } catch (e) {
        results.errors.push(`outcome:${followUp.id}:${e.message}`);
      }
    }
  } catch (e) {
    results.errors.push('outcome-job:' + e.message);
  }

  // ── Job 2: Notable transit change alerts ─────────────────────
  try {
    const { data: kundlis } = await supabase
      .from('saved_kundlis')
      .select('id, full_name, dob, latitude, longitude, planet_data, user_id, user_profiles(email)')
      .limit(100); // batch limit per run — scales via pagination in future

    for (const k of kundlis || []) {
      const email = k.user_profiles?.email;
      if (!email || !k.planet_data?.factSheet) continue;

      try {
        const freshTransit = await buildTransitReport(k.planet_data.factSheet, k.latitude, k.longitude);
        const previousSnapshot = k.planet_data?.transitSnapshot;

        if (isNotableTransitChange(freshTransit, previousSnapshot)) {
          await sendTransitAlertEmail(email, k.full_name, freshTransit);
          // Update stored snapshot so we don't re-alert for the same change tomorrow
          await supabase.from('saved_kundlis')
            .update({ planet_data: { ...k.planet_data, transitSnapshot: freshTransit } })
            .eq('id', k.id);
          results.transitEmails++;
        }
      } catch (e) {
        results.errors.push(`transit:${k.id}:${e.message}`);
      }
    }
  } catch (e) {
    results.errors.push('transit-job:' + e.message);
  }

  return Response.json(results);
}

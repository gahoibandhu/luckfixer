// app/api/cron/complete-analysis/route.js
//
// Auto-heals kundlis missing life_domains/annual_timeline on a
// schedule (see vercel.json crons) — same logic the admin "अगला बैच"
// button uses (lib/life-domains-backfill.js), just triggered
// automatically instead of requiring an admin to notice a stuck
// kundli and click through batches by hand. This is what actually
// closes the user-experience gap: without it, a kundli that landed on
// the wrong side of a transient provider outage (Gemini 503, a dead
// OpenRouter model, etc.) at creation time stayed incomplete
// indefinitely. GET /api/kundli's on-view trigger (see that route)
// covers the SAME user coming back sooner; this cron is the backstop
// that covers everyone else, including kundlis nobody has revisited.
//
// Protected by CRON_SECRET header (same pattern as
// app/api/cron/daily-digest) so it can't be triggered externally.
import { createClient } from '@supabase/supabase-js';
import { runBackfillBatch } from '@/lib/life-domains-backfill';

export const dynamic = 'force-dynamic';
// Larger than the admin panel's batch (5) — nobody is watching a
// spinner here, so the only real ceiling is this route's maxDuration
// (see vercel.json) rather than a human's patience.
const BATCH_SIZE = 20;

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { processed, results } = await runBackfillBatch(adminDb, BATCH_SIZE, 'cron_auto_heal');
  const summary = {
    processed,
    ok: results.filter(r => r.status === 'ok').length,
    partial: results.filter(r => r.status === 'partial').length,
    failed: results.filter(r => r.status === 'error').length,
  };

  console.log(`[CompleteAnalysis Cron] ${JSON.stringify(summary)}`);
  return Response.json({ ...summary, results });
}

// app/api/admin/migrate-life-domains/route.js
//
// Admin-triggered batch backfill (manual "अगला बैच" button) — thin
// wrapper around lib/life-domains-backfill.js, the shared logic also
// used by the automatic cron healer (app/api/cron/complete-analysis)
// and the on-view trigger in this same file's GET below. Unlike
// migrate-kundlis/route.js (deterministic-only, free), this DOES call
// the AI, so it's rate-limited to a small batch per request — the
// admin panel calls this repeatedly until GET reports zero remaining.
import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getMissingCounts, runBackfillBatch } from '@/lib/life-domains-backfill';

export const dynamic = 'force-dynamic';
const BATCH_SIZE = 5; // small on purpose — AI calls are the slow/costly part, and an admin is watching a spinner for this one

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET — how many kundlis still need migrating
export async function GET() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  return Response.json(await getMissingCounts(getSupabaseAdmin()));
}

// POST — process one batch (BATCH_SIZE kundlis)
export async function POST() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  return Response.json(await runBackfillBatch(getSupabaseAdmin(), BATCH_SIZE));
}

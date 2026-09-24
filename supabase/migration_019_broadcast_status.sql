-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 019: Broadcast status tracking
-- Run in Supabase SQL Editor (after migration_018)
-- ============================================================
--
-- Previously broadcast_log was only written AFTER sendBroadcastEmail
-- fully resolved — so a broadcast large enough to hit the route's 60s
-- maxDuration (roughly 600+ recipients at the enforced 10/sec rate
-- limit) would die mid-send with zero record: no row, no sent count,
-- nothing in the admin panel to show it was even attempted.
--
-- Fix (paired with the app/api/admin/broadcast/route.js change): write
-- a row with status='sending' BEFORE the send starts, then update the
-- same row when it finishes. A timeout now still leaves a visible row
-- stuck on 'sending' with the correct total_recipients — the admin can
-- tell something was attempted and roughly how far it should have got,
-- instead of the attempt vanishing entirely.

ALTER TABLE broadcast_log
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('sending', 'completed', 'failed'));

-- Backfill: every row that existed before this migration finished
-- successfully by definition (the old code only wrote after success).
UPDATE broadcast_log SET status = 'completed' WHERE status IS NULL;

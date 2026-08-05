-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 008: Broadcast log
-- Run in Supabase SQL Editor (after migration_007)
-- ============================================================
--
-- Tracks history of admin broadcast emails sent — subject, audience,
-- send counts, and who sent it. Shown in Admin → Broadcast tab so the
-- admin can see a summary of past campaigns rather than only being
-- able to fire-and-forget with no record.

CREATE TABLE IF NOT EXISTS broadcast_log (
  id            BIGSERIAL PRIMARY KEY,
  subject       TEXT NOT NULL,
  headline      TEXT,
  body_text     TEXT NOT NULL,
  cta_label     TEXT,
  cta_url       TEXT,
  audience      TEXT NOT NULL DEFAULT 'all',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count    INTEGER NOT NULL DEFAULT 0,
  failed_count  INTEGER NOT NULL DEFAULT 0,
  sent_by       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE broadcast_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages broadcast_log" ON broadcast_log FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_broadcast_log_created ON broadcast_log(created_at DESC);

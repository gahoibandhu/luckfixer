-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 012
-- Generic feature usage log — closes the admin-visibility gap for
-- Kundli Milan and Ram Shalaka, which (unlike chat and numerology)
-- currently write NOTHING to the database, so the admin panel has
-- zero signal on how much they're actually used.
--
-- Deliberately generic (one table, a `feature` tag) rather than a
-- bespoke table per tool — every NEW tool added later gets admin
-- visibility for free just by calling the same insert, no new
-- migration required.
-- ============================================================

CREATE TABLE IF NOT EXISTS feature_usage_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL,        -- 'milan' | 'ram_shalaka' | ...
  meta        JSONB DEFAULT '{}',   -- small, non-sensitive context (e.g. {"question_type":"career"})
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_log_feature_date ON feature_usage_log(feature, created_at);
CREATE INDEX IF NOT EXISTS idx_feature_usage_log_user ON feature_usage_log(user_id);

ALTER TABLE feature_usage_log ENABLE ROW LEVEL SECURITY;

-- Users can log their own usage (INSERT only — this is a write-only
-- event log from the user's side, not something they read back).
CREATE POLICY "Users log own usage" ON feature_usage_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only the admin panel (service role) reads it back.
CREATE POLICY "Service role reads all usage log" ON feature_usage_log
  FOR SELECT USING (auth.role() = 'service_role');

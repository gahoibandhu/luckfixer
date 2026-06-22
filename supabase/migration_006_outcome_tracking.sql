-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 006: Outcome Tracking Loop
-- Run in Supabase SQL Editor (after migration_005)
-- ============================================================
--
-- This is the PRIMARY long-term differentiator for Luckfixer vs
-- generic AI chatbots. The loop:
--   1. When a kundli analysis is saved, schedule a follow-up
--      question ~3 weeks later asking if the predicted events
--      happened (career shift, relationship change, etc.)
--   2. User answers yes/no/partially in chat — we record it
--   3. Over time, this builds a proprietary accuracy dataset
--      that no competitor can replicate without our users
--
-- This data is used to:
--   a) Show users their "accuracy score" (builds trust)
--   b) Identify which dasha/yoga predictions are most reliable
--   c) Eventually: weight future predictions by historical accuracy

CREATE TABLE outcome_tracking (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  kundli_id         UUID NOT NULL REFERENCES saved_kundlis(id) ON DELETE CASCADE,
  prediction_id     BIGINT REFERENCES predictions_log(id) ON DELETE SET NULL,

  -- The specific prediction being tracked
  prediction_type   TEXT NOT NULL,   -- 'career' | 'marriage' | 'health' | 'general' | 'dasha_event'
  prediction_text   TEXT NOT NULL,   -- Short human-readable summary of what was predicted
  predicted_window  TEXT NOT NULL,   -- e.g. "January 2026 - August 2026"
  dasha_context     TEXT,            -- e.g. "Chandra MD > Shukra AD"
  predicted_score   INTEGER,         -- 0-100 from eventScores

  -- Follow-up scheduling
  follow_up_at      TIMESTAMPTZ NOT NULL, -- when to ask the user
  asked_at          TIMESTAMPTZ,          -- when we actually asked (NULL = not yet asked)
  reminder_count    INTEGER DEFAULT 0,    -- how many times we've tried asking

  -- Outcome (filled after user responds)
  outcome           TEXT CHECK (outcome IN ('confirmed','denied','partial','skipped')),
  outcome_note      TEXT,            -- user's free-text explanation
  outcome_recorded_at TIMESTAMPTZ,

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE outcome_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own outcomes" ON outcome_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages outcomes" ON outcome_tracking FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_outcome_user      ON outcome_tracking(user_id);
CREATE INDEX idx_outcome_kundli    ON outcome_tracking(kundli_id);
CREATE INDEX idx_outcome_followup  ON outcome_tracking(follow_up_at) WHERE asked_at IS NULL;
CREATE INDEX idx_outcome_pending   ON outcome_tracking(user_id, follow_up_at) WHERE outcome IS NULL;

-- ── View: accuracy summary per user (used in profile + admin) ──
CREATE VIEW user_accuracy_summary AS
SELECT
  user_id,
  COUNT(*)                                        AS total_tracked,
  COUNT(*) FILTER (WHERE outcome = 'confirmed')   AS confirmed,
  COUNT(*) FILTER (WHERE outcome = 'denied')      AS denied,
  COUNT(*) FILTER (WHERE outcome = 'partial')     AS partial,
  COUNT(*) FILTER (WHERE outcome IS NOT NULL AND outcome != 'skipped') AS responded,
  ROUND(
    COUNT(*) FILTER (WHERE outcome IN ('confirmed','partial'))::numeric
    / NULLIF(COUNT(*) FILTER (WHERE outcome IS NOT NULL AND outcome != 'skipped'), 0) * 100
  ) AS accuracy_pct
FROM outcome_tracking
GROUP BY user_id;

-- ── Helper RPC to safely increment reminder_count ──────────────
CREATE OR REPLACE FUNCTION increment_reminder_count(row_id BIGINT)
RETURNS void LANGUAGE sql AS $$
  UPDATE outcome_tracking
  SET reminder_count = reminder_count + 1
  WHERE id = row_id;
$$;

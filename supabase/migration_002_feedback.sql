-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 002: Feedback Loop
-- Run this in Supabase SQL Editor (after schema.sql)
-- ============================================================

-- ─── PREDICTIONS LOG ──────────────────────────────────────────
-- Stores every AI-generated analysis with the raw deterministic
-- fact-sheet that was sent to the AI, for auditing and feedback
CREATE TABLE predictions_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  kundli_id       UUID REFERENCES saved_kundlis(id) ON DELETE CASCADE,
  source          TEXT NOT NULL DEFAULT 'kundli_analysis', -- 'kundli_analysis' | 'chat_reply'
  fact_sheet      JSONB NOT NULL,   -- deterministic planetary data sent to AI
  ai_response     JSONB NOT NULL,   -- full AI output
  model_used      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE predictions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own predictions" ON predictions_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages predictions" ON predictions_log FOR ALL USING (auth.role() = 'service_role');

-- ─── USER FEEDBACK (Thumbs up/down + corrections) ─────────────
CREATE TABLE user_feedback (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  prediction_id   BIGINT REFERENCES predictions_log(id) ON DELETE CASCADE,
  rating          TEXT NOT NULL CHECK (rating IN ('up','down')),
  section         TEXT,             -- 'vedic','lal_kitab','nadi','hora','overall'
  correction_note TEXT,             -- optional user-provided correction text
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own feedback" ON user_feedback FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role views feedback" ON user_feedback FOR SELECT USING (auth.role() = 'service_role');

-- Index for admin querying feedback by prediction
CREATE INDEX idx_feedback_prediction ON user_feedback(prediction_id);
CREATE INDEX idx_predictions_user ON predictions_log(user_id);

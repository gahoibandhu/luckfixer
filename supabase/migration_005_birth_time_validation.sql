-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 005: Birth time validation tracking
-- Run in Supabase SQL Editor
-- ============================================================
--
-- Tracks how the user has responded to past-validation questions.
-- Does NOT auto-adjust the birth chart — that's deliberately conservative.
-- Instead, accumulates a confidence signal: if the user denies multiple
-- chart-derived past events, we surface a soft warning suggesting they
-- double-check their birth time, rather than silently shifting the lagna.

ALTER TABLE saved_kundlis
  ADD COLUMN IF NOT EXISTS birth_time_confidence INTEGER NOT NULL DEFAULT 100
    CHECK (birth_time_confidence >= 0 AND birth_time_confidence <= 100);

ALTER TABLE saved_kundlis
  ADD COLUMN IF NOT EXISTS validation_responses JSONB DEFAULT '[]'::jsonb;
  -- Array of { question, lord, answer: 'yes'|'no'|'unsure', asked_at }

ALTER TABLE saved_kundlis
  ADD COLUMN IF NOT EXISTS birth_time_warning_shown BOOLEAN NOT NULL DEFAULT false;
  -- Prevents repeatedly nagging the user once they've seen the warning

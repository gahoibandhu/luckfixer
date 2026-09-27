-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 021: Yoga-level accuracy tracking
-- Run in Supabase SQL Editor (after migration_020)
-- ============================================================
--
-- migration_014 built dasha-level accuracy stats and said the goal
-- was to "weight future predictions by historical accuracy" — that
-- landed for chat follow-ups (getDashaAccuracyStat, wired into
-- app/api/chat/route.js) but never for the yoga that's actually
-- headlined on every kundli (key_yoga), and never for the FIRST
-- reading a user gets at kundli-creation time — only later chat
-- messages benefited. This closes both gaps.
--
-- Same privacy pattern as migration_014/015: key_yoga is added to
-- outcome_tracking (per-row, alongside the existing dasha_context),
-- and the aggregate view exposes ONLY counts grouped by yoga name —
-- no user_id, no kundli_id, no prediction text.

ALTER TABLE outcome_tracking ADD COLUMN IF NOT EXISTS key_yoga TEXT;
CREATE INDEX IF NOT EXISTS idx_outcome_key_yoga ON outcome_tracking(key_yoga) WHERE key_yoga IS NOT NULL;

CREATE OR REPLACE VIEW yoga_accuracy_stats AS
SELECT
  key_yoga,
  COUNT(*) FILTER (WHERE outcome IS NOT NULL AND outcome != 'skipped')                AS responded,
  COUNT(*) FILTER (WHERE outcome IN ('confirmed','partial'))                           AS positive
FROM outcome_tracking
WHERE key_yoga IS NOT NULL AND key_yoga != ''
GROUP BY key_yoga;

GRANT SELECT ON yoga_accuracy_stats TO authenticated;

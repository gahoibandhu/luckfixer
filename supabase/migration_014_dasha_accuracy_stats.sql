-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 014: Site-wide Dasha Accuracy Stats
-- Run in Supabase SQL Editor (after migration_013)
-- ============================================================
--
-- migration_006 set up the outcome-tracking loop with the stated
-- long-term goal: "Eventually: weight future predictions by
-- historical accuracy." That data has been accumulating (per-user)
-- but nothing reads it back into new predictions yet — this closes
-- that gap.
--
-- This view aggregates outcome_tracking ACROSS ALL USERS, grouped by
-- prediction_type + dasha_context (e.g. "career" + "Chandra MD >
-- Shukra AD"). It intentionally exposes ONLY aggregate counts — no
-- user_id, no prediction_text, no anything identifying — so it is
-- safe to read cross-user despite outcome_tracking's own RLS
-- restricting each user to their own rows.
--
-- lib/outcome-tracking.js:getDashaAccuracyStat() applies the same
-- honesty gate already used for personal accuracy (see
-- MIN_TRACKED_FOR_DISPLAY in app/api/chat/route.js): a minimum
-- sample size before this is used at all, and it is only ever framed
-- to the AI as a general pattern, never as a guarantee for the
-- individual user.

CREATE OR REPLACE VIEW dasha_accuracy_stats AS
SELECT
  prediction_type,
  dasha_context,
  COUNT(*) FILTER (WHERE outcome IS NOT NULL AND outcome != 'skipped')                AS responded,
  COUNT(*) FILTER (WHERE outcome IN ('confirmed','partial'))                           AS positive
FROM outcome_tracking
WHERE dasha_context IS NOT NULL AND dasha_context != ''
GROUP BY prediction_type, dasha_context;

-- Aggregate-only view — no per-user data exposed, safe to grant
-- broadly to any authenticated user (needed because chat/route.js
-- reads via the cookie-scoped client, not a service-role client).
GRANT SELECT ON dasha_accuracy_stats TO authenticated;

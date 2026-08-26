-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 015: Remedy ↔ Outcome Correlation
-- Run in Supabase SQL Editor (after migration_014)
-- ============================================================
--
-- Closes the last piece of the "prediction stronger" discussion:
-- we now have BOTH user_remedies (who actually did a remedy) and
-- outcome_tracking (what happened). This view correlates them at
-- the kundli level: kundlis with at least one COMPLETED remedy vs
-- kundlis with none, compared on their outcome_tracking confirm
-- rate. Deliberately coarse (kundli-level, not remedy-to-prediction
-- matched 1:1) — a stricter match would need vastly more data before
-- any cell had enough samples to say anything honest.
--
-- Aggregate-only, no user_id/kundli_id/text exposed — safe to read
-- cross-user from the cookie-scoped client, same reasoning as
-- migration_014's dasha_accuracy_stats.

CREATE OR REPLACE VIEW remedy_outcome_correlation AS
WITH kundli_remedy_flag AS (
  SELECT DISTINCT kundli_id
  FROM user_remedies
  WHERE status = 'done'
),
outcome_with_flag AS (
  SELECT
    ot.outcome,
    (krf.kundli_id IS NOT NULL) AS took_remedy
  FROM outcome_tracking ot
  LEFT JOIN kundli_remedy_flag krf ON krf.kundli_id = ot.kundli_id
  WHERE ot.outcome IS NOT NULL AND ot.outcome != 'skipped'
)
SELECT
  took_remedy,
  COUNT(*)                                                   AS responded,
  COUNT(*) FILTER (WHERE outcome IN ('confirmed','partial'))  AS positive
FROM outcome_with_flag
GROUP BY took_remedy;

GRANT SELECT ON remedy_outcome_correlation TO authenticated;

-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 026: Admin dashboard performance
-- Run in Supabase SQL Editor (after migration_025)
-- ============================================================
--
-- Fixes "canceling statement due to statement timeout" (SQLSTATE 57014) on the
-- admin Overview. The stats route filters chat_messages / predictions_log /
-- usage_log by DATE, but none of those columns were indexed, so every
-- dashboard load full-scanned tables that grow with every chat and every
-- kundli analysis (predictions_log rows also carry big JSON payloads).
--
-- Safe to re-run. If an index build itself hits the editor's time limit on a big
-- table, run this first in the same editor tab:   SET statement_timeout = '10min';

-- 1) Date-range lookups the stats route does every load ---------------------
CREATE INDEX IF NOT EXISTS idx_chat_messages_assistant_recent
  ON chat_messages (created_at DESC)
  WHERE role = 'assistant' AND model_used IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_predictions_log_created
  ON predictions_log (created_at DESC)
  INCLUDE (model_used)
  WHERE model_used IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usage_log_log_date
  ON usage_log (log_date);

-- 2) Model-usage breakdown computed IN the database -------------------------
-- The old code downloaded every matching row (silently capped at 1000 by the API,
-- so the numbers were also wrong on busy weeks) and counted in JavaScript.
-- predictions_log.model_used looks like "core:gemini/x, life_domains:groq/y" —
-- each comma-separated piece is one provider call; the part after the first ':'
-- is the model name (same rule the route used before).
CREATE OR REPLACE FUNCTION admin_model_breakdown(since timestamptz)
RETURNS TABLE (model text, cnt bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT model_used AS model, count(*)::bigint AS cnt
  FROM chat_messages
  WHERE role = 'assistant' AND created_at >= since AND model_used IS NOT NULL
  GROUP BY model_used
  UNION ALL
  SELECT trim(CASE WHEN position(':' in part) = 0 THEN part
                   ELSE substring(part from position(':' in part) + 1) END) AS model,
         count(*)::bigint AS cnt
  FROM (
    SELECT unnest(string_to_array(model_used, ',')) AS part
    FROM predictions_log
    WHERE created_at >= since AND model_used IS NOT NULL
  ) p
  GROUP BY 1;
$$;

-- Service role only — never callable from the browser.
REVOKE ALL ON FUNCTION admin_model_breakdown(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_model_breakdown(timestamptz) TO service_role;

ANALYZE chat_messages;
ANALYZE predictions_log;
ANALYZE usage_log;

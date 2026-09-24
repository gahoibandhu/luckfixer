-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 018: App config (key/value)
-- Run in Supabase SQL Editor (after migration_017)
-- ============================================================
--
-- General-purpose site config store, read live (60s cache, same
-- pattern as plan_config) — no redeploy needed to change a value.
-- First use: bot_display_name, so admin can rename the bot away
-- from "Luckfixer" without touching code.

CREATE TABLE IF NOT EXISTS app_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages app_config" ON app_config FOR ALL USING (auth.role() = 'service_role');

INSERT INTO app_config (key, value)
VALUES ('bot_display_name', 'Luckfixer')
ON CONFLICT (key) DO NOTHING;

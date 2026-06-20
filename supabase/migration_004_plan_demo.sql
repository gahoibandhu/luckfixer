-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 004: Flexible plan config + demo users
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Add plan_type to plan_config ──────────────────────────────
-- plan_type: 'chat' = limit by chat count, 'time' = limit by minutes
ALTER TABLE plan_config
  ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'chat'
    CHECK (plan_type IN ('chat', 'time', 'both'));

ALTER TABLE plan_config
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── Demo users table ──────────────────────────────────────────
-- Admin can assign users to demo plan (unlimited access for testing)
CREATE TABLE IF NOT EXISTS demo_users (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL DEFAULT 'admin',
  note        TEXT,
  expires_at  TIMESTAMPTZ,             -- NULL = never expires
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE demo_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages demo users"
  ON demo_users FOR ALL
  USING (auth.role() = 'service_role');

-- ── Update default plan_config if exists ──────────────────────
UPDATE plan_config
SET plan_type = 'chat'
WHERE plan_type IS NULL OR plan_type = '';

-- ── Insert default if no row exists ──────────────────────────
INSERT INTO plan_config (plan_name, free_chats_day, free_mins_day, charge_per_min, plan_type)
SELECT 'free', 10, 5, 1.0, 'chat'
WHERE NOT EXISTS (SELECT 1 FROM plan_config WHERE plan_name = 'free');

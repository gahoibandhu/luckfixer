-- ============================================================
-- LUCKFIXER 2.0 — EMERGENCY SECURITY FIX
-- Run this IMMEDIATELY in Supabase SQL Editor
-- Enables RLS on all tables + adds correct policies
-- ============================================================

-- ── 1. user_profiles ─────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access profiles" ON user_profiles;

CREATE POLICY "Users view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role full access profiles"
  ON user_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ── 2. saved_kundlis ──────────────────────────────────────────
ALTER TABLE saved_kundlis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own kundlis" ON saved_kundlis;
DROP POLICY IF EXISTS "Service role full access kundlis" ON saved_kundlis;

CREATE POLICY "Users manage own kundlis"
  ON saved_kundlis FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access kundlis"
  ON saved_kundlis FOR ALL
  USING (auth.role() = 'service_role');

-- ── 3. chat_sessions ─────────────────────────────────────────
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Service role full access sessions" ON chat_sessions;

CREATE POLICY "Users manage own sessions"
  ON chat_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access sessions"
  ON chat_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- ── 4. chat_messages ─────────────────────────────────────────
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users insert own messages" ON chat_messages;
DROP POLICY IF EXISTS "Service role full access messages" ON chat_messages;

CREATE POLICY "Users view own messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access messages"
  ON chat_messages FOR ALL
  USING (auth.role() = 'service_role');

-- ── 5. usage_log ─────────────────────────────────────────────
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own usage" ON usage_log;
DROP POLICY IF EXISTS "Service role full access usage" ON usage_log;

CREATE POLICY "Users view own usage"
  ON usage_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access usage"
  ON usage_log FOR ALL
  USING (auth.role() = 'service_role');

-- ── 6. plan_config ───────────────────────────────────────────
ALTER TABLE plan_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read plan config" ON plan_config;
DROP POLICY IF EXISTS "Service role manages plan config" ON plan_config;

-- Plan config is public read (needed by usage-guard), admin-only write
CREATE POLICY "Anyone can read plan config"
  ON plan_config FOR SELECT
  USING (true);

CREATE POLICY "Service role manages plan config"
  ON plan_config FOR ALL
  USING (auth.role() = 'service_role');

-- ── 7. predictions_log (if exists) ───────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'predictions_log') THEN
    ALTER TABLE predictions_log ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users view own predictions" ON predictions_log;
    DROP POLICY IF EXISTS "Service role manages predictions" ON predictions_log;

    CREATE POLICY "Users view own predictions"
      ON predictions_log FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Service role manages predictions"
      ON predictions_log FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ── 8. user_feedback (if exists) ─────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_feedback') THEN
    ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users manage own feedback" ON user_feedback;
    DROP POLICY IF EXISTS "Service role views feedback" ON user_feedback;

    CREATE POLICY "Users manage own feedback"
      ON user_feedback FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Service role views feedback"
      ON user_feedback FOR SELECT
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ── Verify RLS is enabled on all tables ──────────────────────
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

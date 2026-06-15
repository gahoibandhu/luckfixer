-- ============================================================
-- LUCKFIXER 2.0 — COMPLETE SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable pgvector for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── 1. USER PROFILES ────────────────────────────────────────
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  mobile        TEXT,
  email         TEXT UNIQUE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"   ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── 2. SAVED KUNDLIS ────────────────────────────────────────
CREATE TABLE saved_kundlis (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  label         TEXT NOT NULL DEFAULT 'My Kundli',
  full_name     TEXT NOT NULL,
  dob           DATE NOT NULL,
  birth_time    TIME NOT NULL,
  birth_place   TEXT NOT NULL,
  latitude      DECIMAL(10,7) NOT NULL,
  longitude     DECIMAL(10,7) NOT NULL,
  ayanamsa      TEXT DEFAULT 'lahiri',
  planet_data   JSONB,
  luck_score    INTEGER,
  last_analysis TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE saved_kundlis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own kundlis" ON saved_kundlis FOR ALL USING (auth.uid() = user_id);

-- ─── 3. CHAT SESSIONS ────────────────────────────────────────
CREATE TABLE chat_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  kundli_id     UUID REFERENCES saved_kundlis(id) ON DELETE SET NULL,
  title         TEXT DEFAULT 'New Chat',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON chat_sessions FOR ALL USING (auth.uid() = user_id);

-- ─── 4. CHAT MESSAGES ────────────────────────────────────────
CREATE TABLE chat_messages (
  id            BIGSERIAL PRIMARY KEY,
  session_id    UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content       TEXT NOT NULL,
  model_used    TEXT,
  tokens_used   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages" ON chat_messages FOR ALL USING (auth.uid() = user_id);

-- ─── 5. USAGE LOG (for billing/free tier tracking) ───────────
CREATE TABLE usage_log (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  chat_count    INTEGER DEFAULT 0,
  free_mins_used DECIMAL(6,2) DEFAULT 0,
  paid_mins_used DECIMAL(6,2) DEFAULT 0,
  total_tokens  INTEGER DEFAULT 0,
  UNIQUE(user_id, log_date)
);

ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own usage" ON usage_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages usage" ON usage_log FOR ALL USING (auth.role() = 'service_role');

-- ─── 6. PLAN CONFIG (Admin editable) ─────────────────────────
CREATE TABLE plan_config (
  id              SERIAL PRIMARY KEY,
  plan_name       TEXT UNIQUE NOT NULL DEFAULT 'free',
  free_mins_day   DECIMAL(6,2) DEFAULT 10,
  free_chats_day  INTEGER DEFAULT 5,
  charge_per_min  DECIMAL(8,4) DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_by      TEXT
);

-- Insert default free plan
INSERT INTO plan_config (plan_name, free_mins_day, free_chats_day, charge_per_min)
VALUES ('free', 10, 5, 0);

-- RLS: public can read, only service_role can write
ALTER TABLE plan_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plan config" ON plan_config FOR SELECT USING (true);
CREATE POLICY "Service role manages plan"   ON plan_config FOR ALL USING (auth.role() = 'service_role');

-- ─── 7. SHASTRIC KNOWLEDGEBASE (RAG) ─────────────────────────
CREATE TABLE shastric_knowledgebase (
  id              BIGSERIAL PRIMARY KEY,
  stream_type     TEXT NOT NULL,  -- 'NADI','LAL_KITAB','PARASHARA','NUMEROLOGY'
  chapter_ref     TEXT,
  original_text   TEXT NOT NULL,
  hindi_text      TEXT,
  planet_tags     TEXT[],
  sign_tags       TEXT[],
  remedy_type     TEXT,
  efficacy_score  DECIMAL(4,2) DEFAULT 5.0,
  embedding       VECTOR(1536),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON shastric_knowledgebase USING ivfflat (embedding vector_cosine_ops);

ALTER TABLE shastric_knowledgebase ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read knowledgebase" ON shastric_knowledgebase FOR SELECT USING (true);

-- ─── 8. HELPER FUNCTION — upsert usage ───────────────────────
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_mins    DECIMAL,
  p_tokens  INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_log (user_id, log_date, chat_count, free_mins_used, total_tokens)
  VALUES (p_user_id, CURRENT_DATE, 1, p_mins, p_tokens)
  ON CONFLICT (user_id, log_date) DO UPDATE SET
    chat_count     = usage_log.chat_count + 1,
    free_mins_used = usage_log.free_mins_used + p_mins,
    total_tokens   = usage_log.total_tokens + p_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

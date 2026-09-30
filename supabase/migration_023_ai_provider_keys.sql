-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 023: Admin-managed AI provider keys
-- Run in Supabase SQL Editor (after migration_022)
-- ============================================================
--
-- Lets the admin add extra AI providers / API keys from the admin panel
-- instead of only via Vercel env vars. These are ADDED to the env-based
-- fallback chain in lib/ai-engine.js (env keys keep working as before).
--
-- Keys are stored ENCRYPTED (AES-256-GCM, secret = KEY_ENCRYPTION_SECRET
-- env var — see lib/ai-key-vault.js). The full key is never returned to
-- the browser; only key_last4 is shown.

CREATE TABLE IF NOT EXISTS ai_provider_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL,                 -- sambanova | groq | openrouter | huggingface | gemini | together | custom
  label           TEXT NOT NULL,                 -- e.g. "SambaNova key 3"
  api_key_enc     TEXT NOT NULL,                 -- v1:iv:tag:ciphertext
  key_last4       TEXT,                          -- for display only
  model           TEXT NOT NULL,
  base_url        TEXT NOT NULL,                 -- OpenAI-compatible base, no trailing /chat/completions
  priority        INTEGER NOT NULL DEFAULT 100,  -- lower = tried earlier (built-ins: Gemini 10, Groq 20, SambaNova 30, OpenRouter 40, HuggingFace 50)
  enabled         BOOLEAN NOT NULL DEFAULT true,
  status          TEXT NOT NULL DEFAULT 'new',   -- new | ok | error | rate_limited | invalid
  last_error      TEXT,
  fail_count      INTEGER NOT NULL DEFAULT 0,
  cooldown_until  TIMESTAMPTZ,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_provider_keys ENABLE ROW LEVEL SECURITY;
-- Service role only. No policy for anon/authenticated => browser can never read this table.
CREATE POLICY "Service role manages ai_provider_keys" ON ai_provider_keys FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_ai_provider_keys_priority ON ai_provider_keys (enabled, priority);

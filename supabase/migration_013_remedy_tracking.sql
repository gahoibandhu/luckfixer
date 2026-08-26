-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 013: Remedy Tracking
-- Run in Supabase SQL Editor (after migration_012)
-- ============================================================
--
-- Problem this fixes: remedies (Lal Kitab daan, mantra, gemstone,
-- dosha remedies) currently only exist as either (a) a JSON snapshot
-- inside saved_kundlis.planet_data.analysis, or (b) one-off prose in
-- a chat reply. Neither is something a user can come back to later
-- and say "yeh maine kar liya, yeh baaki hai" — so remedies given
-- once are effectively forgotten.
--
-- This table logs every remedy actually surfaced to a user (at
-- kundli-save time, or when the chat AI gives one) as a structured,
-- checkable row. Nothing here is AI-generated — every row is copied
-- verbatim from the SAME deterministic remedyPlan / dosha remedy data
-- already computed in lib/remedy-plan.js and lib/yogas.js, consistent
-- with the "compute facts deterministically, AI narrates only" rule.

CREATE TABLE user_remedies (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  kundli_id       UUID NOT NULL REFERENCES saved_kundlis(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,

  source          TEXT NOT NULL CHECK (source IN ('kundli_analysis','chat')),

  -- Which planet this remedy targets ('multiple' for a dosha that
  -- names more than one graha — see remedy_text in that case).
  planet          TEXT,
  planet_hi       TEXT,

  remedy_type     TEXT NOT NULL CHECK (remedy_type IN ('lal_kitab','vedic_mantra','gemstone','dosha_remedy')),

  -- Structured fields — populated depending on remedy_type.
  -- lal_kitab:
  donate          TEXT,
  day_of_week     TEXT,
  color           TEXT,
  food            TEXT,
  avoid           TEXT,
  -- vedic_mantra:
  mantra          TEXT,
  mantra_count    INTEGER,
  -- gemstone:
  gem_name        TEXT,
  gem_reason      TEXT,
  -- dosha_remedy (attachDoshaRemedies produces one combined Hindi
  -- sentence rather than separate structured fields):
  remedy_text     TEXT,

  -- Context captured at the time this remedy was given, so the
  -- reasoning is still visible later even if the chart is re-analyzed.
  verdict         TEXT,   -- e.g. 'needs_direct_remedy' | 'compensated_by_support' | 'partial_support'
  support_planet  TEXT,
  yoga_name       TEXT,   -- set only for dosha_remedy rows

  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','skipped')),
  given_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_remedies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own remedies" ON user_remedies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role manages remedies" ON user_remedies FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_remedies_user      ON user_remedies(user_id);
CREATE INDEX idx_remedies_kundli    ON user_remedies(kundli_id);
CREATE INDEX idx_remedies_pending   ON user_remedies(user_id, status) WHERE status = 'pending';

-- Dedup guard used by lib/remedy-tracking.js before insert: prevents
-- the same planet+type remedy for the same kundli being logged again
-- and again every time the chat AI re-offers it in later messages.
CREATE INDEX idx_remedies_dedup ON user_remedies(kundli_id, planet, remedy_type, status);

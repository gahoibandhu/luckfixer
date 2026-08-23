-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 010: Numerology feature + public ratings
-- Run this in Supabase SQL Editor (after migration_009)
-- ============================================================

-- ─── NUMEROLOGY QUERIES (standalone name checks: person/company/shop) ──
-- Independent of saved_kundlis — a user can check ANY name here,
-- not just their own saved birth chart's name.
CREATE TABLE numerology_queries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name_queried    TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'person', -- 'person' | 'company' | 'shop' | 'other'
  reference_dob   DATE,                            -- optional, e.g. founder's DOB
  numerology_data JSONB NOT NULL,                   -- deterministic output from lib/numerology.js
  ai_narrative    JSONB,                            -- AI Hindi narration of the above
  model_used      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE numerology_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own numerology queries" ON numerology_queries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role manages numerology queries" ON numerology_queries FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_numerology_queries_user ON numerology_queries(user_id);

-- ─── PUBLIC / OPEN-TO-ALL FEATURE RATINGS ──────────────────────
-- Unlike user_feedback (private thumbs up/down tied to one person's
-- own prediction, visible only to that user + service role), this
-- is a 1-5 star rating explicitly meant to be OPEN — any signed-in
-- user can read every rating and the aggregate average/count, the
-- way a public app-store review section works. Scoped per "feature"
-- (starting with 'numerology') so it can be reused for other tools
-- (e.g. 'milan', 'ram_shalaka') later without a new table.
CREATE TABLE feature_ratings (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  feature      TEXT NOT NULL DEFAULT 'numerology',
  stars        SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature)   -- one rating per user per feature; re-rating updates it
);

ALTER TABLE feature_ratings ENABLE ROW LEVEL SECURITY;
-- Open to all signed-in users — this is the whole point (public ratings).
CREATE POLICY "Anyone can read feature ratings" ON feature_ratings FOR SELECT USING (true);
-- But you can only ever write/update/delete YOUR OWN rating.
CREATE POLICY "Users manage own rating" ON feature_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rating" ON feature_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own rating" ON feature_ratings FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_feature_ratings_feature ON feature_ratings(feature);

-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 011
-- 1) Link numerology_queries to a saved_kundlis row (optional)
-- 2) Make feature_ratings comments PRIVATE (author + admin only)
--    while keeping the star AVERAGE/COUNT public, via a view that
--    never exposes comment or user_id.
-- Run this in Supabase SQL Editor (after migration_010)
-- ============================================================

-- ─── 1) Numerology ↔ Kundli link ────────────────────────────────
-- When a user runs the numerology tool "from" one of their saved
-- kundlis, we record which one — this lets /api/numerology reuse the
-- ALREADY-COMPUTED full numerology sheet (lib/numerology.js →
-- buildNumerologySheet, saved on saved_kundlis.planet_data.numerology
-- at kundli-creation time) instead of a lighter recompute, so the
-- correction advice is based on the same complete birth data as the
-- rest of the chart.
ALTER TABLE numerology_queries
  ADD COLUMN IF NOT EXISTS kundli_id UUID REFERENCES saved_kundlis(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_numerology_queries_kundli ON numerology_queries(kundli_id);

-- ─── 2) feature_ratings — comments become private ───────────────
-- Previous policy ("Anyone can read") let every signed-in user read
-- every OTHER user's free-text comment too. Product decision: the
-- 1-5 star score stays a public, app-store-style aggregate; the
-- written feedback text is meant for the Luckfixer team only, not
-- other users. Tighten row-level SELECT to "your own row" (+ service
-- role for the admin panel), and expose the public aggregate through
-- a view that contains no comment and no user_id at all.
DROP POLICY IF EXISTS "Anyone can read feature ratings" ON feature_ratings;

CREATE POLICY "Users read own rating" ON feature_ratings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role reads all ratings" ON feature_ratings
  FOR SELECT USING (auth.role() = 'service_role');

-- Aggregate-only, no comment/user_id — safe for every signed-in user.
-- Drives the public "⭐ 4.8/5 · 12 ratings" display everywhere in the app.
CREATE OR REPLACE VIEW feature_ratings_public AS
  SELECT feature, COUNT(*)::int AS count, ROUND(AVG(stars)::numeric, 2) AS average
  FROM feature_ratings
  GROUP BY feature;

GRANT SELECT ON feature_ratings_public TO authenticated;

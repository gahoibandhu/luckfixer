-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 024: Birth-time source + rectification
-- Run in Supabase SQL Editor (after migration_023)
-- ============================================================
--
-- birth_time_source: how trustworthy the stored birth_time is.
--   exact      user gave a clock time from a certificate / hospital record
--   approx     user was unsure / gave a rough time
--   unknown    user doesn't know the time at all (12:00 stored as a placeholder)
--   rectified  chosen from the birth-time rectification windows
-- life_events:   [{ type, date }] the user entered for rectification
-- rectification: last scan summary { ran_at, window, confidence, windows[], chosen }
--
-- Existing rows default to 'exact' (that is what they were treated as so far).
-- The existing birth_time_confidence (0-100, migration_005) is kept in step with
-- the source by the API: exact 100, rectified 80, approx 60, unknown 30.

ALTER TABLE saved_kundlis
  ADD COLUMN IF NOT EXISTS birth_time_source TEXT NOT NULL DEFAULT 'exact'
    CHECK (birth_time_source IN ('exact', 'approx', 'unknown', 'rectified'));

ALTER TABLE saved_kundlis ADD COLUMN IF NOT EXISTS life_events   JSONB DEFAULT '[]'::jsonb;
ALTER TABLE saved_kundlis ADD COLUMN IF NOT EXISTS rectification JSONB;

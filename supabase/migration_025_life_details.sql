-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 025: Life details (marital status, children)
-- Run in Supabase SQL Editor (after migration_024)
-- ============================================================
--
-- Stored PER KUNDLI (not per user) — a user can hold kundlis of parents, spouse
-- or children, and "married / has kids" describes the person the kundli is for.
-- Collected through tap-to-answer chips in chat (only when a question needs it)
-- and editable from the Profile page.
--
-- marital_status:  unmarried | married | divorced | widowed | prefer_not
-- children_status: none | one | two | three_plus | prefer_not
-- life_prompts_skipped: { "marital": "<iso ts>", "children": "<iso ts> } — set when the
--   user taps "later"; we don't ask again for 7 days.

ALTER TABLE saved_kundlis
  ADD COLUMN IF NOT EXISTS marital_status  TEXT
    CHECK (marital_status IN ('unmarried', 'married', 'divorced', 'widowed', 'prefer_not'));

ALTER TABLE saved_kundlis
  ADD COLUMN IF NOT EXISTS children_status TEXT
    CHECK (children_status IN ('none', 'one', 'two', 'three_plus', 'prefer_not'));

ALTER TABLE saved_kundlis
  ADD COLUMN IF NOT EXISTS life_prompts_skipped JSONB NOT NULL DEFAULT '{}'::jsonb;

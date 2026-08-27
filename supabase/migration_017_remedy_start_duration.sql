-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 017: Remedy Start Date + Duration
-- Run in Supabase SQL Editor (after migration_016)
-- ============================================================
--
-- Product request: a remedy should say WHEN to start and for HOW
-- LONG to continue, and the UI should only show what's actually
-- active right now — not every remedy ever suggested, all at once.
--
-- start_date is set by the user themselves (they tap "शुरू करें"
-- when they actually begin it — NOT auto-set at kundli-save time,
-- since a remedy being *suggested* is not the same as being *started*).
--
-- duration_days is a SUGGESTED length, editable by the user — we
-- deliberately don't hardcode a fixed number per remedy (Lal Kitab
-- duration conventions vary by tradition/region and we'd rather not
-- assert false precision). The UI defaults new mantra/dosha remedies
-- to 43 days (the most widely-cited general Lal Kitab convention) and
-- daan/donation-type remedies to 1 day (a one-time act performed on
-- the specified weekday) — both are pre-fills the user can change.

ALTER TABLE user_remedies
  ADD COLUMN IF NOT EXISTS start_date    DATE,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER;

-- Fast lookup for "what's active today" queries (profile/remedies page).
CREATE INDEX IF NOT EXISTS idx_remedies_active
  ON user_remedies(user_id, start_date)
  WHERE status = 'pending' AND start_date IS NOT NULL;

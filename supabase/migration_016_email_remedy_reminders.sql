-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 016: Remedy Email Reminder Opt-in
-- Run in Supabase SQL Editor (after migration_015)
-- ============================================================
--
-- Default reminder is in-app (profile page shows today's day-matched
-- remedy — no data change needed for that, it's computed client-side
-- from user_remedies + today's weekday). Email is opt-in ONLY, per
-- explicit product decision — this column is that toggle, read by
-- the existing daily-digest cron job (app/api/cron/daily-digest/route.js).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email_remedy_reminders BOOLEAN NOT NULL DEFAULT false;

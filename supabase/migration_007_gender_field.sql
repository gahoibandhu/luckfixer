-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 007: Gender field
-- Run in Supabase SQL Editor (after migration_006)
-- ============================================================
--
-- Adds an optional gender field to saved_kundlis. Used for:
--   1. Correct address terms in chat (bhai/behen instead of a
--      default that was wrongly assuming everyone is male —
--      real bug: "Sanchita bhai" was said to a female user).
--   2. A few classical Vedic techniques have gender-specific
--      nuances (e.g. some Mangal Dosha interpretation variations).
-- Optional field — if not provided, the AI uses fully neutral
-- address (first name only, no bhai/behen) rather than guessing.

ALTER TABLE saved_kundlis
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male','female','other') OR gender IS NULL);

-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 020: Feedback + Support messages
-- Run in Supabase SQL Editor (after migration_019)
-- ============================================================
--
-- One table, two purposes, sharing the same submission route/UI:
--   type='feedback' — one-way, no admin reply expected. General site
--                      feedback, separate from the per-kundli-reading
--                      thumbs up/down and from the star-rating widget.
--   type='support'  — ticket-style. Admin can reply (admin_reply,
--                      admin_reply_at) and the user sees the reply
--                      back on their own /support page.

CREATE TABLE IF NOT EXISTS support_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('feedback', 'support')),
  subject         TEXT,
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  admin_reply     TEXT,
  admin_reply_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_user ON support_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_type_status ON support_messages(type, status);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Users can see and create their own messages/tickets.
CREATE POLICY "Users manage own support_messages" ON support_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admin API routes use the service role key (bypasses RLS) — matches
-- the pattern already used by feature_ratings / broadcast_log.
CREATE POLICY "Service role manages support_messages" ON support_messages
  FOR ALL USING (auth.role() = 'service_role');

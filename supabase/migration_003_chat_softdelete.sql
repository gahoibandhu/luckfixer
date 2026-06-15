-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 003: Chat soft-delete + cleanup
-- Run this in Supabase SQL Editor (after migration_002)
-- ============================================================

-- Soft-delete flag: when a user deletes a chat from their side, we hide it
-- from their list AND from admin's default Chat Audit view, but keep the
-- row + messages intact so admin can review it under a separate
-- "Deleted" filter if needed for record management.
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS deleted_by_user BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- One-time cleanup: remove any existing chat sessions that have zero
-- messages (created before the deferred-session-creation fix).
DELETE FROM chat_sessions
WHERE id NOT IN (SELECT DISTINCT session_id FROM chat_messages WHERE session_id IS NOT NULL);

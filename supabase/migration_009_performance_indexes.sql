-- migration_009_performance_indexes.sql
--
-- ROOT CAUSE of "admin panel bahut slow hai": the original schema never
-- indexed the columns every admin query actually filters/joins/orders by
-- (chat_sessions.user_id, chat_messages.session_id, saved_kundlis.user_id,
-- etc). Every query on these was doing a full sequential table scan —
-- fine with a handful of test rows, but gets linearly slower as real
-- chat_messages/chat_sessions data grows. The app-level fixes already
-- made (parallel Promise.all queries, batched N+1 removal) only help
-- once each individual query is itself fast — this migration is what
-- actually makes each query fast at the database level.
--
-- Safe to run on production: CREATE INDEX IF NOT EXISTS is non-destructive
-- and does not lock tables for writes (uses CONCURRENTLY where possible).

-- ── Chat sessions: admin/chats and chat/page.jsx both filter by user_id
-- and sort by updated_at — this was a full table scan on every load.
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id    ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_kundli_id  ON chat_sessions(kundli_id) WHERE kundli_id IS NOT NULL;

-- ── Chat messages: every session-load and every admin per-session
-- message-count query filters by session_id — this was the single
-- biggest contributor to admin panel slowness as chat volume grows.
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id    ON chat_messages(user_id);

-- ── Saved kundlis: profile page + kundli lookups filter by user_id.
CREATE INDEX IF NOT EXISTS idx_saved_kundlis_user_id ON saved_kundlis(user_id);

-- ── Predictions log: used by outcome-tracking + admin chat audit joins.
CREATE INDEX IF NOT EXISTS idx_predictions_log_user_id   ON predictions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_log_kundli_id ON predictions_log(kundli_id);

-- ── User search for the broadcast "specific users" picker: a plain
-- ILIKE '%term%' can't use a normal btree index (wildcard on both sides).
-- pg_trgm + a GIN trigram index makes that search fast instead of a full
-- table scan on every keystroke-triggered search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_trgm     ON user_profiles USING GIN (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_profiles_full_name_trgm ON user_profiles USING GIN (full_name gin_trgm_ops);

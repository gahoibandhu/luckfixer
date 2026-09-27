-- ============================================================
-- LUCKFIXER 2.0 — MIGRATION 022: Chat message error detail
-- Run in Supabase SQL Editor (after migration_021)
-- ============================================================
--
-- Bug this fixes: when a message falls all the way through the AI
-- provider chain (Gemini → Groq → SambaNova → OpenRouter →
-- HuggingFace), the real reason EACH one failed only ever went to
-- console.warn (Vercel Runtime Logs) — invisible from the admin
-- panel, so diagnosing a "fallback" message meant going log-digging.
-- This column stores that detail (only set on fallback messages,
-- NULL otherwise) so it's visible right in Chat Audit.

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS error_detail TEXT;

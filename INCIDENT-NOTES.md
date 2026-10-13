# Chat on fallback + slow admin panel — what was found and what changed (overlay on the chat-crash-fix zip)

## What the error text says
 Groq 413            prompt too big for Groq's 8000-token/min limit (the base chat prompt alone is ~4.6k tokens, plus chart blocks + 2000 reserved output)
 SambaNova 402       out of credits / key problem          HuggingFace 402   no remaining credits
 Gemini 10000ms      the PRIMARY provider (~92% of chats per the code comments) did not answer in 10s  -> every chat fell through to the weak ones
 OpenRouter 9000ms   free models too slow
 Admin: ALL queries timed out, even "count user_profiles"  -> the database (or the path to it) was not answering, not one heavy query.
 I cannot see your production, so I could not prove WHY Gemini and the database stalled. These changes remove the amplifiers and add a tool that measures it.

## Changes
 1 Gemini chat timeout 10s -> 25s (env GEMINI_CHAT_TIMEOUT_MS). The other providers are weaker or dead; waiting for Gemini beats a fallback message.
 2 Groq is not called when the prompt is over ~5500 tokens (env GROQ_MAX_PROMPT_TOKENS) - it would only answer 413.
 3 A provider that answers 401/402/403 (bad key / no credits) is rested for 10 min instead of being hit on every chat.
 4 Chat Audit failure detail now starts with "prompt~NNNNtok" and logs show per-provider milliseconds.
 5 Supabase calls on the chat path (usage guard, bot name, provider list, usage log, user client) now time out (3-8s) instead of hanging until the function dies.
   IMPORTANT detail found while testing: supabase-js retries failed GETs up to 3x with 1s/2s/4s waits unless the abort is an "AbortError";
   a plain AbortSignal.timeout() inside the client's fetch is a "TimeoutError" and gets retried. lib/supabase-fetch.js uses AbortError (verified: 1 request, 1s).
 6 proxy.js: no network call on a normal request (getSession reads the cookie, refreshes only near expiry), 2s cap, API routes no longer go through it.
   (My earlier version called Supabase Auth on every /api and page request - extra load exactly when Supabase is slow.)
 7 Admin stats: 6s per query, skips the 10 parallel user-list calls when the DB is not answering, serves the last good dashboard (marked stale) if >=6 queries fail.
 8 NEW /api/admin/health  (open while logged in as admin): times the DB, Supabase Auth, Gemini (tiny AND chat-sized prompt), Groq, OpenRouter, SambaNova, HuggingFace
   and prints a plain-language "readout".   NEW supabase/diagnose_db.sql: read-only queries for the Supabase SQL editor.

## Verified here (mock providers, no production access)
 Gemini answering after 15s now succeeds (was fallback); Gemini hanging -> friendly message after 25s with prompt size in the detail;
 Groq never called with the big prompt; 402 providers skipped on the next chat; stalled DB -> 1 request / 1s.  Build OK.
## NOT verified: your real Gemini/Supabase health. Run /api/admin/health and send me the "readout" lines.

## Things only you can do
 - Supabase dashboard: Reports -> Database (CPU, memory, "Disk IO % consumed"); Project Settings -> Infrastructure (paused?); status.supabase.com for your region.
 - SambaNova + HuggingFace: top up credits or remove those keys (Admin -> AI keys / Vercel env) - they only add noise while they return 402.
 - Google AI Studio: check the Gemini key's quota/billing, and that GEMINI_MODEL (default gemini-3.1-flash-lite) is still a valid model name.

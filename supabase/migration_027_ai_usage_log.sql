-- migration_027_ai_usage_log.sql
-- Per-call AI token ledger for every feature EXCEPT live chat (chat tokens already
-- live in usage_log.total_tokens). Lets the admin dashboard show "kitne token kis
-- feature me gaye" — kundli analysis, regenerate-in-language, numerology, etc.
-- Tokens are ESTIMATES (characters / 4) — the free providers don't all return counts.

create table if not exists public.ai_usage_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  feature     text not null,                 -- 'kundli_analysis' | 'numerology' | ...
  model       text,
  tokens_est  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists ai_usage_log_created_idx on public.ai_usage_log (created_at desc);
create index if not exists ai_usage_log_feature_idx on public.ai_usage_log (feature, created_at desc);

-- Written/read only through the service-role key (admin API). No client access.
alter table public.ai_usage_log enable row level security;

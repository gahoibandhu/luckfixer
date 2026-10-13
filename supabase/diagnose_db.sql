-- supabase/diagnose_db.sql — run in Supabase -> SQL Editor, one block at a time. Read-only. Use when the admin panel shows "database timeout".

-- 1) Is anything running right now, and for how long? (long-running or "idle in transaction" rows are the usual culprits)
select pid, usename, state, now() - query_start as running_for, wait_event_type, wait_event, left(query, 120) as query
from pg_stat_activity
where datname = current_database() and pid <> pg_backend_pid()
order by query_start nulls last
limit 25;

-- 2) Is something blocking something else (locks)?
select blocked.pid as blocked_pid, left(blocked.query, 80) as blocked_query,
       blocking.pid as blocking_pid, left(blocking.query, 80) as blocking_query
from pg_stat_activity blocked
join pg_stat_activity blocking on blocking.pid = any(pg_blocking_pids(blocked.pid))
where cardinality(pg_blocking_pids(blocked.pid)) > 0;

-- 3) How many connections are open vs the limit?
select count(*) as open_connections, current_setting('max_connections') as max_connections from pg_stat_activity;

-- 4) Which tables are big? (a very large table with heavy JSON columns makes counts and scans slow)
select relname as table_name,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size,
       n_live_tup as approx_rows
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 12;

-- 5) Cache hit ratio (should be > 0.99; much lower means the database is short of memory / constantly reading from disk)
select sum(heap_blks_hit)::float / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) as table_cache_hit_ratio
from pg_statio_user_tables;

-- 6) Slowest statements (needs the pg_stat_statements extension: Dashboard -> Database -> Extensions; skip this one if it errors)
select calls, round(mean_exec_time::numeric, 1) as avg_ms, round(total_exec_time::numeric / 1000, 1) as total_s, left(query, 110) as query
from pg_stat_statements
order by total_exec_time desc
limit 10;

-- ALSO check in the dashboard (no SQL): Reports -> Database: CPU, memory, disk IO budget ("Disk IO % consumed" at 100% = everything slows down),
-- and Project Settings -> Infrastructure: is the project paused / restoring? https://status.supabase.com for incidents in your region.

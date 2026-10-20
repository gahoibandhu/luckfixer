-- ============================================================
-- MIGRATION 028 — kundli_migration_overview()
--
-- Problem: the admin panel (on every load), the daily cron and the
-- "अगला बैच" loop all pulled the WHOLE saved_kundlis table — including the
-- big planet_data JSON — into Vercel just to count which kundlis are
-- missing lagna / supportChain / life_domains / annual_timeline.
-- pg_stat_statements showed ~74% of database time going to those scans
-- (avg 0.4–1.4 s each), which also made the Supabase dashboard time out
-- and show its "reload" message.
--
-- Fix: do the check INSIDE Postgres, in ONE pass, and return only small
-- lists of ids. The JS side (lib/kundli-status.js) caches the result
-- for 30 s, so three admin cards = one scan.
--
-- Rules mirror the old JavaScript exactly ("missing" = absent or JSON null):
--   lagna missing        : !planet_data.factSheet.lagna
--   support-chain needed : factSheet + lagna present, but supportChain or remedyPlan absent
--   analysis missing     : !planet_data.analysis.life_domains  and/or  !planet_data.analysis.annual_timeline
--
-- Safe to run more than once.
-- ============================================================

CREATE OR REPLACE FUNCTION kundli_migration_overview()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT
      id,
      created_at,
      COALESCE(jsonb_typeof(planet_data #> '{factSheet}'), 'null')                 <> 'null' AS has_fs,
      COALESCE(jsonb_typeof(planet_data #> '{factSheet,lagna}'), 'null')           <> 'null' AS has_lagna,
      COALESCE(jsonb_typeof(planet_data #> '{factSheet,supportChain}'), 'null')    <> 'null' AS has_sc,
      COALESCE(jsonb_typeof(planet_data #> '{factSheet,remedyPlan}'), 'null')      <> 'null' AS has_rp,
      COALESCE(jsonb_typeof(planet_data #> '{analysis,life_domains}'), 'null')     <> 'null' AS has_ld,
      COALESCE(jsonb_typeof(planet_data #> '{analysis,annual_timeline}'), 'null')  <> 'null' AS has_tl
    FROM saved_kundlis
  )
  SELECT json_build_object(
    'total', count(*),
    'lagna_missing_ids',
      COALESCE(json_agg(id ORDER BY created_at, id) FILTER (WHERE NOT has_lagna), '[]'::json),
    'support_chain_ids',
      COALESCE(json_agg(id ORDER BY created_at, id) FILTER (WHERE has_fs AND has_lagna AND NOT (has_sc AND has_rp)), '[]'::json),
    'analysis_missing',
      COALESCE(json_agg(json_build_object('id', id, 'life_domains', NOT has_ld, 'annual_timeline', NOT has_tl)
                        ORDER BY created_at, id) FILTER (WHERE NOT (has_ld AND has_tl)), '[]'::json)
  )
  FROM f;
$$;

REVOKE ALL ON FUNCTION kundli_migration_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION kundli_migration_overview() TO service_role;

NOTIFY pgrst, 'reload schema';

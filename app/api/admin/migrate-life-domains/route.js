// app/api/admin/migrate-life-domains/route.js
//
// Admin-triggered batch backfill: re-runs the AI analysis for existing
// kundlis that predate either the life_domains schema OR the newer
// annual_timeline (birthday-bound transit periods) schema — so users
// never have to click anything themselves. A kundli is "remaining"
// if it's missing life_domains, annual_timeline, or both; one re-run
// of the AI call produces both fields together. Unlike
// migrate-kundlis/route.js (deterministic-only, free), this DOES call
// the AI, so it's rate-limited to a small batch per request (avoids
// hammering the AI provider and avoids Vercel function timeouts) — the
// admin panel calls this repeatedly ("अगला बैच") until GET reports zero
// remaining.
import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { buildFactSheet } from '@/lib/astro-facts';
import { calcVimshottari } from '@/lib/vimshottari';
import { buildSpecialistInsights } from '@/lib/specialist-rules';
import { buildTransitReport } from '@/lib/transit';
import { buildJaiminiSheet, crossValidate } from '@/lib/jaimini';
import { detectYogas } from '@/lib/yogas';
import { buildAshtakavarga } from '@/lib/ashtakavarga';
import { buildNakshatraSheet } from '@/lib/nakshatra';
import { buildVarshaphal } from '@/lib/varshaphal';
import { buildGocharPhalTimeline, buildAnnualTransitPeriods } from '@/lib/gochar-phal';
import { buildSaptahikPhal } from '@/lib/saptahik-phal';
import { getLuckfixerResponse } from '@/lib/ai-engine';
import { RAM_SHALAKA_ANSWERS } from '@/lib/ram-shalaka';
import { buildAnalysisSystemPrompt, buildAnalysisUserPrompt } from '@/lib/kundli-analysis-prompt';

export const dynamic = 'force-dynamic';
const BATCH_SIZE = 5; // small on purpose — AI calls are the slow/costly part

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET — how many kundlis still need migrating
export async function GET() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const adminDb = getSupabaseAdmin();
  // Narrow JSON-path projection — Postgres extracts just these nested
  // fields server-side, so we're not pulling the (often large) full
  // planet_data blob over the wire just to check two boolean-ish flags.
  const { data: kundlis } = await adminDb
    .from('saved_kundlis')
    .select('id, life_domains:planet_data->analysis->life_domains, annual_timeline:planet_data->analysis->annual_timeline');
  const remaining = (kundlis || []).filter(k => !k.life_domains || !k.annual_timeline);

  return Response.json({ total: kundlis?.length || 0, remaining: remaining.length, migrated: (kundlis?.length || 0) - remaining.length });
}

// POST — process one batch (BATCH_SIZE kundlis)
export async function POST() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const adminDb = getSupabaseAdmin();

  // Two-step: first a narrow query to find WHICH kundlis need migrating
  // (cheap), then fetch full rows only for the small batch we'll
  // actually process — instead of pulling every kundli's full
  // planet_data blob just to filter most of it away in JS.
  const { data: idCheck } = await adminDb
    .from('saved_kundlis')
    .select('id, life_domains:planet_data->analysis->life_domains, annual_timeline:planet_data->analysis->annual_timeline');
  const idsToMigrate = (idCheck || []).filter(k => !k.life_domains || !k.annual_timeline).slice(0, BATCH_SIZE).map(k => k.id);

  if (idsToMigrate.length === 0) {
    return Response.json({ processed: 0, results: [] });
  }

  const { data: kundlis } = await adminDb.from('saved_kundlis').select('*').in('id', idsToMigrate);
  const toMigrate = kundlis || [];

  const results = [];
  for (const existing of toMigrate) {
    try {
      const { full_name, dob, birth_time, latitude, longitude, ayanamsa, gender, birth_place } = existing;

      const factSheet = await buildFactSheet(dob, birth_time, latitude, longitude, ayanamsa);
      const numerology = (await import('@/lib/numerology')).buildNumerologySheet(full_name, dob);
      const moon = factSheet.planets.find(p => p.name === 'Moon');
      const vimshottari = moon ? calcVimshottari(moon.degree, dob) : null;
      const specialist  = buildSpecialistInsights(factSheet, vimshottari);
      const transit     = await buildTransitReport(factSheet, latitude, longitude).catch(() => null);
      const jaimini     = buildJaiminiSheet(factSheet.planets, factSheet.lagna?.sign, factSheet.d9Chart, dob);
      const crossVal    = crossValidate(jaimini, factSheet);
      const yogas       = detectYogas(factSheet.planets, factSheet.lagna?.sign, factSheet.houseLords, factSheet.d9Chart);
      const ashtakavarga = buildAshtakavarga(factSheet.planets, factSheet.lagna?.sign);
      const nakshatra   = buildNakshatraSheet(factSheet.planets, factSheet.lagna?.sign);
      const varshaphal  = buildVarshaphal(factSheet, dob);
      const gocharPhal  = buildGocharPhalTimeline(moon?.sign, ayanamsa);
      const annualTransitPeriods = buildAnnualTransitPeriods(moon?.sign, ayanamsa, varshaphal?.solarReturnDate);
      const saptahikPhal = buildSaptahikPhal(ayanamsa);

      const systemPrompt = buildAnalysisSystemPrompt();
      const userPrompt = buildAnalysisUserPrompt({ full_name, dob, birth_time, birth_place, ayanamsa, factSheet, numerology, vimshottari, specialist, jaimini, crossVal, yogas, ashtakavarga, nakshatra, varshaphal, gocharPhal, annualTransitPeriods, transit, gender });

      const aiResult = await getLuckfixerResponse(systemPrompt, userPrompt, true);

      const score = aiResult.content.metric_score || 50;
      const matchingTone = score >= 60 ? 'shubh' : score >= 40 ? 'dhairya' : 'saavdhani';
      const allAnswers = Object.values(RAM_SHALAKA_ANSWERS);
      const versePool = allAnswers.filter(v => v.tone === matchingTone);
      const pool = versePool.length > 0 ? versePool : allAnswers;
      const hashSeed = `${full_name}${dob}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const picked = pool[hashSeed % pool.length];
      const closingVerse = { verse: picked.verse, source: `रामचरितमानस, ${picked.kand}` };

      await adminDb.from('saved_kundlis').update({
        planet_data: {
          planets: factSheet.planets, factSheet, numerology, vimshottari, specialist, jaimini,
          crossValidation: crossVal, yogas, ashtakavarga, nakshatra, varshaphal, gocharPhal, annualTransitPeriods, saptahikPhal,
          transitSnapshot: transit, analysis: aiResult.content, closingVerse,
        },
        luck_score: aiResult.content.metric_score || 50,
        last_analysis: new Date().toISOString(),
      }).eq('id', existing.id);

      results.push({ id: existing.id, name: full_name, status: 'ok' });
    } catch (e) {
      results.push({ id: existing.id, name: existing.full_name, status: 'error', error: e.message });
    }
  }

  return Response.json({ processed: results.length, results });
}

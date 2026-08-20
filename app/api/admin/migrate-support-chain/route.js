// app/api/admin/migrate-support-chain/route.js
//
// Admin: back-fill factSheet.supportChain + factSheet.remedyPlan for
// kundlis saved before the Support-Chain feature existed.
//
// Unlike migrate-kundlis/route.js (which re-derives lagna/houses and
// therefore MUST re-hit the ephemeris service), this migration is
// cheap and offline: supportChain/remedyPlan are pure functions of
// data ALREADY stored in planet_data.factSheet (planets with their
// strengthScore/dignity/house, lagna.sign, houseLords, gemstoneGuidance)
// — no ephemeris call, no AI call, safe to run on the full table.
// If gemstoneGuidance itself is also missing on a very old row (i.e.
// it predates BOTH features), it's recomputed here too, deterministically,
// from the same stored planets — still no ephemeris/AI call needed.

import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { pickGemstoneRecommendation } from '@/lib/gemstone-policy';
import { evaluateSupportChain } from '@/lib/graha-support-chain';
import { buildRemedyPlan } from '@/lib/remedy-plan';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function needsMigration(k) {
  const fs = k.planet_data?.factSheet;
  if (!fs) return false;          // no factSheet at all — out of scope, migrate-kundlis handles that case first
  if (!fs.lagna) return false;    // lagna missing too — let migrate-kundlis run first (it rebuilds factSheet wholesale)
  return !fs.supportChain || !fs.remedyPlan;
}

// GET — count how many kundlis need this migration
export async function GET() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const adminDb = getSupabaseAdmin();
  const { data: kundlis } = await adminDb.from('saved_kundlis').select('id, planet_data');

  const pending = (kundlis || []).filter(needsMigration);
  return Response.json({
    total: kundlis?.length || 0,
    needsMigration: pending.length,
    ids: pending.map(k => k.id),
  });
}

// POST — run migration for all (or a specific list of) kundlis
export async function POST(req) {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const onlyIds = body.ids || null;

  const adminDb = getSupabaseAdmin();
  let query = adminDb.from('saved_kundlis').select('*');
  if (onlyIds) query = query.in('id', onlyIds);
  const { data: kundlis } = await query;

  const results = { migrated: 0, skipped: 0, failed: 0, errors: [] };

  for (const k of (kundlis || [])) {
    const fs = k.planet_data?.factSheet;

    if (!fs || !fs.lagna) {
      results.skipped++; // needs the heavier migrate-kundlis pass first
      continue;
    }
    if (fs.supportChain && fs.remedyPlan) {
      results.skipped++; // already migrated
      continue;
    }

    try {
      const gemstoneGuidance = fs.gemstoneGuidance || pickGemstoneRecommendation(fs.lagna.sign, fs.planets);
      const supportChain = evaluateSupportChain(fs.planets, fs.lagna.sign, fs.houseLords);
      const remedyPlan = buildRemedyPlan({
        weakestPlanet: { planet: fs.weakestPlanet?.planet, name: fs.weakestPlanet?.name },
        gemstoneGuidance,
        supportChain,
      });

      const newFactSheet = { ...fs, gemstoneGuidance, supportChain, remedyPlan };
      const newPlanetData = { ...k.planet_data, factSheet: newFactSheet };

      const { error } = await adminDb
        .from('saved_kundlis')
        .update({ planet_data: newPlanetData })
        .eq('id', k.id);

      if (error) {
        results.failed++;
        results.errors.push({ id: k.id, error: error.message });
      } else {
        results.migrated++;
      }
    } catch (e) {
      results.failed++;
      results.errors.push({ id: k.id, error: e.message });
    }
  }

  return Response.json(results);
}

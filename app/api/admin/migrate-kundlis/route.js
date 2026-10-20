// app/api/admin/migrate-kundlis/route.js
// Admin: re-analyze old kundlis that are missing lagna/houses/eventScores
// (created before those features existed). Re-runs the deterministic
// fact-sheet + specialist engine and re-saves planet_data — does NOT
// call the AI again (keeps the existing narrative analysis untouched
// unless explicitly asked, since AI calls cost money/quota).
import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { getKundliOverview, fetchKundlisByIds, invalidateKundliOverview } from '@/lib/kundli-status';
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

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET — count how many kundlis need migration (lagna missing)
export async function GET() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  // one cheap database-side check (lib/kundli-status.js) — no planet_data is pulled into Vercel
  const ov = await getKundliOverview(getSupabaseAdmin());
  return Response.json({
    total: ov.total,
    needsMigration: ov.lagnaMissingIds.length,
    ids: ov.lagnaMissingIds,
  });
}

// POST — run migration for all (or a specific list of) kundlis
export async function POST(req) {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const onlyIds = body.ids || null; // optional: migrate specific IDs only

  const adminDb = getSupabaseAdmin();
  const results = { migrated: 0, skipped: 0, failed: 0, errors: [] };

  // Only fetch the rows that actually need work (in small chunks) — never the whole table.
  let ids = onlyIds;
  if (!ids) {
    const ov = await getKundliOverview(adminDb, { fresh: true });
    ids = ov.lagnaMissingIds;
    results.skipped += ov.total - ids.length;   // already migrated — counted the same way as before
  }
  const kundlis = await fetchKundlisByIds(adminDb, ids);

  for (const k of (kundlis || [])) {
    // Skip if already has lagna (already migrated / created after the feature)
    if (k.planet_data?.factSheet?.lagna) {
      results.skipped++;
      continue;
    }

    try {
      const factSheet = await buildFactSheet(k.dob, k.birth_time, k.latitude, k.longitude, k.ayanamsa || 'lahiri');
      const moon = factSheet.planets.find(p => p.name === 'Moon');
      const vimshottari = moon ? calcVimshottari(moon.degree, k.dob) : null;
      const specialist      = buildSpecialistInsights(factSheet, vimshottari);
      const transitSnapshot = await buildTransitReport(factSheet, k.latitude, k.longitude).catch(() => null);
      const jaimini         = buildJaiminiSheet(factSheet.planets, factSheet.lagna?.sign, factSheet.d9Chart, k.dob);
      const crossVal        = crossValidate(jaimini, factSheet);
      const yogas           = detectYogas(factSheet.planets, factSheet.lagna?.sign, factSheet.houseLords, factSheet.d9Chart);
      const ashtakavarga    = buildAshtakavarga(factSheet.planets, factSheet.lagna?.sign);
      const nakshatra       = buildNakshatraSheet(factSheet.planets, factSheet.lagna?.sign);
      const varshaphal      = buildVarshaphal(factSheet, k.dob);

      const newPlanetData = {
        ...k.planet_data,
        planets: factSheet.planets,
        factSheet,
        vimshottari,
        specialist,
        jaimini,
        crossValidation: crossVal,
        yogas,
        ashtakavarga,
        nakshatra,
        varshaphal,
        transitSnapshot,
      };

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

  invalidateKundliOverview();   // the next status check must see the new state
  return Response.json(results);
}

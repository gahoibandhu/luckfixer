// app/api/admin/migrate-kundlis/route.js
// Admin: re-analyze old kundlis that are missing lagna/houses/eventScores
// (created before those features existed). Re-runs the deterministic
// fact-sheet + specialist engine and re-saves planet_data — does NOT
// call the AI again (keeps the existing narrative analysis untouched
// unless explicitly asked, since AI calls cost money/quota).
import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { buildFactSheet } from '@/lib/astro-facts';
import { calcVimshottari } from '@/lib/vimshottari';
import { buildSpecialistInsights } from '@/lib/specialist-rules';
import { buildTransitReport } from '@/lib/transit';

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

  const adminDb = getSupabaseAdmin();
  const { data: kundlis } = await adminDb.from('saved_kundlis').select('id, planet_data');

  const needsMigration = (kundlis || []).filter(k => !k.planet_data?.factSheet?.lagna);
  return Response.json({
    total: kundlis?.length || 0,
    needsMigration: needsMigration.length,
    ids: needsMigration.map(k => k.id),
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
  let query = adminDb.from('saved_kundlis').select('*');
  if (onlyIds) query = query.in('id', onlyIds);
  const { data: kundlis } = await query;

  const results = { migrated: 0, skipped: 0, failed: 0, errors: [] };

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
      const specialist = buildSpecialistInsights(factSheet, vimshottari);
      const transitSnapshot = await buildTransitReport(factSheet, k.latitude, k.longitude).catch(() => null);

      const newPlanetData = {
        ...k.planet_data,           // keep existing analysis, numerology etc.
        planets: factSheet.planets, // refresh with house/dignity-enriched version
        factSheet,                  // now includes lagna, houseLords, d9Chart, d10Chart, eventScores
        vimshottari,
        specialist,
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

  return Response.json(results);
}

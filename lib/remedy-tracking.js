// lib/remedy-tracking.js
//
// Turns the ALREADY-COMPUTED deterministic remedy data (from
// lib/remedy-plan.js's buildRemedyPlan output, and from
// lib/yogas.js's attachDoshaRemedies output) into structured,
// checkable rows in user_remedies — so a user can come back later
// and see what was suggested and mark it done.
//
// No AI call happens here. Every field is copied verbatim from data
// that was already computed for the kundli — consistent with the
// app-wide rule "compute facts deterministically, AI narrates only".

import { LAL_KITAB_REMEDIES } from './specialist-rules.js';

// ── Internal: does a pending row for this exact remedy already exist? ──
// Prevents the same remedy being logged again every time it's
// re-surfaced (kundli re-analysis, or the chat AI re-offering the
// same upaay in a later message of the same conversation).
async function alreadyLogged(supabase, kundliId, planet, remedyType) {
  const { data } = await supabase
    .from('user_remedies')
    .select('id')
    .eq('kundli_id', kundliId)
    .eq('planet', planet || null)
    .eq('remedy_type', remedyType)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  return !!data;
}

// ── Build insertable rows from a remedyPlan (see buildRemedyPlan) ──
function rowsFromRemedyPlan(remedyPlan, base) {
  if (!remedyPlan?.remedies?.length) return [];
  const rows = [];

  for (const bundle of remedyPlan.remedies) {
    const planet   = bundle.planet || remedyPlan.weakestPlanet;
    const planetHi = bundle.planetHi || remedyPlan.weakestPlanetHi;

    if (bundle.lalKitab) {
      rows.push({
        ...base,
        planet, planet_hi: planetHi,
        remedy_type: 'lal_kitab',
        donate:      bundle.lalKitab.donate || null,
        day_of_week: bundle.lalKitab.day || null,
        color:       bundle.lalKitab.color || null,
        food:        bundle.lalKitab.food || null,
        avoid:       bundle.lalKitab.avoid || null,
        verdict:        remedyPlan.verdict || null,
        support_planet: remedyPlan.supportPlanet || null,
      });
    }

    if (bundle.vedic?.mantra) {
      rows.push({
        ...base,
        planet, planet_hi: planetHi,
        remedy_type: 'vedic_mantra',
        mantra:       bundle.vedic.mantra,
        mantra_count: bundle.vedic.mantraCount || null,
        verdict:        remedyPlan.verdict || null,
        support_planet: remedyPlan.supportPlanet || null,
      });
    }

    if (bundle.vedic?.gem?.name) {
      rows.push({
        ...base,
        planet, planet_hi: planetHi,
        remedy_type: 'gemstone',
        gem_name:   bundle.vedic.gem.name,
        gem_reason: bundle.vedic.gem.reason || null,
        verdict:        remedyPlan.verdict || null,
        support_planet: remedyPlan.supportPlanet || null,
      });
    }
  }

  return rows;
}

// ── Build insertable rows from dosha remedies attached to yogas ──
function rowsFromDoshaYogas(yogas, base) {
  if (!yogas?.length) return [];
  return yogas
    .filter(y => y.isChallenging && y.remedy)
    .map(y => ({
      ...base,
      planet:      y.remedyPlanets?.length > 1 ? 'multiple' : (y.remedyPlanets?.[0] || null),
      planet_hi:   null,
      remedy_type: 'dosha_remedy',
      remedy_text: y.remedy,
      yoga_name:   y.name || null,
    }));
}

// ── Milan (compatibility) dosha remedies ──────────────────────────
// kundli-milan.js's doshas (नाड़ी दोष, भकूट दोष, गण दोष, मंगल दोष) are
// match-specific, not single-planet weaknesses, so they don't come
// from remedy-plan.js. Mangal Dosh reuses the SAME vetted Mars entry
// from specialist-rules.js's LAL_KITAB_REMEDIES (no new data invented).
// The other three are classically addressed with a specific Nivaran
// puja rather than a planet-wise daan/mantra — since the exact ritual
// varies by region/tradition, we deliberately give general, honest
// guidance here rather than inventing a specific prescription.

const MILAN_DOSHA_GUIDANCE = {
  'नाड़ी दोष':      'यह सबसे गंभीर दोष माना जाता है — किसी योग्य पंडित से नाड़ी दोष निवारण पूजा के बारे में सलाह लें, खासकर विवाह से पहले।',
  'भकूट दोष':       'किसी योग्य पंडित से भकूट दोष निवारण पूजा या उपाय के बारे में सलाह लें।',
  'गण दोष':         'किसी योग्य पंडित से गण दोष निवारण के पारंपरिक उपाय के बारे में सलाह लें।',
};

function rowsFromMilanDoshas(doshas, base) {
  if (!doshas?.length) return [];
  const rows = [];
  for (const d of doshas) {
    if (d.name === 'मंगल दोष (एकतरफा)' || d.name === 'मंगल दोष') {
      const lk = LAL_KITAB_REMEDIES.Mars;
      rows.push({
        ...base,
        planet: 'Mars', planet_hi: 'मंगल',
        remedy_type: 'lal_kitab',
        donate: lk.donate, day_of_week: lk.day, color: lk.color, food: lk.food, avoid: lk.avoid,
        yoga_name: d.name,
      });
      continue;
    }
    const guidance = MILAN_DOSHA_GUIDANCE[d.name];
    if (guidance) {
      rows.push({
        ...base,
        planet: null, planet_hi: null,
        remedy_type: 'dosha_remedy',
        remedy_text: guidance,
        yoga_name: d.name,
      });
    }
  }
  return rows;
}

// ── Entry point for Kundli Milan — logs remedies for BOTH kundlis ──
// involved in the match (dosha belongs to the pairing, but the user
// should see it against whichever kundli(s) they own).
export async function logMilanRemedies(supabase, { userId, kundliId, doshas }) {
  if (!userId || !kundliId) return;
  const base = { user_id: userId, kundli_id: kundliId, source: 'milan' };
  try {
    const rows = rowsFromMilanDoshas(doshas, base);
    if (rows.length === 0) return;
    const rowsToInsert = [];
    for (const row of rows) {
      const exists = await alreadyLogged(supabase, kundliId, row.planet, row.remedy_type);
      if (!exists) rowsToInsert.push(row);
    }
    if (rowsToInsert.length === 0) return;
    await supabase.from('user_remedies').insert(rowsToInsert);
    console.log(`[RemedyTracking] Logged ${rowsToInsert.length} milan remedy row(s) for kundli ${kundliId}`);
  } catch (e) {
    console.warn('[RemedyTracking] Failed to log milan remedies (non-fatal):', e.message);
  }
}
// or when the chat AI has just given a remedy in the current turn.
// Never throws — remedy logging is a nice-to-have, not a blocker for
// the actual analysis/chat response.
export async function logRemedyPlan(supabase, { userId, kundliId, sessionId, source, remedyPlan, yogas }) {
  if (!userId || !kundliId) return;

  const base = {
    user_id:    userId,
    kundli_id:  kundliId,
    session_id: sessionId || null,
    source:     source || 'kundli_analysis',
  };

  try {
    const candidateRows = [
      ...rowsFromRemedyPlan(remedyPlan, base),
      ...rowsFromDoshaYogas(yogas, base),
    ];
    if (candidateRows.length === 0) return;

    // Dedup against existing pending rows for this kundli — best
    // effort, run sequentially since the set is always small (a
    // handful of remedies per kundli).
    const rowsToInsert = [];
    for (const row of candidateRows) {
      const exists = await alreadyLogged(supabase, kundliId, row.planet, row.remedy_type);
      if (!exists) rowsToInsert.push(row);
    }
    if (rowsToInsert.length === 0) return;

    await supabase.from('user_remedies').insert(rowsToInsert);
    console.log(`[RemedyTracking] Logged ${rowsToInsert.length} remedy row(s) for kundli ${kundliId} (source: ${source})`);
  } catch (e) {
    console.warn('[RemedyTracking] Failed to log remedies (non-fatal):', e.message);
  }
}

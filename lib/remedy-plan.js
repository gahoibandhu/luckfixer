// lib/remedy-plan.js
//
// MULTI-REMEDY PLAN BUILDER
//
// Problem this fixes:
// 1. specialist-rules.js's LAL_KITAB_REMEDIES table always includes a
//    `gem` field for every planet — including factSheet.weakestPlanet,
//    which is exactly the gem gemstone-policy.js says NOT to recommend
//    unless the planet is Lagna lord/9th lord/Yogakaraka and well
//    placed. Previously the AI prompt just hoped the separate
//    "GEMSTONE POLICY" instruction would override this reference data.
//    This module removes the ambiguity: it builds the ONE object the
//    AI (and any future non-AI UI) should read for remedies, with gem
//    eligibility already resolved — never a raw ungated LAL_KITAB gem.
// 2. The live-chat REMEDY RULE previously said "ONE focused remedy".
//    Classical practice (and what users actually expect) is a small
//    SET of remedies across systems (Lal Kitab action + Vedic mantra,
//    gem only if eligible) — and, per the Support-Chain design doc,
//    sometimes a COMBINATION (weak graha + its compensating support)
//    rather than a single isolated action. This module returns that
//    structured set; the AI still decides how much of it to surface
//    in a given reply (see chat/route.js REMEDY RULE).
//
// This module does NOT call the AI and NEVER decides classical
// correctness on its own — it only assembles already-deterministic
// pieces (gemstone-policy.js, LAL_KITAB_REMEDIES, graha-support-chain.js)
// into one coherent structure, matching this codebase's existing
// deterministic-core / AI-narrates-only split.

import { LAL_KITAB_REMEDIES } from './specialist-rules.js';

// NOTE: deliberately NOT importing PLANETS_HI from astro-facts.js —
// astro-facts.js imports buildRemedyPlan from THIS file, so importing
// back would create a circular module dependency. Small constant
// duplicated locally instead (same pattern already used by
// gemstone-policy.js and neecha-bhanga.js for their own small tables).
const PLANETS_HI = { Sun:'सूर्य', Moon:'चंद्र', Mercury:'बुध', Venus:'शुक्र', Mars:'मंगल', Jupiter:'बृहस्पति', Saturn:'शनि', Rahu:'राहु', Ketu:'केतु' };

function planetBundle(planetName, factSheet) {
  if (!planetName) return null;
  const lk = LAL_KITAB_REMEDIES[planetName] || null;
  const isGemEligible = factSheet.gemstoneGuidance?.planet === planetName;

  return {
    planet: planetName,
    planetHi: PLANETS_HI?.[planetName] || planetName,
    lalKitab: lk ? {
      donate: lk.donate,
      day: lk.day,
      color: lk.color,
      food: lk.food,
      avoid: lk.avoid,
    } : null,
    vedic: {
      mantra: lk ? lk.mantra : null,
      mantraCount: lk ? lk.count : null,
      // Gem is NEVER pulled from LAL_KITAB_REMEDIES[planet].gem directly —
      // it is only ever populated when gemstone-policy.js has already
      // certified this exact planet (Lagna lord / 9th lord / Yogakaraka
      // AND well-placed). This is the single gate for gem recommendations
      // app-wide; nothing else should surface a gem name.
      gem: isGemEligible ? { name: lk?.gem || null, reason: factSheet.gemstoneGuidance.reason } : null,
      gemNotEligibleReason: isGemEligible
        ? null
        : (factSheet.gemstoneGuidance?.planet && factSheet.gemstoneGuidance.planet !== planetName
            ? `${planetName} के लिए gem नहीं — इस कुंडली में सिर्फ ${factSheet.gemstoneGuidance.planet} रत्न योग्य है (${factSheet.gemstoneGuidance.reason})`
            : (factSheet.gemstoneGuidance?.reason || 'योग्य नहीं')),
    },
  };
}

const VERDICT_GUIDANCE_HI = {
  compensated_by_support: (weakHi, suppHi, sourceNote) =>
    `${weakHi} कमज़ोर है, लेकिन ${suppHi} से पर्याप्त सपोर्ट मिल रहा है (${sourceNote}) — इसलिए उपाय सीधे ${weakHi} पर नहीं, बल्कि ${suppHi} को मज़बूत करने पर केंद्रित करें। ${suppHi} का दान + मंत्र एक साथ करना ${weakHi} की कमज़ोरी को व्यावहारिक रूप से संतुलित कर देगा।`,
  partial_support: (weakHi, suppHi, sourceNote) =>
    `${weakHi} को ${suppHi} से आंशिक सपोर्ट मिल रहा है (${sourceNote}) — पूरा भरोसा सिर्फ इस सपोर्ट पर मत करें। दोनों का उपाय साथ में करें: ${weakHi} के लिए सीधा उपाय भी जारी रखें और ${suppHi} को मज़बूत करने का काम भी साथ करें — यह combination अकेले किसी एक उपाय से बेहतर असर देगा।`,
  needs_direct_remedy: (weakHi) =>
    `${weakHi} के लिए कोई भरोसेमंद सपोर्ट नहीं मिला — इसलिए उपाय सीधे ${weakHi} पर ही केंद्रित रहे, बिना किसी दूसरे ग्रह की तरफ ध्यान बांटे।`,
};

// ── Main builder ────────────────────────────────────────────────
// factSheet must already contain: weakestPlanet, gemstoneGuidance,
// supportChain (see astro-facts.js buildFactSheet wiring).
export function buildRemedyPlan(factSheet) {
  const weakestPlanet = factSheet?.weakestPlanet?.planet || factSheet?.weakestPlanet?.name;
  if (!weakestPlanet) return null;

  const supportEntry = (factSheet.supportChain || []).find(s => s.planet === weakestPlanet) || null;
  const verdict = supportEntry?.verdict || 'needs_direct_remedy';
  const supportPlanet = supportEntry?.bestSupport?.source || null;

  let focusPlanets = [weakestPlanet];
  if (verdict === 'compensated_by_support' && supportPlanet) {
    focusPlanets = [supportPlanet];
  } else if (verdict === 'partial_support' && supportPlanet) {
    focusPlanets = [weakestPlanet, supportPlanet];
  }

  const remedies = focusPlanets.map(p => planetBundle(p, factSheet)).filter(Boolean);

  const weakHi = PLANETS_HI?.[weakestPlanet] || weakestPlanet;
  const suppHi = supportPlanet ? (PLANETS_HI?.[supportPlanet] || supportPlanet) : null;
  const sourceNote = supportEntry?.bestSupport
    ? `${supportEntry.bestSupport.type === 'dispositor' ? 'दिशपोजिटर' : supportEntry.bestSupport.type === 'exchange' ? 'परिवर्तन योग' : supportEntry.bestSupport.type === 'bhagya' ? '9वां भाव/भाग्येश' : 'युति/दृष्टि'} के ज़रिए`
    : '';

  const combinationGuidance = verdict === 'needs_direct_remedy'
    ? VERDICT_GUIDANCE_HI.needs_direct_remedy(weakHi)
    : VERDICT_GUIDANCE_HI[verdict]?.(weakHi, suppHi, sourceNote) || null;

  return {
    weakestPlanet,
    weakestPlanetHi: weakHi,
    verdict,
    supportPlanet,
    supportPlanetHi: suppHi,
    focusPlanets,
    remedies,          // one bundle per focus planet — each has lalKitab + vedic(mantra/gem)
    combinationGuidance,
    enemyComplications: supportEntry?.enemyComplications || [],
  };
}

// ── Dosha / bad-yuti remedies ─────────────────────────────────────
//
// yogas.js flags certain classical combinations as isChallenging
// (Mangal Dosh, Kaal Sarp Dosh, Pitru Dosh, Guru Chandal Yoga,
// Kemadrum Yoga — a bad graha yuti/affliction, not merely a weak
// planet) and now also tags each with `remedyPlanets` — the graha(s)
// classically addressed by that dosha's remedy. This function turns
// that into an actual Hindi remedy line the user can act on, using
// the SAME deterministic LAL_KITAB_REMEDIES table as everything else
// in the app (no AI, no fabrication, no gemstone — doshas are
// pacified with donation/mantra practice, not gem recommendations,
// so this deliberately does NOT touch gemstone-policy.js).
//
// Kept separate from buildRemedyPlan() above: that one is about the
// single weakest planet + its support chain; this one is about
// specific classical dosha combinations, which can co-exist with, and
// name entirely different planets than, the weakest-planet remedy.
export function attachDoshaRemedies(yogas) {
  if (!yogas || yogas.length === 0) return yogas;
  return yogas.map(y => {
    if (!y.isChallenging || !y.remedyPlanets || y.remedyPlanets.length === 0) return y;
    const lines = y.remedyPlanets.map(p => {
      const r = LAL_KITAB_REMEDIES[p];
      if (!r) return null;
      return `${PLANETS_HI[p] || p} के लिए — ${r.day} को ${r.donate} का दान करें, "${r.mantra}" मंत्र का ${r.count} बार जाप करें (${r.avoid} जैसी सावधानी भी रखें)।`;
    }).filter(Boolean);
    if (lines.length === 0) return y;
    return { ...y, remedy: lines.join(' ') };
  });
}

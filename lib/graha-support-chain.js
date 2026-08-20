// lib/graha-support-chain.js
//
// SUPPORT-CHAIN COMPENSATION ENGINE
// Implements Luckfixer-Support-Chain-Design-Doc.docx Sections 2-4
// (core scoring + verdict logic), PLUS Value-Add 5.1 (Friend/Enemy
// Check) integrated from day one — not left as future work, because
// the design doc's own worked example (7.2) shows the engine gives a
// wrong verdict without it (a strong ENEMY graha would otherwise be
// counted as "support"). Shipping without 5.1 would mean the very
// first real chart with an enemy aspect produces a bad remedy.
//
// SCOPE NOTE (Value-Adds 5.2-5.5): Dasha Overlay, House-Lordship
// weighting, Combustion/Retrograde cause-tagging, and Ashtakvarga
// bindus are genuinely separate features needing extra data plumbing
// (live dasha state, lordship tables, bindu counts) — implementing
// all five in one pass risks a large untested surface. They're wired
// as clearly-marked extension points below (see EXTENSION POINTS)
// so a future pass can fill them in without refactoring callers.
//
// DESIGN NOTE — 0-10 vs 0-100 scale: astro-facts.js already computes
// a deterministic per-planet strengthScore on a 0-10 scale (dignity +
// vargottama + combustion + retrograde). Rather than inventing a
// second, parallel strength calculation, this module reuses that
// exact score (×10) as the 0-100 "own strength" the design doc's
// weights/thresholds table expects. This keeps ONE source of truth
// for "how strong is this graha" across the whole app (eventScores,
// gemstone eligibility, and now support-chain all agree).
//
// FRIENDSHIP NOTE: only NATURAL (permanent, classical Parashari)
// friend/enemy relationships are applied here. Temporal friendship
// (which changes with relative house positions at birth, combining
// with natural friendship into a 5-tier Panchadha Maitri) is a real
// classical refinement but adds meaningful complexity for a marginal
// accuracy gain — left as a documented extension point, not silently
// skipped.

import { SIGN_LORD, aspectsSign } from './neecha-bhanga.js';

// ── Configurable constants (per design doc Section 8 — never hard-code
// magic numbers inline; keep these here so they can be tuned per
// prediction category later without touching the scoring logic) ────
export const THRESHOLDS = {
  weak: 40,    // grahas below this (on 0-100) are flagged for analysis
  strong: 65,  // a support source only counts if its own strength clears this
};

export const WEIGHTS = {
  dispositor: 0.35,
  aspectingFriend: 0.25,
  conjunctFriend: 0.20,
  exchange: 0.30,
  bhagya: 0.30,
};

// ── Natural (Naisargika) friend/enemy table — classical Parashari.
// Rahu/Ketu don't have a universally agreed table across texts; the
// convention used here (Rahu treated like Saturn, Ketu treated like
// Mars, for friendship purposes only) is a common software-astrology
// simplification, flagged explicitly rather than presented as settled.
const NATURAL_FRIENDS = {
  Sun:     ['Moon', 'Mars', 'Jupiter'],
  Moon:    ['Sun', 'Mercury'],
  Mars:    ['Sun', 'Moon', 'Jupiter'],
  Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'],
  Venus:   ['Mercury', 'Saturn'],
  Saturn:  ['Mercury', 'Venus'],
  Rahu:    ['Venus', 'Saturn', 'Mercury'],
  Ketu:    ['Mars', 'Venus', 'Saturn'],
};
const NATURAL_ENEMIES = {
  Sun:     ['Venus', 'Saturn'],
  Moon:    [],
  Mars:    ['Mercury'],
  Mercury: ['Moon'],
  Jupiter: ['Mercury', 'Venus'],
  Venus:   ['Sun', 'Moon'],
  Saturn:  ['Sun', 'Moon', 'Mars'],
  Rahu:    ['Sun', 'Moon', 'Mars', 'Jupiter'],
  Ketu:    ['Sun', 'Moon', 'Jupiter'],
};

function naturalRelation(fromPlanet, toPlanet) {
  if (NATURAL_FRIENDS[fromPlanet]?.includes(toPlanet)) return 'friend';
  if (NATURAL_ENEMIES[fromPlanet]?.includes(toPlanet)) return 'enemy';
  return 'neutral';
}

function getPlanet(planets, name) { return planets.find(p => p.name === name); }
function scaled100(p) { return Math.round((p?.strengthScore ?? 0) * 10); }

// ── EXTENSION POINTS (Value-Adds 5.2-5.5) — call sites left explicit
// so wiring in real logic later is a one-line change, not a rewrite. ──
function dashaWeightMultiplier(_planetName, _vimshottari) { return 1; }      // 5.2 Dasha Overlay (TODO: weight up if Mahadasha/Antardasha of _planetName is live/imminent)
function lordshipQuality(_houseNum) { return null; }                          // 5.3 House-Lordship (TODO: 'kendra_trikona' | 'dusthana' | 'neutral')
function weaknessCause(_planet) { return _planet?.combust ? 'combust' : (_planet?.dignity === 'debilitated' ? 'debilitated' : (_planet?.retro ? 'retrograde_review' : 'other')); } // 5.4 partially available today from existing p.combust/p.dignity/p.retro fields
function ashtakavargaBoost(_planetName, _ashtakavarga) { return 0; }           // 5.5 Ashtakvarga bindus (TODO: fold bindu count into own-strength)

// ── Main evaluator ─────────────────────────────────────────────
// Only returns entries for planets whose base strength is below the
// weak threshold — mirrors the existing neecha-bhanga.js convention
// of "empty/omitted = not applicable" rather than padding the array
// with already_strong no-ops for every planet.
export function evaluateSupportChain(planets, lagnaSign, houseLords) {
  if (!planets || !lagnaSign) return [];

  const results = [];

  for (const p of planets) {
    const baseStrength = scaled100(p);
    if (baseStrength >= THRESHOLDS.weak) continue; // already_strong — no entry needed

    const supports = [];

    // 1. Dispositor (sign lord)
    const dispositorName = SIGN_LORD[p.sign];
    const dispositor = dispositorName && dispositorName !== p.name ? getPlanet(planets, dispositorName) : null;
    if (dispositor) {
      const strength = scaled100(dispositor);
      const included = strength >= THRESHOLDS.strong;
      supports.push({
        type: 'dispositor', source: dispositor.name, sourceHi: dispositor.nameHi,
        ownStrength: strength, weight: WEIGHTS.dispositor,
        contribution: included ? Math.round(strength * WEIGHTS.dispositor) : 0,
        included, note: included ? 'दिशपोजिटर मजबूत है' : 'दिशपोजिटर स्वयं कमजोर है — सपोर्ट नहीं गिना गया',
      });

      // 3. Parivartan (mutual sign exchange) — dispositor's own dispositor is p itself
      const dispositorsDispositor = SIGN_LORD[dispositor.sign];
      if (dispositorsDispositor === p.name) {
        const included2 = strength >= THRESHOLDS.strong;
        supports.push({
          type: 'exchange', source: dispositor.name, sourceHi: dispositor.nameHi,
          ownStrength: strength, weight: WEIGHTS.exchange,
          contribution: included2 ? Math.round(strength * WEIGHTS.exchange) : 0,
          included: included2, note: 'परस्पर राशि परिवर्तन (परिवर्तन योग)',
        });
      }
    }

    // 2. Aspecting / conjunct grahas — WITH Value-Add 5.1 friend/enemy gate
    for (const other of planets) {
      if (other.name === p.name) continue;
      const isConjunct = other.house != null && p.house != null && other.house === p.house;
      const isAspecting = !isConjunct && aspectsSign(other.name, other.sign, p.sign);
      if (!isConjunct && !isAspecting) continue;

      const relation = naturalRelation(other.name, p.name);
      const strength = scaled100(other);
      const type = isConjunct ? 'conjunctFriend' : 'aspectingFriend';
      const weight = WEIGHTS[type];

      if (relation === 'enemy') {
        // Value-Add 5.1: never count an enemy as support — log it as a
        // complicating factor instead so it's visible, not silently dropped.
        supports.push({
          type, source: other.name, sourceHi: other.nameHi, ownStrength: strength, weight,
          contribution: 0, included: false, isEnemyComplication: true,
          note: `${other.nameHi || other.name} स्वाभाविक शत्रु है — भले ही मजबूत हो, सपोर्ट नहीं माना गया; बल्कि जटिलता का कारण हो सकता है`,
        });
        continue;
      }

      const included = relation === 'friend' && strength >= THRESHOLDS.strong;
      supports.push({
        type, source: other.name, sourceHi: other.nameHi, ownStrength: strength, weight,
        contribution: included ? Math.round(strength * weight) : 0,
        included, relation,
        note: relation === 'neutral'
          ? 'सम भाव — तटस्थ, सपोर्ट में नहीं गिना गया (केवल मित्र ग्रह गिने जाते हैं)'
          : (included ? 'मित्र ग्रह और मजबूत — सपोर्ट में गिना गया' : 'मित्र है लेकिन खुद कमजोर — सपोर्ट में नहीं गिना गया'),
      });
    }

    // 4. Bhagya (9th house / lord) — universal support factor
    const ninthLordName = houseLords?.[9]?.lord;
    const ninthLord = ninthLordName && ninthLordName !== p.name ? getPlanet(planets, ninthLordName) : null;
    if (ninthLord) {
      const strength = scaled100(ninthLord);
      const included = strength >= THRESHOLDS.strong;
      supports.push({
        type: 'bhagya', source: ninthLord.name, sourceHi: ninthLord.nameHi,
        ownStrength: strength, weight: WEIGHTS.bhagya,
        contribution: included ? Math.round(strength * WEIGHTS.bhagya) : 0,
        included, note: included ? '9वें भाव/भाग्येश मजबूत — सार्वभौमिक सपोर्ट' : '9वें भाव का स्वामी स्वयं कमजोर',
      });
    }

    const totalContribution = supports.filter(s => s.included).reduce((sum, s) => sum + s.contribution, 0);
    const effectiveStrength = Math.min(100, baseStrength + totalContribution);

    let verdict;
    if (effectiveStrength >= THRESHOLDS.strong) verdict = 'compensated_by_support';
    else if (effectiveStrength > baseStrength) verdict = 'partial_support';
    else verdict = 'needs_direct_remedy';

    const included = supports.filter(s => s.included).sort((a, b) => b.contribution - a.contribution);
    const bestSupport = included[0] || null;

    results.push({
      planet: p.name,
      planetHi: p.nameHi,
      baseStrength,
      effectiveStrength,
      verdict,
      weaknessCause: weaknessCause(p),
      supports,
      bestSupport,
      enemyComplications: supports.filter(s => s.isEnemyComplication),
    });
  }

  return results;
}

export { naturalRelation as _naturalRelationForTest };

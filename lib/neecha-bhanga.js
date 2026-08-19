// lib/neecha-bhanga.js
//
// NEECHA BHANGA RAJA YOGA (debilitation-cancellation) — STRICT rule
// engine, per classical Parashari criteria only.
//
// Deliberately NOT a scoring system (no `score += 40`-style numbers —
// those create false precision with no classical basis). Instead this
// checks a small set of named, individually-defensible classical
// conditions and reports which ones are actually met as booleans.
// "Any benefic aspect" is NOT treated as sufficient — that produces
// false positives; only these four specific conditions count:
//
//   1. dispositorInKendra          — the debilitated planet's sign-lord
//                                     (dispositor) sits in a Kendra
//                                     (1/4/7/10) from Lagna or Moon.
//   2. exaltationLordInKendra      — the planet that gets EXALTED in the
//                                     debilitated planet's current sign
//                                     sits in a Kendra from Lagna or Moon.
//   3. dispositorKendraFromExaltLord — the dispositor and that
//                                     exaltation-lord are mutually in
//                                     Kendra from each other.
//   4. dispositorAspectsPlanet     — the dispositor casts a classical
//                                     Parashari aspect back onto the
//                                     debilitated planet itself.
//
// isNeechaBhanga is true if ANY ONE of these four is true — matching
// the classical position that any one condition is sufficient to
// cancel the debilitation (not full Raja Yoga strength, just
// cancellation of the negative effect).

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const KENDRA = [1, 4, 7, 10];

const SIGN_LORD = {
  Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
  Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
  Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
};

const EXALTATION = { Sun:'Aries', Moon:'Taurus', Mercury:'Virgo', Venus:'Pisces', Mars:'Capricorn', Jupiter:'Cancer', Saturn:'Libra', Rahu:'Gemini', Ketu:'Sagittarius' };

// Reverse lookup: which planet gets exalted in a given sign
const SIGN_EXALTED_LORD = {};
for (const [planet, sign] of Object.entries(EXALTATION)) SIGN_EXALTED_LORD[sign] = planet;

// Classical Parashari full-aspect houses (from own position). All
// planets aspect the 7th; Mars/Jupiter/Saturn get extra aspects.
const ASPECT_HOUSES = { Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10] };
function getAspectHouses(planetName) { return ASPECT_HOUSES[planetName] || [7]; }

function houseOfSignFrom(targetSign, refSign) {
  const ti = SIGNS.indexOf(targetSign);
  const ri = SIGNS.indexOf(refSign);
  if (ti === -1 || ri === -1) return null;
  return ((ti - ri + 12) % 12) + 1;
}

function isKendraFromEither(sign, lagnaSign, moonSign) {
  if (!sign) return false;
  const fromLagna = lagnaSign ? KENDRA.includes(houseOfSignFrom(sign, lagnaSign)) : false;
  const fromMoon = moonSign ? KENDRA.includes(houseOfSignFrom(sign, moonSign)) : false;
  return fromLagna || fromMoon;
}

function aspectsSign(planetName, planetSign, targetSign) {
  const houses = getAspectHouses(planetName);
  const h = houseOfSignFrom(targetSign, planetSign);
  return h !== null && houses.includes(h);
}

function getPlanet(planets, name) { return planets.find(p => p.name === name); }

// ── Main evaluator ──────────────────────────────────────────
// Returns one entry per DEBILITATED planet in the chart (empty array
// if none). Each entry reports which classical conditions are met —
// use `.isNeechaBhanga` for a simple true/false, or `.criteriaMet` to
// show/explain WHICH classical rule applied.
export function evaluateSupportedWeakPlanet(planets, lagnaSign) {
  if (!planets || !lagnaSign) return [];

  const moon = getPlanet(planets, 'Moon');
  const moonSign = moon?.sign || null;

  const results = [];

  for (const p of planets) {
    if (p.dignity !== 'debilitated') continue;

    const dispositorName = SIGN_LORD[p.sign];
    const dispositor = dispositorName ? getPlanet(planets, dispositorName) : null;

    const exaltLordName = SIGN_EXALTED_LORD[p.sign]; // planet exalted in p's (debilitating) sign
    const exaltLord = exaltLordName ? getPlanet(planets, exaltLordName) : null;

    const criteriaMet = {
      dispositorInKendra: dispositor ? isKendraFromEither(dispositor.sign, lagnaSign, moonSign) : false,
      exaltationLordInKendra: exaltLord ? isKendraFromEither(exaltLord.sign, lagnaSign, moonSign) : false,
      dispositorKendraFromExaltLord: (dispositor && exaltLord)
        ? KENDRA.includes(houseOfSignFrom(exaltLord.sign, dispositor.sign))
        : false,
      dispositorAspectsPlanet: (dispositor && dispositorName)
        ? aspectsSign(dispositorName, dispositor.sign, p.sign)
        : false,
    };

    const isNeechaBhanga = Object.values(criteriaMet).some(Boolean);

    // Separate, milder signal — general benefic support (conjunction or
    // aspect from Jupiter/Venus) — NOT the same claim as Neecha Bhanga
    // cancellation, reported honestly as its own flag so the two are
    // never conflated in the output.
    const benefics = ['Jupiter', 'Venus'];
    const hasBeneficConjunction = benefics.some(b => {
      const bp = getPlanet(planets, b);
      return bp && bp.sign === p.sign;
    });
    const hasBeneficAspect = benefics.some(b => {
      const bp = getPlanet(planets, b);
      return bp && aspectsSign(b, bp.sign, p.sign);
    });

    results.push({
      planet: p.name,
      planetHi: p.nameHi,
      sign: p.sign,
      signHi: p.signHi,
      dispositor: dispositorName,
      dispositorHi: dispositor?.nameHi,
      isNeechaBhanga,
      criteriaMet,
      hasBeneficProtection: hasBeneficConjunction || hasBeneficAspect,
      beneficProtectionDetail: { hasBeneficConjunction, hasBeneficAspect },
    });
  }

  return results;
}

export { isKendraFromEither, aspectsSign, houseOfSignFrom, SIGN_LORD, SIGN_EXALTED_LORD };

// lib/gemstone-policy.js
//
// RESPONSIBLE GEMSTONE POLICY
//
// Problem this fixes: the app previously recommended a gemstone for
// factSheet.weakestPlanet unconditionally (kundli-analysis-prompt.js
// "remedies.vedic.gem" and chat's REMEDY RULE both did this). But the
// classical position is that wearing the gemstone of a debilitated /
// afflicted planet can amplify its negative effect — gemstones should
// only be recommended for a planet that is BOTH (a) playing a
// genuinely beneficial functional role in THIS chart (Lagna lord,
// 9th lord, or Yogakaraka for this specific Lagna) AND (b) not itself
// badly placed (6th/8th/12th house, or debilitated).
//
// This module answers ONE question deterministically: for a given
// planet, is a gemstone appropriate — and if not, why not (so the
// reasoning is visible, not just a silent no).

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const DUSTHANA = [6, 8, 12];

const SIGN_LORD = {
  Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
  Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
  Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
};

// Yogakaraka — a planet that classically owns BOTH a Kendra and a
// Trikona house for a given Lagna, making it uniquely auspicious.
// Only these three Lagna-pairs have an agreed-upon Yogakaraka; for
// every other Lagna there isn't one (deliberately not extended by
// approximation).
const YOGAKARAKA_BY_LAGNA = {
  Taurus: 'Saturn', Libra: 'Saturn',
  Cancer: 'Mars', Leo: 'Mars',
  Capricorn: 'Venus', Aquarius: 'Venus',
};

function getSignAtHouse(lagnaSign, houseNum) {
  const li = SIGNS.indexOf(lagnaSign);
  if (li === -1) return null;
  return SIGNS[(li + houseNum - 1) % 12];
}

function houseOfPlanet(planet, lagnaSign) {
  const li = SIGNS.indexOf(lagnaSign);
  const pi = SIGNS.indexOf(planet.sign);
  if (li === -1 || pi === -1) return null;
  return ((pi - li + 12) % 12) + 1;
}

// ── Main check ──────────────────────────────────────────────
// planetName: English key (e.g. "Saturn")
// lagnaSign: English sign name of the Lagna
// planets: factSheet.planets (each with .name, .sign, .dignity)
export function evaluateGemstoneEligibility(planetName, lagnaSign, planets) {
  if (!planetName || !lagnaSign || !planets) {
    return { eligible: false, reason: 'अपर्याप्त डेटा — जन्म-कुंडली विश्लेषण पूरा नहीं है।' };
  }

  const lagnaLord = SIGN_LORD[lagnaSign];
  const ninthSign = getSignAtHouse(lagnaSign, 9);
  const ninthLord = ninthSign ? SIGN_LORD[ninthSign] : null;
  const yogakaraka = YOGAKARAKA_BY_LAGNA[lagnaSign] || null;

  const roles = [];
  if (planetName === lagnaLord) roles.push('लग्नेश (लग्न का स्वामी)');
  if (planetName === ninthLord) roles.push('नवमेश (भाग्य भाव का स्वामी)');
  if (planetName === yogakaraka) roles.push('योगकारक');

  if (roles.length === 0) {
    return {
      eligible: false,
      reason: `${planetName} इस कुंडली में न तो लग्नेश है, न नवमेश, न योगकारक — इसका रत्न सामान्यतः अनुशंसित नहीं किया जाता। इसके बजाय मंत्र/दान जैसे सुरक्षित उपाय दिए जाने चाहिए।`,
    };
  }

  const planet = planets.find(p => p.name === planetName);
  if (!planet) {
    return { eligible: false, reason: `${planetName} की स्थिति डेटा में नहीं मिली।` };
  }

  if (planet.dignity === 'debilitated') {
    return {
      eligible: false,
      reason: `${planetName} स्वयं नीच का है — भले ही यह ${roles.join('/')} की भूमिका में हो, नीच ग्रह का रत्न पहनना नुकसानदेह माना जाता है। पहले शांति उपाय (मंत्र/दान) करें, रत्न नहीं।`,
    };
  }

  const house = houseOfPlanet(planet, lagnaSign);
  if (house && DUSTHANA.includes(house)) {
    return {
      eligible: false,
      reason: `${planetName} ${house}वें भाव (दुस्थान) में स्थित है — इस स्थिति में रत्न देने से पहले सावधानी ज़रूरी है, केवल मंत्र/दान की सलाह दें।`,
    };
  }

  return {
    eligible: true,
    reason: `${planetName} इस कुंडली में ${roles.join(' और ')} है और शुभ स्थिति में है — रत्न अनुशंसा योग्य।`,
    roles,
  };
}

// ── Picks which planet (if any) should be offered a gemstone in this
// chart, preferring the strongest qualifying role. Returns null (with
// a reason) if nothing qualifies — callers should then fall back to
// non-gemstone remedies only (mantra/daan), never default to the
// weakest planet's gem just because it's "the one that needs help".
export function pickGemstoneRecommendation(lagnaSign, planets) {
  if (!lagnaSign || !planets) return { planet: null, reason: 'डेटा अनुपलब्ध।' };

  const lagnaLord = SIGN_LORD[lagnaSign];
  const ninthSign = getSignAtHouse(lagnaSign, 9);
  const ninthLord = ninthSign ? SIGN_LORD[ninthSign] : null;
  const yogakaraka = YOGAKARAKA_BY_LAGNA[lagnaSign] || null;

  // Priority: Yogakaraka > Lagna lord > 9th lord (Yogakaraka is the
  // single strongest classical category when one exists for this Lagna)
  const candidates = [yogakaraka, lagnaLord, ninthLord].filter(Boolean);
  const uniqueCandidates = [...new Set(candidates)];

  for (const candidate of uniqueCandidates) {
    const result = evaluateGemstoneEligibility(candidate, lagnaSign, planets);
    if (result.eligible) return { planet: candidate, ...result };
  }

  return {
    planet: null,
    reason: 'इस कुंडली में कोई भी योग्य ग्रह (लग्नेश/नवमेश/योगकारक) रत्न के लिए उपयुक्त स्थिति में नहीं मिला — इस समय रत्न नहीं, केवल मंत्र और दान की सलाह दी जानी चाहिए।',
  };
}

export const GEMSTONE_DISCLAIMER =
  'महत्वपूर्ण नोट: यह विश्लेषण पारंपरिक वैदिक सिद्धांतों पर आधारित एक मार्गदर्शिका है, जीवन के पैटर्न समझने में मदद के लिए — कोई गारंटी नहीं। रत्न नीति: नीच या पीड़ित ग्रह का रत्न पहनना नुकसानदेह हो सकता है, इसलिए यह प्रणाली केवल उन्हीं ग्रहों के रत्न सुझाती है जो आपकी कुंडली में स्वाभाविक रूप से शुभ भूमिका में हैं (लग्नेश/नवमेश/योगकारक) और अच्छी स्थिति में हैं। यह किसी भी वित्तीय, चिकित्सकीय या कानूनी परिणाम की गारंटी नहीं देता — कोई भी बड़ा निर्णय लेने से पहले किसी योग्य विशेषज्ञ से सलाह लें।';

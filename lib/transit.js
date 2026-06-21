// lib/transit.js
//
// TRANSIT (GOCHAR) ENGINE
//
// Computes today's real planetary positions and compares them against
// the natal chart to answer "what's happening right now" — the most
// requested type of question in Vedic astrology practice.
//
// Classical Gochar (transit) houses are counted from the natal MOON sign
// (Chandra Lagna) — this is the traditional Parashari method, distinct
// from the D1 Lagna used for static birth-chart house analysis. Some
// schools also reference the birth Lagna; we compute both and let the
// narrator pick what's relevant, but Moon-based Gochar is primary.
//
// Reuses the existing 3-tier ephemeris engine — transits are just planet
// positions for TODAY's date instead of the birth date, so no new
// astronomical code is needed, only new interpretation logic.

import { getPlanetPositions, calcHouse, PLANETS_HI, SIGNS_HI } from './astro-facts.js';

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

// ── Classical Gochar effects per house-from-Moon (simplified Parashari) ──
// Each planet has different effects depending which house (from Moon) it
// transits. This is the single most-used timing technique after Dasha.
const GOCHAR_EFFECTS = {
  Saturn: {
    good: [3, 6, 11],
    neutral: [2, 5, 9],
    challenging: [1, 4, 7, 8, 10, 12],
    note: 'शनि की ढैय्या/साढ़े साती सबसे प्रभावशाली गोचर मानी जाती है',
  },
  Jupiter: {
    good: [2, 5, 7, 9, 11],
    neutral: [1, 3, 10],
    challenging: [4, 6, 8, 12],
    note: 'बृहस्पति गोचर विकास और भाग्य का संकेतक है',
  },
  Rahu: {
    good: [3, 6, 11],
    neutral: [2, 5, 9],
    challenging: [1, 4, 7, 8, 10, 12],
    note: 'राहु गोचर अप्रत्याशित परिवर्तन लाता है',
  },
  Ketu: {
    good: [3, 6, 11],
    neutral: [2, 5, 9],
    challenging: [1, 4, 7, 8, 10, 12],
    note: 'केतु गोचर वैराग्य और आंतरिक परिवर्तन का समय है',
  },
  Mars: {
    good: [3, 6, 11],
    neutral: [1, 2, 5, 9, 10],
    challenging: [4, 7, 8, 12],
    note: 'मंगल गोचर साहस और संघर्ष दोनों ला सकता है',
  },
  Sun: {
    good: [3, 6, 10, 11],
    neutral: [1, 2, 5, 9],
    challenging: [4, 7, 8, 12],
    note: 'सूर्य गोचर हर 30 दिन में राशि बदलता है — अल्पकालिक प्रभाव',
  },
  Venus: {
    good: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    neutral: [6, 10],
    challenging: [7],
    note: 'शुक्र गोचर लगभग हमेशा शुभ माना जाता है',
  },
  Mercury: {
    good: [2, 4, 6, 8, 10, 11],
    neutral: [1, 3, 5, 9, 12],
    challenging: [7],
    note: 'बुध गोचर तेज़ी से बदलता है — संचार/व्यापार पर असर',
  },
};

const HOUSE_GOCHAR_THEME_HI = {
  1:  'व्यक्तित्व और स्वास्थ्य',
  2:  'धन और वाणी',
  3:  'साहस और प्रयास',
  4:  'घर और मानसिक शांति',
  5:  'संतान और बुद्धि',
  6:  'शत्रु और रोग',
  7:  'विवाह और साझेदारी',
  8:  'अचानक परिवर्तन',
  9:  'भाग्य और धर्म',
  10: 'करियर और कर्म',
  11: 'लाभ और इच्छापूर्ति',
  12: 'व्यय और हानि',
};

// ── Sade Sati (Saturn's 7.5-year transit cycle around natal Moon) ───
// Classical definition: Saturn transiting the 12th, 1st, or 2nd house
// FROM THE NATAL MOON SIGN. This is THE most asked-about transit in
// Vedic astrology — deserves dedicated detection.
function checkSadeSati(transitSaturnSign, natalMoonSign) {
  const moonIdx = SIGNS.indexOf(natalMoonSign);
  const satIdx = SIGNS.indexOf(transitSaturnSign);
  if (moonIdx === -1 || satIdx === -1) return null;

  const houseFromMoon = ((satIdx - moonIdx + 12) % 12) + 1;

  if (houseFromMoon === 12) {
    return { active: true, phase: 'पहला चरण (आरंभिक)', houseFromMoon, description: 'साढ़े साती का पहला ढाई वर्ष शुरू — मानसिक तैयारी और परिवर्तन का समय' };
  }
  if (houseFromMoon === 1) {
    return { active: true, phase: 'दूसरा चरण (शिखर)', houseFromMoon, description: 'साढ़े साती का मध्य काल — सबसे प्रभावशाली, धैर्य और अनुशासन आवश्यक' };
  }
  if (houseFromMoon === 2) {
    return { active: true, phase: 'तीसरा चरण (समापन)', houseFromMoon, description: 'साढ़े साती का अंतिम चरण — परिणाम और स्थिरता का समय' };
  }

  // Dhaiyya (2.5 year mini-Sade-Sati): Saturn in 4th or 8th from Moon
  if (houseFromMoon === 4 || houseFromMoon === 8) {
    return { active: false, isDhaiyya: true, houseFromMoon, description: `शनि की ढैय्या — चंद्र से ${houseFromMoon}वें भाव में, सतर्कता आवश्यक` };
  }

  return { active: false, houseFromMoon, description: 'अभी साढ़े साती या ढैय्या सक्रिय नहीं है' };
}

// ── Main transit calculation ─────────────────────────────────────
// natalFactSheet: the already-computed birth chart fact-sheet (has lagna, planets)
// Returns transit positions + house-from-Moon + house-from-Lagna + Sade Sati + per-planet effect
export async function buildTransitReport(natalFactSheet, lat, lng) {
  if (!natalFactSheet?.lagna || !natalFactSheet?.planets) {
    return null; // can't compute transits without natal lagna/planets
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const nowTime = `${String(today.getUTCHours()).padStart(2,'0')}:${String(today.getUTCMinutes()).padStart(2,'0')}`;

  // Reuse the existing ephemeris engine — current date, birth location
  // (location affects only the transit ascendant calc, not planet signs)
  const result = await getPlanetPositions(todayStr, nowTime, lat, lng, 'lahiri');
  const transitPlanets = result.planets;

  const natalMoon = natalFactSheet.planets.find(p => p.name === 'Moon');
  const natalLagnaSign = natalFactSheet.lagna.sign;
  const natalMoonSign = natalMoon.sign;

  const transitDetails = transitPlanets
    .filter(p => GOCHAR_EFFECTS[p.name]) // skip if no rule defined
    .map(tp => {
      const houseFromMoon  = calcHouse(tp.sign, natalMoonSign);
      const houseFromLagna = calcHouse(tp.sign, natalLagnaSign);
      const rule = GOCHAR_EFFECTS[tp.name];

      let nature = 'neutral';
      if (rule.good.includes(houseFromMoon)) nature = 'good';
      else if (rule.challenging.includes(houseFromMoon)) nature = 'challenging';

      return {
        name: tp.name,
        nameHi: tp.nameHi,
        currentSign: tp.sign,
        currentSignHi: tp.signHi,
        degree: tp.degree,
        retro: tp.retro,
        houseFromMoon,
        houseFromMoonThemeHi: HOUSE_GOCHAR_THEME_HI[houseFromMoon],
        houseFromLagna,
        houseFromLagnaThemeHi: HOUSE_GOCHAR_THEME_HI[houseFromLagna],
        nature, // 'good' | 'neutral' | 'challenging'
        note: rule.note,
      };
    });

  const transitSaturn = transitPlanets.find(p => p.name === 'Saturn');
  const sadeSati = transitSaturn ? checkSadeSati(transitSaturn.sign, natalMoonSign) : null;

  const transitJupiter = transitDetails.find(p => p.name === 'Jupiter');
  const transitSaturnDetail = transitDetails.find(p => p.name === 'Saturn');

  return {
    asOf: todayStr,
    natalMoonSign,
    natalMoonSignHi: SIGNS_HI[SIGNS.indexOf(natalMoonSign)],
    natalLagnaSign,
    natalLagnaSignHi: SIGNS_HI[SIGNS.indexOf(natalLagnaSign)],
    transits: transitDetails,
    sadeSati,
    headline: buildHeadline(transitDetails, sadeSati),
    // Quick-access for the two most-asked-about transits
    jupiterTransit: transitJupiter,
    saturnTransit: transitSaturnDetail,
  };
}

function buildHeadline(transitDetails, sadeSati) {
  const points = [];
  if (sadeSati?.active) {
    points.push(`साढ़े साती सक्रिय (${sadeSati.phase})`);
  } else if (sadeSati?.isDhaiyya) {
    points.push('शनि की ढैय्या चल रही है');
  }
  const challenging = transitDetails.filter(t => t.nature === 'challenging' && ['Saturn','Mars','Rahu'].includes(t.name));
  const good = transitDetails.filter(t => t.nature === 'good' && ['Jupiter','Venus'].includes(t.name));

  if (good.length > 0) points.push(`${good.map(g => g.nameHi).join(', ')} शुभ स्थिति में`);
  if (challenging.length > 0) points.push(`${challenging.map(c => c.nameHi).join(', ')} सतर्कता मांगते हैं`);

  return points.length > 0 ? points.join(' · ') : 'सामान्य गोचर स्थिति';
}

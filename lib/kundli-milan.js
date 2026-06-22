// lib/kundli-milan.js
//
// KUNDLI MILAN — ASHTAKOOT COMPATIBILITY ENGINE
//
// Classical 8-factor compatibility scoring system used across all
// major Vedic astrology traditions for marriage matching. This is
// the most standardized, agreed-upon compatibility technique —
// safe to implement deterministically with high confidence.
//
// The 8 Kootas (factors) and their max points:
//   1. Varna   (1 pt)  — spiritual/dharmic compatibility
//   2. Vashya  (2 pts) — mutual attraction and control
//   3. Tara    (3 pts) — destiny/longevity compatibility
//   4. Yoni    (4 pts) — physical/intimate compatibility
//   5. Graha Maitri (5 pts) — mind and friendship
//   6. Gana    (6 pts) — temperament/nature match
//   7. Bhakoot (7 pts) — emotional and health compatibility
//   8. Nadi    (8 pts) — health, progeny, genetic compatibility
// Total: 36 points. Recommended minimum: 18 (50%)

const NAKSHATRAS = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Moola','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha',
  'Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati',
];
const NAKSHATRAS_HI = [
  'अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा',
  'पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्व फाल्गुनी','उत्तर फाल्गुनी',
  'हस्त','चित्रा','स्वाती','विशाखा','अनुराधा','ज्येष्ठा',
  'मूल','पूर्वाषाढ़ा','उत्तराषाढ़ा','श्रवण','धनिष्ठा',
  'शतभिषा','पूर्व भाद्रपद','उत्तर भाद्रपद','रेवती',
];

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGNS_HI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];

// ── Nakshatra lord (for Graha Maitri) ─────────────────────────
const NAK_LORD = [
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // 1-9
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // 10-18
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // 19-27
];

// ── Varna (1 pt) — dharmic/spiritual class ─────────────────────
const VARNA = {
  Aries:'Kshatriya', Leo:'Kshatriya', Sagittarius:'Kshatriya',
  Taurus:'Vaishya', Virgo:'Vaishya', Capricorn:'Vaishya',
  Gemini:'Shudra', Libra:'Shudra', Aquarius:'Shudra',
  Cancer:'Brahmin', Scorpio:'Brahmin', Pisces:'Brahmin',
};
const VARNA_RANK = { Brahmin:4, Kshatriya:3, Vaishya:2, Shudra:1 };
const VARNA_HI = { Brahmin:'ब्राह्मण', Kshatriya:'क्षत्रिय', Vaishya:'वैश्य', Shudra:'शूद्र' };

function calcVarna(boyMoonSign, girlMoonSign) {
  const bRank = VARNA_RANK[VARNA[boyMoonSign]] || 1;
  const gRank = VARNA_RANK[VARNA[girlMoonSign]] || 1;
  // Boy's varna must be >= girl's for compatibility
  return { score: bRank >= gRank ? 1 : 0, max: 1, bVarna: VARNA[boyMoonSign], gVarna: VARNA[girlMoonSign] };
}

// ── Vashya (2 pts) — mutual attraction ────────────────────────
const VASHYA_GROUP = {
  Aries:'quadruped', Taurus:'quadruped', Gemini:'human', Cancer:'watercrawler',
  Leo:'wild', Virgo:'human', Libra:'human', Scorpio:'watercrawler',
  Sagittarius:'human', Capricorn:'watercrawler', Aquarius:'human', Pisces:'watercrawler',
};
// Vashya pairs: who controls whom
const VASHYA_CONTROLS = {
  human: ['quadruped','watercrawler'], quadruped: ['wild'], wild: ['quadruped'], watercrawler: [],
};

function calcVashya(boySign, girlSign) {
  const bGrp = VASHYA_GROUP[boySign];
  const gGrp = VASHYA_GROUP[girlSign];
  let score = 0;
  if (bGrp === gGrp) score = 2;
  else if (VASHYA_CONTROLS[bGrp]?.includes(gGrp)) score = 2;
  else if (VASHYA_CONTROLS[gGrp]?.includes(bGrp)) score = 1; // girl controls boy — half
  return { score, max: 2 };
}

// ── Tara (3 pts) — destiny compatibility ──────────────────────
// Count from boy's nakshatra to girl's (and vice versa), divide by 9,
// take remainder. Inauspicious remainders: 3,5,7 (Vipat, Pratyak, Vadha)
function taraCount(fromNak, toNak) {
  const f = NAKSHATRAS.indexOf(fromNak);
  const t = NAKSHATRAS.indexOf(toNak);
  if (f === -1 || t === -1) return 0;
  const count = ((t - f + 27) % 27) + 1;
  return count % 9; // 0=9th,1=1st,2=2nd...
}

function calcTara(boyNak, girlNak) {
  const inauspicious = [3, 5, 7]; // Vipat=3, Pratyak=5, Vadha=7
  const bTara = taraCount(boyNak, girlNak);
  const gTara = taraCount(girlNak, boyNak);
  const bOk = !inauspicious.includes(bTara);
  const gOk = !inauspicious.includes(gTara);
  let score = 0;
  if (bOk && gOk) score = 3;
  else if (bOk || gOk) score = 1.5;
  return { score, max: 3, bTara, gTara };
}

// ── Yoni (4 pts) — physical compatibility ─────────────────────
const YONI = {
  Ashwini:'horse', Shatabhisha:'horse',
  Bharani:'elephant', Revati:'elephant',
  Pushya:'goat', Krittika:'goat',
  Rohini:'serpent', Mrigashira:'serpent',
  Moola:'dog', Ardra:'dog',
  'Purva Phalguni':'rat', Magha:'rat',
  'Purva Phalguni':'rat', 'Magha':'rat',
  'Purva Ashadha':'monkey', 'Punarvasu':'monkey',
  'Uttara Ashadha':'mongoose', 'Uttara Phalguni':'cow',
  'Hasta':'buffalo', 'Swati':'buffalo',
  'Vishakha':'tiger', 'Chitra':'tiger',
  'Jyeshtha':'deer', 'Anuradha':'deer',
  'Purva Bhadrapada':'lion', 'Dhanishtha':'lion',
  'Uttara Bhadrapada':'cow', 'Shravana':'monkey',
  'Ashlesha':'cat',
};

// Yoni enemies (incompatible pairs)
const YONI_ENEMIES = [
  ['horse','buffalo'],['elephant','lion'],['goat','monkey'],
  ['serpent','mongoose'],['dog','deer'],['rat','cat'],
  ['tiger','deer'],
];

function calcYoni(boyNak, girlNak) {
  const bYoni = YONI[boyNak] || 'unknown';
  const gYoni = YONI[girlNak] || 'unknown';
  if (bYoni === 'unknown' || gYoni === 'unknown') return { score: 2, max: 4, bYoni, gYoni };

  if (bYoni === gYoni) return { score: 4, max: 4, bYoni, gYoni }; // same yoni — best
  const isEnemy = YONI_ENEMIES.some(pair =>
    (pair[0] === bYoni && pair[1] === gYoni) || (pair[1] === bYoni && pair[0] === gYoni)
  );
  return { score: isEnemy ? 0 : 2, max: 4, bYoni, gYoni };
}

// ── Graha Maitri (5 pts) — mental compatibility ────────────────
const FRIENDSHIP = {
  Sun:     { friends:['Moon','Mars','Jupiter'],   neutral:['Mercury'],          enemies:['Venus','Saturn','Rahu','Ketu'] },
  Moon:    { friends:['Sun','Mercury'],            neutral:['Mars','Jupiter','Venus','Saturn'], enemies:['Rahu','Ketu'] },
  Mars:    { friends:['Sun','Moon','Jupiter'],     neutral:['Venus','Saturn'],   enemies:['Mercury','Rahu','Ketu'] },
  Mercury: { friends:['Sun','Venus'],              neutral:['Mars','Jupiter','Saturn'], enemies:['Moon','Rahu','Ketu'] },
  Jupiter: { friends:['Sun','Moon','Mars'],        neutral:['Saturn'],           enemies:['Mercury','Venus','Rahu','Ketu'] },
  Venus:   { friends:['Mercury','Saturn'],         neutral:['Mars','Jupiter'],   enemies:['Sun','Moon','Rahu','Ketu'] },
  Saturn:  { friends:['Mercury','Venus'],          neutral:['Jupiter'],          enemies:['Sun','Moon','Mars','Rahu','Ketu'] },
  Rahu:    { friends:['Saturn','Mercury','Venus'], neutral:['Jupiter'],          enemies:['Sun','Moon','Mars'] },
  Ketu:    { friends:['Mars','Venus','Saturn'],    neutral:['Jupiter'],          enemies:['Sun','Moon','Mercury'] },
};

function lordRelation(lordA, lordB) {
  const f = FRIENDSHIP[lordA];
  if (!f) return 'neutral';
  if (f.friends.includes(lordB)) return 'friend';
  if (f.enemies.includes(lordB)) return 'enemy';
  return 'neutral';
}

function calcGrahaMaitri(boyNak, girlNak) {
  const bLord = NAK_LORD[NAKSHATRAS.indexOf(boyNak)] || 'Sun';
  const gLord = NAK_LORD[NAKSHATRAS.indexOf(girlNak)] || 'Sun';
  const bToG = lordRelation(bLord, gLord);
  const gToB = lordRelation(gLord, bLord);

  const rel = bToG === 'friend' && gToB === 'friend' ? 'mutual_friend'
    : bToG === 'enemy' && gToB === 'enemy' ? 'mutual_enemy'
    : bToG === 'friend' || gToB === 'friend' ? 'one_sided_friend'
    : bToG === 'enemy' || gToB === 'enemy' ? 'one_sided_enemy'
    : 'neutral';

  const scores = { mutual_friend:5, one_sided_friend:4, neutral:3, one_sided_enemy:1, mutual_enemy:0 };
  return { score: scores[rel], max: 5, bLord, gLord, bToG, gToB, relation: rel };
}

// ── Gana (6 pts) — temperament ────────────────────────────────
const GANA = {
  Ashwini:'Deva', Mrigashira:'Deva', Punarvasu:'Deva', Pushya:'Deva',
  Hasta:'Deva', Swati:'Deva', Anuradha:'Deva', Shravana:'Deva', Revati:'Deva',
  Bharani:'Manushya', Rohini:'Manushya', Ardra:'Manushya', 'Purva Phalguni':'Manushya',
  'Purva Phalguni':'Manushya', 'Uttara Phalguni':'Manushya', 'Purva Ashadha':'Manushya',
  'Uttara Ashadha':'Manushya', 'Purva Bhadrapada':'Manushya', 'Uttara Bhadrapada':'Manushya',
  Krittika:'Rakshasa', Ashlesha:'Rakshasa', Magha:'Rakshasa', Chitra:'Rakshasa',
  Vishakha:'Rakshasa', Jyeshtha:'Rakshasa', Moola:'Rakshasa', Dhanishtha:'Rakshasa',
  Shatabhisha:'Rakshasa',
};
const GANA_HI = { Deva:'देव', Manushya:'मानुष', Rakshasa:'राक्षस' };

function calcGana(boyNak, girlNak) {
  const bGana = GANA[boyNak] || 'Manushya';
  const gGana = GANA[girlNak] || 'Manushya';
  let score = 0;
  if (bGana === gGana) score = 6;
  else if ((bGana === 'Deva' && gGana === 'Manushya') || (bGana === 'Manushya' && gGana === 'Deva')) score = 5;
  else if (bGana === 'Manushya' && gGana === 'Rakshasa') score = 1;
  else if (bGana === 'Deva' && gGana === 'Rakshasa') score = 0;
  else score = 3;
  return { score, max: 6, bGana: GANA_HI[bGana], gGana: GANA_HI[gGana] };
}

// ── Bhakoot (7 pts) — emotional / destiny compatibility ────────
function calcBhakoot(boySign, girlSign) {
  const bIdx = SIGNS.indexOf(boySign);
  const gIdx = SIGNS.indexOf(girlSign);
  const fwd = ((gIdx - bIdx + 12) % 12) + 1; // girl from boy
  const bwd = ((bIdx - gIdx + 12) % 12) + 1; // boy from girl

  // Inauspicious pairs: 6-8, 9-5, 12-2
  const inauspicious = [[6,8],[9,5],[12,2]];
  const isDosha = inauspicious.some(([a,b]) =>
    (fwd === a && bwd === b) || (fwd === b && bwd === a)
  );

  return {
    score: isDosha ? 0 : 7,
    max: 7,
    fwd,   // girl's sign position from boy's
    bwd,   // boy's sign position from girl's
    dosha: isDosha,
  };
}

// ── Nadi (8 pts) — progeny + health compatibility ──────────────
const NADI = {
  Ashwini:'Adi', Ardra:'Adi', Punarvasu:'Adi', 'Uttara Phalguni':'Adi',
  'Uttara Phalguni':'Adi', Hasta:'Adi', Jyeshtha:'Adi',
  Moola:'Adi', Shatabhisha:'Adi', 'Purva Bhadrapada':'Adi',
  Bharani:'Madhya', Mrigashira:'Madhya', Pushya:'Madhya',
  'Purva Phalguni':'Madhya', Chitra:'Madhya', Anuradha:'Madhya',
  'Purva Ashadha':'Madhya', Dhanishtha:'Madhya', 'Uttara Bhadrapada':'Madhya',
  Krittika:'Antya', Rohini:'Antya', Ashlesha:'Antya',
  Magha:'Antya', Swati:'Antya', Vishakha:'Antya',
  'Uttara Ashadha':'Antya', Shravana:'Antya', Revati:'Antya',
};
const NADI_HI = { Adi:'आदि', Madhya:'मध्य', Antya:'अंत्य' };

function calcNadi(boyNak, girlNak) {
  const bNadi = NADI[boyNak] || 'Madhya';
  const gNadi = NADI[girlNak] || 'Madhya';
  // Same Nadi = Nadi Dosha (8 pts lost — worst incompatibility)
  return {
    score: bNadi === gNadi ? 0 : 8,
    max: 8,
    bNadi: NADI_HI[bNadi],
    gNadi: NADI_HI[gNadi],
    dosha: bNadi === gNadi,
  };
}

// ── Main Kundli Milan calculator ──────────────────────────────
export function calcKundliMilan(boyFactSheet, girlFactSheet) {
  // Extract Moon nakshatra and sign from each factSheet
  const boyMoon  = boyFactSheet?.planets?.find(p => p.name === 'Moon');
  const girlMoon = girlFactSheet?.planets?.find(p => p.name === 'Moon');

  if (!boyMoon || !girlMoon) return null;

  const boyNak   = boyMoon.nakshatra;
  const girlNak  = girlMoon.nakshatra;
  const boySign  = boyMoon.sign;
  const girlSign = girlMoon.sign;

  const varna       = calcVarna(boySign, girlSign);
  const vashya      = calcVashya(boySign, girlSign);
  const tara        = calcTara(boyNak, girlNak);
  const yoni        = calcYoni(boyNak, girlNak);
  const grahaMaitri = calcGrahaMaitri(boyNak, girlNak);
  const gana        = calcGana(boyNak, girlNak);
  const bhakoot     = calcBhakoot(boySign, girlSign);
  const nadi        = calcNadi(boyNak, girlNak);

  const totalScore = varna.score + vashya.score + tara.score + yoni.score +
                     grahaMaitri.score + gana.score + bhakoot.score + nadi.score;
  const totalMax = 36;
  const percentage = Math.round(totalScore / totalMax * 100);

  // Dosha detection
  const doshas = [];
  if (nadi.dosha)    doshas.push({ name: 'नाड़ी दोष', severity: 'high', effect: 'स्वास्थ्य और संतान पर प्रभाव — सबसे गंभीर दोष' });
  if (bhakoot.dosha) doshas.push({ name: 'भकूट दोष', severity: 'high', effect: 'भावनात्मक और आर्थिक असंतुलन' });
  if (gana.score === 0) doshas.push({ name: 'गण दोष', severity: 'medium', effect: 'स्वभाव में भारी असमानता' });

  // Interpretation
  let verdict, verdictHi;
  if (totalScore >= 27)       { verdict = 'Excellent'; verdictHi = 'उत्तम मेल'; }
  else if (totalScore >= 21)  { verdict = 'Good';      verdictHi = 'शुभ मेल'; }
  else if (totalScore >= 18)  { verdict = 'Average';   verdictHi = 'सामान्य मेल'; }
  else if (totalScore >= 14)  { verdict = 'Below Average'; verdictHi = 'निम्न मेल'; }
  else                        { verdict = 'Not Recommended'; verdictHi = 'अनुकूल नहीं'; }

  return {
    boyNakshatra:  { en: boyNak,  hi: NAKSHATRAS_HI[NAKSHATRAS.indexOf(boyNak)] },
    girlNakshatra: { en: girlNak, hi: NAKSHATRAS_HI[NAKSHATRAS.indexOf(girlNak)] },
    boyMoonSign:   { en: boySign,  hi: SIGNS_HI[SIGNS.indexOf(boySign)] },
    girlMoonSign:  { en: girlSign, hi: SIGNS_HI[SIGNS.indexOf(girlSign)] },
    kootas: [
      { name: 'वर्ण',         nameEn: 'Varna',        score: varna.score,       max: 1, details: `${VARNA_HI[varna.bVarna] || varna.bVarna} × ${VARNA_HI[varna.gVarna] || varna.gVarna}` },
      { name: 'वश्य',         nameEn: 'Vashya',       score: vashya.score,      max: 2, details: '' },
      { name: 'तारा',         nameEn: 'Tara',         score: tara.score,        max: 3, details: `${tara.bTara}/${tara.gTara}` },
      { name: 'योनि',         nameEn: 'Yoni',         score: yoni.score,        max: 4, details: `${yoni.bYoni} × ${yoni.gYoni}` },
      { name: 'ग्रह मैत्री', nameEn: 'Graha Maitri', score: grahaMaitri.score, max: 5, details: `${grahaMaitri.bLord} & ${grahaMaitri.gLord}` },
      { name: 'गण',           nameEn: 'Gana',         score: gana.score,        max: 6, details: `${gana.bGana} × ${gana.gGana}` },
      { name: 'भकूट',         nameEn: 'Bhakoot',      score: bhakoot.score,     max: 7, details: bhakoot.dosha ? '⚠️ दोष' : 'शुभ' },
      { name: 'नाड़ी',        nameEn: 'Nadi',         score: nadi.score,        max: 8, details: `${nadi.bNadi} × ${nadi.gNadi}${nadi.dosha ? ' — ⚠️ दोष' : ''}` },
    ],
    totalScore,
    totalMax,
    percentage,
    verdict,
    verdictHi,
    doshas,
    recommendation: buildMilanRecommendation(totalScore, doshas, grahaMaitri),
  };
}

function buildMilanRecommendation(score, doshas, grahaMaitri) {
  const parts = [];

  if (score >= 27) {
    parts.push('यह मिलान अत्यंत शुभ है। दोनों की जीवन-यात्रा एक-दूसरे को बल देगी।');
  } else if (score >= 21) {
    parts.push('यह मिलान शुभ है और विवाह के लिए उचित माना जाता है।');
  } else if (score >= 18) {
    parts.push('मिलान औसत है — विवाह संभव है परंतु कुछ सावधानियाँ आवश्यक हैं।');
  } else {
    parts.push('मिलान अनुकूल नहीं है। किसी अनुभवी ज्योतिषी से परामर्श आवश्यक है।');
  }

  const nadiDosha = doshas.find(d => d.name === 'नाड़ी दोष');
  if (nadiDosha) {
    parts.push('नाड़ी दोष है — इसके निवारण के लिए नाड़ी दोष शांति पूजा या विशेष परामर्श लें।');
  }

  const bhakootDosha = doshas.find(d => d.name === 'भकूट दोष');
  if (bhakootDosha) {
    parts.push('भकूट दोष है — दोनों की कुंडली में मंगल/शनि की स्थिति विस्तार से देखें।');
  }

  if (grahaMaitri.score >= 4) {
    parts.push('ग्रह मैत्री उत्तम है — मानसिक तालमेल और मित्रता स्वाभाविक रहेगी।');
  }

  return parts.join(' ');
}

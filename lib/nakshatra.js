// lib/nakshatra.js
//
// NAKSHATRA-LEVEL ANALYSIS ENGINE
//
// Goes deeper than sign-level Parashari by computing:
// 1. Exact Nakshatra + Pada (quarter) for each planet
// 2. Nakshatra lord chain (planet → nakshatra lord → nakshatra lord's nakshatra)
//    This "KP Sub-lord" style chain reveals hidden connections between planets
// 3. Nakshatra-based yogas (Pushkara, Vargottama at nakshatra level)
// 4. Moon nakshatra special analysis (most important for daily life)
//
// Classical sources: Brihat Parashara Hora Shastra, KP System,
// Nakshatra Vichara (traditional)

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

// Nakshatra lord (Vimshottari sequence repeating)
const NAK_LORDS = [
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
];
const NAK_LORDS_HI = {
  Sun:'सूर्य', Moon:'चंद्र', Mars:'मंगल', Mercury:'बुध',
  Jupiter:'बृहस्पति', Venus:'शुक्र', Saturn:'शनि', Rahu:'राहु', Ketu:'केतु'
};

// Each nakshatra = 13°20' = 800' of arc. Total zodiac = 360° = 27 nakshatras.
const NAK_SPAN_DEG = 360 / 27; // 13.3333...

// Pushkara nakshatras (most auspicious for beginnings)
const PUSHKARA_NAKSHATRAS = ['Rohini','Ashwini','Punarvasu','Pushya','Hasta','Vishakha','Uttara Ashadha','Dhanishtha','Revati'];
// Pushkara Navamsa — specific padas that are extra auspicious
const PUSHKARA_NAVAMSA = {
  Aries:3, Taurus:5, Gemini:6, Cancer:8, Leo:9, Virgo:11,
  Libra:12, Scorpio:14, Sagittarius:15, Capricorn:17, Aquarius:18, Pisces:19,
};

// Nakshatra characteristics for AI narrative
const NAK_THEMES = {
  Ashwini:      { theme:'नई शुरुआत, गति, चिकित्सा, साहस', deity:'अश्विन कुमार', quality:'chara (moveable)', element:'पृथ्वी' },
  Bharani:      { theme:'परिवर्तन, सृजन-विनाश, कर्म का बोझ', deity:'यम', quality:'sthira (fixed)', element:'पृथ्वी' },
  Krittika:     { theme:'तीक्ष्णता, शुद्धि, पाचन, नेतृत्व', deity:'अग्नि', quality:'both', element:'अग्नि' },
  Rohini:       { theme:'सौंदर्य, कृषि, संपदा, स्थिरता', deity:'ब्रह्मा', quality:'sthira', element:'पृथ्वी' },
  Mrigashira:   { theme:'खोज, यात्रा, सौम्यता, नाजुकता', deity:'सोम', quality:'chara', element:'पृथ्वी/आकाश' },
  Ardra:        { theme:'तूफान, बदलाव, तीव्र भावना, रुदन', deity:'रुद्र', quality:'chara', element:'जल' },
  Punarvasu:    { theme:'पुनर्जन्म, वापसी, उदारता, आनंद', deity:'अदिति', quality:'chara', element:'जल' },
  Pushya:       { theme:'पोषण, सुरक्षा, आध्यात्म, परंपरा', deity:'बृहस्पति', quality:'sthira', element:'जल' },
  Ashlesha:     { theme:'कुंडलिनी, गुप्त शक्ति, बुद्धि, चालाकी', deity:'नाग', quality:'sthira', element:'जल' },
  Magha:        { theme:'पूर्वज, राजसत्ता, यश, परंपरा', deity:'पितर', quality:'ugra (fierce)', element:'अग्नि' },
  'Purva Phalguni': { theme:'आनंद, विश्राम, प्रजनन, कला', deity:'भग', quality:'ugra', element:'अग्नि' },
  'Uttara Phalguni': { theme:'मित्रता, अनुकूलता, सेवा, शांति', deity:'अर्यमन', quality:'sthira', element:'अग्नि' },
  Hasta:        { theme:'कौशल, हस्त-कला, वाक्पटुता, सफाई', deity:'सूर्य', quality:'laghu (light)', element:'अग्नि' },
  Chitra:       { theme:'सृजन, सौंदर्यबोध, वास्तुकला, रत्न', deity:'विश्वकर्मा', quality:'mridu', element:'अग्नि' },
  Swati:        { theme:'स्वतंत्रता, वायु, व्यापार, नम्रता', deity:'वायु', quality:'chara', element:'वायु' },
  Vishakha:     { theme:'लक्ष्य-साधना, उत्साह, विजय, महत्वाकांक्षा', deity:'इंद्र-अग्नि', quality:'both', element:'अग्नि' },
  Anuradha:     { theme:'मित्रता, भक्ति, कड़ी मेहनत, संघर्ष', deity:'मित्र', quality:'mridu', element:'जल' },
  Jyeshtha:     { theme:'वरिष्ठता, सुरक्षा, गुप्त शक्ति', deity:'इंद्र', quality:'ugra', element:'जल' },
  Moola:        { theme:'जड़ें, खोज, विनाश-पुनर्निर्माण, अध्यात्म', deity:'निऋति', quality:'ugra', element:'अग्नि' },
  'Purva Ashadha': { theme:'दृढ़ता, गर्व, जल-शुद्धि, विजय', deity:'जल', quality:'ugra', element:'जल' },
  'Uttara Ashadha': { theme:'अंतिम विजय, अखंडता, धर्म', deity:'विश्वदेव', quality:'sthira', element:'पृथ्वी' },
  Shravana:     { theme:'श्रवण, शिक्षा, संचार, ज्ञान', deity:'विष्णु', quality:'chara', element:'वायु' },
  Dhanishtha:   { theme:'संपदा, संगीत, साहस, बहुमुखी प्रतिभा', deity:'वसु', quality:'chara', element:'आकाश' },
  Shatabhisha:  { theme:'चिकित्सा, रहस्य, एकांत, वैज्ञानिक सोच', deity:'वरुण', quality:'chara', element:'आकाश' },
  'Purva Bhadrapada': { theme:'अग्नि-परिवर्तन, तीव्र भावना, पश्चाताप', deity:'अज एकपाद', quality:'ugra', element:'आकाश' },
  'Uttara Bhadrapada': { theme:'गहराई, ज्ञान, नियंत्रण, दीर्घायु', deity:'अहि बुध्न्य', quality:'sthira', element:'आकाश' },
  Revati:       { theme:'समापन, पोषण, यात्रा, दैवी कृपा', deity:'पूषा', quality:'mridu', element:'आकाश' },
};

// ── Main nakshatra analysis ──────────────────────────────────
export function buildNakshatraSheet(planets, lagnaSign) {
  if (!planets || !lagnaSign) return null;

  const planetDetails = planets.map(p => {
    // Nakshatra from degree (0-360 total longitude)
    const totalDeg = p.degree; // should be 0-360
    const nakIdx = Math.floor(totalDeg / NAK_SPAN_DEG) % 27;
    const nakName = NAKSHATRAS[nakIdx];
    const nakHi   = NAKSHATRAS_HI[nakIdx];
    const lord    = NAK_LORDS[nakIdx];
    const lordHi  = NAK_LORDS_HI[lord];

    // Pada (quarter) — each nakshatra has 4 padas of 3°20' each
    const posInNak = totalDeg % NAK_SPAN_DEG;
    const pada = Math.floor(posInNak / (NAK_SPAN_DEG / 4)) + 1;

    // Nakshatra lord's nakshatra (2nd level chain — KP-style)
    const lordPlanet = planets.find(p2 => p2.name === lord);
    let lordNakHi = null, lordNakLord = null;
    if (lordPlanet) {
      const lordNakIdx = Math.floor(lordPlanet.degree / NAK_SPAN_DEG) % 27;
      lordNakHi  = NAKSHATRAS_HI[lordNakIdx];
      lordNakLord = NAK_LORDS_HI[NAK_LORDS[lordNakIdx]];
    }

    const theme = NAK_THEMES[nakName];
    const isPushkara = PUSHKARA_NAKSHATRAS.includes(nakName);

    return {
      name:     p.name,
      nameHi:   p.nameHi,
      nakshatra: nakName,
      nakshatraHi: nakHi,
      pada,
      lord,
      lordHi,
      lordNakHi,    // where the nakshatra lord itself sits
      lordNakLord,  // what controls the nakshatra lord
      isPushkara,
      theme: theme?.theme || '',
      deity: theme?.deity || '',
      quality: theme?.quality || '',
      sign: p.sign,
      degree: p.degree,
      // Interpretation hook for AI
      summary: `${p.nameHi} — ${nakHi} नक्षत्र (${pada} पाद), स्वामी: ${lordHi}${isPushkara ? ' ✦ पुष्कर' : ''}`,
    };
  });

  // Moon nakshatra — most important for daily life, personality, mind
  const moonDetail = planetDetails.find(p => p.name === 'Moon');

  // Janma tara (birth star classification)
  const moonNakIdx = NAKSHATRAS.indexOf(moonDetail?.nakshatra);
  const janmaTaraClassification = moonNakIdx !== -1 ? buildJanmaTara(moonNakIdx) : null;

  // Planets in Pushkara nakshatras
  const pushkaraGrahas = planetDetails.filter(p => p.isPushkara);

  // Nakshatra-based strength summary
  const nakInsights = buildNakshatraInsights(planetDetails, moonDetail);

  return {
    planets:   planetDetails,
    moonNakshatra: moonDetail,
    janmaTara: janmaTaraClassification,
    pushkaraGrahas,
    insights:  nakInsights,
  };
}

// ── Janma Tara system — 9 tara classifications from Moon ─────
// Shows relationship of current period to birth star
function buildJanmaTara(moonNakIdx) {
  const TARA_NAMES_HI = [
    'जन्म','संपत्','विपत्','क्षेम','प्रत्यक्','साधन','नैधन','मित्र','परम मित्र'
  ];
  const TARA_EFFECTS = [
    'स्व-विकास, आत्म-जागृति',
    'धन-संपदा, समृद्धि',
    'बाधा, सावधानी',
    'सुख, आराम',
    'शत्रु, विघ्न',
    'सिद्धि, कार्य-पूर्ति',
    'मृत्यु-तुल्य कष्ट',
    'मित्रता, सहयोग',
    'उत्तम मित्रता, श्रेष्ठ फल'
  ];

  const classifications = [];
  for (let i = 0; i < 27; i++) {
    const taraIdx = ((i - moonNakIdx + 27) % 27) % 9;
    classifications.push({
      nakshatra: NAKSHATRAS[i],
      nakshatraHi: NAKSHATRAS_HI[i],
      tara: TARA_NAMES_HI[taraIdx],
      effect: TARA_EFFECTS[taraIdx],
      isFavorable: [0,1,3,5,7,8].includes(taraIdx),
    });
  }
  return classifications;
}

// ── Key insights for AI ──────────────────────────────────────
function buildNakshatraInsights(planetDetails, moonDetail) {
  const insights = [];

  // Moon nakshatra is most important
  if (moonDetail) {
    insights.push({
      type: 'moon_nak',
      text: `चंद्रमा ${moonDetail.nakshatraHi} नक्षत्र में (${moonDetail.pada} पाद, स्वामी: ${moonDetail.lordHi}) — यह व्यक्ति की मानसिकता, भावनात्मक प्रकृति और दैनिक अनुभव का केंद्र है। ${moonDetail.theme}`,
    });
  }

  // Pushkara planets — extra auspicious
  const pushk = planetDetails.filter(p => p.isPushkara && !['Rahu','Ketu'].includes(p.name));
  if (pushk.length > 0) {
    insights.push({
      type: 'pushkara',
      text: `पुष्कर नक्षत्र में ग्रह: ${pushk.map(p => `${p.nameHi} (${p.nakshatraHi})`).join(', ')} — इन ग्रहों की दशा में विशेष शुभता।`,
    });
  }

  // Nakshatra lord chain for Lagna lord
  const lagnaLordDetail = planetDetails.find(p => ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].includes(p.name));
  if (lagnaLordDetail?.lordNakHi) {
    insights.push({
      type: 'chain',
      text: `नक्षत्र श्रृंखला: ${lagnaLordDetail.nameHi} → ${lagnaLordDetail.lordHi} (${lagnaLordDetail.lordNakHi} नक्षत्र में) → ${lagnaLordDetail.lordNakLord} — इस श्रृंखला के ग्रहों की दशाएं आपस में जुड़ी हुई हैं।`,
    });
  }

  return insights;
}

// ── Format for AI prompt ─────────────────────────────────────
export function formatNakshatraForPrompt(nakSheet) {
  if (!nakSheet) return '';
  const lines = ['NAKSHATRA ANALYSIS (गहरा ग्रह विश्लेषण):'];

  for (const p of nakSheet.planets) {
    if (['Rahu','Ketu'].includes(p.name)) continue;
    lines.push(`• ${p.summary}${p.lordNakHi ? ` → ${p.lordHi} खुद ${p.lordNakHi} में` : ''}`);
  }

  if (nakSheet.pushkaraGrahas.length > 0) {
    lines.push(`✦ पुष्कर ग्रह: ${nakSheet.pushkaraGrahas.map(p => p.nameHi).join(', ')} — इनकी दशा में अतिरिक्त शुभता`);
  }

  lines.push('IMPORTANT: Planet predictions mein nakshatra lord ka bhi dhyan rakho — agar kisi planet ki dasha chal rahi hai aur uska nakshatra lord weak hai, to fal adhura milega.');

  return lines.join('\n');
}

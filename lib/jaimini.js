// lib/jaimini.js
//
// JAIMINI ASTROLOGY ENGINE
//
// Implements the core Jaimini techniques as a genuine cross-validation
// layer alongside Parashari. When both systems agree on a life theme,
// the prediction confidence is genuinely higher — this is the real
// value add, not just labeling.
//
// Implemented (deterministic):
//   1. Chara Karakas — 7 planets ranked by degree, assigning karaka roles
//   2. Atmakaraka — the highest-degree planet (soul significator)
//   3. Karakamsha — Atmakaraka's sign in D9 (Navamsa) — the soul's arena
//   4. Jaimini Aspects — signs aspect in a distinct pattern from Parashari
//   5. Chara Dasha — sign-based dasha system (simplified Parashari Chara)
//   6. Cross-validation — flags where Jaimini + Parashari agree

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGNS_HI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];

// ── Jaimini Karakas (Chara Karakas — variable karaka system) ──
// 7 planets (exclude Rahu/Ketu) ranked by degree within sign (highest = AK).
// This is the most agreed-upon Jaimini rule across major commentators.
const KARAKA_ROLES = [
  { key: 'AK',  nameHi: 'आत्मकारक',    meaning: 'आत्मा — जीवन का मूल उद्देश्य' },
  { key: 'AmK', nameHi: 'अमात्यकारक',  meaning: 'करियर और व्यवसाय' },
  { key: 'BK',  nameHi: 'भ्रातृकारक',  meaning: 'भाई-बहन और साहस' },
  { key: 'MK',  nameHi: 'मातृकारक',    meaning: 'माता और मन' },
  { key: 'PiK', nameHi: 'पितृकारक',    meaning: 'पिता और भाग्य' },
  { key: 'PuK', nameHi: 'पुत्रकारक',   meaning: 'संतान और बुद्धि' },
  { key: 'GK',  nameHi: 'ज्ञातिकारक',  meaning: 'शत्रु और बाधा' },
];

// Chara Dasha years per sign (Parashari Chara — one of several systems,
// this is the most widely used): counted from Lagna sign, going odd/even direction.
// Simplified: each sign gets years based on its lord's position.
// We use the widely-cited Neelakantha version for clarity and auditability.
const CHARA_DASHA_YEARS = {
  Aries: 7, Taurus: 11, Gemini: 7, Cancer: 4,
  Leo: 5, Virgo: 8, Libra: 7, Scorpio: 8,
  Sagittarius: 9, Capricorn: 4, Aquarius: 11, Pisces: 12,
};

// ── Jaimini Sign Aspects ───────────────────────────────────────
// Fixed signs aspect moveable signs (except adjacent), moveable aspect fixed,
// dual signs aspect each other (except adjacent). This is the key
// difference from Parashari planetary aspects.
const SIGN_TYPE = {
  Aries:'moveable', Taurus:'fixed', Gemini:'dual', Cancer:'moveable',
  Leo:'fixed', Virgo:'dual', Libra:'moveable', Scorpio:'fixed',
  Sagittarius:'dual', Capricorn:'moveable', Aquarius:'fixed', Pisces:'dual',
};

function jaiminiAspects(signA, signB) {
  // A sign aspects another if they're same quadrant type (but not adjacent or same)
  const idxA = SIGNS.indexOf(signA);
  const idxB = SIGNS.indexOf(signB);
  if (idxA === -1 || idxB === -1 || idxA === idxB) return false;
  const diff = Math.abs(idxA - idxB);
  const typeA = SIGN_TYPE[signA];
  const typeB = SIGN_TYPE[signB];
  // Moveable signs aspect all fixed except the one next to them
  if (typeA === 'moveable' && typeB === 'fixed') return diff !== 1 && diff !== 11;
  if (typeA === 'fixed' && typeB === 'moveable') return diff !== 1 && diff !== 11;
  // Dual signs aspect all other dual signs
  if (typeA === 'dual' && typeB === 'dual') return true;
  return false;
}

// ── Main Jaimini computation ──────────────────────────────────
// Takes the same planets array from buildFactSheet (already has sign, degree,
// house) — no new ephemeris calls needed.
export function buildJaiminiSheet(planets, lagnaSign, d9Chart, dob) {
  if (!planets || !lagnaSign) return null;

  // ── 1. Chara Karakas: rank planets by degree within sign ────
  // Rahu uses reverse degree (subtract from 30) per most commentators.
  const gradeable = planets
    .filter(p => !['Rahu','Ketu'].includes(p.name))
    .map(p => ({
      name: p.name,
      nameHi: p.nameHi,
      sign: p.sign,
      signHi: p.signHi,
      house: p.house,
      degree: p.degree,
      // Within-sign degree (0-30): total degree mod 30
      withinSignDeg: p.degree % 30,
    }))
    .sort((a, b) => b.withinSignDeg - a.withinSignDeg); // descending

  const karakas = gradeable.map((p, i) => ({
    ...p,
    karaka: KARAKA_ROLES[i] || null,
  }));

  const atmakaraka = karakas[0]; // Highest degree = AK
  const amatyakaraka = karakas[1]; // Second = AmK (career)

  // ── 2. Karakamsha — AK's sign in D9 ────────────────────────
  // The sign Atmakaraka occupies in Navamsa is the Karakamsha lagna —
  // the "soul's arena" for this lifetime.
  let karakamsha = null;
  if (atmakaraka && d9Chart) {
    const akInD9 = d9Chart[atmakaraka.name];
    if (akInD9) {
      karakamsha = {
        sign: akInD9,
        signHi: SIGNS_HI[SIGNS.indexOf(akInD9)],
        meaning: getKarakamshaTheme(akInD9),
      };
    }
  }

  // ── 3. Chara Dasha calculation ───────────────────────────────
  // Starting from lagna sign, going in zodiacal order if odd sign,
  // anti-zodiacal if even sign. Each sign rules for its assigned years.
  const charaDasha = buildCharaDasha(lagnaSign, dob);

  // ── 4. Key Jaimini insights ──────────────────────────────────
  const insights = buildJaiminiInsights(karakas, atmakaraka, amatyakaraka, karakamsha, lagnaSign);

  // ── 5. Cross-validate with Parashari ────────────────────────
  // (This is populated later when Parashari factSheet is available)
  // The caller merges this with factSheet and adds crossValidation notes.

  return {
    karakas,        // all 7 with karaka roles
    atmakaraka,
    amatyakaraka,
    karakamsha,
    charaDasha,     // current + upcoming Chara Dasha periods with dates
    insights,       // key Hindi narrative points
  };
}

// ── Karakamsha sign themes ─────────────────────────────────────
function getKarakamshaTheme(sign) {
  const themes = {
    Aries:       'साहस, नेतृत्व, और स्वतंत्र कर्म — आत्मा का मार्ग क्रिया और पहल के द्वारा है',
    Taurus:      'भौतिक सुख, कला, और स्थिरता — आत्मा को सौंदर्य और समृद्धि में जीवन-अर्थ मिलता है',
    Gemini:      'बुद्धि, संचार, और व्यापार — आत्मा का विकास ज्ञान और संवाद के माध्यम से होता है',
    Cancer:      'भावनात्मक गहराई, परिवार, और भक्ति — आत्मा को पोषण और आध्यात्मिकता में शांति मिलती है',
    Leo:         'यश, सत्ता, और सृजनात्मकता — आत्मा का उद्देश्य नेतृत्व और प्रकाश फैलाना है',
    Virgo:       'सेवा, विश्लेषण, और परिपूर्णता — आत्मा की यात्रा विनम्र सेवा और कौशल में है',
    Libra:       'न्याय, साझेदारी, और संतुलन — आत्मा रिश्तों और धर्म के माध्यम से विकसित होती है',
    Scorpio:     'परिवर्तन, रहस्य, और आत्म-खोज — आत्मा गहरे संकट और पुनर्जन्म से सीखती है',
    Sagittarius: 'ज्ञान, धर्म, और दर्शन — आत्मा सत्य की खोज और आध्यात्मिक शिक्षण में बढ़ती है',
    Capricorn:   'अनुशासन, कर्तव्य, और समाज-सेवा — आत्मा संरचना और जिम्मेदारी से पूर्णता पाती है',
    Aquarius:    'मानवता, नवाचार, और सामूहिक चेतना — आत्मा समाज-सुधार और विज्ञान में अर्थ पाती है',
    Pisces:      'मोक्ष, भक्ति, और आत्म-समर्पण — आत्मा ईश्वर-भक्ति और वैराग्य से मुक्ति पाती है',
  };
  return themes[sign] || 'आत्मा की विशेष यात्रा';
}

// ── Chara Dasha builder ────────────────────────────────────────
function buildCharaDasha(lagnaSign, dobStr) {
  const lagnaIdx = SIGNS.indexOf(lagnaSign);
  if (lagnaIdx === -1 || !dobStr) return null;

  const dob = new Date(dobStr);
  const today = new Date();

  // Direction: odd lagna signs go forward (zodiacal), even go backward
  const isOdd = (lagnaIdx % 2 === 0); // Aries=0 is "odd" in Jaimini (1st sign)
  const periods = [];
  let currentDate = new Date(dob);

  // Build 12 sign dashas starting from lagna
  for (let i = 0; i < 12; i++) {
    const signIdx = isOdd
      ? (lagnaIdx + i) % 12
      : (lagnaIdx - i + 12) % 12;
    const sign = SIGNS[signIdx];
    const years = CHARA_DASHA_YEARS[sign] || 7;

    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setFullYear(endDate.getFullYear() + years);

    periods.push({
      sign,
      signHi: SIGNS_HI[signIdx],
      years,
      start: startDate.toISOString().split('T')[0],
      end:   endDate.toISOString().split('T')[0],
      isCurrent: startDate <= today && today < endDate,
    });

    currentDate = new Date(endDate);
  }

  const current = periods.find(p => p.isCurrent) || periods[0];
  const upcoming = periods.filter(p => new Date(p.start) > today).slice(0, 3);

  return { periods, current, upcoming };
}

// ── Key Jaimini narrative insights ────────────────────────────
function buildJaiminiInsights(karakas, ak, amk, karakamsha, lagnaSign) {
  const insights = [];

  if (ak) {
    insights.push({
      type: 'atmakaraka',
      title: 'आत्मकारक',
      text: `${ak.nameHi} आपके आत्मकारक हैं (${ak.withinSignDeg.toFixed(1)}° — सर्वोच्च अंश)। Jaimini के अनुसार, यह ग्रह आपकी आत्मा का मूल प्रतिनिधि है — इसकी स्थिति और दशा जीवन की केंद्रीय दिशा तय करती है।`,
      planet: ak.name,
    });
  }

  if (amk) {
    insights.push({
      type: 'amatyakaraka',
      title: 'अमात्यकारक (करियर)',
      text: `${amk.nameHi} अमात्यकारक हैं — Jaimini ज्योतिष में यह करियर और व्यवसाय के सबसे प्रबल कारक हैं। इनकी दशा और स्थिति करियर की गति को सीधे प्रभावित करती है।`,
      planet: amk.name,
    });
  }

  if (karakamsha) {
    insights.push({
      type: 'karakamsha',
      title: 'कारकांश लग्न',
      text: `आत्मकारक D9 में ${karakamsha.signHi} राशि में हैं — यही कारकांश लग्न है। ${karakamsha.meaning}`,
      sign: karakamsha.sign,
    });
  }

  return insights;
}

// ── Cross-validate Jaimini with Parashari ────────────────────
// Called after both sheets are built — finds where both agree,
// which genuinely increases prediction confidence.
export function crossValidate(jaiminiSheet, parashariFActSheet) {
  if (!jaiminiSheet || !parashariFActSheet) return [];

  const agreements = [];

  // Check if Jaimini AK and Parashari strongest planet agree
  const parashari_strongest = parashariFActSheet.strongestPlanet?.name;
  if (jaiminiSheet.atmakaraka?.name === parashari_strongest) {
    agreements.push({
      type: 'planet_agreement',
      confidence: 'high',
      text: `Parashari aur Jaimini dono mein ${jaiminiSheet.atmakaraka.nameHi} sabse balishtahin hain — yeh ek nadrulab sangam hai jo is kal ki bhaviashwani ko khas taakat deta hai।`,
      textHi: `परशरी और Jaimini दोनों में ${jaiminiSheet.atmakaraka.nameHi} प्रमुख हैं — यह दुर्लभ संयोग इस काल की भविष्यवाणी को विशेष बल देता है।`,
    });
  }

  // Check Chara Dasha current sign vs Parashari current dasha lord's sign
  const charaCurrent = jaiminiSheet.charaDasha?.current;
  const parasharLord = parashariFActSheet.currentDashaLordHint;
  if (charaCurrent && parasharLord && charaCurrent.signHi && parasharLord.includes(charaCurrent.signHi)) {
    agreements.push({
      type: 'dasha_agreement',
      confidence: 'high',
      textHi: `Chara Dasha (${charaCurrent.signHi}) और Vimshottari Dasha दोनों एक ही राशि/ग्रह को इंगित कर रहे हैं — दोनों प्रणालियों का यह समर्थन भविष्यवाणी को अत्यंत विश्वसनीय बनाता है।`,
    });
  }

  return agreements;
}

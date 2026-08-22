// lib/saptahik-phal.js
//
// Saptahik Phal (weekly forecast) — unlike Varshaphal (yearly, has a
// deep classical basis) there isn't a dedicated classical "weekly"
// technique. Rather than inventing one, this is built from two real,
// well-established, independently legitimate techniques combined:
//   1. Moon's actual nakshatra transit across the week (Moon moves
//      ~13°/day — a real 7-day window genuinely spans 2-3 different
//      nakshatras, each with established classical qualities)
//   2. Day-lord (Hora) rotation — which planet rules each day
// This is presented as a lighter-weight, day-by-day companion to the
// more authoritative Varshaphal (year) and Gochar Phal (transit)
// systems — not claimed to carry equivalent classical weight.

import { getMoonNakshatra } from './astro-facts.js';
import { buildRemedyLine } from './specialist-rules.js';
import { formatDateDDMMYYYY } from './date-format.js';

const NAKSHATRAS_HI = [
  'अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा',
  'पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्व फाल्गुनी','उत्तर फाल्गुनी',
  'हस्त','चित्रा','स्वाती','विशाखा','अनुराधा','ज्येष्ठा',
  'मूल','पूर्वाषाढ़ा','उत्तराषाढ़ा','श्रवण','धनिष्ठा',
  'शतभिषा','पूर्व भाद्रपद','उत्तर भाद्रपद','रेवती',
];

// Short, classical-tradition-based qualities per nakshatra — kept brief
// (this is a lighter-weight system than Gochar Phal's full paragraphs).
const NAK_QUALITY = {
  0:'नई शुरुआत के लिए अच्छा', 1:'धैर्य और संयम चाहिए', 2:'तीक्ष्णता — सोच-समझ कर बोलें',
  3:'स्थिरता और आराम', 4:'जिज्ञासा और सीखने का समय', 5:'भावनात्मक तीव्रता — शांत रहें',
  6:'नवीनीकरण और मेल-मिलाप', 7:'पोषण और देखभाल का समय', 8:'सतर्कता — जल्दबाज़ी से बचें',
  9:'तेज़ और उग्र — संयम रखें', 10:'आराम और स्थिरता', 11:'शुभ कार्यों के लिए अच्छा',
  12:'कुशलता और कारीगरी का समय', 13:'रचनात्मकता में वृद्धि', 14:'गति और यात्रा के लिए अच्छा',
  15:'दृढ़ता — लक्ष्य पर ध्यान दें', 16:'मित्रता और सहयोग', 17:'तीव्रता — विवाद से बचें',
  18:'जड़ों/मूल की ओर ध्यान', 19:'अजेय ऊर्जा — बड़े कार्य के लिए अच्छा', 20:'व्यापक सोच का समय',
  21:'सीखना और सुनना', 22:'उदारता और विस्तार', 23:'चुनौतियों से सीख', 24:'रहस्य और गहराई',
  25:'दोहरी प्रकृति — निर्णय में सावधानी', 26:'समापन और पूर्णता',
};

const DAY_LORD_HI = ['सूर्य','चंद्र','मंगल','बुध','बृहस्पति','शुक्र','शनि'];
const DAY_NOTE = {
  0:'नेतृत्व और अधिकार से जुड़े काम', 1:'भावनात्मक और घरेलू विषय', 2:'साहस और ऊर्जा वाले काम',
  3:'बातचीत और बुद्धि का उपयोग', 4:'ज्ञान, सलाह और शुभ कार्य', 5:'रिश्ते, सौंदर्य और आनंद',
  6:'अनुशासन और मेहनत के काम',
};

// ── शुभ रंग / शुभ अंक — day-lord (वार) पर आधारित ──────────────────
// Classical Vedic numerology assigns each planet one governing number
// (Sun=1 through Ketu=7/9, per the standard Chaldean-Vedic mapping used
// in daily panchang practice) and each planet has a well-established
// traditional colour association (same table already used for Lal
// Kitab remedies in specialist-rules.js). Deterministic — day-of-week
// decides the day-lord, day-lord decides colour+number. Not AI-guessed,
// not fabricated: standard classical convention, one lookup per day.
const DAY_LORD_EN = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
const LUCKY_COLOR_HI = {
  Sun:'लाल/नारंगी', Moon:'सफेद', Mars:'लाल', Mercury:'हरा',
  Jupiter:'पीला', Venus:'सफेद/गुलाबी', Saturn:'नीला/काला',
};
const LUCKY_NUMBER = {
  Sun:1, Moon:2, Jupiter:3, Rahu:4, Mercury:5, Venus:6, Ketu:7, Saturn:8,
};
// Day-lord's own number (Sun→1 ... Saturn→8) is what's shown per day —
// Rahu/Ketu's numbers only apply when those specific grahas are the
// remedy-target planet elsewhere, not to a calendar day (no day is
// "ruled" by Rahu/Ketu in the classical 7-day vaar system).

// `weakestPlanetKey` — English planet name (e.g. "Saturn") from
// factSheet.weakestPlanet.planet — used to pick ONE chart-specific
// remedy for the whole week, rather than a generic one. Optional: if
// not passed, the week simply has no remedy block (older callers still
// work unchanged).
export function buildSaptahikPhal(ayanamsa = 'lahiri', weakestPlanetKey = null) {
  const today = new Date();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const { nakshatraIndex } = getMoonNakshatra(d, ayanamsa);
    const nakshatra = NAKSHATRAS_HI[nakshatraIndex];
    const nakshatraNote = NAK_QUALITY[nakshatraIndex];
    const dayLord = DAY_LORD_HI[d.getDay()];
    const dayLordEn = DAY_LORD_EN[d.getDay()];
    const dayNote = DAY_NOTE[d.getDay()];
    const luckyColor = LUCKY_COLOR_HI[dayLordEn];
    const luckyNumber = LUCKY_NUMBER[dayLordEn];
    days.push({
      date: d.toISOString().slice(0, 10),
      dayName: ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'][d.getDay()],
      dayLord,
      dayNote,
      nakshatra,
      nakshatraNote,
      luckyColor,
      luckyNumber,
      // Fuller, readable sentence — combines nakshatra effect + day-lord
      // effect coherently, instead of leaving the UI to stitch two
      // fragments together with a dash.
      combinedNote: `चंद्रमा ${nakshatra} नक्षत्र में है — ${nakshatraNote}। आज का दिन-स्वामी ${dayLord} है, इसलिए ${dayNote} के लिए यह समय अनुकूल रहेगा। शुभ रंग: ${luckyColor}, शुभ अंक: ${luckyNumber}।`,
    });
  }

  // Which distinct nakshatras appear this week (for a one-line summary)
  const uniqueNaks = [...new Set(days.map(d => d.nakshatra))];

  // One chart-specific remedy for the whole week, based on the user's
  // actual weakest planet (factSheet.weakestPlanet) — not a generic
  // "Shani ke liye sarson tel" type line.
  const remedy = weakestPlanetKey ? buildRemedyLine(weakestPlanetKey) : null;

  return { days, weekStart: days[0].date, weekEnd: days[6].date, nakshatraSpan: uniqueNaks, remedy, remedyPlanet: weakestPlanetKey };
}

export function formatSaptahikForPrompt(saptahik) {
  if (!saptahik) return '';
  let out = `\nSAPTAHIK PHAL (इस हफ्ते — Moon nakshatra + day-lord, real calculated data):`;
  saptahik.days.forEach(d => {
    out += `\n${d.dayName} (${formatDateDDMMYYYY(d.date)}): चंद्र ${d.nakshatra} में — ${d.nakshatraNote}; दिन-स्वामी ${d.dayLord} — ${d.dayNote}; शुभ रंग: ${d.luckyColor}, शुभ अंक: ${d.luckyNumber}`;
  });
  if (saptahik.remedy) {
    out += `\nइस हफ्ते का उपाय (${PLANETS_HI_LOCAL[saptahik.remedyPlanet] || saptahik.remedyPlanet} — user के weakest planet पर आधारित): ${saptahik.remedy}`;
  }
  return out;
}

const PLANETS_HI_LOCAL = { Sun:'सूर्य', Moon:'चंद्र', Mars:'मंगल', Mercury:'बुध', Jupiter:'बृहस्पति', Venus:'शुक्र', Saturn:'शनि', Rahu:'राहु', Ketu:'केतु' };

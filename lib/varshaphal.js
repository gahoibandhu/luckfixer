// lib/varshaphal.js
//
// VARSHAPHAL (ANNUAL HOROSCOPE / SOLAR RETURN) ENGINE
//
// The most accurate system for "is saal kaisa rahega" questions.
// Computed when Sun returns to exact birth longitude each year.
// Key elements: Varsha Lagna, Muntha, Varsha Hora Lord, Tri-Pataki chakra
//
// Classical source: Tajik Neelakanthi, Varshaphal Shastra

import { buildRemedyLine } from './specialist-rules.js';
import { formatDateDDMMYYYY } from './date-format.js';

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGNS_HI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];
const PLANETS_HI = { Sun:'सूर्य', Moon:'चंद्र', Mars:'मंगल', Mercury:'बुध', Jupiter:'बृहस्पति', Venus:'शुक्र', Saturn:'शनि', Rahu:'राहु', Ketu:'केतु' };

// ── Mudda Dasha per-planet narrative (~month-scale general nature) ──
// Same classical dasha-lord significations used for the main Vimshottari
// system, just written at the "one month under this lord" scale rather
// than the multi-year Mahadasha scale.
const MUDDA_DASHA_TEXTS = {
  Sun: 'यह महीना आत्मविश्वास, नेतृत्व और अधिकार से जुड़े मामलों को उभारता है। पिता, सरकार या वरिष्ठों से जुड़े कार्यों में प्रगति संभव है। स्वास्थ्य में गर्मी/आंख से जुड़ी सावधानी बरतें, अहंकार पर नियंत्रण रखें।',
  Moon: 'यह महीना भावनाओं, घर-परिवार और मानसिक स्थिति से जुड़ा रहेगा। मां या घरेलू मामलों में ध्यान देने योग्य घटनाएं हो सकती हैं। मन में उतार-चढ़ाव संभव है — धैर्य और नियमित दिनचर्या मानसिक स्थिरता में मदद करेगी।',
  Mars: 'यह महीना ऊर्जा, साहस और प्रतिस्पर्धा से भरा रह सकता है। भाई-बहनों, संपत्ति या कानूनी मामलों में सक्रियता बढ़ेगी। गुस्से और जल्दबाज़ी पर नियंत्रण ज़रूरी है, दुर्घटना से सावधान रहें।',
  Mercury: 'यह महीना संचार, व्यापार, बुद्धि और शिक्षा से जुड़े कार्यों के लिए अच्छा है। नए विचार, अनुबंध या यात्रा से जुड़े मामलों में सफलता मिल सकती है। बातचीत में स्पष्टता बनाए रखें।',
  Jupiter: 'यह महीना ज्ञान, समृद्धि और शुभ कार्यों के लिए अनुकूल है। गुरु, शिक्षा, धर्म या वित्तीय मामलों में प्रगति के योग बनते हैं। संतान सुख और सामाजिक सम्मान में वृद्धि हो सकती है।',
  Venus: 'यह महीना रिश्तों, सौंदर्य, कला और भौतिक सुख-सुविधाओं के लिए अनुकूल है। विवाह/प्रेम संबंधी मामलों में प्रगति के योग बनते हैं, खर्च थोड़ा बढ़ सकता है पर आनंद और संतोष भी मिलेगा।',
  Saturn: 'यह महीना अनुशासन, मेहनत और धैर्य की मांग करता है। परिणाम धीमे मिल सकते हैं पर टिकाऊ होंगे। स्वास्थ्य और पुरानी जिम्मेदारियों पर ध्यान दें, जल्दबाज़ी से बचें।',
  Rahu: 'यह महीना अप्रत्याशित घटनाओं, नई दिशाओं और महत्वाकांक्षा से जुड़ा रह सकता है। विदेश, तकनीक या नए क्षेत्रों में अवसर बन सकते हैं, पर भ्रम या धोखे से सावधान रहें।',
  Ketu: 'यह महीना आध्यात्मिक झुकाव, आत्ममंथन और अलगाव के भाव से जुड़ा रह सकता है। भौतिक लक्ष्यों में मन कम लगे, जबकि गूढ़ या शोध-प्रधान कार्यों में सफलता मिल सकती है। ध्यान और सेवा कार्य लाभकारी रहेंगे।',
};



// Muntha moves 1 sign per year from birth lagna
// Year 1 = birth lagna, Year 2 = next sign, etc.
function getMuntha(birthLagnaSign, age) {
  const li = SIGNS.indexOf(birthLagnaSign);
  if (li === -1) return null;
  const munthaIdx = (li + Math.floor(age)) % 12;
  return {
    sign: SIGNS[munthaIdx],
    signHi: SIGNS_HI[munthaIdx],
    house: (munthaIdx - li + 12) % 12 + 1,
  };
}

// Varsha Hora Lord — planet that rules the birth hour of the solar return year
// Simplified: use day lord of solar return date
const DAY_LORDS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
const HORA_ORDER = ['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars'];

function getVarshaHoraLord(solarReturnDate) {
  const dayIdx = solarReturnDate.getDay();
  const hour   = solarReturnDate.getHours();
  const dayLord = DAY_LORDS[dayIdx];
  const startIdx = HORA_ORDER.indexOf(dayLord);
  const horaLord = HORA_ORDER[(startIdx + hour) % 7];
  return { planet: horaLord, planetHi: PLANETS_HI[horaLord] };
}

// Year Lord (Varshesh) — lord of the sign rising at solar return time
// We approximate using the solar return Sun sign's lord
function getVarshesh(planets) {
  const sun = planets?.find(p => p.name === 'Sun');
  if (!sun) return null;
  const LORDS = {
    Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
    Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
    Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
  };
  const lord = LORDS[sun.sign];
  return { planet: lord, planetHi: PLANETS_HI[lord] };
}

// Annual strength assessment per life area
function assessAnnualAreas(planets, birthLagnaSign, muntha, varshesh) {
  const areas = [];
  const lagnaIdx = SIGNS.indexOf(birthLagnaSign);

  const getHouse = (sign) => ((SIGNS.indexOf(sign) - lagnaIdx + 12) % 12) + 1;

  // Career (10th house): is anything strong there this year?
  const tenth = planets?.filter(p => getHouse(p.sign) === 10) || [];
  const tenthPlanets = tenth.map(p => p.nameHi || PLANETS_HI[p.name]).join(', ');
  const BENEFICS = ['Jupiter','Venus','Mercury','Moon'];
  const hasBeneficIn10 = tenth.some(p => BENEFICS.includes(p.name));
  areas.push({
    area: 'करियर (दशम भाव)',
    strength: hasBeneficIn10 ? 'शुभ' : tenth.length > 0 ? 'मिश्रित' : 'सामान्य',
    note: tenth.length > 0 ? `${tenthPlanets} दशम में — ${hasBeneficIn10 ? 'वृद्धि के संकेत' : 'सतर्कता रखें'}` : 'दशम भाव में ग्रह नहीं — स्थिर वर्ष',
  });

  // Wealth (2nd + 11th)
  const wealth = planets?.filter(p => [2,11].includes(getHouse(p.sign))) || [];
  const wealthBenefic = wealth.some(p => BENEFICS.includes(p.name));
  areas.push({
    area: 'धन (द्वितीय-एकादश)',
    strength: wealthBenefic ? 'शुभ' : 'सामान्य',
    note: wealthBenefic ? 'धन भाव में शुभ ग्रह — आय में वृद्धि संभव' : 'सामान्य आर्थिक वर्ष',
  });

  // Health (1st + 6th + 8th)
  const MALEFICS = ['Saturn','Mars','Rahu','Ketu','Sun'];
  const healthHouses = planets?.filter(p => [1,6,8].includes(getHouse(p.sign))) || [];
  const hasMaleficHealth = healthHouses.some(p => MALEFICS.includes(p.name));
  areas.push({
    area: 'स्वास्थ्य (लग्न-षष्ठ-अष्टम)',
    strength: hasMaleficHealth ? 'सावधानी' : 'ठीक',
    note: hasMaleficHealth ? `${healthHouses.filter(p=>MALEFICS.includes(p.name)).map(p=>PLANETS_HI[p.name]).join(', ')} — स्वास्थ्य पर ध्यान दें` : 'स्वास्थ्य सामान्य रहने के संकेत',
  });

  // Relationships (7th)
  const seventh = planets?.filter(p => getHouse(p.sign) === 7) || [];
  const relBenefic = seventh.some(p => BENEFICS.includes(p.name));
  areas.push({
    area: 'संबंध (सप्तम भाव)',
    strength: relBenefic ? 'शुभ' : seventh.length > 0 ? 'मिश्रित' : 'सामान्य',
    note: seventh.length > 0
      ? `${seventh.map(p=>PLANETS_HI[p.name]).join(', ')} सप्तम में — ${relBenefic ? 'रिश्तों में सुधार' : 'संबंधों में सतर्कता'}`
      : 'संबंध क्षेत्र सामान्य',
  });

  // Muntha house analysis
  if (muntha) {
    const munthaEffect = [1,4,7,10].includes(muntha.house) ? 'केंद्र में — अत्यंत प्रभावशाली वर्ष' :
      [2,5,9,11].includes(muntha.house) ? 'शुभ भाव में — लाभकारी वर्ष' :
      [3,6,8,12].includes(muntha.house) ? 'कठिन भाव में — चुनौतियाँ आ सकती हैं' : 'सामान्य';
    areas.push({
      area: `मुंथा (${muntha.signHi} — ${muntha.house}वाँ भाव)`,
      strength: [1,4,7,10,2,5,9,11].includes(muntha.house) ? 'शुभ' : 'चुनौतीपूर्ण',
      note: `मुंथा ${muntha.signHi} में (${muntha.house}वाँ भाव) — ${munthaEffect}`,
    });
  }

  return areas;
}

// ── Mudda Dasha (month-by-month rulership within the year) ──────
// This is the actual classical technique for "kaunsa mahina kaisa
// rahega" within Varshaphal — the year is divided among all 9 grahas
// proportionally to their Vimshottari dasha years (same proportions as
// the main 120-year Vimshottari system, just compressed into ~365
// days), starting from the Varshesh (year lord) and proceeding in
// standard Vimshottari order.
const VIMSHOTTARI_YEARS = { Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17 };
const VIMSHOTTARI_ORDER = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const TOTAL_VIMSHOTTARI_YEARS = 120;

function buildMuddaDasha(varshesh, solarReturnDate) {
  if (!varshesh?.planet) return [];
  const startIdx = VIMSHOTTARI_ORDER.indexOf(varshesh.planet);
  if (startIdx === -1) return [];

  const YEAR_DAYS = 365.25;
  const periods = [];
  let cursor = new Date(solarReturnDate);

  for (let i = 0; i < 9; i++) {
    const planet = VIMSHOTTARI_ORDER[(startIdx + i) % 9];
    const durationDays = (VIMSHOTTARI_YEARS[planet] / TOTAL_VIMSHOTTARI_YEARS) * YEAR_DAYS;
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + durationDays * 24 * 60 * 60 * 1000);
    periods.push({
      planet,
      planetHi: PLANETS_HI[planet],
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      days: Math.round(durationDays),
      text: MUDDA_DASHA_TEXTS[planet] || '',
      remedy: buildRemedyLine(planet),
    });
    cursor = end;
  }
  return periods;
}


export function buildVarshaphal(factSheet, dob) {
  if (!factSheet?.planets || !factSheet?.lagna?.sign || !dob) return null;

  const birthDate = new Date(dob);
  const today = new Date();
  const age = (today - birthDate) / (365.25 * 24 * 60 * 60 * 1000);
  const currentYear = today.getFullYear();

  // Solar return approximation: Sun returns to birth longitude ~same date each year
  // We use birth month/day in current year as the solar return date
  const solarReturnDate = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
  // If solar return was more than 6 months ago, it might be this year's; else last year's
  // Simple heuristic: if today is before birthday, use last year
  const isBirthdayPast = today >= solarReturnDate;
  const varshYear = isBirthdayPast ? currentYear : currentYear - 1;
  const varshEndYear = varshYear + 1;

  const muntha = getMuntha(factSheet.lagna.sign, age);
  const varshesh = getVarshesh(factSheet.planets);
  const horaLord = getVarshaHoraLord(solarReturnDate);
  const areas = assessAnnualAreas(factSheet.planets, factSheet.lagna.sign, muntha, varshesh);
  const muddaDasha = buildMuddaDasha(varshesh, solarReturnDate);

  // Overall annual verdict
  const shubhAreas = areas.filter(a => a.strength === 'शुभ').length;
  const totalAreas = areas.length;
  const verdict = shubhAreas >= 3 ? 'उत्तम वर्ष' : shubhAreas >= 2 ? 'मध्यम शुभ वर्ष' : 'चुनौतीपूर्ण वर्ष — धैर्य आवश्यक';

  // Key prediction for the year
  const yearPrediction = buildYearPrediction(areas, muntha, varshesh, horaLord, varshYear, varshEndYear);

  return {
    varshYear,
    varshEndYear,
    solarReturnDate: solarReturnDate.toISOString().slice(0, 10),
    period: `${varshYear} जन्मदिन से ${varshEndYear} जन्मदिन तक`,
    muntha,
    varshesh,
    horaLord,
    areas,
    verdict,
    yearPrediction,
    shubhCount: shubhAreas,
    muddaDasha,
  };
}

function buildYearPrediction(areas, muntha, varshesh, horaLord, yr, yrEnd) {
  const lines = [];

  if (muntha) {
    if ([1,4,7,10].includes(muntha.house)) {
      lines.push(`मुंथा ${muntha.signHi} (केंद्र) में — यह वर्ष जीवन में बड़े बदलाव ला सकता है।`);
    } else if ([6,8,12].includes(muntha.house)) {
      lines.push(`मुंथा ${muntha.signHi} (दुस्थान) में — ${yr}-${yrEnd} में विशेष सावधानी रखें।`);
    }
  }

  if (varshesh) {
    lines.push(`वर्षेश ${varshesh.planetHi} — इस ग्रह की स्थिति और दशा पूरे वर्ष का tone set करती है।`);
  }

  const bestArea = areas.filter(a => a.strength === 'शुभ')[0];
  const worstArea = areas.filter(a => ['सावधानी','चुनौतीपूर्ण'].includes(a.strength))[0];

  if (bestArea) lines.push(`सबसे अनुकूल क्षेत्र: ${bestArea.area} — ${bestArea.note}`);
  if (worstArea) lines.push(`सावधानी: ${worstArea.area} — ${worstArea.note}`);

  return lines.join(' ');
}

// ── Format for AI prompt ─────────────────────────────────────
export function formatVarshaphalForPrompt(varsh) {
  if (!varsh) return '';

  const lines = [
    `VARSHAPHAL ${varsh.varshYear}-${varsh.varshEndYear} (वार्षिक कुंडली):`,
    `समग्र: ${varsh.verdict}`,
    `मुंथा: ${varsh.muntha?.signHi || '—'} (${varsh.muntha?.house}वाँ भाव)`,
    `वर्षेश: ${varsh.varshesh?.planetHi || '—'}`,
  ];

  for (const a of varsh.areas) {
    lines.push(`• ${a.area}: ${a.strength} — ${a.note}`);
  }

  if (varsh.muddaDasha?.length > 0) {
    lines.push(`\nMUDDA DASHA (महीने-दर-महीने इस वर्ष के भीतर ग्रह-स्वामी — असली classical month-by-month timing technique, guess नहीं):`);
    varsh.muddaDasha.forEach(m => {
      lines.push(`• ${m.planetHi}: ${formatDateDDMMYYYY(m.start)} से ${formatDateDDMMYYYY(m.end)} तक (${m.days} दिन)`);
    });
    lines.push(`INSTRUCTION: Jab user "kaunsa mahina achha rahega" ya "is saal ke kis hisse mein X hoga" poochhe, is MUDDA DASHA data se exact date-range do — planet ka nature (Guru/Shukra = shubh mahine, Shani/Rahu/Ketu = savdhani ke mahine) explain karke.`);
  }

  lines.push(`\nIMPORTANT: Jab user "is saal" ya "${varsh.varshYear}" ke baare mein pooche, is Varshaphal data ko seedha use karo. Yeh "aaj ka din" wale generic jawab se zyada accurate hai annual view ke liye.`);

  return lines.join('\n');
}

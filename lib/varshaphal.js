// lib/varshaphal.js
//
// VARSHAPHAL (ANNUAL HOROSCOPE / SOLAR RETURN) ENGINE
//
// The most accurate system for "is saal kaisa rahega" questions.
// Computed when Sun returns to exact birth longitude each year.
// Key elements: Varsha Lagna, Muntha, Varsha Hora Lord, Tri-Pataki chakra
//
// Classical source: Tajik Neelakanthi, Varshaphal Shastra

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGNS_HI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];
const PLANETS_HI = { Sun:'सूर्य', Moon:'चंद्र', Mars:'मंगल', Mercury:'बुध', Jupiter:'बृहस्पति', Venus:'शुक्र', Saturn:'शनि', Rahu:'राहु', Ketu:'केतु' };

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

// ── Main Varshaphal builder ──────────────────────────────────
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

  // Overall annual verdict
  const shubhAreas = areas.filter(a => a.strength === 'शुभ').length;
  const totalAreas = areas.length;
  const verdict = shubhAreas >= 3 ? 'उत्तम वर्ष' : shubhAreas >= 2 ? 'मध्यम शुभ वर्ष' : 'चुनौतीपूर्ण वर्ष — धैर्य आवश्यक';

  // Key prediction for the year
  const yearPrediction = buildYearPrediction(areas, muntha, varshesh, horaLord, varshYear, varshEndYear);

  return {
    varshYear,
    varshEndYear,
    period: `${varshYear} जन्मदिन से ${varshEndYear} जन्मदिन तक`,
    muntha,
    varshesh,
    horaLord,
    areas,
    verdict,
    yearPrediction,
    shubhCount: shubhAreas,
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

  lines.push(`\nIMPORTANT: Jab user "is saal" ya "${varsh.varshYear}" ke baare mein pooche, is Varshaphal data ko seedha use karo. Yeh "aaj ka din" wale generic jawab se zyada accurate hai annual view ke liye.`);

  return lines.join('\n');
}

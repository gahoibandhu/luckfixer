// lib/specialist-rules.js
//
// SPECIALIST ASTROLOGER RULES DATABASE
// Classical combinations from BPHS, Lal Kitab, Nadi, and expert practitioners.
// These are deterministically matched against the fact-sheet and injected
// into the AI prompt — AI does narrative only, logic is here.

// ── Planetary combinations and their classical meanings ───────
const YOGA_RULES = [
  // Sun combinations
  { rule: 'Sun_Saturn_conj', match: p => hasConjunction(p, 'Sun', 'Saturn', 10), text: 'सूर्य-शनि युति: पिता से संघर्ष, अधिकार में देरी, जीवन में कठिन परिश्रम के बाद सफलता (BPHS)', past_question: 'क्या आपके पिता या अधिकारियों के साथ कभी टकराव रहा है?' },
  { rule: 'Sun_Rahu_conj', match: p => hasConjunction(p, 'Sun', 'Rahu', 10), text: 'सूर्य-राहु युति (ग्रहण योग): पहचान संकट, अचानक उतार-चढ़ाव, विदेश से संपर्क', past_question: 'क्या आपकी पहचान या प्रतिष्ठा में कभी अचानक बदलाव आया है?' },

  // Moon combinations
  { rule: 'Moon_Rahu_conj', match: p => hasConjunction(p, 'Moon', 'Rahu', 8), text: 'चंद्र-राहु युति: मानसिक अशांति, असाधारण विचार, विदेशी संपर्क, अपरंपरागत जीवन शैली (Nadi)', past_question: 'क्या आप कभी-कभी बहुत अकेलापन या मानसिक अशांति महसूस करते हैं?' },
  { rule: 'Moon_Ketu_conj', match: p => hasConjunction(p, 'Moon', 'Ketu', 8), text: 'चंद्र-केतु युति: आध्यात्मिक झुकाव, भावनात्मक वैराग्य, माता से दूरी (Nadi)', past_question: 'क्या आपकी माता या परिवार से कोई भावनात्मक दूरी रही है?' },
  { rule: 'Moon_Saturn_conj', match: p => hasConjunction(p, 'Moon', 'Saturn', 10), text: 'चंद्र-शनि युति: भावनात्मक दमन, जिम्मेदारी का बोझ, देर से खुशी (Phaladeepika)', past_question: 'क्या आपको लगता है कि आपने बचपन में बहुत जल्दी जिम्मेदारियां उठाईं?' },

  // Mars combinations
  { rule: 'Mars_1st_7th', match: (p, h) => getMars(p) && (inHouse(p, 'Mars', 1, h) || inHouse(p, 'Mars', 7, h)), text: 'कुज दोष: मंगल लग्न या सप्तम में — विवाह में देरी या घर्षण, ऊर्जावान व्यक्तित्व (Lal Kitab)', past_question: 'क्या आपके रिश्तों में कभी बड़ा टकराव या देरी रही है?' },
  { rule: 'Mars_Saturn_conj', match: p => hasConjunction(p, 'Mars', 'Saturn', 8), text: 'मंगल-शनि युति: दुर्घटना का भय, दबी हुई ऊर्जा, संघर्ष के बाद सफलता (BPHS)', past_question: 'क्या आपको कभी अचानक दुर्घटना या स्वास्थ्य समस्या हुई है?' },

  // Jupiter combinations
  { rule: 'Jupiter_Venus_exchange', match: p => hasSignExchange(p, 'Jupiter', 'Venus'), text: 'धर्म-कर्म योग (गुरु-शुक्र राशि परिवर्तन): आध्यात्मिक धन, कला में रुचि, विवाह का सुख (BPHS)', past_question: 'क्या आपको कला, संगीत या आध्यात्म में रुचि है?' },
  { rule: 'Jupiter_retrograde', match: p => isRetrograde(p, 'Jupiter'), text: 'वक्री गुरु: आंतरिक ज्ञान, पारंपरिक मार्ग से अलग, गहरी बुद्धि — शिक्षा में रुकावट फिर प्रगति', past_question: 'क्या आपकी शिक्षा में कभी कोई रुकावट आई थी जो बाद में ठीक हो गई?' },

  // Saturn combinations
  { rule: 'Saturn_7th', match: (p, h) => inHouse(p, 'Saturn', 7, h), text: 'शनि सप्तम: विवाह में विलंब, गंभीर जीवनसाथी, रिश्तों से जीवन के सबक (Lal Kitab ch. 7)', past_question: 'क्या आपकी शादी देर से हुई या अभी तक नहीं हुई?' },
  { rule: 'Saturn_10th', match: (p, h) => inHouse(p, 'Saturn', 10, h), text: 'शनि दशम: करियर में कड़ी मेहनत, धीमी लेकिन ठोस सफलता, प्रशासन में रुचि (BPHS)', past_question: 'क्या आपको करियर में सफलता मिलने में सामान्य से अधिक समय लगा?' },

  // Rahu/Ketu
  { rule: 'Rahu_10th', match: (p, h) => inHouse(p, 'Rahu', 10, h), text: 'राहु दशम: technology, media या अपरंपरागत क्षेत्र में करियर, विदेश से जुड़ा काम (Nadi)', past_question: 'क्या आपका काम technology, media या किसी नए/अलग क्षेत्र से जुड़ा है?' },
  { rule: 'Ketu_1st', match: (p, h) => inHouse(p, 'Ketu', 1, h), text: 'केतु लग्न: आध्यात्मिक स्वभाव, विरक्त व्यक्तित्व, पूर्वजन्म की विशेष शक्तियां (Nadi)', past_question: 'क्या आप स्वभाव से अंतर्मुखी या आध्यात्मिक हैं?' },

  // Special yogas
  { rule: 'Vargottama_strong', match: (p) => p.filter(x => x.vargottama && ['Jupiter','Venus','Mercury'].includes(x.name)).length > 0, text: 'वर्गोत्तम ग्रह: D1 और D9 में एक ही राशि — असाधारण शक्ति, जन्म से ही विशेष क्षमता', past_question: null },
  { rule: 'Multiple_exalted', match: p => p.filter(x => x.dignity === 'exalted').length >= 2, text: 'एकाधिक उच्च ग्रह: बहुमुखी प्रतिभा, जीवन में कई क्षेत्रों में सफलता', past_question: null },
];

// ── Helper functions ───────────────────────────────────────────
function hasConjunction(planets, p1, p2, orb = 10) {
  const a = planets.find(p => p.name === p1);
  const b = planets.find(p => p.name === p2);
  if (!a || !b) return false;
  const diff = Math.abs(a.degree - b.degree);
  return Math.min(diff, 360 - diff) <= orb;
}

function hasSignExchange(planets, p1, p2) {
  // p1 in p2's sign AND p2 in p1's sign
  const OWN = { Sun:['Leo'], Moon:['Cancer'], Mercury:['Gemini','Virgo'], Venus:['Taurus','Libra'], Mars:['Aries','Scorpio'], Jupiter:['Sagittarius','Pisces'], Saturn:['Capricorn','Aquarius'] };
  const a = planets.find(p => p.name === p1);
  const b = planets.find(p => p.name === p2);
  if (!a || !b || !OWN[p1] || !OWN[p2]) return false;
  return OWN[p2].includes(a.sign) && OWN[p1].includes(b.sign);
}

function inHouse(planets, planetName, houseNum, lagnaSign) {
  // Approximate house from lagna sign and planet sign
  if (!lagnaSign) return false;
  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const p = planets.find(x => x.name === planetName);
  if (!p) return false;
  const lagnaIdx = SIGNS.indexOf(lagnaSign);
  const planetIdx = SIGNS.indexOf(p.sign);
  if (lagnaIdx === -1 || planetIdx === -1) return false;
  const house = ((planetIdx - lagnaIdx + 12) % 12) + 1;
  return house === houseNum;
}

function getMars(planets) { return planets.find(p => p.name === 'Mars'); }
function isRetrograde(planets, name) { const p = planets.find(x => x.name === name); return p && p.retro; }

// ── Lal Kitab planet-in-house remedies ────────────────────────
const LAL_KITAB_REMEDIES = {
  Sun:     { metal:'तांबा (Copper)', color:'लाल/नारंगी', day:'रविवार', gem:'माणिक्य (Ruby)', mantra:'ॐ सूर्याय नमः', count:108, food:'गुड़, गेहूं', donate:'गुड़ और गेहूं', avoid:'नमक कम करें' },
  Moon:    { metal:'चांदी (Silver)', color:'सफेद', day:'सोमवार', gem:'मोती (Pearl)', mantra:'ॐ सोमाय नमः', count:108, food:'दूध, चावल', donate:'चावल और दूध', avoid:'रात को दूध पीना' },
  Mars:    { metal:'तांबा (Copper)', color:'लाल', day:'मंगलवार', gem:'मूंगा (Red Coral)', mantra:'ॐ अंगारकाय नमः', count:108, food:'मसूर दाल', donate:'मसूर और गुड़', avoid:'झूठ बोलना' },
  Mercury: { metal:'कांसा (Bronze)', color:'हरा', day:'बुधवार', gem:'पन्ना (Emerald)', mantra:'ॐ बुधाय नमः', count:108, food:'हरी सब्जियां', donate:'मूंग दाल', avoid:'शाम को पढ़ाई न छोड़ें' },
  Jupiter: { metal:'सोना (Gold)', color:'पीला', day:'गुरुवार', gem:'पुखराज (Yellow Sapphire)', mantra:'ॐ गुरवे नमः', count:108, food:'चना दाल, हल्दी', donate:'चना दाल और हल्दी', avoid:'झूठे वादे' },
  Venus:   { metal:'चांदी (Silver)', color:'सफेद/गुलाबी', day:'शुक्रवार', gem:'हीरा (Diamond) या ओपल', mantra:'ॐ शुक्राय नमः', count:108, food:'मिठाई, खीर', donate:'सफेद वस्त्र', avoid:'व्यसन से बचें' },
  Saturn:  { metal:'लोहा (Iron)', color:'नीला/काला', day:'शनिवार', gem:'नीलम (Blue Sapphire)', mantra:'ॐ शनैश्चराय नमः', count:108, food:'उड़द दाल, तिल', donate:'काले तिल और तेल', avoid:'चमड़े के जूते शनिवार को न खरीदें' },
  Rahu:    { metal:'मिश्र धातु', color:'धुंए जैसा', day:'शनिवार', gem:'गोमेद (Hessonite)', mantra:'ॐ राहवे नमः', count:108, food:'सरसों का तेल', donate:'काले तिल और उड़द', avoid:'दोपहर की नींद' },
  Ketu:    { metal:'मिश्र धातु', color:'धूसर', day:'मंगलवार', gem:'लहसुनिया (Cat\'s Eye)', mantra:'ॐ केतवे नमः', count:108, food:'तिल के लड्डू', donate:'कंबल और तिल', avoid:'कुत्तों को मत सताएं' },
};

// ── Past validation questions from dasha ──────────────────────
const DASHA_PAST_VALIDATION = {
  Sun:     'क्या पिछले कुछ वर्षों में आपके करियर या प्रतिष्ठा में कोई महत्वपूर्ण बदलाव आया था?',
  Moon:    'क्या पिछले कुछ वर्षों में आपकी मां या किसी करीबी महिला के साथ कुछ महत्वपूर्ण हुआ था?',
  Mars:    'क्या पिछले कुछ वर्षों में कोई बड़ा संघर्ष, दुर्घटना या भूमि-संपत्ति से जुड़ा मामला था?',
  Mercury: 'क्या पिछले कुछ वर्षों में व्यापार, शिक्षा या communication में कोई बड़ा बदलाव आया था?',
  Jupiter: 'क्या पिछले कुछ वर्षों में कोई बड़ा धार्मिक, शैक्षणिक या वित्तीय लाभ हुआ था?',
  Venus:   'क्या पिछले कुछ वर्षों में विवाह, प्रेम या कला के क्षेत्र में कोई महत्वपूर्ण घटना हुई थी?',
  Saturn:  'क्या पिछले कुछ वर्षों में कठिनाइयां बढ़ी थीं या कोई पुरानी जिम्मेदारी आई थी?',
  Rahu:    'क्या पिछले कुछ वर्षों में कोई अप्रत्याशित बड़ा बदलाव, विदेश यात्रा या नई दिशा मिली थी?',
  Ketu:    'क्या पिछले कुछ वर्षों में आध्यात्मिक रुझान बढ़ा था या कोई नुकसान/वियोग हुआ था?',
};

// ── Main function: match rules against fact-sheet ─────────────
export function buildSpecialistInsights(factSheet, vimshottari) {
  const planets = factSheet.planets || [];
  const lagnaSign = factSheet.lagna?.sign || null;

  const matchedYogas = [];
  const pastValidationQuestions = [];

  // Match yoga rules
  for (const rule of YOGA_RULES) {
    try {
      if (rule.match(planets, lagnaSign)) {
        matchedYogas.push(rule.text);
        if (rule.past_question) {
          pastValidationQuestions.push(rule.past_question);
        }
      }
    } catch { /* skip invalid rule */ }
  }

  // Add dasha-based past validation
  if (vimshottari?.current?.mahaDasha?.lord) {
    const mdLord = vimshottari.current.mahaDasha.lord;
    const q = DASHA_PAST_VALIDATION[mdLord];
    if (q && !pastValidationQuestions.includes(q)) {
      pastValidationQuestions.unshift(q); // put dasha question first
    }
  }

  // Weakest planet remedies
  const weakestName = factSheet.weakestPlanet?.name;
  // Convert Hindi name back to English for lookup
  const hindiToEn = { 'सूर्य':'Sun','चंद्र':'Moon','बुध':'Mercury','शुक्र':'Venus','मंगल':'Mars','बृहस्पति':'Jupiter','शनि':'Saturn','राहु':'Rahu','केतु':'Ketu' };
  const weakestEn = hindiToEn[weakestName] || weakestName;
  const weakestRemedy = LAL_KITAB_REMEDIES[weakestEn] || null;

  // Strongest planet
  const strongestName = factSheet.strongestPlanet?.name;
  const strongestEn = hindiToEn[strongestName] || strongestName;
  const strongestRemedy = LAL_KITAB_REMEDIES[strongestEn] || null;

  return {
    matchedYogas,
    pastValidationQuestions: pastValidationQuestions.slice(0, 3), // max 3 questions
    weakestPlanetRemedy: weakestRemedy,
    strongestPlanetDetails: strongestRemedy,
    allPlanetRemedies: LAL_KITAB_REMEDIES,
  };
}

export { LAL_KITAB_REMEDIES, DASHA_PAST_VALIDATION };

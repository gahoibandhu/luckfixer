// lib/numerology.js
//
// Deterministic numerology core — three systems:
// 1. Pythagorean (Western) — Life Path, Expression, Soul Urge, Personality
// 2. Chaldean (ancient) — name vibration, compound numbers
// 3. Vedic / Lo Shu — birth grid, missing numbers (Ank Jyotish)
//
// All calculations are pure JS, no external dependencies.

// ── Letter maps ────────────────────────────────────────────────
const PYTHAGOREAN = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
  J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
  S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8,
};
const CHALDEAN = {
  A:1,B:2,C:3,D:4,E:5,F:8,G:3,H:5,I:1,
  J:1,K:2,L:3,M:4,N:5,O:7,P:8,Q:1,R:2,
  S:3,T:4,U:6,V:6,W:6,X:5,Y:1,Z:7,
};

const VOWELS = new Set(['A','E','I','O','U']);

// ── Core reduction ─────────────────────────────────────────────
// reduce to single digit, preserving master numbers 11, 22, 33
function reduce(n, preserve = true) {
  while (n > 9) {
    if (preserve && (n === 11 || n === 22 || n === 33)) break;
    n = String(n).split('').reduce((s, d) => s + parseInt(d), 0);
  }
  return n;
}

function sumLetters(name, map) {
  return name.toUpperCase().replace(/[^A-Z]/g, '').split('').reduce((s, c) => s + (map[c] || 0), 0);
}

// ── Life Path (Pythagorean) ────────────────────────────────────
// Date-by-date reduction (not flat sum) to preserve master numbers
function lifePath(dob) {
  const [y, m, d] = dob.split('-').map(Number);
  return reduce(reduce(d) + reduce(m) + reduce(y));
}

// ── Expression / Destiny number (Pythagorean) ─────────────────
function expressionNumber(fullName) {
  return reduce(sumLetters(fullName, PYTHAGOREAN));
}

// ── Soul Urge / Heart's Desire (vowels only) ──────────────────
function soulUrge(fullName) {
  const vowelSum = fullName.toUpperCase().replace(/[^A-Z]/g, '').split('')
    .filter(c => VOWELS.has(c))
    .reduce((s, c) => s + (PYTHAGOREAN[c] || 0), 0);
  return reduce(vowelSum);
}

// ── Personality number (consonants only) ──────────────────────
function personalityNumber(fullName) {
  const conSum = fullName.toUpperCase().replace(/[^A-Z]/g, '').split('')
    .filter(c => !VOWELS.has(c))
    .reduce((s, c) => s + (PYTHAGOREAN[c] || 0), 0);
  return reduce(conSum);
}

// ── Chaldean name number (single + compound) ──────────────────
function chaldeanName(fullName) {
  const compound = sumLetters(fullName, CHALDEAN);
  return { compound, single: reduce(compound) };
}

// ── Birth Day number ──────────────────────────────────────────
function birthDayNumber(dob) {
  return reduce(parseInt(dob.split('-')[2]));
}

// ── Lo Shu / Vedic birth grid ─────────────────────────────────
// Digits 1-9 from flattened DOB. Missing digits = weak areas.
function loShuGrid(dob) {
  const digits = dob.replace(/-/g, '').split('').map(Number).filter(d => d >= 1 && d <= 9);
  const grid = {};
  for (let i = 1; i <= 9; i++) grid[i] = digits.filter(d => d === i).length;
  const missing = Object.entries(grid).filter(([,v]) => v === 0).map(([k]) => parseInt(k));
  return { grid, missing };
}

// ── Number meanings (Hindi) ───────────────────────────────────
const NUMBER_MEANING = {
  1:  { title:'नेतृत्व', desc:'स्वतंत्र, महत्वाकांक्षी, अग्रणी' },
  2:  { title:'सहयोग', desc:'शांतिप्रिय, संवेदनशील, कूटनीतिक' },
  3:  { title:'सृजन', desc:'रचनात्मक, उत्साही, अभिव्यक्तिशील' },
  4:  { title:'स्थिरता', desc:'व्यावहारिक, मेहनती, अनुशासित' },
  5:  { title:'स्वतंत्रता', desc:'साहसी, बहुमुखी, परिवर्तनशील' },
  6:  { title:'सेवा', desc:'देखभाल करने वाला, जिम्मेदार, पोषणकर्ता' },
  7:  { title:'ज्ञान', desc:'विश्लेषणात्मक, आध्यात्मिक, एकांतप्रिय' },
  8:  { title:'शक्ति', desc:'महत्वाकांक्षी, व्यावसायिक, भौतिक सफलता' },
  9:  { title:'मानवता', desc:'उदार, परोपकारी, आदर्शवादी' },
  11: { title:'प्रेरणा (मास्टर)', desc:'आध्यात्मिक शिक्षक, अंतर्ज्ञानी, आदर्शवादी' },
  22: { title:'मास्टर बिल्डर', desc:'विशाल सपने, व्यावहारिक उपलब्धि, वैश्विक दृष्टि' },
  33: { title:'मास्टर शिक्षक', desc:'निःस्वार्थ सेवा, उपचारक, प्रेम का अवतार' },
};

const MISSING_MEANING = {
  1: 'आत्मविश्वास और नेतृत्व की कमी',
  2: 'सहयोग और धैर्य में बाधा',
  3: 'संचार और रचनात्मकता में रुकावट',
  4: 'अनुशासन और स्थिरता की कमी',
  5: 'परिवर्तन से भय, जड़ता',
  6: 'घर और परिवार में असंतुलन',
  7: 'आध्यात्मिक विकास में बाधा',
  8: 'धन और भौतिक सफलता में संघर्ष',
  9: 'करुणा और पूर्णता की कमी',
};

// ── Chaldean COMPOUND number meanings (13-52) ──────────────────
// Classical Chaldean tradition treats the un-reduced compound total
// (before final single-digit reduction) as carrying its own separate
// omen — some compounds are considered inauspicious ("अशुभ") even
// when they reduce to an otherwise fine single digit. This is the
// actual basis real Chaldean-numerology name-correction practice
// uses to reject/accept a spelling — reducing to single digit alone
// is NOT enough to judge a name.
const COMPOUND_MEANING = {
  10: { auspicious:true,  note:'स्वतंत्र सफलता का अंक — नए प्रयासों के लिए शुभ' },
  11: { auspicious:false, note:'चुनौतीपूर्ण — अचानक उतार-चढ़ाव, सावधानी से आगे बढ़ें' },
  12: { auspicious:false, note:'त्याग और बलिदान का संकेत — बड़े निर्णयों में जल्दबाज़ी न करें' },
  13: { auspicious:false, note:'परिवर्तन और अस्थिरता — मेहनत से बदला जा सकता है, पर आसान नहीं' },
  14: { auspicious:false, note:'जोखिम और अप्रत्याशित बदलाव — यात्रा/निवेश में सतर्कता ज़रूरी' },
  15: { auspicious:true,  note:'सौभाग्यशाली — परिवार, प्रेम और सामाजिक सफलता का अंक' },
  16: { auspicious:false, note:'आकस्मिक उतार-चढ़ाव, अहंकार से गिरावट — विनम्रता ज़रूरी' },
  17: { auspicious:true,  note:'आध्यात्मिक शक्ति और आत्म-नवीनीकरण — दीर्घकालिक सफलता' },
  18: { auspicious:false, note:'संघर्ष और विरोध — पारिवारिक/व्यावसायिक झगड़ों की संभावना' },
  19: { auspicious:true,  note:'सूर्य जैसा तेज — नेतृत्व और सम्मान दिलाने वाला शुभ अंक' },
  20: { auspicious:false, note:'सतर्कता और प्रतीक्षा — जल्दबाज़ी में लिए निर्णय नुकसान देंगे' },
  21: { auspicious:true,  note:'मुकुट का अंक — उन्नति और मान्यता' },
  22: { auspicious:false, note:'भ्रम और बड़े जोखिम — बहुत सोच-समझकर बड़े कदम उठाएं' },
  23: { auspicious:true,  note:'शाही सहायता — अप्रत्याशित मदद और तेज़ प्रगति' },
  24: { auspicious:true,  note:'सहयोग और प्रेम — साझेदारी में विशेष रूप से शुभ' },
  25: { auspicious:true,  note:'अनुभव से सीख — धीमी पर स्थिर सफलता' },
  26: { auspicious:false, note:'साझेदारी में हानि की चेतावनी — अनुबंध सावधानी से करें' },
  27: { auspicious:true,  note:'आध्यात्मिक अधिकार — प्रबंधन और अनुशासन में सफलता' },
  28: { auspicious:false, note:'बार-बार शुरुआत करनी पड़ सकती है — दृढ़ता ज़रूरी' },
  29: { auspicious:false, note:'अनिश्चितता और विश्वासघात का जोखिम — भरोसा सोच-समझकर करें' },
  30: { auspicious:true,  note:'चिंतन और ज्ञान — विचार-प्रधान कार्यों में सफलता' },
  31: { auspicious:true,  note:'आत्मनिर्भरता — अकेले प्रयासों से सफलता' },
  32: { auspicious:true,  note:'मंत्र-शक्ति जैसा प्रभाव — प्रभावशाली संवाद और नेतृत्व' },
  33: { auspicious:true,  note:'उपचारक ऊर्जा — सेवा और शिक्षा क्षेत्र में विशेष शुभ' },
  34: { auspicious:false, note:'21 जैसा शुभ आधार पर पर अस्थिर निष्पादन — योजना पक्की रखें' },
  35: { auspicious:true,  note:'स्थिर, संतुलित सफलता — व्यापार के लिए अच्छा' },
  36: { auspicious:true,  note:'प्रेम और सामंजस्य — रिश्तों तथा टीम-वर्क में शुभ' },
  37: { auspicious:true,  note:'मित्रता और गठबंधन — साझेदारी के लिए उत्तम' },
  38: { auspicious:false, note:'अकेले संघर्ष करना पड़ सकता है — सहयोग तलाशें' },
  39: { auspicious:true,  note:'सामुदायिक सफलता — बड़े समूह/ग्राहक-आधार वाले कामों में शुभ' },
  40: { auspicious:false, note:'उतार-चढ़ाव भरा — बड़े बदलावों से पहले सलाह लें' },
  41: { auspicious:true,  note:'मौलिक विचार और नेतृत्व — नए उद्यम के लिए अच्छा' },
  42: { auspicious:true,  note:'नेतृत्व में सहयोग — टीम बनाकर काम करने में शुभ' },
  43: { auspicious:false, note:'अस्थिरता और विरोध — दस्तावेज़/अनुबंध में सतर्कता' },
  44: { auspicious:false, note:'बड़ा दबाव और उच्च जोखिम — मानसिक शांति बनाए रखें' },
  45: { auspicious:true,  note:'व्यावहारिक बुद्धि — व्यापार-वाणिज्य के लिए शुभ' },
  46: { auspicious:false, note:'सुविधा-असुविधा दोनों — निर्णय में जल्दबाज़ी न करें' },
  47: { auspicious:true,  note:'गुप्त सहायता — मेहनत का फल देर से पर पक्का मिलता है' },
  48: { auspicious:true,  note:'ज्ञान और सलाह से सफलता — विशेषज्ञता वाले कामों में शुभ' },
  49: { auspicious:false, note:'बाधाओं भरा मार्ग — धैर्य के साथ आगे बढ़ें' },
  50: { auspicious:true,  note:'शक्ति और शासन — बड़े उत्तरदायित्वों में सफलता' },
  51: { auspicious:true,  note:'नेतृत्व और प्रगति — स्वतंत्र निर्णयों में सफलता' },
  52: { auspicious:false, note:'अराजकता से बचें — सुव्यवस्थित योजना बनाकर चलें' },
};

function compoundMeaning(compound) {
  // Numbers below 10 or above 52 rarely occur for real names/brand
  // names in this letter map — fall back to the single-digit meaning.
  if (COMPOUND_MEANING[compound]) return { compound, ...COMPOUND_MEANING[compound] };
  const single = reduce(compound);
  return { compound, auspicious: ![4,8].includes(single), note: `अंक ${single} के गुण लागू होते हैं` };
}

// Numbers considered broadly favourable to pair a name-number against
// a Life Path number (classic friendly/neutral/enemy numerology chart,
// simplified). Used only to steer name-correction suggestions — never
// presented to the user as astrological fact, only as a numerology
// convention.
const FRIENDLY_NUMBERS = {
  1: [1,2,3,5,9], 2: [1,2,7,9], 3: [1,3,6,9], 4: [4,5,6,8],
  5: [1,4,5,6], 6: [3,4,6,9], 7: [2,7], 8: [4,6,8],
  9: [1,3,6,9], 11: [1,2,9], 22: [4,6,8], 33: [3,6,9],
};

// ── Name-correction suggestions ─────────────────────────────────
// Classic Chaldean-style practice: keep the name essentially the
// same (so it's still recognisably the person's/brand's name) but
// try small, natural spelling tweaks — an extra vowel, a doubled
// letter, silent 'h', etc — and see which tweak lands the Chaldean
// compound number on a number that (a) has an auspicious compound
// per COMPOUND_MEANING and (b) is friendly to the reference number
// (Life Path for a person, or the founder/owner's Life Path for a
// business — optional).
//
// This never invents a wildly different name — every candidate is
// generated by ONE small edit to the original spelling, so results
// stay recognisable and pronounceable.
function generateSpellingVariants(name) {
  const variants = new Set();
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/);
  const lastWordIdx = words.length - 1;
  const lastWord = words[lastWordIdx];

  // 1. Append one extra vowel at the end of the last word (very common
  //    real-world numerology-correction technique — e.g. Manish → Manisha,
  //    Rohit → Rohitt is NOT this category, this is vowel-only).
  for (const v of ['a','e','i','o','u']) {
    const w = [...words]; w[lastWordIdx] = lastWord + v;
    variants.add(w.join(' '));
  }
  // 2. Double the last consonant of the last word (e.g. Karan → Karann).
  const lastChar = lastWord.slice(-1);
  if (/[a-zA-Z]/.test(lastChar) && !'aeiouAEIOU'.includes(lastChar)) {
    const w = [...words]; w[lastWordIdx] = lastWord + lastChar;
    variants.add(w.join(' '));
  }
  // 3. Insert a silent 'h' after the first letter of the last word
  //    (e.g. Ravi → Rhavi-style tweaks are common in Chaldean practice).
  if (lastWord.length > 1) {
    const w = [...words]; w[lastWordIdx] = lastWord[0] + 'h' + lastWord.slice(1);
    variants.add(w.join(' '));
  }
  // 4. Drop a doubled letter if present (simplification correction).
  const dedup = lastWord.replace(/(.)\1/g, '$1');
  if (dedup !== lastWord) {
    const w = [...words]; w[lastWordIdx] = dedup;
    variants.add(w.join(' '));
  }

  variants.delete(trimmed);
  return [...variants];
}

// referenceNumber: optional Life Path (or any anchor number) to check
// friendliness against. If omitted, suggestions are ranked purely by
// whether the compound itself is auspicious.
function nameCorrectionSuggestions(fullName, referenceNumber = null) {
  const current = chaldeanName(fullName);
  const currentMeaning = compoundMeaning(current.compound);

  const candidates = generateSpellingVariants(fullName).map(variant => {
    const c = chaldeanName(variant);
    const m = compoundMeaning(c.compound);
    const friendly = referenceNumber ? (FRIENDLY_NUMBERS[referenceNumber] || []).includes(c.single) : null;
    return { spelling: variant, compound: c.compound, single: c.single, meaning: m, friendlyToReference: friendly };
  });

  // Rank: auspicious compound first, then friendly-to-reference, then
  // prefer the smallest edit (shorter string diff = more natural).
  candidates.sort((a, b) => {
    if (a.meaning.auspicious !== b.meaning.auspicious) return a.meaning.auspicious ? -1 : 1;
    if (referenceNumber) {
      if (a.friendlyToReference !== b.friendlyToReference) return a.friendlyToReference ? -1 : 1;
    }
    return 0;
  });

  const needsCorrection = !currentMeaning.auspicious ||
    !!(referenceNumber && !(FRIENDLY_NUMBERS[referenceNumber] || []).includes(current.single));

  return {
    currentSpelling: fullName,
    currentCompound: current.compound,
    currentSingle: current.single,
    currentMeaning,
    needsCorrection,
    topSuggestions: candidates.slice(0, 3),
  };
}

// ── Standalone name numerology — for ANY name: a person's name typed
// on its own, a company name, a shop/brand name, a product name, etc.
// Deliberately independent of any saved kundli/DOB — dob is optional
// and, when given (e.g. founder/owner's DOB for a business), only
// used to check friendliness against that person's Life Path.
function analyzeStandaloneName(name, dob = null) {
  const chal = chaldeanName(name);
  const meaning = compoundMeaning(chal.compound);
  const expr = expressionNumber(name);
  const referenceNumber = dob ? lifePath(dob) : null;
  const friendlyToReference = referenceNumber ? (FRIENDLY_NUMBERS[referenceNumber] || []).includes(chal.single) : null;
  const correction = nameCorrectionSuggestions(name, referenceNumber);

  return {
    name,
    chaldean: { compound: chal.compound, single: chal.single, meaning: NUMBER_MEANING[chal.single] },
    compoundMeaning: meaning,
    pythagoreanExpression: { number: expr, meaning: NUMBER_MEANING[expr] },
    referenceLifePath: referenceNumber,
    friendlyToReference,
    correction,
  };
}

// ── Main export ────────────────────────────────────────────────
export function buildNumerologySheet(fullName, dob) {
  const lp = lifePath(dob);
  const exp = expressionNumber(fullName);
  const su = soulUrge(fullName);
  const pn = personalityNumber(fullName);
  const chal = chaldeanName(fullName);
  const bd = birthDayNumber(dob);
  const loShu = loShuGrid(dob);
  const nameCorrection = nameCorrectionSuggestions(fullName, lp);

  return {
    lifePathNumber:     lp,
    lifePathMeaning:    NUMBER_MEANING[lp],
    expressionNumber:   exp,
    expressionMeaning:  NUMBER_MEANING[exp],
    soulUrgeNumber:     su,
    soulUrgeMeaning:    NUMBER_MEANING[su],
    personalityNumber:  pn,
    personalityMeaning: NUMBER_MEANING[pn],
    birthDayNumber:     bd,
    birthDayMeaning:    NUMBER_MEANING[bd],
    chaldean: {
      compound: chal.compound,
      single:   chal.single,
      meaning:  NUMBER_MEANING[chal.single],
    },
    loShu: {
      grid:    loShu.grid,
      missing: loShu.missing,
      missingMeanings: loShu.missing.map(n => ({ number: n, meaning: MISSING_MEANING[n] })),
    },
    // नाम सुधार — Chaldean compound-number based spelling suggestions,
    // checked for friendliness against this person's Life Path number.
    // See nameCorrectionSuggestions() above for the method.
    nameCorrection,
  };
}

export { nameCorrectionSuggestions, analyzeStandaloneName, compoundMeaning, lifePath };

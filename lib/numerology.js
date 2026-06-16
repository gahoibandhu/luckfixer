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

// ── Main export ────────────────────────────────────────────────
export function buildNumerologySheet(fullName, dob) {
  const lp = lifePath(dob);
  const exp = expressionNumber(fullName);
  const su = soulUrge(fullName);
  const pn = personalityNumber(fullName);
  const chal = chaldeanName(fullName);
  const bd = birthDayNumber(dob);
  const loShu = loShuGrid(dob);

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
  };
}

// lib/past-validation.js
//
// Generates deterministic past validation questions from chart data.
// These are asked BEFORE future predictions to build trust — real
// jyotishis always validate the past first.
//
// Questions are derived from:
// 1. Vimshottari dasha periods (most reliable — exact dates)
// 2. Planetary dignity/combinations (classical indicators)
// 3. Current dasha lord's known themes

const PLANETS_HI = {
  Sun:'सूर्य', Moon:'चंद्र', Mercury:'बुध', Venus:'शुक्र',
  Mars:'मंगल', Jupiter:'बृहस्पति', Saturn:'शनि', Rahu:'राहु', Ketu:'केतु'
};

// Classical dasha period themes — what typically happens
// NOTE: "hard" themes use behavioral/emotional language only — never
// specific diseases (embarrassing, unnecessary, poor UX). Astrology
// can point to life-area challenges without naming ailments.
const DASHA_THEMES = {
  Sun:     { good: 'सरकारी/अधिकारिक काम, पिता से लाभ, प्रतिष्ठा में वृद्धि', hard: 'पिता से मतभेद, करियर में रुकावट, अहंकार के कारण नुकसान' },
  Moon:    { good: 'माता का सुख, यात्राएं, व्यापार में लाभ, मन की शांति', hard: 'माता की परेशानी, मानसिक अशांति, रिश्तों में उतार-चढ़ाव' },
  Mars:    { good: 'भूमि-संपत्ति लाभ, साहस में वृद्धि, भाई-बंधु से सहयोग', hard: 'विवाद और संघर्ष, जल्दबाजी से नुकसान, ऊर्जा का गलत दिशा में खर्च' },
  Mercury: { good: 'व्यापार/शिक्षा में सफलता, संचार कौशल, नई skills', hard: 'निर्णय में भ्रम, रिश्तेदारों से तनाव, योजनाएं अधूरी रहना' },
  Jupiter: { good: 'धन लाभ, विवाह/संतान, शिक्षा/धर्म में उन्नति', hard: 'अति विश्वास से धोखा, बड़ों से मतभेद, अपेक्षाएं पूरी न होना' },
  Venus:   { good: 'विवाह, प्रेम, कला, विलासिता, वाहन सुख, सौंदर्य', hard: 'विवाह में तनाव, धन का अनावश्यक खर्च, रिश्तों में असंतोष' },
  Saturn:  { good: 'कड़ी मेहनत का फल, अनुशासन, दीर्घकालिक सफलता', hard: 'विलंब और रुकावट, एकाकीपन, मेहनत के बावजूद recognition न मिलना' },
  Rahu:    { good: 'अचानक लाभ, विदेश, technology में सफलता, नई दिशा', hard: 'भ्रम और अनिश्चितता, गलत लोगों पर विश्वास, दिशाहीनता' },
  Ketu:    { good: 'आध्यात्मिक विकास, पुराना ऋण मुक्त, गुप्त ज्ञान, वैराग्य', hard: 'वियोग और अकेलापन, पुरानी चीजें छूटना, मन में अस्थिरता' },
};

// Generate questions from dasha history — uses ANTARDASHA level (6mo-2yr
// windows) instead of Mahadasha (7-20yr windows) for precise, falsifiable
// past validation. A jyotishi who says "1985-1992" isn't being specific;
// "early 1991 to mid 1992" is what builds genuine trust.
function getDashaBasedQuestions(vimshottari, dob) {
  const questions = [];
  if (!vimshottari?.mahadashas) return questions;

  const today = new Date();
  const birthYear = parseInt(dob.split('-')[0]);

  // Flatten all antardashas across all mahadashas into one chronological list
  const allAntarPeriods = [];
  for (const md of vimshottari.mahadashas) {
    if (!md.antarDashas) continue;
    for (const ad of md.antarDashas) {
      allAntarPeriods.push({
        mdLord: md.lord, mdLordHi: md.lordHi,
        adLord: ad.lord, adLordHi: ad.lordHi,
        start: new Date(ad.start), end: new Date(ad.end),
        isCurrent: ad.isCurrent,
      });
    }
  }

  // Filter to periods that already happened (start <= today) and after birth
  const relevantPeriods = allAntarPeriods.filter(p =>
    p.start <= today && p.start.getFullYear() >= birthYear - 1
  );

  // Prefer periods with STRONG/distinctive theme combinations (md+ad same
  // planet = doubled effect, or md+ad are classically connected) — these
  // give the sharpest, most memorable validation questions.
  // Otherwise just take the 2 most recent completed periods + current one.
  const sorted = relevantPeriods.slice().sort((a, b) => b.start - a.start);

  const used = new Set();
  for (const p of sorted) {
    if (questions.length >= 2) break;
    const key = `${p.mdLord}-${p.adLord}`;
    if (used.has(key)) continue;
    used.add(key);

    const theme = DASHA_THEMES[p.adLord] || DASHA_THEMES[p.mdLord];
    if (!theme) continue;

    const fmt = (d) => `${HINDI_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const startLabel = fmt(p.start);
    const endLabel = p.end > today ? 'अभी तक' : fmt(p.end);

    if (p.isCurrent) {
      questions.push({
        period: `${p.mdLordHi}-${p.adLordHi} अंतर्दशा (${startLabel} से अभी)`,
        lord: p.adLord,
        question: `${startLabel} से ${p.mdLordHi} महादशा में ${p.adLordHi} की अंतर्दशा चल रही है। इस दौरान ${theme.good} — ऐसा कुछ जीवन में आया? या उलटा ${theme.hard} जैसा महसूस हुआ?`,
        type: 'current_antardasha',
      });
    } else {
      questions.push({
        period: `${p.mdLordHi}-${p.adLordHi} अंतर्दशा (${startLabel} – ${endLabel})`,
        lord: p.adLord,
        question: `${startLabel} से ${endLabel} के बीच (${p.mdLordHi} महादशा में ${p.adLordHi} अंतर्दशा) — ${theme.good} जैसा कुछ हुआ? या ${theme.hard} जैसा अनुभव रहा?`,
        type: 'past_antardasha',
      });
    }
  }

  return questions;
}

const HINDI_MONTHS = ['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'];

// Generate questions from planetary positions
function getPlanetaryQuestions(factSheet) {
  const questions = [];
  const planets = factSheet?.planets || [];

  // Saturn in strong position = discipline/delay themes
  const saturn = planets.find(p => p.name === 'Saturn');
  if (saturn?.dignity === 'exalted' || saturn?.vargottama) {
    questions.push({
      lord: 'Saturn',
      question: 'आपके chart में शनि बहुत शक्तिशाली है। क्या आपको जीवन में सफलता देर से मिली है — मेहनत ज्यादा, recognition कम?',
      type: 'planetary',
    });
  }

  // Debilitated planet = struggle in that area
  const debilitated = planets.find(p => p.dignity === 'debilitated' && !['Rahu','Ketu'].includes(p.name));
  if (debilitated) {
    const areaMap = {
      Sun: 'करियर और पिता के रिश्ते में',
      Moon: 'मानसिक शांति और माता के विषय में',
      Mars: 'जमीन-जायदाद या भाइयों के मामले में',
      Mercury: 'व्यापार या शिक्षा में',
      Jupiter: 'धन या संतान के क्षेत्र में',
      Venus: 'विवाह या प्रेम जीवन में',
      Saturn: 'नौकरी या दीर्घकालिक योजनाओं में',
    };
    const area = areaMap[debilitated.name] || 'जीवन के एक क्षेत्र में';
    questions.push({
      lord: debilitated.name,
      question: `${debilitated.nameHi} नीच राशि में है, जो ${area} कठिनाइयां दर्शाता है। क्या आपने इस क्षेत्र में संघर्ष महसूस किया है?`,
      type: 'planetary',
    });
  }

  // Multiple exalted planets = multi-talented but scattered
  const exalted = planets.filter(p => p.dignity === 'exalted');
  if (exalted.length >= 2) {
    questions.push({
      lord: 'multiple',
      question: `आपके chart में ${exalted.map(p => p.nameHi).join(' और ')} उच्च के हैं — यह असाधारण प्रतिभा का संकेत है। क्या आपको एक से ज्यादा क्षेत्रों में रुचि और सफलता मिली है?`,
      type: 'planetary',
    });
  }

  return questions.slice(0, 1); // Max 1 planetary question
}

// ── Main export ────────────────────────────────────────────────
export function generatePastValidationQuestions(factSheet, vimshottari, dob) {
  const dashaQ  = getDashaBasedQuestions(vimshottari, dob);
  const planetQ = getPlanetaryQuestions(factSheet);

  // Combine: max 2 questions total
  const all = [...dashaQ, ...planetQ].slice(0, 2);

  if (all.length === 0) return null;

  // Format as a single greeting addition
  return {
    questions: all,
    greeting: formatGreeting(all),
  };
}

function formatGreeting(questions) {
  if (questions.length === 0) return '';

  let text = '\n\n**आपकी कुंडली देखकर मुझे कुछ पूछना है — पहले past validate करते हैं:**\n\n';

  questions.forEach((q, i) => {
    text += `**${i+1}.** ${q.question}\n\n`;
  });

  text += 'आपके जवाब के बाद मैं आपको सटीक भविष्यवाणी दूंगा। 🙏';
  return text;
}

export { DASHA_THEMES };

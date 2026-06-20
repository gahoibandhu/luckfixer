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
const DASHA_THEMES = {
  Sun:     { good: 'सरकारी/अधिकारिक काम, पिता से लाभ, प्रतिष्ठा', hard: 'पिता की सेहत, नेत्र समस्या, अहंकार से नुकसान' },
  Moon:    { good: 'माता का सुख, यात्राएं, व्यापार में लाभ', hard: 'माता की परेशानी, मानसिक अशांति, रिश्तों में उतार-चढ़ाव' },
  Mars:    { good: 'भूमि-संपत्ति लाभ, साहस में वृद्धि, भाई-बंधु से सहयोग', hard: 'दुर्घटना का भय, विवाद, रक्त विकार' },
  Mercury: { good: 'व्यापार/शिक्षा में सफलता, संचार कौशल, नई skills', hard: 'निर्णय में भ्रम, त्वचा समस्या, रिश्तेदारों से तनाव' },
  Jupiter: { good: 'धन लाभ, विवाह/संतान, शिक्षा/धर्म में उन्नति', hard: 'अति विश्वास से नुकसान, यकृत समस्या, बड़ों से मतभेद' },
  Venus:   { good: 'विवाह, प्रेम, कला, विलासिता, वाहन', hard: 'विवाह में तनाव, मूत्र रोग, धन का अपव्यय' },
  Saturn:  { good: 'कड़ी मेहनत का फल, अनुशासन, दीर्घकालिक सफलता', hard: 'विलंब, अवसाद, नौकरी में बाधा, पुरानी बीमारी' },
  Rahu:    { good: 'अचानक लाभ, विदेश, technology में सफलता', hard: 'भ्रम, धोखा, अजीब बीमारी, पारिवारिक कलह' },
  Ketu:    { good: 'आध्यात्मिक विकास, पुराना ऋण मुक्त, गुप्त ज्ञान', hard: 'वियोग, नुकसान, स्वास्थ्य चिंता, दिशाहीनता' },
};

// Generate questions from dasha history
function getDashaBasedQuestions(vimshottari, dob) {
  const questions = [];
  if (!vimshottari?.mahadashas) return questions;

  const today = new Date();
  const birthYear = parseInt(dob.split('-')[0]);

  // Find dashas that ALREADY COMPLETED or are in progress
  for (const md of vimshottari.mahadashas) {
    const mdStart = new Date(md.start);
    const mdEnd   = new Date(md.end);

    // Skip if this dasha started in future
    if (mdStart > today) continue;

    // Skip if this dasha started before user was born (sometimes happens with fractional elapsed)
    if (mdStart.getFullYear() < birthYear - 1) continue;

    const theme = DASHA_THEMES[md.lord];
    if (!theme) continue;

    const startYear = mdStart.getFullYear();
    const endYear   = mdEnd > today ? 'अभी' : mdEnd.getFullYear().toString();
    const isActive  = md.isCurrent;

    if (isActive) {
      // Current dasha — ask about recent themes
      questions.push({
        period: `${md.lordHi} महादशा (${startYear} से अभी तक)`,
        lord: md.lord,
        question: `${md.lordHi} महादशा ${startYear} से चल रही है। इस दौरान क्या आपने अनुभव किया — ${theme.good} — इनमें से कुछ हुआ क्या?`,
        followup: `या फिर ${theme.hard} — ऐसा कुछ?`,
        type: 'current_dasha',
      });
    } else {
      // Past dasha — ask about specific period
      questions.push({
        period: `${md.lordHi} महादशा (${startYear}–${endYear})`,
        lord: md.lord,
        question: `${startYear} से ${endYear} के बीच ${md.lordHi} दशा थी। उस समय ${theme.good} — क्या ऐसा कुछ हुआ था?`,
        followup: `या ${theme.hard} — कुछ ऐसा?`,
        type: 'past_dasha',
      });
    }

    // Max 2 questions from dasha (don't overwhelm)
    if (questions.length >= 2) break;
  }

  return questions;
}

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
    text += `**${i+1}.** ${q.question}`;
    if (q.followup) text += `\n   _(${q.followup})_`;
    text += '\n\n';
  });

  text += 'आपके जवाब के बाद मैं आपको सटीक भविष्यवाणी दूंगा। 🙏';
  return text;
}

export { DASHA_THEMES };

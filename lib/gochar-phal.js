// lib/gochar-phal.js
//
// GOCHAR PHAL — chronological transit-report timeline, the format
// popularized by most Hindi astrology apps: "Mars is in your Nth house
// from [date] to [date], here's what that classically means."
//
// Scope (matches what real apps show, and what's classically standard):
// only Mars, Jupiter, Saturn — the three "slow enough to matter for a
// date-range report" planets. Sun/Moon/Mercury/Venus move too fast
// (days to weeks per sign) to be meaningful "period" entries; Rahu/Ketu
// could be added later but aren't in this first version.
//
// House is counted from the natal MOON sign (Chandra Rashi) — the
// classical/traditional basis for Gochar Phal, same convention already
// used in lib/transit.js for Sade Sati.

import { getSlowPlanetSigns } from './astro-facts.js';

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const PLANETS_HI = { Mars:'मंगल', Jupiter:'बृहस्पति', Saturn:'शनि' };

// ── Classical effects text: Mars/Jupiter/Saturn × 12 houses-from-Moon ──
// Standard Phaladeepika-style Gochar Phal content — this specific genre
// of text is extremely standardized across Hindi astrology books/apps
// (identical in substance across dozens of published sources), so
// confidence in accuracy here is high, unlike novel/unverifiable claims.
const GOCHAR_TEXTS = {
  Mars: {
    1: 'इस अवधि में आपकी वृत्ति साहसी और ऊर्जावान रहेगी, लेकिन गुस्सा और जल्दबाज़ी पर नियंत्रण रखना ज़रूरी है। शारीरिक गतिविधि बढ़ेगी। छोटी चोट या दुर्घटना से सावधान रहें।',
    2: 'वाणी में कठोरता आ सकती है — बोलने से पहले सोचें, परिवार में विवाद से बचें। धन के मामलों में जल्दबाज़ी में निर्णय न लें। खर्च बढ़ सकते हैं।',
    3: 'यह मंगल के लिए अनुकूल स्थान है — साहस, पराक्रम और भाई-बहनों से सहयोग मिलेगा। छोटी यात्राएं सफल रहेंगी। नए कार्य शुरू करने के लिए अच्छा समय है।',
    4: 'घरेलू शांति में कुछ उथल-पुथल संभव है। माता के स्वास्थ्य या घर से जुड़े मामलों में ध्यान दें। संपत्ति/वाहन से जुड़े विवादों में सावधानी रखें।',
    5: 'निर्णय लेने में जल्दबाज़ी से बचें, विशेषकर संतान या पढ़ाई से जुड़े मामलों में। रचनात्मक ऊर्जा तो बढ़ेगी, पर धैर्य से काम लें।',
    6: 'यह मंगल के लिए बहुत अनुकूल स्थान है — प्रतिस्पर्धा, कानूनी मामलों और शत्रुओं पर विजय मिलती है। स्वास्थ्य पर मेहनत का अच्छा असर, पर छोटी बीमारियों से सावधान रहें।',
    7: 'साझेदारी और वैवाहिक जीवन में तनाव या मतभेद हो सकते हैं — बोलचाल में संयम रखें। व्यापारिक साझेदारों से मतभेद संभव।',
    8: 'यह समय सावधानी का है — अचानक खर्च, दुर्घटना या स्वास्थ्य संबंधी परेशानी हो सकती है। बड़े जोखिम लेने से बचें, नियमित जांच कराएं।',
    9: 'भाग्य में मेहनत का साथ मिलेगा, पर बड़े निर्णय बिना सोचे न लें। पिता या गुरु से जुड़े मामलों में धैर्य रखें। लंबी यात्राओं में सावधानी बरतें।',
    10: 'करियर में यह उत्तम समय है — साहसिक निर्णय और कड़ी मेहनत से सफलता मिलेगी। नेतृत्व के अवसर मिल सकते हैं, पर अधिकारियों से टकराव से बचें।',
    11: 'यह मंगल के लिए बहुत शुभ स्थान है — आय में वृद्धि, इच्छाओं की पूर्ति और मित्रों से लाभ मिलता है। नए स्रोतों से धन आने के योग हैं।',
    12: 'खर्च बढ़ सकते हैं, नींद में खलल या मानसिक बेचैनी हो सकती है। विदेश यात्रा के योग बनते हैं, लेकिन जोखिम भरे कार्यों से बचें।',
  },
  Jupiter: {
    1: 'आत्मविश्वास, ज्ञान और सम्मान बढ़ेगा। स्वास्थ्य और व्यक्तित्व में निखार आएगा। यह आत्म-विकास के लिए बहुत अच्छा समय है।',
    2: 'धन और वाणी दोनों में मिठास आएगी — बचत बढ़ेगी, परिवार में सुख-शांति रहेगी। भोजन/स्वाद से जुड़ी नई रुचियां विकसित हो सकती हैं।',
    3: 'साहस तो बढ़ेगा, पर बृहस्पति के लिए यह सामान्य स्थान है — भाई-बहनों से रिश्ते बेहतर होंगे, थोड़ी मेहनत से अच्छे परिणाम मिलेंगे।',
    4: 'घर, वाहन या संपत्ति से जुड़े शुभ समाचार मिल सकते हैं। माता का स्वास्थ्य और सुख अच्छा रहेगा। मानसिक शांति बढ़ेगी।',
    5: 'यह गुरु के लिए अत्यंत शुभ स्थान है — संतान सुख, पढ़ाई में सफलता, रचनात्मकता और शुभ समाचार के प्रबल योग। नई योजनाएं फलदायी होंगी।',
    6: 'शत्रुओं और प्रतिस्पर्धियों पर विजय मिलेगी, कानूनी मामलों में सफलता के योग। स्वास्थ्य पर ध्यान दें, थोड़ी सुस्ती महसूस हो सकती है।',
    7: 'विवाह और साझेदारी के लिए यह बहुत शुभ समय है — जीवनसाथी से तालमेल बेहतर होगा, व्यापारिक साझेदारी लाभदायक रहेगी।',
    8: 'अचानक लाभ (जैसे विरासत या बीमा) के योग बन सकते हैं, पर स्वास्थ्य में सुस्ती या आलस्य महसूस हो सकता है। गहरे अध्ययन/शोध के लिए अच्छा समय।',
    9: 'यह बृहस्पति के लिए सबसे शुभ स्थान है — भाग्योदय, धार्मिक यात्रा, गुरु/पिता से आशीर्वाद, और बड़ी सफलता के प्रबल योग।',
    10: 'करियर में उन्नति, सम्मान और नई ज़िम्मेदारियां मिल सकती हैं। समाज में प्रतिष्ठा बढ़ेगी। बड़े फैसले इस दौर में शुभ रहेंगे।',
    11: 'आय में वृद्धि, इच्छाओं की पूर्ति और मित्रों से लाभ — यह भी गुरु के लिए बहुत अनुकूल स्थान है। पुराने प्रयासों का फल मिलेगा।',
    12: 'खर्च बढ़ सकते हैं, विदेश यात्रा या आध्यात्मिक रुझान बढ़ेगा। दान-पुण्य और सेवा कार्यों के लिए अच्छा समय।',
  },
  Saturn: {
    1: 'यह साढ़े साती/ढैय्या जैसा भारी दौर हो सकता है — धैर्य और अनुशासन की परीक्षा। शरीर और मन दोनों पर मेहनत का बोझ महसूस हो सकता है, पर दीर्घकालिक मजबूती मिलेगी।',
    2: 'धन और वाणी में सतर्कता ज़रूरी — खर्च पर नियंत्रण रखें, परिवार में बोलचाल में संयम बरतें। बचत की आदत मज़बूत होगी।',
    3: 'यह शनि के लिए अनुकूल स्थान है — मेहनत और अनुशासन से बड़ी सफलता मिलती है। भाई-बहनों का सहयोग मिलेगा, साहस बढ़ेगा।',
    4: 'घरेलू सुख-शांति में कमी या माता के स्वास्थ्य में चुनौती संभव। संपत्ति के मामलों में देरी हो सकती है — धैर्य रखें, जल्दबाज़ी न करें।',
    5: 'पढ़ाई या संतान से जुड़े मामलों में मेहनत ज़्यादा लगेगी, पर परिणाम विलंब से मिलेंगे। रचनात्मक कार्यों में गंभीरता आएगी।',
    6: 'यह शनि के लिए बहुत अनुकूल स्थान है — शत्रुओं और प्रतिस्पर्धा पर विजय, कड़ी मेहनत से करियर में मजबूती। स्वास्थ्य पर नियमित ध्यान दें।',
    7: 'विवाह/साझेदारी में धैर्य और ज़िम्मेदारी की मांग होगी — रिश्तों में गंभीरता और परिपक्वता आएगी, पर मतभेद से बचने के लिए संवाद ज़रूरी।',
    8: 'यह सबसे सावधानी वाला गोचर माना जाता है — स्वास्थ्य, मानसिक स्थिरता और अनपेक्षित परिस्थितियों पर विशेष ध्यान दें। नियमित जांच और आराम ज़रूरी।',
    9: 'भाग्य और पिता/गुरु से जुड़े मामलों में धैर्य चाहिए — मेहनत का फल देर से मिलेगा पर मिलेगा ज़रूर। परंपरा और अनुशासन में स्थिरता आएगी।',
    10: 'करियर में यह बहुत महत्वपूर्ण दौर है — कड़ी मेहनत, ज़िम्मेदारी और अनुशासन से बड़ी और स्थायी सफलता मिलती है, भले ही रास्ता धीमा लगे।',
    11: 'आय में स्थिर, धीमी पर पक्की वृद्धि — पुराने प्रयासों का फल मिलेगा। मित्रों के साथ संबंधों में गंभीरता आएगी।',
    12: 'खर्च, अकेलापन या मानसिक थकान महसूस हो सकती है। आराम, ध्यान और आध्यात्मिक अभ्यास के लिए अच्छा समय — जल्दबाज़ी में बड़े फैसले न लें।',
  },
};

const PLANET_YEARS_PER_SIGN = { Mars: 45/365.25, Jupiter: 1, Saturn: 2.5 }; // rough duration, used only to pick a sensible scan step

// Finds the house-from-Moon for a given planet sign
function houseFromMoon(planetSign, moonSign) {
  const mi = SIGNS.indexOf(moonSign);
  const pi = SIGNS.indexOf(planetSign);
  if (mi === -1 || pi === -1) return null;
  return ((pi - mi + 12) % 12) + 1;
}

// ── Main builder: scans from `yearsBack` to `yearsForward` around today,
// finds every sign-change boundary for Mars/Jupiter/Saturn, and returns
// a chronological list of {planet, house, start, end, text} periods.
export function buildGocharPhalTimeline(moonSign, ayanamsa = 'lahiri', yearsBack = 2, yearsForward = 3) {
  if (!moonSign) return [];

  const today = new Date();
  const scanStart = new Date(today);
  scanStart.setFullYear(scanStart.getFullYear() - yearsBack);
  const scanEnd = new Date(today);
  scanEnd.setFullYear(scanEnd.getFullYear() + yearsForward);

  const timeline = { Mars: [], Jupiter: [], Saturn: [] };

  for (const planet of ['Mars', 'Jupiter', 'Saturn']) {
    // Step size: sample often enough to reliably catch every sign change
    // (Mars is the fastest at ~45 days/sign, so a 5-day step is safe
    // for all three without being wastefully fine-grained for Saturn).
    const stepDays = 5;
    let cursor = new Date(scanStart);
    let prevSign = null;
    let periodStart = new Date(scanStart);

    while (cursor <= scanEnd) {
      const signs = getSlowPlanetSigns(cursor, ayanamsa);
      const sign = signs[planet].sign;

      if (prevSign === null) {
        prevSign = sign;
        periodStart = new Date(cursor);
      } else if (sign !== prevSign) {
        // Sign changed somewhere in the last `stepDays` — binary-search
        // for the more exact boundary date (keeps date ranges from
        // being off by several days, without needing a daily scan).
        let lo = new Date(cursor.getTime() - stepDays * 24 * 60 * 60 * 1000);
        let hi = new Date(cursor);
        for (let i = 0; i < 6; i++) {
          const mid = new Date((lo.getTime() + hi.getTime()) / 2);
          const midSign = getSlowPlanetSigns(mid, ayanamsa)[planet].sign;
          if (midSign === prevSign) lo = mid; else hi = mid;
        }
        const house = houseFromMoon(prevSign, moonSign);
        timeline[planet].push({
          planet,
          planetHi: PLANETS_HI[planet],
          sign: prevSign,
          house,
          start: periodStart.toISOString().slice(0, 10),
          end: hi.toISOString().slice(0, 10),
          text: GOCHAR_TEXTS[planet]?.[house] || '',
        });
        periodStart = new Date(hi);
        prevSign = sign;
      }
      cursor = new Date(cursor.getTime() + stepDays * 24 * 60 * 60 * 1000);
    }
    // Close out the final open period at scan end
    if (prevSign !== null) {
      const house = houseFromMoon(prevSign, moonSign);
      timeline[planet].push({
        planet,
        planetHi: PLANETS_HI[planet],
        sign: prevSign,
        house,
        start: periodStart.toISOString().slice(0, 10),
        end: scanEnd.toISOString().slice(0, 10),
        text: GOCHAR_TEXTS[planet]?.[house] || '',
      });
    }
  }

  // Merge all three planets' periods into one chronological list
  const merged = [...timeline.Mars, ...timeline.Jupiter, ...timeline.Saturn];
  merged.sort((a, b) => new Date(a.start) - new Date(b.start));
  return merged;
}

export function formatGocharPhalForPrompt(timeline) {
  if (!timeline || timeline.length === 0) return '';
  const today = new Date().toISOString().slice(0, 10);
  const current = timeline.filter(p => p.start <= today && p.end >= today);
  const upcoming = timeline.filter(p => p.start > today).slice(0, 3);

  let out = '\nGOCHAR PHAL (transit timeline — real calculated periods, not guesses):';
  if (current.length) out += `\nअभी सक्रिय: ${current.map(p => `${p.planetHi} ${p.house}वें भाव में (${p.start} से ${p.end})`).join('; ')}`;
  if (upcoming.length) out += `\nआगे आने वाले: ${upcoming.map(p => `${p.planetHi} ${p.house}वें भाव में ${p.start} से`).join('; ')}`;
  return out;
}

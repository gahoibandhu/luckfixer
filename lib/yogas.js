// lib/yogas.js
//
// CLASSICAL YOGA DETECTION ENGINE
//
// Rajyoga, Dhana Yoga, Panch Mahapurusha, Viparita Raja Yoga,
// Nabhasa Yogas, and other major classical combinations.
// All deterministic — no AI involved in detection.
//
// Each yoga has: name (Hindi), classical source, strength rating,
// life-area affected, and what to look for to validate past.

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGNS_HI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];

// ── House lord helpers ──────────────────────────────────────
const KENDRA  = [1, 4, 7, 10]; // quadrants
const TRIKONA = [1, 5, 9];     // trines
const DUSTHANA = [6, 8, 12];   // malefic houses
const UPACHAYA = [3, 6, 10, 11]; // growth houses

function getLord(sign) {
  const LORDS = {
    Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
    Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
    Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
  };
  return LORDS[sign];
}

function getHouse(planets, planetName, lagnaSign) {
  const p = planets.find(x => x.name === planetName);
  if (!p || !lagnaSign) return null;
  const li = SIGNS.indexOf(lagnaSign);
  const pi = SIGNS.indexOf(p.sign);
  if (li === -1 || pi === -1) return null;
  return ((pi - li + 12) % 12) + 1;
}

function planetInHouses(planets, planetName, lagnaSign, houses) {
  const h = getHouse(planets, planetName, lagnaSign);
  return h !== null && houses.includes(h);
}

function getPlanet(planets, name) {
  return planets.find(p => p.name === name);
}

function isExalted(p) { return p?.dignity === 'exalted'; }
function isDebilitated(p) { return p?.dignity === 'debilitated'; }
function isOwnSign(p) { return p?.dignity === 'own sign'; }
function isFriendlySign(p) { return p?.dignity === 'friendly'; }
function isStrong(p) { return p && (isExalted(p) || isOwnSign(p) || isFriendlySign(p)); }
function isWeak(p) { return p && (isDebilitated(p)); }

// ── Main yoga detection ────────────────────────────────────
export function detectYogas(planets, lagnaSign, houseLords, d9Chart) {
  if (!planets || !lagnaSign) return [];
  const yogas = [];

  const lagna = lagnaSign;
  const li = SIGNS.indexOf(lagna);

  // Helper: sign of a house
  const houseSign = (h) => SIGNS[(li + h - 1) % 12];
  const houseLord = (h) => getLord(houseSign(h));
  const getPlanetHouse = (name) => getHouse(planets, name, lagna);
  const inKendra = (name) => planetInHouses(planets, name, lagna, KENDRA);
  const inTrikona = (name) => planetInHouses(planets, name, lagna, TRIKONA);
  const inDusthana = (name) => planetInHouses(planets, name, lagna, DUSTHANA);

  // ── 1. PANCH MAHAPURUSHA YOGA ──────────────────────────
  // When a non-luminous planet is in its own sign or exaltation in a Kendra
  const MAHAPURUSHA = [
    { planet:'Mars',    name:'रूचक योग',    quality:'साहसी, सैनिक, भूमि-संपत्ति से धन, जन-नेतृत्व', source:'BPHS 25.35' },
    { planet:'Mercury', name:'भद्र योग',    quality:'बुद्धिमान, वाग्मी, व्यापार में सफल, गणित-लेखन में निपुण', source:'BPHS 25.36' },
    { planet:'Jupiter', name:'हंस योग',     quality:'धार्मिक, विद्वान, न्यायप्रिय, उच्च पद प्राप्ति', source:'BPHS 25.37' },
    { planet:'Venus',   name:'मालव्य योग',  quality:'सौम्य, कला-संगीत प्रेमी, विवाह-सुख, भौतिक समृद्धि', source:'BPHS 25.38' },
    { planet:'Saturn',  name:'शश योग',      quality:'अनुशासित, नेता, गुप्त कार्य में दक्ष, दीर्घायु', source:'BPHS 25.39' },
  ];

  for (const m of MAHAPURUSHA) {
    const p = getPlanet(planets, m.planet);
    if (!p) continue;
    if (inKendra(m.planet) && (isExalted(p) || isOwnSign(p))) {
      yogas.push({
        name: m.name,
        category: 'panch_mahapurusha',
        strength: 'high',
        lifeArea: 'व्यक्तित्व और समग्र जीवन',
        description: `${m.name} (${m.planet} केंद्र में ${p.dignityHi} — ${p.signHi}): ${m.quality}`,
        source: m.source,
        planet: m.planet,
        validationQ: `क्या आपको अपने क्षेत्र में विशेष प्रतिभा या मान्यता मिली है?`,
      });
    }
  }

  // ── 2. RAJYOGA — Kendra-Trikona lord conjunction/aspect ──
  // Most powerful: lord of kendra and trikona together
  const kendraLords  = [...new Set(KENDRA.map(h => houseLord(h)).filter(Boolean))];
  const trikonaLords = [...new Set(TRIKONA.map(h => houseLord(h)).filter(Boolean))];

  for (const kl of kendraLords) {
    for (const tl of trikonaLords) {
      if (kl === tl) continue; // same planet = different rule
      const kp = getPlanet(planets, kl);
      const tp = getPlanet(planets, tl);
      if (!kp || !tp) continue;

      // Conjunction check (same sign)
      if (kp.sign === tp.sign) {
        const house = getPlanetHouse(kl);
        if (house && !DUSTHANA.includes(house)) {
          yogas.push({
            name: 'राजयोग',
            category: 'rajyoga',
            strength: isStrong(kp) || isStrong(tp) ? 'high' : 'medium',
            lifeArea: 'करियर, सम्मान, सत्ता',
            description: `राजयोग: ${SIGNS_HI[SIGNS.indexOf(kp.sign)]} में ${kl === 'Sun' ? 'सूर्य' : kl === 'Moon' ? 'चंद्र' : kl === 'Mars' ? 'मंगल' : kl === 'Mercury' ? 'बुध' : kl === 'Jupiter' ? 'बृहस्पति' : kl === 'Venus' ? 'शुक्र' : 'शनि'} (${KENDRA.filter(h=>houseLord(h)===kl).join('/')}-भाव स्वामी) और ${tl} (${TRIKONA.filter(h=>houseLord(h)===tl).join('/')}-भाव स्वामी) साथ — उच्च पद, मान-सम्मान, जीवन में सत्ता प्राप्ति`,
            source: 'BPHS 39.1',
            validationQ: 'क्या आपको जीवन में किसी क्षेत्र में विशेष पद या मान्यता मिली है?',
          });
        }
      }
    }
  }

  // ── 3. DHANA YOGA (Wealth Combinations) ──────────────────
  const lord2 = houseLord(2);  // wealth house lord
  const lord11 = houseLord(11); // gains house lord
  const lord5 = houseLord(5);  // luck/speculation lord
  const lord9 = houseLord(9);  // fortune lord

  const p2  = getPlanet(planets, lord2);
  const p11 = getPlanet(planets, lord11);
  const p5  = getPlanet(planets, lord5);
  const p9  = getPlanet(planets, lord9);

  // 2nd and 11th lords together
  if (lord2 && lord11 && lord2 !== lord11 && p2 && p11 && p2.sign === p11.sign) {
    yogas.push({
      name: 'धन योग',
      category: 'dhana',
      strength: isStrong(p2) || isStrong(p11) ? 'high' : 'medium',
      lifeArea: 'धन और आय',
      description: `धन योग: द्वितीय और एकादश भाव के स्वामी एक साथ — धन संचय, आय में वृद्धि, जीवन में समृद्धि`,
      source: 'Brihat Jataka 14',
      validationQ: 'क्या आपके जीवन में धन या आय का कोई विशेष स्रोत बना है?',
    });
  }

  // 5th and 9th lords together (Lakshmi Yoga base)
  if (lord5 && lord9 && lord5 !== lord9 && p5 && p9 && p5.sign === p9.sign) {
    const inShubh = !inDusthana(lord5) && !inDusthana(lord9);
    yogas.push({
      name: 'लक्ष्मी योग',
      category: 'dhana',
      strength: inShubh ? 'high' : 'medium',
      lifeArea: 'भाग्य और धन',
      description: `लक्ष्मी योग: पंचम और नवम भाव स्वामी एक साथ — भाग्योदय, अचानक लाभ, धार्मिक कार्यों से समृद्धि`,
      source: 'Phaladeepika 6.24',
      validationQ: 'क्या आपको कभी अचानक या अप्रत्याशित धन-लाभ हुआ है?',
    });
  }

  // ── 4. VIPARITA RAJA YOGA ─────────────────────────────────
  // Lord of dusthana in another dusthana — bad becomes good
  const dusthanaLords = DUSTHANA.map(h => ({ house: h, lord: houseLord(h) }));
  for (const { house: h1, lord: l1 } of dusthanaLords) {
    if (!l1) continue;
    const p1 = getPlanet(planets, l1);
    if (!p1) continue;
    const currentHouse = getPlanetHouse(l1);
    if (currentHouse && DUSTHANA.includes(currentHouse) && currentHouse !== h1) {
      const yogaNames = { 6:'हर्ष', 8:'सरल', 12:'विमल' };
      yogas.push({
        name: `${yogaNames[h1] || 'विपरीत'} राजयोग`,
        category: 'viparita',
        strength: 'medium',
        lifeArea: 'संकट से सफलता, शत्रु-पराजय',
        description: `विपरीत राजयोग (${yogaNames[h1]}): ${h1}वें भाव का स्वामी ${currentHouse}वें भाव में — शत्रुओं की पराजय, संकट के बाद उत्थान, छुपी हुई शक्ति`,
        source: 'BPHS 40.3',
        validationQ: 'क्या आपने किसी कठिन परिस्थिति से निकलकर सफलता पाई है?',
      });
    }
  }

  // ── 5. GAJA-KESARI YOGA ───────────────────────────────────
  // Jupiter in kendra from Moon — most common auspicious yoga
  const moon = getPlanet(planets, 'Moon');
  const jupiter = getPlanet(planets, 'Jupiter');
  if (moon && jupiter) {
    const moonSign = moon.sign;
    const jupSign = jupiter.sign;
    const mi = SIGNS.indexOf(moonSign);
    const ji = SIGNS.indexOf(jupSign);
    if (mi !== -1 && ji !== -1) {
      const relHouse = ((ji - mi + 12) % 12) + 1;
      if (KENDRA.includes(relHouse)) {
        yogas.push({
          name: 'गज-केसरी योग',
          category: 'special',
          strength: isStrong(jupiter) ? 'high' : 'medium',
          lifeArea: 'बुद्धि, यश और समृद्धि',
          description: `गज-केसरी योग: बृहस्पति चंद्रमा से ${relHouse}वें (केंद्र) में — उच्च बुद्धि, यश, समाज में सम्मान, संकट से सुरक्षा`,
          source: 'Mansagari 4.1',
          validationQ: 'क्या लोग आपकी बुद्धि या मार्गदर्शन के लिए विशेष रूप से आपके पास आते हैं?',
        });
      }
    }
  }

  // ── 6. BUDH-ADITYA YOGA ──────────────────────────────────
  // Sun and Mercury together (within 14°)
  const sun = getPlanet(planets, 'Sun');
  const mercury = getPlanet(planets, 'Mercury');
  if (sun && mercury && sun.sign === mercury.sign) {
    const diff = Math.abs(sun.degree - mercury.degree);
    const orb = Math.min(diff, 360-diff);
    if (orb <= 14) {
      yogas.push({
        name: 'बुध-आदित्य योग',
        category: 'special',
        strength: !isWeak(mercury) ? 'high' : 'low',
        lifeArea: 'बुद्धि, संचार, व्यापार',
        description: `बुध-आदित्य योग: सूर्य और बुध ${SIGNS_HI[SIGNS.indexOf(sun.sign)]} में साथ (${orb.toFixed(1)}° अंतर) — तीव्र बुद्धि, वाणी-कौशल, लेखन-व्यापार में सफलता`,
        source: 'Jataka Parijata',
        validationQ: 'क्या आप संचार, लेखन, या व्यापार में विशेष रूप से अच्छे हैं?',
      });
    }
  }

  // ── 7. CHANDRA-MANGAL YOGA ───────────────────────────────
  // Moon and Mars together or aspecting — wealth through hard work
  const mars = getPlanet(planets, 'Mars');
  if (moon && mars && moon.sign === mars.sign) {
    yogas.push({
      name: 'चंद्र-मंगल योग',
      category: 'dhana',
      strength: 'medium',
      lifeArea: 'धन और साहस',
      description: `चंद्र-मंगल योग: चंद्र और मंगल ${SIGNS_HI[SIGNS.indexOf(moon.sign)]} में साथ — परिश्रम से धन, भावनात्मक साहस, व्यापार में सफलता`,
      source: 'Brihat Parashara Hora',
      validationQ: 'क्या आप मेहनत से पैसा कमाते हैं और जल्दी निर्णय लेते हैं?',
    });
  }

  // ── 8. SARASWATI YOGA ────────────────────────────────────
  // Jupiter, Venus, Mercury all in kendras/trikonas
  const jInKT = inKendra('Jupiter') || inTrikona('Jupiter');
  const vInKT = inKendra('Venus') || inTrikona('Venus');
  const mInKT = inKendra('Mercury') || inTrikona('Mercury');
  if (jInKT && vInKT && mInKT && isStrong(jupiter)) {
    yogas.push({
      name: 'सरस्वती योग',
      category: 'special',
      strength: 'high',
      lifeArea: 'विद्या, कला, वाणी',
      description: `सरस्वती योग: बृहस्पति, शुक्र और बुध तीनों केंद्र-त्रिकोण में — असाधारण विद्वत्ता, कला-कौशल, लेखन-भाषण में ख्याति`,
      source: 'Phaladeepika 7.12',
      validationQ: 'क्या आपको पढ़ाई-लिखाई या किसी कला में विशेष प्रतिभा मिली है?',
    });
  }

  // ── 9. KEMADRUMA YOGA (negative — warns AI to be careful) ─
  // Moon with no planets in 2nd or 12th from it
  if (moon) {
    const moonIdx = SIGNS.indexOf(moon.sign);
    const adjSigns = [
      SIGNS[(moonIdx + 1) % 12],
      SIGNS[(moonIdx - 1 + 12) % 12],
    ];
    const hasAdjPlanet = planets.some(p =>
      p.name !== 'Moon' && p.name !== 'Rahu' && p.name !== 'Ketu'
      && adjSigns.includes(p.sign)
    );
    if (!hasAdjPlanet) {
      yogas.push({
        name: 'केमद्रुम योग',
        category: 'challenging',
        strength: 'medium',
        lifeArea: 'मानसिक स्थिरता और सहयोग',
        description: `केमद्रुम योग: चंद्रमा के दोनों तरफ कोई ग्रह नहीं — अकेलापन, मानसिक उतार-चढ़ाव, सहयोग की कमी; हालांकि, यह मजबूत लग्न से नष्ट होता है`,
        source: 'BPHS 22.15',
        validationQ: 'क्या आप कभी-कभी अकेलापन या मानसिक अशांति महसूस करते हैं?',
        isChallenging: true,
      });
    }
  }

  // ── 10. AMALA YOGA ───────────────────────────────────────
  // 10th from lagna or Moon has only benefics
  const tenthFromLagna = houseSign(10);
  const tenthFromMoon = moon ? SIGNS[(SIGNS.indexOf(moon.sign) + 9) % 12] : null;
  const BENEFICS = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const planetsIn10 = planets.filter(p => p.sign === tenthFromLagna || p.sign === tenthFromMoon);
  const onlyBenefics = planetsIn10.length > 0 && planetsIn10.every(p => BENEFICS.includes(p.name));
  if (onlyBenefics) {
    yogas.push({
      name: 'अमल योग',
      category: 'special',
      strength: 'high',
      lifeArea: 'करियर और यश',
      description: `अमल योग: दशम भाव में केवल शुभ ग्रह — निर्मल यश, समाज में श्रेष्ठ पद, धार्मिक/सेवा कार्य से कीर्ति`,
      source: 'Jataka Parijata 7.21',
      validationQ: 'क्या लोग आपको ईमानदार और नेक इंसान मानते हैं?',
    });
  }

  // ── MANGLIK / MANGAL DOSH ──────────────────────────────────
  // Classical rule: Mars in 1st, 2nd, 4th, 7th, 8th, or 12th house from
  // Lagna. This is checked separately (and more importantly) in kundli
  // matching (lib/kundli-milan.js) since it's most consequential for
  // marriage compatibility — but it belongs in the individual's own
  // yoga list too, since people frequently ask about their own chart.
  // We also check the classical cancellation (nichbhang-style) condition:
  // Mars in its own sign or exalted meaningfully softens the effect —
  // this keeps the framing honest rather than alarmist.
  const MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12];
  const marsPlanet = getPlanet(planets, 'Mars');
  const marsHouseFromLagna = getPlanetHouse('Mars');
  if (marsPlanet && MANGLIK_HOUSES.includes(marsHouseFromLagna)) {
    const isCancelled = isOwnSign(marsPlanet) || isExalted(marsPlanet);
    yogas.push({
      name: 'मंगल दोष (मांगलिक)',
      category: 'dosha',
      strength: isCancelled ? 'medium' : 'high',
      lifeArea: 'विवाह और साझेदारी',
      isChallenging: true,
      description: `मंगल ${marsHouseFromLagna}वें भाव में (${marsPlanet.signHi}) — पारंपरिक रूप से मांगलिक दोष माना जाता है, जो विवाह में तालमेल को प्रभावित कर सकता है।${isCancelled ? ` मंगल ${marsPlanet.dignityHi} होने से इसका प्रभाव काफी हल्का हो जाता है (शास्त्रीय भंग स्थिति)।` : ' विवाह से पहले वर-वधू दोनों की कुंडली में यह जांचना पारंपरिक प्रथा है — अगर दोनों में समान दोष हो, तो यह स्वतः संतुलित हो जाता है।'}`,
      source: 'Muhurta Chintamani',
      validationQ: 'क्या आपके परिवार में विवाह से पहले कुंडली मिलान करते समय मंगल दोष की बात हुई थी?',
    });
  }

  // ── KAAL SARP DOSH ──────────────────────────────────────────
  // Classical rule: all 7 classical planets (Sun through Saturn) fall
  // on one side of the Rahu-Ketu axis (hemmed between them). We check
  // both directions (Rahu→Ketu and Ketu→Rahu) since either constitutes
  // the dosha.
  const rahuP = getPlanet(planets, 'Rahu');
  const ketuP = getPlanet(planets, 'Ketu');
  if (rahuP && ketuP) {
    const rahuLon = rahuP.absolute_degree ?? rahuP.degree ?? 0;
    const otherPlanets = planets.filter(p => !['Rahu', 'Ketu'].includes(p.name));
    const getLon = p => p.absolute_degree ?? p.degree ?? 0;

    const allBetween = (fromLon, toLon) => {
      const span = ((toLon - fromLon) + 360) % 360;
      return otherPlanets.every(p => {
        const rel = ((getLon(p) - fromLon) + 360) % 360;
        return rel <= span;
      });
    };
    const ketuLon = getLon(ketuP);
    const isKaalSarp = allBetween(rahuLon, ketuLon) || allBetween(ketuLon, rahuLon);

    if (isKaalSarp) {
      yogas.push({
        name: 'कालसर्प दोष',
        category: 'dosha',
        strength: 'medium',
        lifeArea: 'समग्र जीवन-गति',
        isChallenging: true,
        description: `सभी 7 ग्रह राहु-केतु अक्ष के एक तरफ स्थित हैं — कालसर्प दोष की स्थिति बनती है। पारंपरिक मान्यता है कि यह जीवन में संघर्ष के बाद ही सफलता दिलाता है ("देर से मगर ठोस") — यह कोई स्थायी अशुभता नहीं, बल्कि धैर्य और निरंतर प्रयास की मांग करने वाला योग है। कई सफल व्यक्तियों की कुंडली में यह पाया गया है।`,
        source: 'Popular classical tradition (BPHS में सीधा उल्लेख नहीं, बाद की परंपरा से प्रचलित)',
        validationQ: 'क्या आपको लगता है कि आपकी बड़ी सफलताएं देर से, पर संघर्ष के बाद मिली हैं?',
      });
    }
  }

  // ── PITRA DOSH ────────────────────────────────────────────
  // Simplified classical indicators: Rahu or Ketu in the 9th house
  // (ancestral/father house), or Sun (father karaka) conjunct/afflicted
  // by Rahu or Saturn. Different traditions use different exact rules —
  // this uses the most commonly cited version.
  const sunPlanet = getPlanet(planets, 'Sun');
  const rahuHouse = getPlanetHouse('Rahu');
  const ketuHouse = getPlanetHouse('Ketu');
  const sunHouse = getPlanetHouse('Sun');
  const saturnHouse = getPlanetHouse('Saturn');
  const sunRahuConjunct = sunHouse && rahuHouse && sunHouse === rahuHouse;
  const sunSaturnConjunct = sunHouse && saturnHouse && sunHouse === saturnHouse;

  if (rahuHouse === 9 || ketuHouse === 9 || sunRahuConjunct) {
    yogas.push({
      name: 'पितृ दोष',
      category: 'dosha',
      strength: 'medium',
      lifeArea: 'पारिवारिक/पैतृक विषय',
      isChallenging: true,
      description: `${rahuHouse === 9 ? 'राहु नवम भाव में' : ketuHouse === 9 ? 'केतु नवम भाव में' : 'सूर्य-राहु का संयोग'} — पारंपरिक रूप से पितृ दोष का संकेत, जो पैतृक/पूर्वजों से जुड़े अधूरे कार्यों या पारिवारिक तनाव से जोड़ा जाता है। इसका सामान्य उपाय पितरों का श्राद्ध/तर्पण करना और पीपल के वृक्ष को जल देना माना जाता है — यह एक सामान्य, व्यापक रूप से प्रचलित परंपरा है, कोई निजी दोष नहीं।`,
      source: 'Popular classical tradition',
      validationQ: 'क्या परिवार में पैतृक संपत्ति या रीति-रिवाज़ों को लेकर कभी अनसुलझे मामले रहे हैं?',
    });
  }

  // ── GURU CHANDAL YOGA ─────────────────────────────────────
  // Classical rule: Jupiter (Guru) conjunct Rahu in the same sign.
  const jupiterPlanet = getPlanet(planets, 'Jupiter');
  const jupiterHouse = getPlanetHouse('Jupiter');
  if (jupiterHouse && rahuHouse && jupiterHouse === rahuHouse) {
    yogas.push({
      name: 'गुरु चांडाल योग',
      category: 'dosha',
      strength: 'medium',
      lifeArea: 'गुरु/मार्गदर्शन और निर्णय-क्षमता',
      isChallenging: true,
      description: `बृहस्पति और राहु का संयोग (${jupiterPlanet?.signHi || ''}, ${jupiterHouse}वें भाव में) — गुरु चांडाल योग बनता है, जो कभी-कभी गुरु/शिक्षकों के मार्गदर्शन में भ्रम, या पारंपरिक ज्ञान से हटकर अपरंपरागत रास्ते चुनने की प्रवृत्ति दिखाता है। यह हमेशा नकारात्मक नहीं — कई मामलों में यह अपरंपरागत सोच और बड़ी उपलब्धियों से भी जुड़ा पाया गया है, बशर्ते सही मार्गदर्शन मिले।`,
      source: 'Classical tradition',
      validationQ: 'क्या आप पारंपरिक सलाह से हटकर अपने रास्ते खुद तय करना पसंद करते हैं?',
    });
  }


  // Remove duplicates by name
  const seen = new Set();
  return yogas.filter(y => {
    if (seen.has(y.name)) return false;
    seen.add(y.name);
    return true;
  });
}

// ── Format yogas for AI system prompt ────────────────────────
export function formatYogasForPrompt(yogas) {
  if (!yogas || yogas.length === 0) return 'कोई विशेष योग नहीं मिला।';

  const high   = yogas.filter(y => y.strength === 'high' && !y.isChallenging);
  const medium = yogas.filter(y => y.strength === 'medium' && !y.isChallenging);
  const challenging = yogas.filter(y => y.isChallenging);

  let out = '';
  if (high.length)       out += `\nशक्तिशाली योग:\n${high.map(y => `• ${y.description} [${y.source}]`).join('\n')}`;
  if (medium.length)     out += `\nमध्यम योग:\n${medium.map(y => `• ${y.description}`).join('\n')}`;
  if (challenging.length) out += `\nचुनौतीपूर्ण योग:\n${challenging.map(y => `• ${y.description}`).join('\n')}`;
  return out;
}

// lib/astro-facts.js
//
// DETERMINISTIC CORE — rule-based astrological facts computed in JS.
// The AI layer receives this processed fact-sheet instead of raw degrees,
// reducing hallucination and keeping calculations 100% consistent.
//
// ── EPHEMERIS FALLBACK CHAIN ───────────────────────────────────
// Tier 1: pyswisseph microservice (EPHEMERIS_SERVICE_URL) — gold-standard
//         Swiss Ephemeris accuracy. 2.5s timeout. See /ephemeris-service.
// Tier 2: astronomy-engine (npm, runs locally on Netlify) — real
//         astronomical positions (VSOP87/ELP2000-based), slightly less
//         precise for lunar nodes (mean node formula vs true node).
// Tier 3: simulated sine-based positions — last resort only, clearly
//         flagged in the output as NOT real data.
//
// Both Tier 1 and Tier 2 are normalized into the SAME planet object
// shape (absolute_degree, sign, sign_degree, is_retrograde — plus the
// legacy aliases degree/inSign/retro used by the rest of this module)
// so the rule logic below works identically regardless of source.

import * as Astronomy from 'astronomy-engine';

const PLANETS  = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'];
const SIGNS    = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGNS_HI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];
const NAKS     = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Moola','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const PLANETS_HI = { Sun:'सूर्य', Moon:'चंद्र', Mercury:'बुध', Venus:'शुक्र', Mars:'मंगल', Jupiter:'बृहस्पति', Saturn:'शनि', Rahu:'राहु', Ketu:'केतु' };

const EXALTATION   = { Sun:'Aries', Moon:'Taurus', Mercury:'Virgo', Venus:'Pisces', Mars:'Capricorn', Jupiter:'Cancer', Saturn:'Libra', Rahu:'Gemini', Ketu:'Sagittarius' };
const DEBILITATION = { Sun:'Libra', Moon:'Scorpio', Mercury:'Pisces', Venus:'Virgo', Mars:'Cancer', Jupiter:'Capricorn', Saturn:'Aries', Rahu:'Sagittarius', Ketu:'Gemini' };

const OWN_SIGNS = {
  Sun: ['Leo'], Moon: ['Cancer'], Mercury: ['Gemini','Virgo'], Venus: ['Taurus','Libra'],
  Mars: ['Aries','Scorpio'], Jupiter: ['Sagittarius','Pisces'], Saturn: ['Capricorn','Aquarius'],
  Rahu: [], Ketu: [],
};

const SIGN_LORD = {
  Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon', Leo:'Sun', Virgo:'Mercury',
  Libra:'Venus', Scorpio:'Mars', Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
};

const FRIENDS = {
  Sun:     { friends:['Moon','Mars','Jupiter'], enemies:['Venus','Saturn'] },
  Moon:    { friends:['Sun','Mercury'], enemies:[] },
  Mercury: { friends:['Sun','Venus'], enemies:['Moon'] },
  Venus:   { friends:['Mercury','Saturn'], enemies:['Sun','Moon'] },
  Mars:    { friends:['Sun','Moon','Jupiter'], enemies:['Mercury'] },
  Jupiter: { friends:['Sun','Moon','Mars'], enemies:['Mercury','Venus'] },
  Saturn:  { friends:['Mercury','Venus'], enemies:['Sun','Moon','Mars'] },
  Rahu:    { friends:['Venus','Saturn'], enemies:['Sun','Moon','Mars'] },
  Ketu:    { friends:['Venus','Saturn'], enemies:['Sun','Moon','Mars'] },
};

// Vimshottari dasha lords cycle (order from Ketu, repeating every 9 nakshatras)
const NAK_LORDS = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];

// ── Shared helpers ──────────────────────────────────────────────
function navamsaSignIndex(deg) {
  const signIdx = Math.floor(deg/30);
  const partIdx = Math.floor((deg % 30) / (30/9));
  return (signIdx * 9 + partIdx) % 12;
}

// D10 (Dashamsa) — career chart. Each sign divided into 10 parts of 3deg.
// Classical rule: odd signs count from the same sign; even signs count
// from the 9th sign from it.
function dashamsaSignIndex(deg) {
  const signIdx = Math.floor(deg / 30);
  const partIdx = Math.floor((deg % 30) / 3); // 0-9
  const isOdd = (signIdx % 2) === 0; // signIdx 0=Aries(odd sign #1)
  const startIdx = isOdd ? signIdx : (signIdx + 8) % 12; // 9th from sign = +8
  return (startIdx + partIdx) % 12;
}

// Normalizes a raw absolute degree into the common planet object shape
// used by every tier and by the rule-based scoring below.
function buildPlanetObj(name, absoluteDegree, isRetrograde) {
  const deg = ((absoluteDegree % 360) + 360) % 360;
  const signIdx = Math.floor(deg/30);
  const signDeg = deg % 30;
  const nakIdx = Math.floor(deg/(360/27));
  const pada = Math.floor((deg % (360/27))/((360/27)/4)) + 1;
  return {
    name,
    nameHi: PLANETS_HI[name],
    // canonical normalized fields
    absolute_degree: parseFloat(deg.toFixed(7)),
    sign: SIGNS[signIdx],
    sign_degree: parseFloat(signDeg.toFixed(4)),
    is_retrograde: isRetrograde,
    // legacy aliases used throughout the rest of this module
    degree: parseFloat(deg.toFixed(7)),
    inSign: parseFloat(signDeg.toFixed(4)),
    retro: isRetrograde,
    signHi: SIGNS_HI[signIdx],
    nakshatra: NAKS[nakIdx],
    pada,
    combust: false, // computed after all planets known
    d9Sign: SIGNS[navamsaSignIndex(deg)],
    d10Sign: SIGNS[dashamsaSignIndex(deg)],
  };
}

function applyCombustion(results) {
  const sunDeg = results.find(p => p.name === 'Sun').degree;
  for (const p of results) {
    if (['Sun','Moon','Rahu','Ketu'].includes(p.name)) { p.combust = false; continue; }
    let diff = Math.abs(p.degree - sunDeg);
    diff = Math.min(diff, 360 - diff);
    p.combust = diff < 6;
  }
  return results;
}

// Local Mean Time -> approximate UT, using longitude (no timezone DB available)
function toUtDate(dob, time, lng) {
  const [y, m, d] = dob.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const utHour = (h + min/60) - (lng/15);
  return new Date(Date.UTC(y, m-1, d, 0, 0, 0) + utHour * 3600 * 1000);
}

// ── TIER 1: pyswisseph microservice (2.5s timeout) ──────────────
async function fetchPlanetPositionsPyswisseph(dob, time, lat, lng, ayanamsa) {
  const url = process.env.EPHEMERIS_SERVICE_URL;
  if (!url) throw new Error('EPHEMERIS_SERVICE_URL not configured');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s — fast enough for warm Render, fails fast when cold

  try {
    const res = await fetch(url.replace(/\/$/, '') + '/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dob, time, lat, lng, ayanamsa }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('Ephemeris service responded ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data.planets) || data.planets.length !== 9) {
      throw new Error('Invalid response shape from ephemeris service');
    }
    // Normalize: the FastAPI service returns {degree, sign, inSign, retro, ...}
    // Map into buildPlanetObj so absolute_degree/sign_degree/is_retrograde
    // are present and the shape exactly matches Tier 2.
    const planets = data.planets.map(p => buildPlanetObj(p.name, p.degree, p.retro));
    const lagna = data.lagna ? buildLagnaObj(data.lagna.degree) : null;
    return { planets, lagna };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── TIER 2: astronomy-engine (real data, computed locally) ─────
// Lahiri-style ayanamsa approximation by year, with offsets for other modes.
function getAyanamsaDeg(date, ayanamsa) {
  const year = date.getUTCFullYear() + date.getUTCMonth() / 12;
  const lahiri = 23.85 + (year - 2000) * 0.013972; // ~50.3"/year precession rate
  switch ((ayanamsa || 'lahiri').toLowerCase()) {
    case 'raman': return lahiri - 1.39;
    case 'kp':    return lahiri + 0.12;
    case 'fagan': return lahiri - 0.90;
    default:      return lahiri;
  }
}

// Mean lunar node longitude (Meeus formula), tropical, degrees
function meanLunarNodeLongitude(astroTime) {
  const T = astroTime.tt / 36525.0; // Julian centuries from J2000 TT
  let omega = 125.0445479 - 1934.1362891*T + 0.0020754*T*T + Math.pow(T,3)/467441 - Math.pow(T,4)/60616000;
  return ((omega % 360) + 360) % 360;
}

const AE_BODIES = {
  Mercury: Astronomy.Body.Mercury,
  Venus:   Astronomy.Body.Venus,
  Mars:    Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn:  Astronomy.Body.Saturn,
};

// ── Ascendant (Lagna) calculation — standard astronomical formula ──
// asc = atan2( -cos(LST), sin(LST)*cos(obliquity) + tan(lat)*sin(obliquity) )
function calcAscendantTropical(astroTime, lat, lng) {
  const gastHours = Astronomy.SiderealTime(astroTime); // Greenwich Apparent Sidereal Time, hours
  const lstDeg = ((gastHours * 15) + lng + 360) % 360;  // Local Sidereal Time, degrees
  const lstRad = lstDeg * Math.PI / 180;
  const latRad = lat * Math.PI / 180;

  // Mean obliquity of the ecliptic for the date
  const T = astroTime.tt / 36525.0;
  const eps = (23.43929111 - 0.0130042 * T) * Math.PI / 180;

  const y = -Math.cos(lstRad);
  const x = Math.sin(lstRad) * Math.cos(eps) + Math.tan(latRad) * Math.sin(eps);
  let asc = Math.atan2(y, x) * 180 / Math.PI;
  return ((asc % 360) + 360) % 360;
}

function buildLagnaObj(siderealDeg) {
  const deg = ((siderealDeg % 360) + 360) % 360;
  const signIdx = Math.floor(deg / 30);
  const inSign = deg % 30;
  const nakIdx = Math.floor(deg / (360/27));
  const pada = Math.floor((deg % (360/27)) / ((360/27)/4)) + 1;
  return {
    sign: SIGNS[signIdx],
    signHi: SIGNS_HI[signIdx],
    degree: parseFloat(deg.toFixed(7)),
    inSign: parseFloat(inSign.toFixed(4)),
    nakshatra: NAKS[nakIdx],
    pada,
    d9Sign: SIGNS[navamsaSignIndex(deg)],
    d10Sign: SIGNS[dashamsaSignIndex(deg)],
  };
}

function calcPlanetPositionsAstronomyEngine(dob, time, lat, lng, ayanamsa) {
  ayanamsa = ayanamsa || 'lahiri';
  const utDate = toUtDate(dob, time, lng);
  const astroTime = Astronomy.MakeTime(utDate);
  const ayVal = getAyanamsaDeg(utDate, ayanamsa);
  const toSidereal = (tropDeg) => ((tropDeg - ayVal) % 360 + 360) % 360;

  const results = [];

  // Sun (never retrograde)
  results.push(buildPlanetObj('Sun', toSidereal(Astronomy.SunPosition(astroTime).elon), false));

  // Moon (never retrograde for this purpose)
  results.push(buildPlanetObj('Moon', toSidereal(Astronomy.EclipticGeoMoon(astroTime).lon), false));

  // Mercury -> Saturn — compute longitude now and +1 day to detect retrograde
  ['Mercury','Venus','Mars','Jupiter','Saturn'].forEach((name) => {
    const lon1 = Astronomy.Ecliptic(Astronomy.GeoVector(AE_BODIES[name], astroTime, true)).elon;
    const lon2 = Astronomy.Ecliptic(Astronomy.GeoVector(AE_BODIES[name], astroTime.AddDays(1), true)).elon;
    let diff = lon2 - lon1;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    results.push(buildPlanetObj(name, toSidereal(lon1), diff < 0));
  });

  // Rahu (mean node) — conventionally always treated as retrograde
  const rahuDeg = toSidereal(meanLunarNodeLongitude(astroTime));
  results.push(buildPlanetObj('Rahu', rahuDeg, true));

  // Ketu = Rahu + 180 degrees
  results.push(buildPlanetObj('Ketu', (rahuDeg + 180) % 360, true));

  const ascTropical = calcAscendantTropical(astroTime, lat, lng);
  const lagna = buildLagnaObj(toSidereal(ascTropical));

  return { planets: applyCombustion(results), lagna };
}

// ── TIER 3: Simulated (last resort, clearly flagged) ────────────
function calcPlanetPositionsSimulated(dob, time, lat, lng, ayanamsa) {
  ayanamsa = ayanamsa || 'lahiri';
  const parts = dob.split('-').map(Number);
  const y = parts[0], m = parts[1], d = parts[2];
  const tparts = time.split(':').map(Number);
  const h = tparts[0], min = tparts[1];
  const jd = 367*y - Math.floor(7*(y + Math.floor((m+9)/12))/4) + Math.floor(275*m/9) + d + 1721013.5 + (h + min/60)/24 - lng/360;
  const ayVal = ayanamsa === 'lahiri' ? 23.85 : ayanamsa === 'raman' ? 22.46 : ayanamsa === 'kp' ? 23.97 : 23.85;

  const results = PLANETS.map((name, i) => {
    const seed = jd * 0.0001 + i * 1.618;
    const raw = ((Math.sin(seed)*0.5+0.5)*360);
    const deg = (raw - ayVal + 360) % 360;
    const retro = i > 1 && i < 7 && Math.sin(seed*2.3) < -0.3;
    return buildPlanetObj(name, deg, retro);
  });

  // Simulated lagna — same sine-seed approach, clearly not real
  const lagnaSeed = jd * 0.0001 + 9 * 1.618;
  const lagnaDeg = (((Math.sin(lagnaSeed)*0.5+0.5)*360) - ayVal + 360) % 360;
  const lagna = buildLagnaObj(lagnaDeg);

  return { planets: applyCombustion(results), lagna };
}

// ── Orchestrator: try tiers in order ────────────────────────────
export async function getPlanetPositions(dob, time, lat, lng, ayanamsa) {
  ayanamsa = ayanamsa || 'lahiri';

  try {
    const result = await fetchPlanetPositionsPyswisseph(dob, time, lat, lng, ayanamsa);
    return { planets: result.planets, lagna: result.lagna, engine: 'pyswisseph' };
  } catch (e) {
    console.warn('[Ephemeris] Tier 1 (pyswisseph) unavailable:', e.message);
  }

  try {
    const result = calcPlanetPositionsAstronomyEngine(dob, time, lat, lng, ayanamsa);
    return { planets: result.planets, lagna: result.lagna, engine: 'astronomy-engine' };
  } catch (e) {
    console.warn('[Ephemeris] Tier 2 (astronomy-engine) failed:', e.message);
  }

  const simResult = calcPlanetPositionsSimulated(dob, time, lat, lng, ayanamsa);
  return { planets: simResult.planets, lagna: simResult.lagna, engine: 'simulated' };
}

// ── Rule-based dignity / strength scoring (engine-agnostic) ─────
function getDignity(planet, sign) {
  if (EXALTATION[planet] === sign) return 'exalted';
  if (DEBILITATION[planet] === sign) return 'debilitated';
  if (OWN_SIGNS[planet] && OWN_SIGNS[planet].includes(sign)) return 'own';
  const lord = SIGN_LORD[sign];
  if (!lord || lord === planet) return 'own';
  const rel = FRIENDS[planet];
  if (rel && rel.friends.includes(lord)) return 'friend';
  if (rel && rel.enemies.includes(lord)) return 'enemy';
  return 'neutral';
}

const DIGNITY_HI = { exalted:'उच्च का', debilitated:'नीच का', own:'स्वराशि', friend:'मित्र राशि', enemy:'शत्रु राशि', neutral:'सम राशि' };

// ── Planetary War (Graha Yuddha) — two planets within 1 degree ──
function findPlanetaryWars(planets) {
  const wars = [];
  const warCapable = planets.filter(p => !['Sun','Moon','Rahu','Ketu'].includes(p.name));
  for (let i = 0; i < warCapable.length - 1; i++) {
    for (let j = i+1; j < warCapable.length; j++) {
      const diff = Math.abs(warCapable[i].degree - warCapable[j].degree);
      if (diff < 1) {
        const winner = warCapable[i].degree > warCapable[j].degree ? warCapable[i] : warCapable[j];
        const loser  = winner === warCapable[i] ? warCapable[j] : warCapable[i];
        wars.push({ planets: [warCapable[i].nameHi, warCapable[j].nameHi], orb: parseFloat(diff.toFixed(4)), winner: winner.nameHi, loser: loser.nameHi });
      }
    }
  }
  return wars;
}

// ── Remedial timing windows — Lal Kitab style, based on day lord ──
const DAY_LORDS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']; // JS getDay(): 0=Sunday
const DAY_LORDS_HI = { Sun:'रविवार', Moon:'सोमवार', Mars:'मंगलवार', Mercury:'बुधवार', Jupiter:'गुरुवार', Venus:'शुक्रवार', Saturn:'शनिवार' };

function getRemedialWindow(planet, dignity) {
  const today = DAY_LORDS[new Date().getDay()];
  if (dignity === 'debilitated' || planet === today) {
    return { window: 'सूर्योदय के 1 घंटे के भीतर (प्रातः काल)', priority: 'उच्च — आज विशेष प्रभावी', dayMatch: planet === today ? DAY_LORDS_HI[today] : null };
  }
  return { window: 'अभिजीत मुहूर्त (दोपहर लगभग 11:45 - 12:30)', priority: 'सामान्य', dayMatch: null };
}

const ENGINE_LABELS = {
  'pyswisseph':       'Swiss Ephemeris (pyswisseph) — production-grade सटीक गणना',
  'astronomy-engine': 'Astronomy Engine — वास्तविक खगोलीय गणना (स्थानीय fallback)',
  'simulated':        'SIMULATED — गणितीय pseudo-data, वास्तविक खगोलीय डेटा नहीं',
};

// ── Build the full deterministic fact-sheet ───────────────────
// ── House calculation (whole-sign system — standard in Parashari) ──
// House N from lagna = (planet's sign index - lagna's sign index + 12) % 12 + 1
function calcHouse(planetSign, lagnaSign) {
  const SIGNS_LOCAL = SIGNS;
  const lagnaIdx = SIGNS_LOCAL.indexOf(lagnaSign);
  const planetIdx = SIGNS_LOCAL.indexOf(planetSign);
  if (lagnaIdx === -1 || planetIdx === -1) return null;
  return ((planetIdx - lagnaIdx + 12) % 12) + 1;
}

const HOUSE_SIGNIFICANCE_HI = {
  1:  'स्वयं, व्यक्तित्व, शरीर, स्वास्थ्य',
  2:  'धन, वाणी, परिवार, भोजन',
  3:  'साहस, भाई-बहन, संचार, यात्रा',
  4:  'माता, घर, सुख, संपत्ति',
  5:  'संतान, बुद्धि, शिक्षा, प्रेम',
  6:  'शत्रु, ऋण, रोग, सेवा',
  7:  'विवाह, साझेदारी, व्यापार',
  8:  'आयु, गुप्त रहस्य, परिवर्तन, अचानक घटनाएं',
  9:  'भाग्य, धर्म, पिता, उच्च शिक्षा',
  10: 'करियर, कर्म, सम्मान, सरकार',
  11: 'लाभ, मित्र, इच्छापूर्ति',
  12: 'व्यय, हानि, मोक्ष, विदेश',
};

// ── Event-specific scoring engine (Career / Marriage / Health) ───
// Deterministic, weighted-factor model. Each event combines supporting
// vs opposing factors into a net score + confidence + contradiction note.
// No AI involved — this is pure rule-based computation per the
// "Core Foundation: Parashari + weighted scoring" architecture.
function planetByName(scored, name) { return scored.find(p => p.nameHi === PLANETS_HI[name] || p.name === name); }

function dignityWeight(p) {
  if (!p) return 0;
  if (p.dignity === 'exalted') return 25;
  if (p.dignity === 'own') return 18;
  if (p.dignity === 'friend') return 10;
  if (p.dignity === 'neutral') return 5;
  if (p.dignity === 'enemy') return -8;
  if (p.dignity === 'debilitated') return -20;
  return 0;
}

function buildEventScores(scored, houseLords, d9Chart, d10Chart, currentDashaLord) {
  const results = {};

  // ── CAREER (10th house) ──────────────────────────────────────
  {
    const supporting = [];
    const opposing = [];
    let net = 50; // baseline

    const tenthLordName = houseLords[10]?.lord;
    const tenthLordPlanet = planetByName(scored, tenthLordName);
    const tenthLordWeight = dignityWeight(tenthLordPlanet);
    net += tenthLordWeight;
    if (tenthLordWeight > 0) supporting.push(`दशम भाव स्वामी ${tenthLordPlanet?.nameHi} ${tenthLordPlanet?.dignityHi} में (बल देता है)`);
    if (tenthLordWeight < 0) opposing.push(`दशम भाव स्वामी ${tenthLordPlanet?.nameHi} ${tenthLordPlanet?.dignityHi} में (कमजोर करता है)`);

    // Planets actually placed in 10th house
    const inTenth = scored.filter(p => p.house === 10);
    inTenth.forEach(p => {
      const w = dignityWeight(p) / 2;
      net += w;
      if (w > 0) supporting.push(`${p.nameHi} दशम भाव में स्थित (करियर को बल)`);
      if (w < 0) opposing.push(`${p.nameHi} दशम भाव में कमजोर स्थिति में`);
    });

    // D10 support: is 10th-lord vargottama-like (same sign in D1 and D10)?
    if (d10Chart && tenthLordPlanet) {
      const d10Self = d10Chart.planets.find(p => p.name === tenthLordPlanet.nameHi);
      if (d10Self && d10Self.house && [1,10].includes(d10Self.house)) {
        net += 12;
        supporting.push('D10 (दशमांश) में करियर ग्रह मजबूत स्थिति में');
      }
    }

    // Jupiter aspect/placement (classical benefic for growth)
    const jupiter = planetByName(scored, 'Jupiter');
    if (jupiter && [10, 9, 1].includes(jupiter.house)) {
      net += 8;
      supporting.push('बृहस्पति करियर भाव से जुड़ा हुआ (विकास सहायक)');
    }

    // Dasha alignment
    if (currentDashaLord === tenthLordName || currentDashaLord === 'Saturn' || currentDashaLord === 'Sun') {
      net += 10;
      supporting.push(`वर्तमान दशा (${PLANETS_HI[currentDashaLord]}) करियर से संबंधित विषयों को सक्रिय करती है`);
    }

    net = Math.max(0, Math.min(100, Math.round(net)));
    const confidence = Math.min(95, Math.round(40 + (supporting.length * 8) - (opposing.length * 5)));

    results.career = {
      score: net,
      confidence: Math.max(20, confidence),
      supporting,
      opposing,
      summary: opposing.length > supporting.length
        ? 'करियर में चुनौतियां हैं, अतिरिक्त प्रयास और धैर्य आवश्यक'
        : opposing.length > 0
        ? 'करियर में वृद्धि संभव है, लेकिन देरी या बाधाओं के साथ'
        : 'करियर में अच्छी वृद्धि के संकेत',
    };
  }

  // ── MARRIAGE (7th house) ─────────────────────────────────────
  {
    const supporting = [];
    const opposing = [];
    let net = 50;

    const seventhLordName = houseLords[7]?.lord;
    const seventhLordPlanet = planetByName(scored, seventhLordName);
    const seventhWeight = dignityWeight(seventhLordPlanet);
    net += seventhWeight;
    if (seventhWeight > 0) supporting.push(`सप्तम भाव स्वामी ${seventhLordPlanet?.nameHi} ${seventhLordPlanet?.dignityHi} में`);
    if (seventhWeight < 0) opposing.push(`सप्तम भाव स्वामी ${seventhLordPlanet?.nameHi} ${seventhLordPlanet?.dignityHi} में (विलंब संभव)`);

    const venus = planetByName(scored, 'Venus');
    const venusWeight = dignityWeight(venus);
    net += venusWeight * 0.6;
    if (venusWeight > 5) supporting.push(`शुक्र ${venus?.dignityHi} में (प्रेम/विवाह सुख)`);
    if (venusWeight < -5) opposing.push(`शुक्र ${venus?.dignityHi} में (रिश्तों में तनाव संभव)`);

    // Saturn or Mars in 7th = classical delay/friction indicators
    const inSeventh = scored.filter(p => p.house === 7);
    inSeventh.forEach(p => {
      if (p.name === 'Saturn') { net -= 10; opposing.push('शनि सप्तम भाव में — विवाह में विलंब, गंभीर जीवनसाथी'); }
      if (p.name === 'Mars') { net -= 8; opposing.push('मंगल सप्तम भाव में (कुज दोष) — रिश्तों में घर्षण संभव'); }
      if (['Jupiter','Venus'].includes(p.name)) { net += 12; supporting.push(`${p.nameHi} सप्तम भाव में — शुभ विवाह योग`); }
    });

    // D9 (Navamsa) is THE primary marriage confirmation chart
    if (d9Chart && seventhLordPlanet) {
      const d9Self = d9Chart.planets.find(p => p.name === seventhLordPlanet.nameHi);
      if (d9Self?.sameAsD1) {
        net += 15;
        supporting.push('सप्तमेश वर्गोत्तम (D1=D9) — विवाह योग बहुत मजबूत');
      }
    }
    const d9Venus = d9Chart?.planets.find(p => p.name === 'शुक्र');
    if (d9Venus?.sameAsD1) { net += 10; supporting.push('शुक्र वर्गोत्तम — दांपत्य सुख प्रबल'); }

    net = Math.max(0, Math.min(100, Math.round(net)));
    const confidence = Math.min(95, Math.round(40 + (supporting.length * 8) - (opposing.length * 5)));

    results.marriage = {
      score: net,
      confidence: Math.max(20, confidence),
      supporting,
      opposing,
      summary: opposing.length > supporting.length
        ? 'विवाह में विलंब या चुनौतियों के संकेत — धैर्य रखें'
        : opposing.length > 0
        ? 'विवाह योग है, परंतु कुछ बाधाओं के साथ — समय लग सकता है'
        : 'विवाह के लिए अच्छे योग बन रहे हैं',
    };
  }

  // ── HEALTH (6th/8th house, Saturn/Mars affliction) ───────────
  {
    const supporting = [];
    const opposing = [];
    let net = 60; // baseline slightly positive

    const sixthLordName = houseLords[6]?.lord;
    const sixthLordPlanet = planetByName(scored, sixthLordName);
    if (sixthLordPlanet?.dignity === 'debilitated') { net -= 15; opposing.push('षष्ठेश नीच राशि में — रोग प्रतिरोधक क्षमता पर ध्यान दें'); }
    if (sixthLordPlanet?.dignity === 'exalted') { net += 10; supporting.push('षष्ठेश उच्च राशि में — रोगों पर विजय की क्षमता'); }

    const inEighth = scored.filter(p => p.house === 8);
    if (inEighth.some(p => ['Saturn','Mars','Rahu'].includes(p.name))) {
      net -= 12;
      opposing.push('अष्टम भाव में पाप ग्रह — स्वास्थ्य में सावधानी आवश्यक');
    }

    const lagnaLordPlanet = planetByName(scored, houseLords[1]?.lord);
    if (lagnaLordPlanet?.dignity === 'debilitated' || lagnaLordPlanet?.combust) {
      net -= 10;
      opposing.push('लग्नेश कमजोर — समग्र जीवनशक्ति पर ध्यान दें');
    }
    if (lagnaLordPlanet?.dignity === 'exalted' || lagnaLordPlanet?.dignity === 'own') {
      net += 8;
      supporting.push('लग्नेश मजबूत — अच्छी जीवनशक्ति');
    }

    net = Math.max(0, Math.min(100, Math.round(net)));
    const confidence = Math.min(90, Math.round(35 + (supporting.length * 8) - (opposing.length * 5)));

    results.health = {
      score: net,
      confidence: Math.max(20, confidence),
      supporting,
      opposing,
      summary: opposing.length > supporting.length
        ? 'स्वास्थ्य पर विशेष ध्यान देने की आवश्यकता है'
        : 'सामान्यतः अच्छा स्वास्थ्य, नियमित देखभाल जारी रखें',
    };
  }

  return results;
}

export async function buildFactSheet(dob, time, lat, lng, ayanamsa) {
  ayanamsa = ayanamsa || 'lahiri';
  const result = await getPlanetPositions(dob, time, lat, lng, ayanamsa);
  const planets = result.planets;
  const engine = result.engine;
  const lagna = result.lagna;

  const scored = planets.map(p => {
    const dignity = getDignity(p.name, p.sign);
    const vargottama = p.sign === p.d9Sign;
    const house = lagna ? calcHouse(p.sign, lagna.sign) : null;

    let score = 5;
    if (dignity === 'exalted') score += 3;
    if (dignity === 'debilitated') score -= 3;
    if (dignity === 'own') score += 2;
    if (dignity === 'friend') score += 1;
    if (dignity === 'enemy') score -= 1;
    if (vargottama) score += 2;
    if (p.combust) score -= 2;
    if (p.retro) score += (['Jupiter','Saturn','Venus','Mercury'].includes(p.name) ? 1 : -1);
    score = Math.max(0, Math.min(10, score));

    return Object.assign({}, p, {
      dignity: dignity,
      dignityHi: DIGNITY_HI[dignity],
      vargottama: vargottama,
      strengthScore: score,
      remedialWindow: getRemedialWindow(p.name, dignity),
      house: house,
      houseSignificance: house ? HOUSE_SIGNIFICANCE_HI[house] : null,
    });
  });

  const strongest = scored.slice().sort((a,b) => b.strengthScore - a.strengthScore)[0];
  const weakest   = scored.slice().sort((a,b) => a.strengthScore - b.strengthScore)[0];

  const moon = scored.find(p => p.name === 'Moon');
  const moonNakIdx = NAKS.indexOf(moon.nakshatra);
  const currentDashaLord = NAK_LORDS[moonNakIdx % 9];

  // House lords (which planet rules each house, whole-sign from lagna)
  const houseLords = {};
  if (lagna) {
    const lagnaIdx = SIGNS.indexOf(lagna.sign);
    for (let h = 1; h <= 12; h++) {
      const signIdx = (lagnaIdx + h - 1) % 12;
      const sign = SIGNS[signIdx];
      houseLords[h] = { sign, signHi: SIGNS_HI[signIdx], lord: SIGN_LORD[sign], lordHi: PLANETS_HI[SIGN_LORD[sign]] };
    }
  }

  // ── D9 (Navamsa) chart summary — marriage/inner strength confirmation ──
  const d9Chart = lagna ? {
    lagnaSign: lagna.d9Sign,
    lagnaSignHi: SIGNS_HI[SIGNS.indexOf(lagna.d9Sign)],
    planets: scored.map(p => ({
      name: p.nameHi,
      sign: p.d9Sign,
      signHi: SIGNS_HI[SIGNS.indexOf(p.d9Sign)],
      house: calcHouse(p.d9Sign, lagna.d9Sign),
      sameAsD1: p.sign === p.d9Sign, // vargottama
    })),
  } : null;

  // ── D10 (Dashamsa) chart summary — career chart ─────────────────
  const d10Chart = lagna ? {
    lagnaSign: lagna.d10Sign,
    lagnaSignHi: SIGNS_HI[SIGNS.indexOf(lagna.d10Sign)],
    planets: scored.map(p => ({
      name: p.nameHi,
      sign: p.d10Sign,
      signHi: SIGNS_HI[SIGNS.indexOf(p.d10Sign)],
      house: calcHouse(p.d10Sign, lagna.d10Sign),
    })),
  } : null;

  // ── Event-specific scoring (Career / Marriage / Health) ─────────
  // Each score combines: relevant house lord strength + key planet
  // dignity + D9/D10 support + dasha alignment. All deterministic.
  const eventScores = lagna ? buildEventScores(scored, houseLords, d9Chart, d10Chart, currentDashaLord) : null;

  return {
    engineUsed: engine,
    engineNotice: ENGINE_LABELS[engine],
    lagna: lagna,
    houseLords: houseLords,
    d9Chart: d9Chart,
    d10Chart: d10Chart,
    eventScores: eventScores,
    planets: scored,
    combustPlanets: scored.filter(p => p.combust).map(p => p.nameHi),
    retroPlanets: scored.filter(p => p.retro).map(p => p.nameHi),
    exaltedPlanets: scored.filter(p => p.dignity === 'exalted').map(p => ({ name: p.nameHi, sign: p.signHi, house: p.house })),
    debilitatedPlanets: scored.filter(p => p.dignity === 'debilitated').map(p => ({ name: p.nameHi, sign: p.signHi, house: p.house })),
    vargottamaPlanets: scored.filter(p => p.vargottama).map(p => p.nameHi),
    planetaryWars: findPlanetaryWars(scored),
    strongestPlanet: { name: strongest.nameHi, degree: strongest.degree, sign: strongest.signHi, dignity: strongest.dignityHi, score: strongest.strengthScore, house: strongest.house },
    weakestPlanet:   { name: weakest.nameHi, degree: weakest.degree, sign: weakest.signHi, dignity: weakest.dignityHi, score: weakest.strengthScore, remedialWindow: weakest.remedialWindow, house: weakest.house },
    moonNakshatra: moon.nakshatra,
    currentDashaLordHint: PLANETS_HI[currentDashaLord],
    overallScore: Math.round((scored.reduce((s,p) => s + p.strengthScore, 0) / scored.length) * 10),
  };
}

export { PLANETS_HI, SIGNS_HI, calcHouse };

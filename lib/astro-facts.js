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
  const timeoutId = setTimeout(() => controller.abort(), 2500);

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
    return data.planets.map(p => buildPlanetObj(p.name, p.degree, p.retro));
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

  return applyCombustion(results);
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

  return applyCombustion(results);
}

// ── Orchestrator: try tiers in order ────────────────────────────
export async function getPlanetPositions(dob, time, lat, lng, ayanamsa) {
  ayanamsa = ayanamsa || 'lahiri';

  try {
    const planets = await fetchPlanetPositionsPyswisseph(dob, time, lat, lng, ayanamsa);
    return { planets: planets, engine: 'pyswisseph' };
  } catch (e) {
    console.warn('[Ephemeris] Tier 1 (pyswisseph) unavailable:', e.message);
  }

  try {
    const planets = calcPlanetPositionsAstronomyEngine(dob, time, lat, lng, ayanamsa);
    return { planets: planets, engine: 'astronomy-engine' };
  } catch (e) {
    console.warn('[Ephemeris] Tier 2 (astronomy-engine) failed:', e.message);
  }

  return { planets: calcPlanetPositionsSimulated(dob, time, lat, lng, ayanamsa), engine: 'simulated' };
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
export async function buildFactSheet(dob, time, lat, lng, ayanamsa) {
  ayanamsa = ayanamsa || 'lahiri';
  const result = await getPlanetPositions(dob, time, lat, lng, ayanamsa);
  const planets = result.planets;
  const engine = result.engine;

  const scored = planets.map(p => {
    const dignity = getDignity(p.name, p.sign);
    const vargottama = p.sign === p.d9Sign;

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
    });
  });

  const strongest = scored.slice().sort((a,b) => b.strengthScore - a.strengthScore)[0];
  const weakest   = scored.slice().sort((a,b) => a.strengthScore - b.strengthScore)[0];

  const moon = scored.find(p => p.name === 'Moon');
  const moonNakIdx = NAKS.indexOf(moon.nakshatra);
  const currentDashaLord = NAK_LORDS[moonNakIdx % 9];

  return {
    engineUsed: engine,
    engineNotice: ENGINE_LABELS[engine],
    planets: scored,
    combustPlanets: scored.filter(p => p.combust).map(p => p.nameHi),
    retroPlanets: scored.filter(p => p.retro).map(p => p.nameHi),
    exaltedPlanets: scored.filter(p => p.dignity === 'exalted').map(p => ({ name: p.nameHi, sign: p.signHi })),
    debilitatedPlanets: scored.filter(p => p.dignity === 'debilitated').map(p => ({ name: p.nameHi, sign: p.signHi })),
    vargottamaPlanets: scored.filter(p => p.vargottama).map(p => p.nameHi),
    planetaryWars: findPlanetaryWars(scored),
    strongestPlanet: { name: strongest.nameHi, degree: strongest.degree, sign: strongest.signHi, dignity: strongest.dignityHi, score: strongest.strengthScore },
    weakestPlanet:   { name: weakest.nameHi, degree: weakest.degree, sign: weakest.signHi, dignity: weakest.dignityHi, score: weakest.strengthScore, remedialWindow: weakest.remedialWindow },
    moonNakshatra: moon.nakshatra,
    currentDashaLordHint: PLANETS_HI[currentDashaLord],
    overallScore: Math.round((scored.reduce((s,p) => s + p.strengthScore, 0) / scored.length) * 10),
  };
}

export { PLANETS_HI, SIGNS_HI };

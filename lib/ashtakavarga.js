// lib/ashtakavarga.js
//
// ASHTAKAVARGA SYSTEM
//
// The single most-used technique for judging transit (Gochar) strength.
// Each planet contributes "bindus" (dots) to each sign — when a transiting
// planet passes through a sign with high bindus (5+), the transit is strong.
// Total bindus per sign = Sarvashtakavarga (0-56 scale).
//
// Classical source: BPHS chapters 66-76, Phala Deepika 19.
// This is deterministic — no AI involved.

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

// ── Classical bindu tables ──────────────────────────────────
// Each row = which houses FROM that planet's position give a bindu
// Order of contributors: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Lagna
// Classical tables from BPHS (Parashari standard)
const BINDU_TABLES = {
  Sun: {
    Sun:     [1,2,4,7,8,9,10,11],
    Moon:    [3,6,10,11],
    Mars:    [1,2,4,7,8,9,10,11],
    Mercury: [3,5,6,9,10,11,12],
    Jupiter: [5,6,9,11],
    Venus:   [6,7,12],
    Saturn:  [1,2,4,7,8,9,10,11],
    Lagna:   [3,4,6,10,11,12],
  },
  Moon: {
    Sun:     [3,6,7,8,10,11],
    Moon:    [1,3,6,7,10,11],
    Mars:    [2,3,5,6,9,10,11],
    Mercury: [1,3,4,5,7,8,10,11],
    Jupiter: [1,4,7,8,10,11,12],
    Venus:   [3,4,5,7,9,10,11],
    Saturn:  [3,5,6,11],
    Lagna:   [3,6,10,11],
  },
  Mars: {
    Sun:     [3,5,6,10,11],
    Moon:    [3,6,11],
    Mars:    [1,2,4,7,8,10,11],
    Mercury: [3,5,6,11],
    Jupiter: [6,10,11,12],
    Venus:   [6,8,11,12],
    Saturn:  [1,4,7,8,9,10,11],
    Lagna:   [1,4,7,8,9,10,11],
  },
  Mercury: {
    Sun:     [5,6,9,11,12],
    Moon:    [2,4,6,8,10,11],
    Mars:    [1,2,4,7,8,9,10,11],
    Mercury: [1,3,5,6,9,10,11,12],
    Jupiter: [6,8,11,12],
    Venus:   [1,2,3,4,5,8,9,11],
    Saturn:  [1,2,4,7,8,9,10,11],
    Lagna:   [1,2,4,6,8,10,11],
  },
  Jupiter: {
    Sun:     [1,2,3,4,7,8,9,10,11],
    Moon:    [2,5,7,9,11],
    Mars:    [1,2,4,7,8,10,11],
    Mercury: [1,2,4,5,6,9,10,11],
    Jupiter: [1,2,3,4,7,8,10,11],
    Venus:   [2,5,6,9,10,11],
    Saturn:  [3,5,6,12],
    Lagna:   [1,2,4,5,6,7,9,10,11],
  },
  Venus: {
    Sun:     [8,11,12],
    Moon:    [1,2,3,4,5,8,9,11,12],
    Mars:    [3,4,6,9,11,12],
    Mercury: [3,5,6,9,11],
    Jupiter: [5,8,9,10,11],
    Venus:   [1,2,3,4,5,8,9,10,11],
    Saturn:  [3,4,5,8,9,10,11],
    Lagna:   [1,2,3,4,5,8,9,10,11],
  },
  Saturn: {
    Sun:     [1,2,4,7,8,10,11],
    Moon:    [3,6,11],
    Mars:    [3,5,6,10,11,12],
    Mercury: [6,8,9,10,11,12],
    Jupiter: [5,6,11,12],
    Venus:   [6,11,12],
    Saturn:  [3,5,6,11],
    Lagna:   [1,3,4,6,10,11],
  },
};

// ── Core computation ─────────────────────────────────────────
// planets: array from factSheet with .name and .sign
// lagnaSign: ascendant sign
// Returns: { byPlanet: { Saturn: [bindus per sign], ... }, sarva: [0-56 per sign] }
export function buildAshtakavarga(planets, lagnaSign) {
  if (!planets || !lagnaSign) return null;

  const lagnaIdx = SIGNS.indexOf(lagnaSign);
  if (lagnaIdx === -1) return null;

  // Get sign index for each planet
  const signIdx = {};
  for (const p of planets) {
    signIdx[p.name] = SIGNS.indexOf(p.sign);
  }
  signIdx['Lagna'] = lagnaIdx;

  const byPlanet = {};
  const sarva = new Array(12).fill(0);

  for (const [planet, table] of Object.entries(BINDU_TABLES)) {
    const bindus = new Array(12).fill(0);

    for (const [contributor, houseList] of Object.entries(table)) {
      const contribIdx = signIdx[contributor];
      if (contribIdx === undefined || contribIdx === -1) continue;

      for (const house of houseList) {
        const targetIdx = (contribIdx + house - 1) % 12;
        bindus[targetIdx]++;
      }
    }

    byPlanet[planet] = bindus;
    for (let i = 0; i < 12; i++) sarva[i] += bindus[i];
  }

  // ── Trikona shodhana (reduction by trine) — classical refinement ──
  // Remove the minimum bindu value from each trikona group
  const shodhana = (arr) => {
    const result = [...arr];
    const trikonas = [[0,4,8],[1,5,9],[2,6,10],[3,7,11]];
    for (const [a,b,c] of trikonas) {
      const min = Math.min(result[a], result[b], result[c]);
      result[a] -= min; result[b] -= min; result[c] -= min;
    }
    return result;
  };

  const sarvaAfterShodhana = shodhana(sarva);

  return {
    byPlanet,              // raw bindus per planet per sign
    sarva,                 // total bindus per sign (0-56)
    sarvaReduced: sarvaAfterShodhana,  // after trikona shodhana
    lagnaSign,
    // Precomputed strength rating per sign
    signStrength: SIGNS.map((sign, i) => ({
      sign,
      signHi: ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'][i],
      bindus: sarva[i],
      reduced: sarvaAfterShodhana[i],
      rating: sarva[i] >= 30 ? 'excellent' : sarva[i] >= 25 ? 'good' : sarva[i] >= 20 ? 'average' : 'weak',
    })),
  };
}

// ── Transit strength using Ashtakavarga ──────────────────────
// Given a transiting planet and the sign it's in, return how strong
// that transit is based on the natal Ashtakavarga bindus.
export function getTransitStrength(avData, transitPlanet, transitSign) {
  if (!avData?.byPlanet?.[transitPlanet]) return null;
  const idx = SIGNS.indexOf(transitSign);
  if (idx === -1) return null;

  const bindus = avData.byPlanet[transitPlanet][idx];
  const sarva  = avData.sarva[idx];

  return {
    planet:  transitPlanet,
    sign:    transitSign,
    bindus,
    sarva,
    // Classical threshold: 4+ = good transit, below 4 = weak
    isStrongTransit: bindus >= 4,
    strengthLabel: bindus >= 5 ? 'अत्यंत शुभ' : bindus >= 4 ? 'शुभ' : bindus >= 3 ? 'सामान्य' : 'दुर्बल',
    note: `${transitPlanet} ${transitSign} में ${bindus} बिंदु — ${bindus >= 4 ? 'इस गोचर से लाभ होगा' : 'यह गोचर कमज़ोर है, सतर्कता रखें'}`,
  };
}

// ── Format for AI prompt ─────────────────────────────────────
export function formatAVForPrompt(avData, currentTransits) {
  if (!avData) return '';

  const lines = ['ASHTAKAVARGA (गोचर की असली शक्ति):'];

  // Show bindus for currently transiting planets
  if (currentTransits) {
    for (const t of currentTransits) {
      if (!['Saturn','Jupiter','Mars','Rahu'].includes(t.name)) continue;
      const strength = getTransitStrength(avData, t.name, t.currentSign);
      if (strength) {
        lines.push(`• ${t.nameHi} गोचर (${t.currentSignHi}): ${strength.bindus} बिंदु — ${strength.strengthLabel}`);
      }
    }
  }

  // Top 3 strongest signs (good periods when planets transit here)
  const top3 = [...avData.signStrength].sort((a,b) => b.bindus - a.bindus).slice(0,3);
  lines.push(`सबसे शुभ राशियाँ (जब ग्रह यहाँ जाएं): ${top3.map(s => `${s.signHi}(${s.bindus})`).join(', ')}`);

  // Bottom 3 weakest
  const bot3 = [...avData.signStrength].sort((a,b) => a.bindus - b.bindus).slice(0,3);
  lines.push(`सबसे कमज़ोर राशियाँ: ${bot3.map(s => `${s.signHi}(${s.bindus})`).join(', ')}`);

  lines.push('IMPORTANT: Jab transit prediction do, in bindus ka use karo — high bindus = transit zyada fal dega, low bindus = transit kamzor rahega chahe planet strong ho.');

  return lines.join('\n');
}

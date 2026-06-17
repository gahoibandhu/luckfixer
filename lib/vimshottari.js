// lib/vimshottari.js
//
// Complete Vimshottari Dasha calculation engine (Parashari system).
// Inputs: Moon's sidereal longitude (degrees), exact birth date.
// Outputs: Maha Dasha, Antar Dasha, Pratyantar Dasha with start/end dates.
//
// This is purely deterministic — no AI, no ephemeris call needed.
// The Moon's nakshatra and exact degree within it determine the
// elapsed portion of the starting dasha, from which all subsequent
// periods are derived by simple arithmetic.

// ── Dasha sequence and durations (years) ──────────────────────
const DASHA_LORDS   = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const DASHA_YEARS   = { Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17 };
const TOTAL_YEARS   = 120; // sum of all dasha periods

const PLANETS_HI = {
  Ketu:'केतु', Venus:'शुक्र', Sun:'सूर्य', Moon:'चंद्र', Mars:'मंगल',
  Rahu:'राहु', Jupiter:'बृहस्पति', Saturn:'शनि', Mercury:'बुध'
};

// Nakshatra lords in order (27 nakshatras, cycling through dasha lords)
const NAK_LORDS = [
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // 1-9
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // 10-18
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // 19-27
];

// Each nakshatra spans 360/27 = 13.333... degrees
const NAK_SPAN = 360 / 27;

// ── Date arithmetic ────────────────────────────────────────────
// Add fractional years to a Date object (handles leap years approximately)
function addYears(date, years) {
  const ms = years * 365.25 * 24 * 60 * 60 * 1000;
  return new Date(date.getTime() + ms);
}

function formatDate(date) {
  return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function dateLabel(date) {
  return date.toLocaleDateString('hi-IN', { day:'numeric', month:'long', year:'numeric' });
}

// ── Core calculation ───────────────────────────────────────────
export function calcVimshottari(moonLongitude, birthDateStr) {
  const birthDate = new Date(birthDateStr + 'T00:00:00Z');

  // Which nakshatra is the Moon in?
  const moonDeg = ((moonLongitude % 360) + 360) % 360;
  const nakIndex = Math.floor(moonDeg / NAK_SPAN);           // 0-26
  const degInNak = moonDeg - nakIndex * NAK_SPAN;            // 0..13.33°

  // Fraction of nakshatra elapsed → fraction of starting dasha elapsed
  const fracElapsed = degInNak / NAK_SPAN;                   // 0..1

  // Starting dasha lord
  const startLord = NAK_LORDS[nakIndex];
  const startDashaYears = DASHA_YEARS[startLord];

  // Years already elapsed in the starting dasha at birth
  const yearsElapsed = fracElapsed * startDashaYears;

  // Start of the current (birth-time) dasha, projected backwards
  const birthDashaStart = addYears(birthDate, -yearsElapsed);

  // Build the full sequence of Maha Dashas from birth
  // We'll generate enough to cover 120 years from birth
  const mahadashas = [];
  let startLordIdx = DASHA_LORDS.indexOf(startLord);
  let cursor = birthDashaStart;

  for (let i = 0; i < 9; i++) {
    const lordIdx = (startLordIdx + i) % 9;
    const lord = DASHA_LORDS[lordIdx];
    const years = DASHA_YEARS[lord];
    const end = addYears(cursor, years);
    mahadashas.push({ lord, lordHi: PLANETS_HI[lord], years, start: cursor, end });
    cursor = end;
  }

  // ── Antar Dashas within each Maha Dasha ───────────────────
  for (const md of mahadashas) {
    md.antarDashas = [];
    let adCursor = md.start;
    const mdLordIdx = DASHA_LORDS.indexOf(md.lord);

    for (let j = 0; j < 9; j++) {
      const adLordIdx = (mdLordIdx + j) % 9;
      const adLord = DASHA_LORDS[adLordIdx];
      // Antar dasha duration = (MD years × AD years) / 120
      const adYears = (md.years * DASHA_YEARS[adLord]) / TOTAL_YEARS;
      const adEnd = addYears(adCursor, adYears);
      md.antarDashas.push({
        lord: adLord,
        lordHi: PLANETS_HI[adLord],
        years: parseFloat(adYears.toFixed(4)),
        start: adCursor,
        end: adEnd,
      });
      adCursor = adEnd;
    }
  }

  // ── Pratyantar Dashas within current Antar Dasha ──────────
  // Find which MD and AD are currently active (today)
  const today = new Date();

  const currentMD = mahadashas.find(md => today >= md.start && today < md.end) || mahadashas[0];
  const currentAD = currentMD.antarDashas.find(ad => today >= ad.start && today < ad.end) || currentMD.antarDashas[0];

  // Pratyantar dashas within currentAD
  const pratyantar = [];
  let pdCursor = currentAD.start;
  const adLordIdx = DASHA_LORDS.indexOf(currentAD.lord);

  for (let k = 0; k < 9; k++) {
    const pdLordIdx = (adLordIdx + k) % 9;
    const pdLord = DASHA_LORDS[pdLordIdx];
    // PD duration = (AD years × PD years) / 120
    const pdYears = (currentAD.years * DASHA_YEARS[pdLord]) / TOTAL_YEARS;
    const pdEnd = addYears(pdCursor, pdYears);
    const pdDays = Math.round(pdYears * 365.25);
    pratyantar.push({
      lord: pdLord,
      lordHi: PLANETS_HI[pdLord],
      years: parseFloat(pdYears.toFixed(6)),
      days: pdDays,
      start: pdCursor,
      end: pdEnd,
      startLabel: dateLabel(pdCursor),
      endLabel: dateLabel(pdEnd),
      isCurrent: today >= pdCursor && today < pdEnd,
    });
    pdCursor = pdEnd;
  }

  const currentPD = pratyantar.find(p => p.isCurrent) || pratyantar[0];

  // Days remaining in current period
  const daysLeftPD = Math.max(0, Math.round((currentPD.end - today) / (1000*60*60*24)));
  const daysLeftAD = Math.max(0, Math.round((currentAD.end - today) / (1000*60*60*24)));
  const daysLeftMD = Math.max(0, Math.round((currentMD.end - today) / (1000*60*60*24)));

  return {
    moonNakshatra: {
      index: nakIndex,
      degree: parseFloat(moonDeg.toFixed(4)),
      degInNak: parseFloat(degInNak.toFixed(4)),
      lord: startLord,
      lordHi: PLANETS_HI[startLord],
    },
    mahadashas: mahadashas.map(md => ({
      lord: md.lord,
      lordHi: md.lordHi,
      years: md.years,
      start: formatDate(md.start),
      end: formatDate(md.end),
      isCurrent: today >= md.start && today < md.end,
      antarDashas: md.antarDashas.map(ad => ({
        lord: ad.lord,
        lordHi: ad.lordHi,
        years: ad.years,
        start: formatDate(ad.start),
        end: formatDate(ad.end),
        isCurrent: today >= ad.start && today < ad.end,
      })),
    })),
    current: {
      mahaDasha: {
        lord: currentMD.lord,
        lordHi: currentMD.lordHi,
        start: formatDate(currentMD.start),
        end: formatDate(currentMD.end),
        daysLeft: daysLeftMD,
      },
      antarDasha: {
        lord: currentAD.lord,
        lordHi: currentAD.lordHi,
        start: formatDate(currentAD.start),
        end: formatDate(currentAD.end),
        daysLeft: daysLeftAD,
        years: currentAD.years,
      },
      pratyantarDasha: {
        lord: currentPD.lord,
        lordHi: currentPD.lordHi,
        start: formatDate(currentPD.start),
        end: formatDate(currentPD.end),
        days: currentPD.days,
        daysLeft: daysLeftPD,
        startLabel: currentPD.startLabel,
        endLabel: currentPD.endLabel,
      },
      allPratyantar: pratyantar.map(p => ({
        lord: p.lord,
        lordHi: p.lordHi,
        days: p.days,
        start: formatDate(p.start),
        end: formatDate(p.end),
        startLabel: p.startLabel,
        endLabel: p.endLabel,
        isCurrent: p.isCurrent,
      })),
    },
  };
}

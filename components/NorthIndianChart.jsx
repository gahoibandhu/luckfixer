'use client';
// components/NorthIndianChart.jsx
//
// North Indian style Rasi (D1/Lagna) chart — the classical diamond
// layout common across the Hindi-speaking belt: house POSITIONS are
// fixed on screen (house 1 always the top kite-shape, going clockwise),
// while which rasi (sign) falls in which house depends on the lagna.
//
// Pure presentation — takes already-computed data (planet.house is
// whole-sign house-from-lagna, already calculated deterministically in
// astro-facts.js). No astrology math happens in this component.

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

const PLANET_ABBR_HI = {
  Sun: 'सू', Moon: 'चं', Mars: 'मं', Mercury: 'बु',
  Jupiter: 'गु', Venus: 'शु', Saturn: 'श', Rahu: 'रा', Ketu: 'के',
};

// Fixed geometry (400x400 viewBox) — see derivation notes in the PR:
// the square + both full diagonals + the diamond joining edge-midpoints
// splits the square into exactly 12 regions: 4 "kite" shapes at the
// cardinal points (houses 1/4/7/10) and 8 corner triangles (the rest),
// which is the standard North Indian chart construction.
const HOUSE_CELLS = {
  1:  { points: '200,200 100,100 200,0 300,100',   num: [200, 28],  text: [200, 128] },
  2:  { points: '400,0 200,0 300,100',              num: [300, 22],  text: [300, 55] },
  3:  { points: '400,0 400,200 300,100',            num: [372, 100], text: [345, 100] },
  4:  { points: '200,200 300,100 400,200 300,300',  num: [372, 200], text: [272, 200] },
  5:  { points: '400,400 400,200 300,300',          num: [372, 300], text: [345, 300] },
  6:  { points: '400,400 200,400 300,300',          num: [300, 378], text: [300, 345] },
  7:  { points: '200,200 300,300 200,400 100,300',  num: [200, 372], text: [200, 272] },
  8:  { points: '0,400 200,400 100,300',            num: [100, 378], text: [100, 345] },
  9:  { points: '0,400 0,200 100,300',               num: [28, 300],  text: [55, 300] },
  10: { points: '200,200 100,300 0,200 100,100',    num: [28, 200],  text: [128, 200] },
  11: { points: '0,0 0,200 100,100',                 num: [28, 100],  text: [55, 100] },
  12: { points: '0,0 200,0 100,100',                 num: [100, 22],  text: [100, 55] },
};

export default function NorthIndianChart({ planets, lagnaSign }) {
  if (!planets || !lagnaSign) return null;
  const lagnaIdx = SIGNS.indexOf(lagnaSign);
  if (lagnaIdx === -1) return null;

  // Group planets by house (1-12, already computed relative to lagna)
  const byHouse = {};
  planets.forEach(p => {
    if (!p.house) return;
    if (!byHouse[p.house]) byHouse[p.house] = [];
    byHouse[p.house].push(p);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox="0 0 400 400" style={{ width: '100%', maxWidth: '360px', height: 'auto' }}>
        {/* Outer square */}
        <rect x="0" y="0" width="400" height="400" fill="var(--color-background-primary)" stroke="var(--color-border-secondary)" strokeWidth="2" />
        {/* Both diagonals */}
        <line x1="0" y1="0" x2="400" y2="400" stroke="var(--color-border-secondary)" strokeWidth="1.5" />
        <line x1="400" y1="0" x2="0" y2="400" stroke="var(--color-border-secondary)" strokeWidth="1.5" />
        {/* Inner diamond (edge midpoints) */}
        <polygon points="200,0 400,200 200,400 0,200" fill="none" stroke="var(--color-border-secondary)" strokeWidth="1.5" />

        {Object.entries(HOUSE_CELLS).map(([houseStr, cell]) => {
          const house = parseInt(houseStr, 10);
          const rasiNum = ((lagnaIdx + house - 1) % 12) + 1;
          const isLagna = house === 1;
          const occupants = byHouse[house] || [];
          return (
            <g key={house}>
              {isLagna && (
                <polygon points={cell.points} fill="var(--color-brand-light)" opacity="0.5" />
              )}
              <text x={cell.num[0]} y={cell.num[1]} textAnchor="middle" fontSize="12" fill="var(--color-text-tertiary)">{rasiNum}</text>
              {isLagna && (
                <text x={cell.num[0]} y={cell.num[1] + 14} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-brand)">ल</text>
              )}
              <text x={cell.text[0]} y={cell.text[1]} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-text-primary)">
                {occupants.map((p, i) => (
                  <tspan key={p.name} x={cell.text[0]} dy={i === 0 ? 0 : 15}>
                    {PLANET_ABBR_HI[p.name] || p.name}{p.retro ? ' (व)' : ''}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
      <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '10px', textAlign: 'center' }}>
        छोटा अंक = राशि क्रमांक (1=मेष...12=मीन) · ल = लग्न · (व) = वक्री
      </p>
    </div>
  );
}

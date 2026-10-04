// lib/brand.js — single source of truth for the product name / site URL.
// Public pages (rashifal, rashi, moolank, ram-shalaka) read from here, so the planned
// Luckfixer -> AstroFix rebrand is a one-line change for them. (Old pages still hard-code the name;
// they are handled in the rebrand sweep — see AstroFix-master-plan.md, Phase 3.)
export const BRAND = {
  name: 'Luckfixer',
  tagline: { hi: 'AI वैदिक ज्योतिष चैट', en: 'AI Vedic astrology chat' },
  site: 'https://luckfixer.jaigahoi.in',
  contactEmail: '',   // TODO: set a real support address — shown on /about, /privacy, /terms once filled
};

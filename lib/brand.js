// lib/brand.js — single source of truth for the product name / site URL.
// Public pages (rashifal, rashi, moolank, ram-shalaka) read from here, so the planned
// Luckfixer -> AstroFix rebrand is a one-line change for them. (Old pages still hard-code the name;
// they are handled in the rebrand sweep — see AstroFix-master-plan.md, Phase 3.)
export const BRAND = {
  name: 'Luckfixer',
  tagline: { hi: 'AI वैदिक ज्योतिष चैट', en: 'AI Vedic astrology chat' },
  site: 'https://luckfixer.jaigahoi.in',
  // The logo lives at this URL; the new logo will be uploaded to the SAME link, so every page just reads it from here.
  logo: 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg',
  contactEmail: '',   // TODO: set a real support address — shown on /about, /privacy, /terms once filled
};

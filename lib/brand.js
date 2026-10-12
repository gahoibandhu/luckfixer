// lib/brand.js — single source of truth for the product name / site URL.
// Public pages (rashifal, rashi, moolank, ram-shalaka) read from here, so the planned
// product-name changes are a one-line change for them. (Brand: AstroBharat, domain astrobharat.in.)
export const BRAND = {
  name: 'AstroBharat',
  tagline: { hi: 'AI वैदिक ज्योतिष चैट', en: 'AI Vedic astrology chat' },
  // One place for the public address. Set NEXT_PUBLIC_SITE_URL in Vercel (e.g. https://astrobharat.in) to move the whole site
  // (canonical links, sitemap, robots, share texts) to a new domain without a code change.
  site: (process.env.NEXT_PUBLIC_SITE_URL || 'https://luckfixer.jaigahoi.in').replace(/\/+$/, ''),
  host: (process.env.NEXT_PUBLIC_SITE_URL || 'https://luckfixer.jaigahoi.in').replace(/^https?:\/\//, '').replace(/\/+$/, ''),
  // Logo files live in /public/brand (served from our own domain: no third-party CDN, works offline-first, same file for header, e-mails and share cards).
  logo: '/brand/logo-mark-256.png',          // transparent rounded mark - headers, login, chat
  ogImage: '/brand/og-share.png',            // 1200x630 share card (Open Graph / WhatsApp / Twitter)
  logoFull: '/brand/logo-full-light.png',    // full logo with wordmark on a light background (print, documents)
  contactEmail: '',   // TODO: set a real support address — shown on /about, /privacy, /terms once filled
};

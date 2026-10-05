// components/PublicShell.jsx — header / footer for the no-login public pages. Server component.
import Link from 'next/link';
import Bi from '@/components/Bi';
import LangToggle from '@/components/LangToggle';
import { BRAND } from '@/lib/brand';
import { DISCLAIMER } from '@/lib/public-content';
import { mukta, tiro } from '@/lib/public-fonts';

export const NAV = [
  { href: '/',            hi: 'होम',          en: 'Home' },
  { href: '/panchang',    hi: 'पंचांग',       en: 'Panchang' },
  { href: '/rashifal',    hi: 'राशिफल',       en: 'Horoscope' },
  { href: '/meri-rashi',  hi: 'मेरी राशि',    en: 'My rashi' },
  { href: '/moolank',     hi: 'अंक ज्योतिष',  en: 'Numerology' },
  { href: '/tools',       hi: 'सभी टूल',      en: 'All tools' },
];

// kept for the existing public components
export const card = { background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '14px', padding: '16px' };

export default function PublicShell({ children, flush = false }) {
  return (
    <div className={`pub ${mukta.variable} ${tiro.variable}`} style={{ minHeight: '100vh' }}>
      <header className="pub-header">
        <div className="pub-wrap pub-header-in">
          <Link href="/" className="pub-brandlink" aria-label={`${BRAND.name} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt={BRAND.name} width="38" height="38" className="pub-logo" />
            <span className="pub-brand">{BRAND.name}</span>
          </Link>
          <LangToggle />
          <Link href="/login" className="pub-btn pub-btn-gold" style={{ minHeight: '38px', padding: '0 14px', fontSize: '14px', whiteSpace: 'nowrap', color: '#251a00' }}><Bi hi="AI चैट" en="AI chat" /></Link>
          <nav className="pub-nav" aria-label="Main">
            {NAV.map(n => <Link key={n.href} href={n.href}><Bi hi={n.hi} en={n.en} /></Link>)}
          </nav>
        </div>
      </header>
      {flush ? children : <main className="pub-wrap" style={{ paddingTop: '22px', paddingBottom: '8px' }}>{children}</main>}
      <Link href="/login" className="pub-fab" aria-label="AI chat"><span aria-hidden="true">💬</span><Bi hi="AI से चैट करें" en="Chat with AI" /></Link>
      <footer className="pub-footer">
        <div className="pub-wrap" style={{ padding: '26px 16px 30px', lineHeight: 1.8 }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <Link href="/about"><Bi hi="हमारे बारे में" en="About" /></Link>
            <Link href="/privacy"><Bi hi="गोपनीयता नीति" en="Privacy" /></Link>
            <Link href="/terms"><Bi hi="नियम व शर्तें" en="Terms" /></Link>
            <Link href="/"><Bi hi="होम" en="Home" /></Link>
            <Link href="/rashi"><Bi hi="राशि गाइड" en="Rashi guide" /></Link>
            <Link href="/vrat-calendar"><Bi hi="व्रत कैलेंडर" en="Vrat calendar" /></Link>
          </div>
          <p style={{ margin: '0 0 6px' }}><Bi hi={DISCLAIMER.hi} en={DISCLAIMER.en} /></p>
          <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" width="22" height="22" className="pub-logo" style={{ width: 22, height: 22 }} /> © {new Date().getFullYear()} {BRAND.name}
          </p>
        </div>
      </footer>
    </div>
  );
}

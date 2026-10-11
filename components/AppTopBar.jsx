'use client';
// Desktop-only slim bar on the logged-in app pages so every page has a visible link back to the home page.
// (On mobile the bottom tab bar has a Home tab; /chat has the link in its sidebar.)
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiLang } from '@/lib/i18n';
import { BRAND } from '@/lib/brand';

const HIDE = ['/chat', '/login', '/admin', '/auth'];
const PUBLIC = ['/rashi', '/rashifal', '/moolank', '/panchang', '/meri-rashi', '/manglik', '/sade-sati', '/vrat-calendar', '/gita-shlok', '/aaj-ka-upay', '/aarti', '/vrat', '/tyohar', '/tools', '/about', '/privacy', '/terms'];

export default function AppTopBar() {
  const pathname = usePathname();
  const en = useUiLang() === 'en';
  const hidden = pathname === '/' || [...HIDE, ...PUBLIC].some(x => pathname === x || pathname.startsWith(x + '/'));
  if (hidden) return null;
  return (
    <div className="lf-app-topbar">
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>
        {en ? 'Home' : 'होम'} · {BRAND.name}
      </Link>
    </div>
  );
}

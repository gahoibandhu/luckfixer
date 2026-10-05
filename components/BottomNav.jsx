'use client';
// components/BottomNav.jsx
//
// Mobile-only bottom tab strip — always visible, on every page,
// per explicit request (helps users jump between sections from
// anywhere, including mid-chat). /chat manages its own fixed-height
// shell (see .lf-chat-shell in globals.css) so it doesn't need the
// in-flow spacer below — every other page does. See globals.css for
// the mobile-only display + fixed positioning + safe-area handling.

import { usePathname, useRouter } from 'next/navigation';
import { House, MessageCircle, LayoutGrid, Hash, Disc3, User } from 'lucide-react';

const TABS = [
  { href: '/',            label: 'Home',        icon: House },
  { href: '/chat',        label: 'Chat',        icon: MessageCircle },
  { href: '/kundli',      label: 'Kundli',       icon: LayoutGrid },
  { href: '/numerology',  label: 'Numerology',  icon: Hash },
  { href: '/ram-shalaka', label: 'Ram Shalaka', icon: Disc3 },
  { href: '/profile',     label: 'Profile',     icon: User },
];

// Only /chat sizes its own shell to leave room for the bar — everywhere
// else needs the spacer so trailing content clears it.
const OWNS_ITS_OWN_SPACE = ['/chat'];

// Public no-login pages have their own header/footer; the app's tab bar would send logged-out visitors to /login.
const PUBLIC_PREFIXES = ['/rashi', '/rashifal', '/moolank', '/panchang', '/meri-rashi', '/manglik', '/sade-sati', '/vrat-calendar', '/gita-shlok', '/aaj-ka-upay', '/tools', '/about', '/privacy', '/terms'];
const isPublicPath = (p) => p === '/' || PUBLIC_PREFIXES.some(x => p === x || p.startsWith(x + '/'));

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  if (isPublicPath(pathname)) return null;

  return (
    <>
      {!OWNS_ITS_OWN_SPACE.includes(pathname) && <div className="lf-bottom-nav-spacer" />}
      <nav className="lf-bottom-nav">
      {TABS.map(({ href, label, icon: Icon }) => {
        // /kundli covers /kundli and /milan (matchmaking lives under it)
        const active = href === '/kundli'
          ? (pathname === '/kundli' || pathname === '/milan')
          : pathname === href;   // '/' is a public path, so the bar is hidden there
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="lf-bottom-nav-item"
            style={{ color: active ? '#da7756' : 'var(--color-text-tertiary)' }}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
            <span>{label}</span>
          </button>
        );
      })}
      </nav>
    </>
  );
}

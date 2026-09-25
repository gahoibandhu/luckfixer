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
import { MessageCircle, LayoutGrid, Hash, Disc3, User } from 'lucide-react';

const TABS = [
  { href: '/chat',        label: 'Chat',        icon: MessageCircle },
  { href: '/kundli',      label: 'Kundli',       icon: LayoutGrid },
  { href: '/numerology',  label: 'Numerology',  icon: Hash },
  { href: '/ram-shalaka', label: 'Ram Shalaka', icon: Disc3 },
  { href: '/profile',     label: 'Profile',     icon: User },
];

// Only /chat sizes its own shell to leave room for the bar — everywhere
// else needs the spacer so trailing content clears it.
const OWNS_ITS_OWN_SPACE = ['/chat'];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {!OWNS_ITS_OWN_SPACE.includes(pathname) && <div className="lf-bottom-nav-spacer" />}
      <nav className="lf-bottom-nav">
      {TABS.map(({ href, label, icon: Icon }) => {
        // /kundli covers /kundli and /milan (matchmaking lives under it)
        const active = href === '/kundli'
          ? (pathname === '/kundli' || pathname === '/milan')
          : pathname === href;
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

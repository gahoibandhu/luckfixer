'use client';
// components/BottomNav.jsx
//
// Mobile-only bottom tab strip. Deliberately NOT shown on /chat, /admin,
// or /login — /chat and the auth pages get their own full-screen or
// dedicated navigation, and a chat conversation's composer already owns
// the bottom of the screen (standard pattern: tap into a focused flow,
// the tab bar steps aside). See app/globals.css for the mobile-only
// display + fixed positioning + safe-area handling.

import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle, LayoutGrid, Hash, Disc3, User } from 'lucide-react';

const TABS = [
  { href: '/chat',        label: 'Chat',        icon: MessageCircle },
  { href: '/kundli',      label: 'Kundli',       icon: LayoutGrid },
  { href: '/numerology',  label: 'Numerology',  icon: Hash },
  { href: '/ram-shalaka', label: 'Ram Shalaka', icon: Disc3 },
  { href: '/profile',     label: 'Profile',     icon: User },
];

const HIDDEN_ON = ['/chat', '/admin', '/login', '/'];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <>
      {/* In-flow spacer so the last bit of real page content clears the
          fixed bar below it — see the CSS comment for why this can't
          just be a blanket `body` padding rule. */}
      <div className="lf-bottom-nav-spacer" />
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

'use client';
// Marks "the visitor has already opened a page in this browser tab". The home page uses it so signed-in people are
// sent to /chat only when the home page is the FIRST page of their visit — never when they tap a "Home" link inside the site.
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
export default function SessionMark() {
  const pathname = usePathname();
  useEffect(() => { try { window.sessionStorage.setItem('lf_entered', '1'); } catch { /* private mode */ } }, [pathname]);
  return null;
}

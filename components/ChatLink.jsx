'use client';
// A link to the AI chat that knows whether the visitor is signed in.
// Signed out -> /login (label = children). Signed in -> /chat (label = authedChildren, if given).
// Public pages stay static/cached: the login state is read in the browser after load, never on the server,
// so a cached page can never show the wrong state to a signed-in visitor.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export function useAuthed() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    let alive = true;
    let sub;
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }) => { if (alive) setAuthed(!!data?.session); }).catch(() => {});
      const res = supabase.auth.onAuthStateChange((_e, session) => { if (alive) setAuthed(!!session); });
      sub = res?.data?.subscription;
    } catch { /* env missing in preview builds: stay logged-out */ }
    return () => { alive = false; sub?.unsubscribe?.(); };
  }, []);
  return authed;
}

export default function ChatLink({ children, authedChildren, ...props }) {
  const authed = useAuthed();
  return <Link href={authed ? '/chat' : '/login'} {...props}>{authed && authedChildren ? authedChildren : children}</Link>;
}

'use client';
// Signed-in visitors who OPEN the site on the home page land straight in the chat. If they come back to the home page
// by tapping a Home link (not the first page of the visit) they stay on it. Renders nothing.
//
// The "first page of the visit" flag is read during RENDER (useState initialiser), because <SessionMark/> in the root
// layout sets it in an effect that runs before this component's effect.
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function AuthRedirect() {
  const router = useRouter();
  const [firstPage] = useState(() => {
    try { return !window.sessionStorage.getItem('lf_entered'); } catch { return true; }   // server render / private mode
  });
  useEffect(() => {
    if (!firstPage) return;
    createClient().auth.getSession().then(({ data: { session } }) => { if (session) router.replace('/chat'); }).catch(() => {});
  }, [firstPage, router]);
  return null;
}

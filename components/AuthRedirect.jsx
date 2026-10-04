'use client';
// Signed-in visitors who open the home page go straight to their profile (as the app did before);
// everyone else just sees the public page. Renders nothing.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
export default function AuthRedirect() {
  const router = useRouter();
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => { if (session) router.replace('/profile'); }).catch(() => {});
  }, [router]);
  return null;
}

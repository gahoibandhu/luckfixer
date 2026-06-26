'use client';
// app/page.jsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      router.push(session ? '/chat' : '/login');
    }
    check();
  }, []);

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ fontSize:'14px', color:'var(--color-text-secondary)' }}>Loading...</p>
    </div>
  );
}

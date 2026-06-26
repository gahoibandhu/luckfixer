// app/auth/callback/route.js
import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);

    if (session) {
      // Upsert profile on first Google login
      await supabase.from('user_profiles').upsert({
        id:         session.user.id,
        email:      session.user.email,
        full_name:  session.user.user_metadata?.full_name || '',
        avatar_url: session.user.user_metadata?.avatar_url || '',
      }, { onConflict: 'id', ignoreDuplicates: true });
    }
  }

  return NextResponse.redirect(new URL('/chat', request.url));
}

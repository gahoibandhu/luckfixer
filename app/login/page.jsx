'use client';
// app/login/page.jsx
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

const LOGO_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';

export default function LoginPage() {
  const supabase = createClient();
  const router   = useRouter();
  const [mode, setMode]       = useState('choice');
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [step, setStep]       = useState('enter');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [msg, setMsg]         = useState('');

  async function signInWithGoogle() {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function sendOtp(e) {
    e.preventDefault();
    if (!email) return setError('Email डालें');
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) { setError(error.message); setLoading(false); return; }
    setMsg(`OTP भेजा गया: ${email}`);
    setStep('verify');
    setLoading(false);
  }

  async function verifyOtp(e) {
    e.preventDefault();
    if (!otp) return setError('OTP डालें');
    setLoading(true); setError('');
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    if (error) { setError('गलत OTP। दोबारा कोशिश करें।'); setLoading(false); return; }
    await supabase.from('user_profiles').upsert({ id: data.user.id, email: data.user.email }, { onConflict: 'id' });
    router.push('/profile');
  }

  return (
    <div className="lf-page" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-background-tertiary)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle radial glow behind logo */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '320px',
        height: '320px',
        background: 'radial-gradient(circle, var(--color-brand-glow) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '400px', padding: '0 1rem', position: 'relative' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src={LOGO_URL} alt="Luckfixer" className="lf-logo-lg" style={{ margin: '0 auto 16px', display: 'block' }} />
          <span className="lf-brand-pill" style={{ marginBottom: '12px', display: 'inline-flex' }}>✦ Luckfixer 2.0</span>
          <h1 style={{ fontSize: '26px', fontWeight: '500', color: 'var(--color-text-primary)', margin: '10px 0 4px' }}>स्वागत है</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>Vedic ज्योतिष द्वारा जीवन-सुधार</p>
        </div>

        <div className="lf-card" style={{ padding: '1.5rem' }}>

          {mode === 'choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={signInWithGoogle} disabled={loading}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', padding:'11px', fontSize:'15px', background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', color:'var(--color-text-primary)', fontWeight:'500', transition:'all 0.15s ease' }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google से Login करें
              </button>

              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div className="lf-divider" style={{ flex:1, margin:0 }} />
                <span style={{ fontSize:'12px', color:'var(--color-text-tertiary)' }}>या</span>
                <div className="lf-divider" style={{ flex:1, margin:0 }} />
              </div>

              <button onClick={() => setMode('email')} className="lf-btn-primary">
                Email से Login करें
              </button>
            </div>
          )}

          {mode === 'email' && step === 'enter' && (
            <form onSubmit={sendOtp} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <button type="button" onClick={() => setMode('choice')} style={{ alignSelf:'flex-start', fontSize:'13px', color:'var(--color-text-tertiary)', background:'none', border:'none', cursor:'pointer', padding:0 }}>← वापस</button>
              <div>
                <label className="lf-label">Email पता</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={{ width:'100%', fontSize:'15px' }}/>
              </div>
              {error && <p style={{ fontSize:'13px', color:'var(--color-text-danger)', margin:0 }}>{error}</p>}
              <button type="submit" disabled={loading} className="lf-btn-primary">
                {loading ? 'भेज रहे हैं...' : 'OTP भेजें'}
              </button>
            </form>
          )}

          {mode === 'email' && step === 'verify' && (
            <form onSubmit={verifyOtp} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <p style={{ fontSize:'13px', color:'var(--color-text-secondary)', margin:0 }}>{msg}</p>
              <div>
                <label className="lf-label">6-digit OTP</label>
                <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="123456" maxLength={6} style={{ width:'100%', fontSize:'22px', letterSpacing:'8px', textAlign:'center' }}/>
              </div>
              {error && <p style={{ fontSize:'13px', color:'var(--color-text-danger)', margin:0 }}>{error}</p>}
              <button type="submit" disabled={loading} className="lf-btn-primary">
                {loading ? 'Verify हो रहा है...' : 'Verify करें'}
              </button>
              <button type="button" onClick={() => setStep('enter')} style={{ fontSize:'13px', color:'var(--color-text-tertiary)', background:'none', border:'none', cursor:'pointer' }}>दूसरा Email डालें</button>
            </form>
          )}
        </div>

        {/* Watermark */}
        <p style={{ textAlign:'center', fontSize:'10px', color:'var(--color-text-tertiary)', marginTop:'16px', opacity:0.6 }}>
          luckfixer.jaigahoi.in · Vedic Astrology AI
        </p>
      </div>
    </div>
  );
}

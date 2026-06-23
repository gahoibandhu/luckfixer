'use client';
// app/login/page.jsx — Hero login: 70% logo + assembly animation + 2 buttons
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

const LOGO_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';

// Assembly animation: 8 "pieces" fly in from different directions and converge
// onto the logo — simulates fixing/assembling the luck
const PIECES = [
  { id:1, from:{ x:'-120%', y:'-80%'  }, delay:0.0  },
  { id:2, from:{ x:'130%',  y:'-90%'  }, delay:0.08 },
  { id:3, from:{ x:'-140%', y:'20%'   }, delay:0.15 },
  { id:4, from:{ x:'140%',  y:'30%'   }, delay:0.22 },
  { id:5, from:{ x:'-100%', y:'110%'  }, delay:0.30 },
  { id:6, from:{ x:'120%',  y:'100%'  }, delay:0.36 },
  { id:7, from:{ x:'-20%',  y:'-130%' }, delay:0.44 },
  { id:8, from:{ x:'20%',   y:'130%'  }, delay:0.50 },
];

export default function LoginPage() {
  const supabase = createClient();
  const router   = useRouter();
  const [mode,    setMode]    = useState('choice');
  const [email,   setEmail]   = useState('');
  const [otp,     setOtp]     = useState('');
  const [step,    setStep]    = useState('enter');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [msg,     setMsg]     = useState('');
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Trigger assembly animation after a brief pause
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, []);

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0d0d0f',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* ── Ambient background glow ─────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(30,60,40,0.7) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'fixed',
        top: '15%', left: '50%',
        transform: 'translateX(-50%)',
        width: '340px', height: '340px',
        background: 'radial-gradient(circle, rgba(200,131,26,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ── HERO: Logo takes 70vh ────────────────────────────── */}
      <div style={{
        flex: '0 0 68vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Assembly pieces — fly in from edges */}
        {PIECES.map((piece) => (
          <div key={piece.id} style={{
            position: 'absolute',
            width: '18vw',
            height: '18vw',
            maxWidth: '90px',
            maxHeight: '90px',
            borderRadius: '30%',
            background: 'radial-gradient(circle, rgba(0,200,80,0.13) 0%, transparent 70%)',
            border: '1px solid rgba(0,200,80,0.15)',
            transform: animated
              ? 'translate(0,0) scale(0) rotate(0deg)'
              : `translate(${piece.from.x}, ${piece.from.y}) scale(1) rotate(${piece.id * 45}deg)`,
            opacity: animated ? 0 : 0.7,
            transition: `transform ${0.65 + piece.delay}s cubic-bezier(0.22,1,0.36,1) ${piece.delay}s, opacity ${0.4}s ease ${0.5 + piece.delay}s`,
            pointerEvents: 'none',
          }} />
        ))}

        {/* Main logo — assembles last */}
        <div style={{
          transform: animated ? 'scale(1)' : 'scale(0.3)',
          opacity: animated ? 1 : 0,
          transition: 'transform 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.45s, opacity 0.5s ease 0.45s',
          position: 'relative',
        }}>
          {/* Outer gold ring — pulsing */}
          <div style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '30%',
            background: 'linear-gradient(135deg, #c8831a 0%, #f0c060 40%, #c8831a 70%, #e8a030 100%)',
            animation: 'lf-ring-spin 8s linear infinite',
            zIndex: 0,
          }} />
          {/* Inner background to mask ring */}
          <div style={{
            position: 'absolute',
            inset: '-2px',
            borderRadius: '27%',
            background: '#0d0d0f',
            zIndex: 1,
          }} />
          {/* The logo itself */}
          <img
            src={LOGO_URL}
            alt="Luckfixer"
            style={{
              width: 'min(62vw, 260px)',
              height: 'min(62vw, 260px)',
              borderRadius: '26%',
              objectFit: 'cover',
              display: 'block',
              position: 'relative',
              zIndex: 2,
              animation: 'lf-logo-breathe-slow 4s ease-in-out infinite',
              boxShadow: '0 8px 60px rgba(0,200,80,0.2), 0 4px 20px rgba(200,131,26,0.3)',
            }}
          />
          {/* "FIXED" stamp — appears after assembly */}
          <div style={{
            position: 'absolute',
            bottom: '-16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #c8831a, #f0c060)',
            borderRadius: '999px',
            padding: '3px 14px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '3px',
            color: '#0d0d0f',
            opacity: animated ? 1 : 0,
            transition: 'opacity 0.4s ease 1.1s',
            zIndex: 3,
            whiteSpace: 'nowrap',
          }}>
            ✦ LUCKFIXER 2.0
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Tagline + 2 Buttons (30vh) ─────────────── */}
      <div style={{
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '28px 24px 32px',
        position: 'relative',
        zIndex: 1,
        opacity: animated ? 1 : 0,
        transform: animated ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.5s ease 0.9s, transform 0.5s ease 0.9s',
      }}>
        {mode === 'choice' && <>
          <h1 style={{
            fontSize: '26px',
            fontWeight: '600',
            color: '#f1efe8',
            margin: '0 0 6px',
            textAlign: 'center',
            letterSpacing: '-0.3px',
          }}>स्वागत है</h1>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.45)',
            margin: '0 0 28px',
            textAlign: 'center',
          }}>Vedic ज्योतिष · Parashari · Lal Kitab · Jaimini</p>

          {/* Google button */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            style={{
              width: '100%',
              maxWidth: '360px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '500',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '14px',
              cursor: 'pointer',
              color: '#f1efe8',
              marginBottom: '10px',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.13)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google से Login करें
          </button>

          {/* Email button */}
          <button
            onClick={() => setMode('email')}
            disabled={loading}
            style={{
              width: '100%',
              maxWidth: '360px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #c8831a 0%, #e8a030 100%)',
              border: 'none',
              borderRadius: '14px',
              cursor: 'pointer',
              color: '#0d0d0f',
              boxShadow: '0 4px 20px rgba(200,131,26,0.35)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 28px rgba(200,131,26,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(200,131,26,0.35)'; }}
          >
            Email से Login करें
          </button>

          <p style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', marginTop:'20px', letterSpacing:'0.5px' }}>
            luckfixer.jaigahoi.in · Vedic Astrology AI
          </p>
        </>}

        {/* Email OTP flow */}
        {mode === 'email' && step === 'enter' && (
          <div style={{ width:'100%', maxWidth:'360px' }}>
            <button type="button" onClick={() => setMode('choice')} style={{ fontSize:'13px', color:'rgba(255,255,255,0.45)', background:'none', border:'none', cursor:'pointer', padding:'0 0 16px', display:'block' }}>← वापस</button>
            <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'16px' }}>अपना Email डालें — हम एक OTP भेजेंगे</p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ width:'100%', fontSize:'16px', padding:'14px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.07)', color:'#f1efe8', marginBottom:'10px' }}
              onKeyDown={e => e.key==='Enter' && sendOtp(e)}
            />
            {error && <p style={{ fontSize:'13px', color:'#f09595', margin:'0 0 8px' }}>{error}</p>}
            <button
              onClick={sendOtp}
              disabled={loading}
              style={{ width:'100%', padding:'14px', fontSize:'15px', fontWeight:'600', background:'linear-gradient(135deg, #c8831a, #e8a030)', border:'none', borderRadius:'12px', cursor:'pointer', color:'#0d0d0f' }}
            >
              {loading ? 'भेज रहे हैं...' : 'OTP भेजें'}
            </button>
          </div>
        )}

        {mode === 'email' && step === 'verify' && (
          <div style={{ width:'100%', maxWidth:'360px' }}>
            <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'16px', textAlign:'center' }}>{msg}</p>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
              placeholder="_ _ _ _ _ _"
              maxLength={6}
              style={{ width:'100%', fontSize:'28px', letterSpacing:'14px', textAlign:'center', padding:'14px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.07)', color:'#f1efe8', marginBottom:'10px' }}
            />
            {error && <p style={{ fontSize:'13px', color:'#f09595', margin:'0 0 8px', textAlign:'center' }}>{error}</p>}
            <button
              onClick={verifyOtp}
              disabled={loading}
              style={{ width:'100%', padding:'14px', fontSize:'15px', fontWeight:'600', background:'linear-gradient(135deg, #c8831a, #e8a030)', border:'none', borderRadius:'12px', cursor:'pointer', color:'#0d0d0f', marginBottom:'10px' }}
            >
              {loading ? 'Verify हो रहा है...' : 'Verify करें →'}
            </button>
            <button type="button" onClick={() => setStep('enter')} style={{ display:'block', width:'100%', textAlign:'center', fontSize:'12px', color:'rgba(255,255,255,0.35)', background:'none', border:'none', cursor:'pointer' }}>दूसरा Email डालें</button>
          </div>
        )}
      </div>

      {/* CSS animations injected as style tag */}
      <style>{`
        @keyframes lf-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes lf-logo-breathe-slow {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 60px rgba(0,200,80,0.2), 0 4px 20px rgba(200,131,26,0.3); }
          50%       { transform: scale(1.04); box-shadow: 0 12px 80px rgba(0,200,80,0.3), 0 6px 32px rgba(200,131,26,0.45); }
        }
      `}</style>
    </div>
  );
}

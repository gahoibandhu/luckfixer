'use client';
// components/Header.jsx
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSavedUiLang, setSavedUiLang } from '@/lib/i18n';

const LOGO_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';

export default function Header({ subtitle, showHome = true }) {
  const router = useRouter();
  const [botName, setBotName] = useState('Luckfixer 2.0');
  const [uiLang, setUiLang] = useState('hi');

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => {
      if (d.botName) setBotName(d.botName);
    }).catch(() => {}); // keep default on failure — not worth a UI error for a display name
    setUiLang(getSavedUiLang());
  }, []);

  function toggleLang() {
    const next = uiLang === 'en' ? 'hi' : 'en';
    setUiLang(next);
    setSavedUiLang(next);
    // Other already-mounted pages/components only read the saved
    // preference on their own mount, so a full reload is the simplest
    // way to make the switch take effect everywhere immediately.
    if (typeof window !== 'undefined') window.location.reload();
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'0.5px solid var(--color-border-tertiary)', background:'var(--color-background-primary)' }}>
      <div onClick={() => router.push('/profile')} style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
        <img src={LOGO_URL} alt={botName} className="lf-logo-sm" />
        <div>
          <p style={{ margin:0, fontSize:'14px', fontWeight:'500', color:'var(--color-text-primary)' }}>{botName}</p>
          {subtitle && <p style={{ margin:0, fontSize:'11px', color:'var(--color-text-tertiary)' }}>{subtitle}</p>}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <button onClick={toggleLang} aria-label="Toggle language" title="Switch language" style={{ padding:'6px 10px', fontSize:'12px', fontWeight:'600', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', color:'var(--color-text-secondary)' }}>
          {uiLang === 'en' ? 'हि' : 'EN'}
        </button>
        {showHome && (
          <button onClick={() => router.push('/profile')} aria-label="Home" style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', fontSize:'13px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', color:'var(--color-text-primary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            {uiLang === 'en' ? 'Home' : 'होम'}
          </button>
        )}
      </div>
    </div>
  );
}

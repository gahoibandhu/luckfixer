'use client';
// components/Header.jsx
import { useRouter } from 'next/navigation';

const LOGO_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';

export default function Header({ subtitle, showHome = true }) {
  const router = useRouter();

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'0.5px solid var(--color-border-tertiary)', background:'var(--color-background-primary)' }}>
      <div onClick={() => router.push('/profile')} style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
        <img src={LOGO_URL} alt="Luckfixer" className="lf-logo-sm" />
        <div>
          <p style={{ margin:0, fontSize:'14px', fontWeight:'500', color:'var(--color-text-primary)' }}>Luckfixer 2.0</p>
          {subtitle && <p style={{ margin:0, fontSize:'11px', color:'var(--color-text-tertiary)' }}>{subtitle}</p>}
        </div>
      </div>

      {showHome && (
        <button onClick={() => router.push('/profile')} aria-label="Home" style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', fontSize:'13px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', color:'var(--color-text-primary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          होम
        </button>
      )}
    </div>
  );
}

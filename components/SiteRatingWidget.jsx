'use client';
// app/components/SiteRatingWidget.jsx
//
// Reusable rating widget — backed by app/api/ratings (feature_ratings
// table, migration_010 + migration_011). Used on the profile page
// (site-wide "overall" rating) and after a chat session (same
// 'overall' feature by default, or pass a different `feature` prop to
// scope it elsewhere).
//
// The 1-5 star SCORE is public — every signed-in user sees the
// aggregate average + count, app-store style. The written comment is
// PRIVATE — only the author (shown here as "your rating") and admins
// (Admin panel → Feedback tab) can read it; it's never shown to other
// users.

import { useState, useEffect } from 'react';

function Stars({ value, onChange, size = 22 }) {
  return (
    <div style={{ display:'flex', gap:'4px' }}>
      {[1,2,3,4,5].map(n => (
        <span
          key={n}
          onClick={() => onChange && onChange(n)}
          style={{ cursor: onChange ? 'pointer' : 'default', fontSize:`${size}px`, lineHeight:1, color: n <= value ? '#e8a33d' : 'var(--color-border-secondary)' }}
        >★</span>
      ))}
    </div>
  );
}

export default function SiteRatingWidget({ feature = 'overall', title = 'Rating दें', compact = false }) {
  const [ratings,     setRatings]     = useState(null);
  const [myStars,     setMyStars]     = useState(0);
  const [myComment,   setMyComment]   = useState('');
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState('');
  const [expanded,    setExpanded]    = useState(!compact);

  useEffect(() => { load(); }, [feature]);

  async function load() {
    const res = await fetch(`/api/ratings?feature=${encodeURIComponent(feature)}`);
    if (!res.ok) return;
    const data = await res.json();
    setRatings(data);
    if (data.myRating) {
      setMyStars(data.myRating.stars);
      setMyComment(data.myRating.comment || '');
    }
  }

  async function submit() {
    if (!myStars) { setMsg('कृपया स्टार चुनें'); return; }
    setSaving(true); setMsg('');
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature, stars: myStars, comment: myComment }),
    });
    const data = await res.json();
    if (data.success) {
      setMsg('✓ धन्यवाद! आपकी rating सेव हो गई');
      load();
    } else {
      setMsg('Error: ' + (data.error || 'unknown'));
    }
    setSaving(false);
  }

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{ width:'100%', padding:'10px', fontSize:'14px', color:'var(--color-text-primary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontWeight:'500' }}
      >
        ⭐ Rating व फीडबैक {ratings?.count ? `(${ratings.average} / 5 · ${ratings.count} ratings)` : ''}
      </button>
    );
  }

  return (
    <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
        <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:0 }}>{title}</p>
        {compact && (
          <button onClick={() => setExpanded(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary)', fontSize:'13px' }}>बंद करें</button>
        )}
      </div>

      {ratings && (
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
          <span style={{ fontSize:'28px', fontWeight:'600', color:'var(--color-text-primary)' }}>{ratings.average || '—'}</span>
          <div>
            <Stars value={Math.round(ratings.average)} size={16} />
            <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:'2px 0 0' }}>{ratings.count} rating{ratings.count === 1 ? '' : 's'}</p>
          </div>
        </div>
      )}

      <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:'0 0 6px' }}>आपकी rating (सबको दिखेगी):</p>
      <Stars value={myStars} onChange={setMyStars} />
      <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:'12px 0 6px' }}>आपकी प्रतिक्रिया (सिर्फ हमारी टीम पढ़ेगी):</p>
      <textarea
        value={myComment}
        onChange={e => setMyComment(e.target.value)}
        placeholder="कोई सुझाव या समस्या बताएं? (वैकल्पिक, निजी)"
        rows={2}
        style={{ width:'100%', fontSize:'13px', resize:'vertical' }}
      />
      {msg && <p style={{ fontSize:'12px', color: msg.startsWith('✓') ? 'var(--color-text-success)' : 'var(--color-text-danger)', margin:'6px 0 0' }}>{msg}</p>}
      <button onClick={submit} disabled={saving} style={{ marginTop:'10px', padding:'8px 16px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500' }}>
        {saving ? 'सेव हो रहा है...' : (ratings?.myRating ? 'Rating अपडेट करें' : 'Rating दें')}
      </button>
    </div>
  );
}

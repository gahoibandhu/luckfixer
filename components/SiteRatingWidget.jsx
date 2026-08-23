'use client';
// app/components/SiteRatingWidget.jsx
//
// Reusable public, open-to-all star-rating widget — backed by
// app/api/ratings (feature_ratings table, migration_010). Used on
// the profile page (site-wide "overall" rating) and after a chat
// session (same 'overall' feature by default, or pass a different
// `feature` prop to scope it elsewhere).
//
// Every signed-in user can see the average + every comment; each
// user can only submit/update their OWN rating (enforced server-side
// by RLS, this component just reflects that).

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

export default function SiteRatingWidget({ feature = 'overall', title = 'यूज़र Rating (सबके लिए खुला)', compact = false }) {
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
        ⭐ फीडबैक दें {ratings?.count ? `(${ratings.average} / 5 · ${ratings.count} ratings)` : ''}
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

      <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:'0 0 6px' }}>आपकी rating:</p>
      <Stars value={myStars} onChange={setMyStars} />
      <textarea
        value={myComment}
        onChange={e => setMyComment(e.target.value)}
        placeholder="कोई टिप्पणी? (वैकल्पिक)"
        rows={2}
        style={{ width:'100%', marginTop:'10px', fontSize:'13px', resize:'vertical' }}
      />
      {msg && <p style={{ fontSize:'12px', color: msg.startsWith('✓') ? 'var(--color-text-success)' : 'var(--color-text-danger)', margin:'6px 0 0' }}>{msg}</p>}
      <button onClick={submit} disabled={saving} style={{ marginTop:'10px', padding:'8px 16px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500' }}>
        {saving ? 'सेव हो रहा है...' : (ratings?.myRating ? 'Rating अपडेट करें' : 'Rating दें')}
      </button>

      {ratings?.recent?.length > 0 && (
        <div style={{ marginTop:'16px', borderTop:'0.5px solid var(--color-border-tertiary)', paddingTop:'12px' }}>
          {ratings.recent.filter(r => r.comment).slice(0, 5).map((r, i) => (
            <div key={i} style={{ marginBottom:'10px' }}>
              <Stars value={r.stars} size={12} />
              <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:'3px 0 0' }}>{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

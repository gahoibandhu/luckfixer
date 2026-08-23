'use client';
// app/numerology/page.jsx — Standalone Numerology (अंक ज्योतिष) tool
// Checks ANY name: person, company, shop/brand — independent of any
// saved kundli. Also hosts a public, open-to-all star-rating widget
// for this feature (see app/api/ratings/route.js, feature=numerology).

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  { id: 'person',  label: 'व्यक्ति' },
  { id: 'company', label: 'कंपनी' },
  { id: 'shop',    label: 'दुकान / ब्रांड' },
  { id: 'other',   label: 'अन्य' },
];

const VERDICT_COLOR = {
  'शुभ':              'var(--color-text-success)',
  'सामान्य':          'var(--color-text-warning)',
  'सुधार सुझाया गया': 'var(--color-text-danger)',
};

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

export default function NumerologyPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [name,       setName]       = useState('');
  const [category,   setCategory]   = useState('person');
  const [refDob,     setRefDob]     = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [result,     setResult]     = useState(null);

  const [ratings,    setRatings]    = useState(null); // { average, count, myRating, recent }
  const [myStars,    setMyStars]    = useState(0);
  const [myComment,  setMyComment]  = useState('');
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingMsg,  setRatingMsg]  = useState('');

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      loadRatings();
    }
    init();
  }, []);

  async function loadRatings() {
    const res = await fetch('/api/ratings?feature=numerology');
    if (!res.ok) return;
    const data = await res.json();
    setRatings(data);
    if (data.myRating) {
      setMyStars(data.myRating.stars);
      setMyComment(data.myRating.comment || '');
    }
  }

  async function checkName(e) {
    e.preventDefault();
    if (!name.trim()) { setError('नाम दर्ज करें'); return; }
    setLoading(true); setError(''); setResult(null);

    const res = await fetch('/api/numerology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, reference_dob: refDob || null }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'कुछ गड़बड़ हुई'); }
    else         { setResult(data); }
    setLoading(false);
  }

  async function submitRating() {
    if (!myStars) { setRatingMsg('कृपया स्टार चुनें'); return; }
    setRatingSaving(true); setRatingMsg('');
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'numerology', stars: myStars, comment: myComment }),
    });
    const data = await res.json();
    if (data.success) {
      setRatingMsg('✓ धन्यवाद! आपकी rating सेव हो गई');
      loadRatings();
    } else {
      setRatingMsg('Error: ' + (data.error || 'unknown'));
    }
    setRatingSaving(false);
  }

  const LOGO_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';

  return (
    <div className="lf-page" style={{ maxWidth:'680px', margin:'0 auto', padding:'1.5rem 1rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'1.5rem' }}>
        <button onClick={() => router.push('/profile')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-secondary)', fontSize:'14px', padding:0 }}>← वापस</button>
        <img src={LOGO_URL} alt="Luckfixer" className="lf-logo-sm" />
        <h1 style={{ fontSize:'20px', fontWeight:'500', color:'var(--color-text-primary)', margin:0 }}>अंक ज्योतिष (Numerology)</h1>
      </div>

      {/* Input form */}
      <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem', marginBottom:'1rem' }}>
        <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:'0 0 12px', lineHeight:'1.5' }}>
          कोई भी नाम जांचें — अपना नाम, कंपनी का नाम, या दुकान/ब्रांड का नाम। Chaldean अंक-पद्धति से नाम की ऊर्जा और ज़रूरत पड़ने पर सुधार सुझाव मिलेगा।
        </p>
        <form onSubmit={checkName} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          <div>
            <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', display:'block', marginBottom:'4px' }}>नाम *</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="जैसे: Rohit Sharma / Sharma Traders" style={{ width:'100%' }}/>
          </div>
          <div>
            <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', display:'block', marginBottom:'6px' }}>श्रेणी</label>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {CATEGORIES.map(c => (
                <button type="button" key={c.id} onClick={() => setCategory(c.id)} style={{
                  padding:'6px 12px', fontSize:'13px', borderRadius:'var(--border-radius-md)', cursor:'pointer',
                  border: category===c.id ? '0.5px solid var(--color-text-primary)' : '0.5px solid var(--color-border-tertiary)',
                  background: category===c.id ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
                  color:'var(--color-text-primary)', fontWeight: category===c.id ? '500' : '400',
                }}>{c.label}</button>
              ))}
            </div>
          </div>
          {(category === 'company' || category === 'shop') && (
            <div>
              <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', display:'block', marginBottom:'4px' }}>मालिक/संस्थापक की जन्म तिथि (वैकल्पिक)</label>
              <input type="date" value={refDob} onChange={e => setRefDob(e.target.value)} />
              <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:'4px 0 0' }}>दें तो नाम-अंक की तुलना मालिक के Life Path अंक से भी होगी</p>
            </div>
          )}
          {error && <p style={{ fontSize:'12px', color:'var(--color-text-danger)', margin:0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding:'10px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>
            {loading ? 'जांच हो रही है...' : 'नाम जांचें'}
          </button>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'1.5rem' }}>
          <div className="lf-watermark" style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem', textAlign:'center', position:'relative' }}>
            <p style={{ fontSize:'13px', color:'var(--color-text-secondary)', margin:'0 0 4px' }}>{result.name}</p>
            <p style={{ fontSize:'40px', fontWeight:'600', color:'var(--color-text-primary)', margin:'6px 0 2px', lineHeight:1 }}>
              {result.numerology.chaldean.compound}
            </p>
            <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:'0 0 8px' }}>Chaldean Compound Number → अंक {result.numerology.chaldean.single}</p>
            <p style={{ fontSize:'16px', fontWeight:'500', color: VERDICT_COLOR[result.narrative.verdict] || 'var(--color-text-primary)', margin:0 }}>{result.narrative.verdict}</p>
          </div>

          <div style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'12px 14px' }}>
            <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'1px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 6px' }}>विश्लेषण</p>
            <p style={{ fontSize:'13px', color:'var(--color-text-primary)', margin:0, lineHeight:'1.6' }}>{result.narrative.summary}</p>
          </div>

          {result.numerology.correction?.needsCorrection && (
            <div style={{ background:'var(--color-background-warning)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'12px 14px' }}>
              <p style={{ fontSize:'12px', fontWeight:'600', color:'var(--color-text-warning)', margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'1px' }}>✏️ नाम सुधार सुझाव</p>
              <p style={{ fontSize:'13px', color:'var(--color-text-primary)', margin:'0 0 6px', lineHeight:'1.6' }}>{result.narrative.correction_advice}</p>
              {result.numerology.correction.topSuggestions?.[0] && (
                <p style={{ fontSize:'14px', fontWeight:'600', color:'var(--color-text-primary)', margin:0 }}>
                  सुझाई गई स्पेलिंग: {result.numerology.correction.topSuggestions[0].spelling}
                  <span style={{ fontWeight:'400', color:'var(--color-text-tertiary)', fontSize:'12px' }}> (अंक {result.numerology.correction.topSuggestions[0].single})</span>
                </p>
              )}
            </div>
          )}

          <button onClick={() => router.push('/chat')} style={{ padding:'10px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500' }}>
            विस्तृत चर्चा के लिए चैट करें →
          </button>
        </div>
      )}

      {/* Public open-to-all rating widget */}
      <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem' }}>
        <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 10px' }}>यूज़र Rating (सबके लिए खुला)</p>

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
        {ratingMsg && <p style={{ fontSize:'12px', color: ratingMsg.startsWith('✓') ? 'var(--color-text-success)' : 'var(--color-text-danger)', margin:'6px 0 0' }}>{ratingMsg}</p>}
        <button onClick={submitRating} disabled={ratingSaving} style={{ marginTop:'10px', padding:'8px 16px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500' }}>
          {ratingSaving ? 'सेव हो रहा है...' : (ratings?.myRating ? 'Rating अपडेट करें' : 'Rating दें')}
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
    </div>
  );
}

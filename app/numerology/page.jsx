'use client';
// app/numerology/page.jsx — Standalone Numerology (अंक ज्योतिष) tool
// Checks ANY name: person, company, shop/brand — independent of any
// saved kundli. Also hosts a public, open-to-all star-rating widget
// for this feature (see app/api/ratings/route.js, feature=numerology).

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { t, getSavedUiLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  { id: 'person',  key: 'catPerson' },
  { id: 'company', key: 'catCompany' },
  { id: 'shop',    key: 'catShop' },
  { id: 'other',   key: 'catOther' },
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

  // ── Link to a saved kundli — pulls name + dob from it automatically
  // so the correction is evaluated against the person's real, already-
  // validated birth data instead of retyping everything by hand.
  const [kundlis,      setKundlis]      = useState([]);
  const [linkedId,     setLinkedId]     = useState('');   // '' = not linked (custom name)

  const [ratings,    setRatings]    = useState(null); // { average, count, myRating, recent }
  const [myStars,    setMyStars]    = useState(0);
  const [myComment,  setMyComment]  = useState('');
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingMsg,  setRatingMsg]  = useState('');
  const [uiLang, setUiLang] = useState('hi');

  useEffect(() => { setUiLang(getSavedUiLang()); }, []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      loadRatings();
      const { data: ks } = await supabase
        .from('saved_kundlis').select('id, label, full_name, dob, birth_place')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setKundlis(ks || []);
    }
    init();
  }, []);

  // Selecting a saved kundli fills name + dob from it and locks the
  // category to 'person' (it's their own name). Choosing "कोई भी नाम"
  // again clears the link so any custom/company/shop name can be typed.
  function linkKundli(id) {
    setLinkedId(id);
    if (!id) return;
    const k = kundlis.find(x => x.id === id);
    if (!k) return;
    setName(k.full_name || '');
    setRefDob(k.dob || '');
    setCategory('person');
    setResult(null);
  }

  function unlinkKundli() {
    setLinkedId('');
    setName('');
    setRefDob('');
    setResult(null);
  }

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
    if (!name.trim()) { setError(uiLang === 'en' ? 'Please enter a name' : 'नाम दर्ज करें'); return; }
    setLoading(true); setError(''); setResult(null);

    const res = await fetch('/api/numerology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, reference_dob: refDob || null, kundli_id: linkedId || null }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || (uiLang === 'en' ? 'Something went wrong' : 'कुछ गड़बड़ हुई')); }
    else         { setResult(data); }
    setLoading(false);
  }

  async function submitRating() {
    if (!myStars) { setRatingMsg(uiLang === 'en' ? 'Please select a star rating' : 'कृपया स्टार चुनें'); return; }
    setRatingSaving(true); setRatingMsg('');
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'numerology', stars: myStars, comment: myComment }),
    });
    const data = await res.json();
    if (data.success) {
      setRatingMsg(uiLang === 'en' ? '✓ Thank you! Your rating was saved' : '✓ धन्यवाद! आपकी rating सेव हो गई');
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
        <button onClick={() => router.push('/profile')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-secondary)', fontSize:'14px', padding:0 }}>{t('backBtn', uiLang)}</button>
        <img src={LOGO_URL} alt="Luckfixer" className="lf-logo-sm" />
        <h1 style={{ fontSize:'20px', fontWeight:'500', color:'var(--color-text-primary)', margin:0 }}>{t('numerologyTitle', uiLang)}</h1>
      </div>

      {/* Input form */}
      <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem', marginBottom:'1rem' }}>
        <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:'0 0 12px', lineHeight:'1.5' }}>
          {t('numerologyIntro', uiLang)}
        </p>
        {/* Link to a saved kundli — auto-fills name + dob so the check
            runs against real, already-validated birth data (and reuses
            the fuller numerology sheet already computed for that chart)
            instead of retyping everything and getting a thinner reading. */}
        {kundlis.length > 0 && (
          <div style={{ marginBottom:'12px', padding:'10px 12px', background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)' }}>
            <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', display:'block', marginBottom:'6px' }}>{t('whoToCheck', uiLang)}</label>
            <select value={linkedId} onChange={e => linkKundli(e.target.value)} style={{ width:'100%' }}>
              <option value="">{t('anyNameTypeIt', uiLang)}</option>
              {kundlis.map(k => (
                <option key={k.id} value={k.id}>{k.label || k.full_name} — {k.dob}</option>
              ))}
            </select>
            {linkedId && (
              <p style={{ fontSize:'11px', color:'var(--color-text-success)', margin:'6px 0 0' }}>
                ✓ {t('linkedNote', uiLang)}{' '}
                <span onClick={unlinkKundli} style={{ textDecoration:'underline', cursor:'pointer', color:'var(--color-text-tertiary)' }}>{t('removeLink', uiLang)}</span>
              </p>
            )}
          </div>
        )}

        <form onSubmit={checkName} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          <div>
            <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', display:'block', marginBottom:'4px' }}>{t('nameLabel', uiLang)} *</label>
            <input value={name} onChange={e => { setName(e.target.value); if (linkedId) setLinkedId(''); }} required placeholder={t('namePlaceholder', uiLang)} style={{ width:'100%' }}/>
          </div>
          <div>
            <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', display:'block', marginBottom:'6px' }}>{t('categoryLabel', uiLang)}</label>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {CATEGORIES.map(c => (
                <button type="button" key={c.id} disabled={!!linkedId} onClick={() => setCategory(c.id)} style={{
                  padding:'6px 12px', fontSize:'13px', borderRadius:'var(--border-radius-md)', cursor: linkedId ? 'not-allowed' : 'pointer',
                  border: category===c.id ? '0.5px solid var(--color-text-primary)' : '0.5px solid var(--color-border-tertiary)',
                  background: category===c.id ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
                  color:'var(--color-text-primary)', fontWeight: category===c.id ? '500' : '400',
                  opacity: linkedId ? 0.6 : 1,
                }}>{t(c.key, uiLang)}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', display:'block', marginBottom:'4px' }}>
              {category === 'person' ? t('dobOptionalPerson', uiLang) : t('dobOptionalOwner', uiLang)}
            </label>
            <input type="date" value={refDob} disabled={!!linkedId} onChange={e => setRefDob(e.target.value)} />
            <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:'4px 0 0' }}>{t('dobHint', uiLang)}</p>
          </div>
          {error && <p style={{ fontSize:'12px', color:'var(--color-text-danger)', margin:0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding:'10px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>
            {loading ? t('checking', uiLang) : t('checkNameBtn', uiLang)}
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
            <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:'0 0 8px' }}>{t('chaldeanLabel', uiLang)} {result.numerology.chaldean.single}</p>
            <p style={{ fontSize:'16px', fontWeight:'500', color: VERDICT_COLOR[result.narrative.verdict] || 'var(--color-text-primary)', margin:0 }}>{result.narrative.verdict}</p>
          </div>

          <div style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'12px 14px' }}>
            <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'1px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 6px' }}>{t('analysisLabel', uiLang)}</p>
            <p style={{ fontSize:'13px', color:'var(--color-text-primary)', margin:0, lineHeight:'1.6' }}>{result.narrative.summary}</p>
          </div>

          {result.numerology.correction?.needsCorrection && (
            <div style={{ background:'var(--color-background-warning)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'12px 14px' }}>
              <p style={{ fontSize:'12px', fontWeight:'600', color:'var(--color-text-warning)', margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'1px' }}>{t('correctionSuggestion', uiLang)}</p>
              <p style={{ fontSize:'13px', color:'var(--color-text-primary)', margin:'0 0 6px', lineHeight:'1.6' }}>{result.narrative.correction_advice}</p>
              {result.numerology.correction.topSuggestions?.[0] && (
                <p style={{ fontSize:'14px', fontWeight:'600', color:'var(--color-text-primary)', margin:0 }}>
                  {t('suggestedSpelling', uiLang)}: {result.numerology.correction.topSuggestions[0].spelling}
                  <span style={{ fontWeight:'400', color:'var(--color-text-tertiary)', fontSize:'12px' }}> ({uiLang === 'en' ? 'number' : 'अंक'} {result.numerology.correction.topSuggestions[0].single})</span>
                </p>
              )}
            </div>
          )}

          <button onClick={() => router.push('/chat')} style={{ padding:'10px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500' }}>
            {t('chatForDetail', uiLang)}
          </button>
        </div>
      )}

      {/* Rating (public average) + written feedback (private, admin-only) */}
      <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem' }}>
        <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 10px' }}>{t('ratingFeedbackLabel', uiLang)}</p>

        {ratings && (
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
            <span style={{ fontSize:'28px', fontWeight:'600', color:'var(--color-text-primary)' }}>{ratings.average || '—'}</span>
            <div>
              <Stars value={Math.round(ratings.average)} size={16} />
              <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:'2px 0 0' }}>{ratings.count} rating{ratings.count === 1 ? '' : 's'} · {t('visibleToAll', uiLang)}</p>
            </div>
          </div>
        )}

        <Stars value={myStars} onChange={setMyStars} />
        <textarea
          value={myComment}
          onChange={e => setMyComment(e.target.value)}
          placeholder="कोई सुझाव या समस्या बताएं? (वैकल्पिक, निजी)"
          rows={2}
          style={{ width:'100%', fontSize:'13px', resize:'vertical', marginTop:'12px' }}
        />
        {ratingMsg && <p style={{ fontSize:'12px', color: ratingMsg.startsWith('✓') ? 'var(--color-text-success)' : 'var(--color-text-danger)', margin:'6px 0 0' }}>{ratingMsg}</p>}
        <button onClick={submitRating} disabled={ratingSaving} style={{ marginTop:'10px', padding:'8px 16px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500' }}>
          {ratingSaving ? t('savingRating', uiLang) : (ratings?.myRating ? t('updateRating', uiLang) : t('giveRating', uiLang))}
        </button>
      </div>
    </div>
  );
}

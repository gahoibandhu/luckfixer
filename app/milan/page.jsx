'use client';
// app/milan/page.jsx — Kundli Milan (Ashtakoot compatibility matching)

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

const VERDICT_COLOR = {
  'Excellent':         'var(--color-text-success)',
  'Good':              'var(--color-text-success)',
  'Average':           'var(--color-text-warning)',
  'Below Average':     'var(--color-text-danger)',
  'Not Recommended':   'var(--color-text-danger)',
};

export default function MilanPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [kundlis,   setKundlis]   = useState([]);
  const [boyId,     setBoyId]     = useState('');
  const [girlId,    setGirlId]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState('');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const { data } = await supabase
        .from('saved_kundlis').select('id, label, full_name, dob')
        .eq('user_id', session.user.id).order('created_at', { ascending: false });
      setKundlis(data || []);
    }
    load();
  }, []);

  async function calcMilan() {
    if (!boyId || !girlId) { setError('दोनों कुंडली चुनें'); return; }
    if (boyId === girlId)  { setError('अलग-अलग कुंडली चुनें'); return; }
    setLoading(true); setError(''); setResult(null);

    const res = await fetch('/api/milan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kundliId1: boyId, kundliId2: girlId }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'कुछ गड़बड़ हुई'); }
    else         { setResult(data); }
    setLoading(false);
  }

  const kName = (id) => {
    const k = kundlis.find(k => k.id === id);
    return k ? (k.label || k.full_name) : '';
  };

  function shareOnWhatsApp(m) {
    const text = `🔮 *Luckfixer 2.0 — कुंडली मिलान*\n\n${kName(boyId)} + ${kName(girlId)}\n\n*अंक: ${m.totalScore}/36* (${m.percentage}%)\n*${m.verdictHi}*\n\n${m.doshas.length > 0 ? '⚠️ ' + m.doshas.map(d=>d.name).join(', ') + '\n\n' : ''}${m.recommendation}\n\n✦ अपनी कुंडली मिलान चेक करें: luckfixer.jaigahoi.in`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  const LOGO_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';

  return (
    <div className="lf-page" style={{ maxWidth:'680px', margin:'0 auto', padding:'1.5rem 1rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'1.5rem' }}>
        <button onClick={() => router.push('/profile')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-secondary)', fontSize:'14px', padding:0 }}>← वापस</button>
        <img src={LOGO_URL} alt="Luckfixer" className="lf-logo-sm" />
        <h1 style={{ fontSize:'20px', fontWeight:'500', color:'var(--color-text-primary)', margin:0 }}>कुंडली मिलान</h1>
      </div>

      {/* Selector card */}
      <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem', marginBottom:'1rem' }}>
        <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:'0 0 12px', lineHeight:'1.5' }}>
          अष्टकूट गुण मिलान — 36 में से अंक देखें। 18+ = विवाह योग्य, 27+ = उत्तम।
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <div>
            <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>वर (लड़के) की कुंडली</label>
            <select value={boyId} onChange={e => setBoyId(e.target.value)} style={{ width:'100%' }}>
              <option value=''>— चुनें —</option>
              {kundlis.map(k => <option key={k.id} value={k.id}>{k.label || k.full_name} ({k.dob})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>कन्या (लड़की) की कुंडली</label>
            <select value={girlId} onChange={e => setGirlId(e.target.value)} style={{ width:'100%' }}>
              <option value=''>— चुनें —</option>
              {kundlis.map(k => <option key={k.id} value={k.id}>{k.label || k.full_name} ({k.dob})</option>)}
            </select>
          </div>
        </div>
        {error && <p style={{ fontSize:'12px', color:'var(--color-text-danger)', margin:'0 0 8px' }}>{error}</p>}
        <button
          onClick={calcMilan}
          disabled={loading}
          style={{ width:'100%', padding:'10px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}
        >
          {loading ? 'गणना हो रही है...' : 'मिलान देखें'}
        </button>
      </div>

      {/* Result */}
      {result && (() => {
        const m = result.milan;
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

            {/* Score headline */}
            <div className="lf-watermark" style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem', textAlign:'center', position:'relative' }}>
              <p style={{ fontSize:'13px', color:'var(--color-text-secondary)', margin:'0 0 4px' }}>
                {kName(boyId)} + {kName(girlId)}
              </p>
              <p style={{ fontSize:'48px', fontWeight:'600', color: VERDICT_COLOR[m.verdict] || 'var(--color-text-primary)', margin:'8px 0 4px', lineHeight:1 }}>
                {m.totalScore}<span style={{ fontSize:'20px', color:'var(--color-text-tertiary)' }}>/36</span>
              </p>
              <p style={{ fontSize:'18px', fontWeight:'500', color: VERDICT_COLOR[m.verdict], margin:'0 0 4px' }}>{m.verdictHi}</p>
              <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0 }}>{m.percentage}% अनुकूलता</p>
            </div>

            {/* Moon info */}
            <div style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'10px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'13px' }}>
              <div>
                <p style={{ margin:'0 0 2px', fontSize:'11px', color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'1px' }}>वर का चंद्र</p>
                <p style={{ margin:0, fontWeight:'500', color:'var(--color-text-primary)' }}>{m.boyMoonSign.hi} — {m.boyNakshatra.hi}</p>
              </div>
              <div>
                <p style={{ margin:'0 0 2px', fontSize:'11px', color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'1px' }}>कन्या का चंद्र</p>
                <p style={{ margin:0, fontWeight:'500', color:'var(--color-text-primary)' }}>{m.girlMoonSign.hi} — {m.girlNakshatra.hi}</p>
              </div>
            </div>

            {/* Doshas — show prominently if any */}
            {m.doshas.length > 0 && (
              <div style={{ background:'var(--color-background-warning)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'12px 14px' }}>
                <p style={{ fontSize:'12px', fontWeight:'600', color:'var(--color-text-warning)', margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'1px' }}>⚠️ दोष</p>
                {m.doshas.map((d, i) => (
                  <div key={i} style={{ marginBottom: i < m.doshas.length-1 ? '6px' : 0 }}>
                    <p style={{ margin:'0 0 2px', fontSize:'13px', fontWeight:'500', color:'var(--color-text-warning)' }}>{d.name}</p>
                    <p style={{ margin:0, fontSize:'12px', color:'var(--color-text-secondary)' }}>{d.effect}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Koota breakdown */}
            <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden' }}>
              <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:0, padding:'10px 14px', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>अष्टकूट विवरण</p>
              {m.kootas.map((k, i) => {
                const pct = k.score / k.max;
                const barColor = pct >= 0.6 ? 'var(--color-text-success)' : pct >= 0.3 ? 'var(--color-text-warning)' : 'var(--color-text-danger)';
                return (
                  <div key={i} style={{ padding:'10px 14px', borderBottom: i < m.kootas.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none', display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                        <span style={{ fontSize:'13px', color:'var(--color-text-primary)', fontWeight:'500' }}>{k.name}</span>
                        <span style={{ fontSize:'13px', fontWeight:'600', color: barColor }}>{k.score}/{k.max}</span>
                      </div>
                      <div className="lf-meter-bar">
                        <div className="lf-meter-fill" style={{ width:`${pct*100}%`, background: barColor }} />
                      </div>
                      {k.details && <p style={{ margin:'3px 0 0', fontSize:'11px', color:'var(--color-text-tertiary)' }}>{k.details}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendation */}
            <div style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'12px 14px' }}>
              <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'1px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 6px' }}>निष्कर्ष</p>
              <p style={{ fontSize:'13px', color:'var(--color-text-primary)', margin:0, lineHeight:'1.6' }}>{m.recommendation}</p>
            </div>

            {/* Share button */}
            <button
              onClick={() => shareOnWhatsApp(m)}
              style={{ padding:'10px', background:'#25D366', color:'#fff', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .103 5.36.101 11.943c0 2.105.549 4.16 1.595 5.976L0 24l6.335-1.652a11.882 11.882 0 005.71 1.447h.005c6.582 0 11.94-5.36 11.943-11.943a11.87 11.87 0 00-3.473-8.403"/></svg>
              WhatsApp पर Share करें
            </button>

            {/* Chat button */}
            <button
              onClick={() => router.push('/chat')}
              style={{ padding:'10px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500' }}
            >
              विस्तृत मिलान विश्लेषण के लिए चैट करें →
            </button>
          </div>
        );
      })()}

      {/* Empty state */}
      {!result && !loading && kundlis.length < 2 && (
        <div style={{ textAlign:'center', padding:'2rem', color:'var(--color-text-tertiary)', fontSize:'13px', border:'0.5px dashed var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)' }}>
          मिलान के लिए कम से कम 2 कुंडली चाहिए।
          <br />
          <button onClick={() => router.push('/profile')} style={{ marginTop:'8px', color:'var(--color-text-info)', background:'none', border:'none', cursor:'pointer', fontSize:'13px' }}>
            प्रोफाइल में जाकर कुंडली जोड़ें →
          </button>
        </div>
      )}
    </div>
  );
}

'use client';
// app/profile/page.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const supabase = createClient();
  const router   = useRouter();
  const [profile,  setProfile]  = useState(null);
  const [kundlis,  setKundlis]  = useState([]);
  const [usage,    setUsage]    = useState(null);
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState({ full_name:'', mobile:'' });
  const [saving,   setSaving]   = useState(false);
  const [addOpen,  setAddOpen]  = useState(false);
  const [expandedKundli, setExpandedKundli] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState({});
  const [newK,     setNewK]     = useState({ label:'', full_name:'', dob:'', birth_time:'', birth_place:'', latitude:'', longitude:'', ayanamsa:'lahiri' });
  const [analyzing,setAnalyzing]= useState(false);

  useEffect(() => {
    loadAll();
    // Re-load when auth state settles (handles fresh login redirects where
    // the session cookie may not be synced yet on first render)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        loadAll();
      }
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  async function loadAll() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const [{ data: prof }, { data: kundlisData, error: kundliError }] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle(),
      supabase.from('saved_kundlis').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
    ]);

    if (kundliError) {
      console.error('[Profile] saved_kundlis error:', kundliError);
    }

    // Today's usage
    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabase.from('usage_log').select('*').eq('user_id', session.user.id).eq('log_date', today).maybeSingle();

    setProfile(prof || { id: session.user.id, email: session.user.email });
    setForm({ full_name: prof?.full_name || '', mobile: prof?.mobile || '' });
    setKundlis(kundlisData || []);
    setUsage(usageData || { chat_count: 0, free_mins_used: 0 });
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('user_profiles').upsert({ id: profile.id, ...form });
    setProfile(p => ({ ...p, ...form }));
    setEditing(false);
    setSaving(false);
  }

  const [geocoding, setGeocoding] = useState(false);
  const [geoError,  setGeoError]  = useState('');
  const [geoResults, setGeoResults] = useState([]);

  // ── Auto-geocode birth place to lat/lng via internal API (avoids CORS) ──
  async function geocodePlace() {
    if (!newK.birth_place.trim()) {
      setGeoError('कृपया पहले जन्म स्थान भरें');
      return;
    }
    setGeocoding(true);
    setGeoError('');
    setGeoResults([]);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(newK.birth_place)}`);
      const data = await res.json();
      if (data.found && data.results?.length > 0) {
        if (data.results.length === 1) {
          selectLocation(data.results[0]);
        } else {
          setGeoResults(data.results);
        }
      } else {
        setGeoError('स्थान नहीं मिला — Latitude/Longitude खुद डालें');
      }
    } catch {
      setGeoError('स्थान खोजने में समस्या — Latitude/Longitude खुद डालें');
    }
    setGeocoding(false);
  }

  function selectLocation(r) {
    setNewK(k => ({
      ...k,
      birth_place: r.display_name,
      latitude:  r.latitude.toFixed(4),
      longitude: r.longitude.toFixed(4),
    }));
    setGeoResults([]);
    setGeoError('');
  }

  async function deleteKundli(id) {
    if (!confirm('इस कुंडली को permanently delete करें? यह वापस नहीं आएगी।')) return;
    const res = await fetch(`/api/kundli?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setKundlis(prev => prev.filter(k => k.id !== id));
      setExpandedKundli(null);
    } else {
      alert('Delete नहीं हो पाया: ' + (data.error || 'unknown error'));
    }
  }

  async function sendFeedback(kundliId, rating) {
    setFeedbackSent(f => ({ ...f, [kundliId]: rating }));
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kundli_id: kundliId, rating, section: 'overall' }),
    });
  }

  async function addKundli(e) {
    e.preventDefault();
    if (!newK.latitude || !newK.longitude) {
      setGeoError('कृपया जन्म स्थान डालकर बाहर क्लिक करें, या Latitude/Longitude खुद भरें');
      return;
    }
    setAnalyzing(true);
    const res = await fetch('/api/kundli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newK),
    });
    const data = await res.json();
    if (data.kundli) {
      setKundlis(k => [data.kundli, ...k]);
      setAddOpen(false);
      setNewK({ label:'', full_name:'', dob:'', birth_time:'', birth_place:'', latitude:'', longitude:'', ayanamsa:'lahiri' });
    } else if (data.error) {
      setGeoError(data.error);
    }
    setAnalyzing(false);
  }


  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (!profile) return <div style={{ padding:'2rem', textAlign:'center', color:'var(--color-text-secondary)', fontSize:'14px' }}>Loading...</div>;

  const initials = (profile.full_name || profile.email || 'U').slice(0,2).toUpperCase();

  return (
    <div>
      <Header showHome={false} />
    <div style={{ maxWidth:'680px', margin:'0 auto', padding:'1.5rem 1rem' }}>

      {/* Profile Card */}
      <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem', marginBottom:'1rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'1rem' }}>
          <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'var(--color-background-info)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'500', fontSize:'15px', color:'var(--color-text-info)', flexShrink:0 }}>{initials}</div>
          <div style={{ flex:1 }}>
            <p style={{ fontWeight:'500', fontSize:'16px', margin:'0', color:'var(--color-text-primary)' }}>{profile.full_name || 'नाम नहीं'}</p>
            <p style={{ fontSize:'13px', color:'var(--color-text-secondary)', margin:'2px 0 0' }}>{profile.email}</p>
          </div>
          <button onClick={() => setEditing(e => !e)} style={{ fontSize:'13px', color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'6px 12px', cursor:'pointer' }}>
            {editing ? 'बंद करें' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <form onSubmit={saveProfile} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <div><label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>पूरा नाम</label><input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} placeholder="पूरा नाम"/></div>
              <div><label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>Mobile</label><input value={form.mobile} onChange={e => setForm(f => ({...f, mobile: e.target.value}))} placeholder="+91 9999999999"/></div>
            </div>
            <button type="submit" disabled={saving} style={{ padding:'9px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>
              {saving ? 'Save हो रहा है...' : 'Save करें'}
            </button>
          </form>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'13px' }}>
            <div><span style={{ color:'var(--color-text-tertiary)' }}>Mobile: </span><span style={{ color:'var(--color-text-primary)' }}>{profile.mobile || '—'}</span></div>
            {usage && <div><span style={{ color:'var(--color-text-tertiary)' }}>आज की chats: </span><span style={{ color:'var(--color-text-primary)' }}>{usage.chat_count}</span></div>}
          </div>
        )}
      </div>

      {/* Saved Kundlis */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
        <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:0 }}>सहेजी कुंडली ({kundlis.length})</p>
        <button onClick={() => setAddOpen(a => !a)} style={{ fontSize:'13px', color:'var(--color-text-primary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', padding:'6px 12px', cursor:'pointer' }}>
          + नई कुंडली
        </button>
      </div>

      {/* Add kundli form */}
      {addOpen && (
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem', marginBottom:'1rem' }}>
          <p style={{ fontSize:'13px', fontWeight:'500', color:'var(--color-text-primary)', margin:'0 0 12px' }}>नई कुंडली जोड़ें</p>
          <form onSubmit={addKundli} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <div className="lf-form-grid">
              <div>
                <label className="lf-label">Label</label>
                <input value={newK.label} onChange={e => setNewK(k => ({...k, label:e.target.value}))} placeholder="मेरी कुंडली"/>
              </div>
              <div>
                <label className="lf-label">पूरा नाम *</label>
                <input value={newK.full_name} onChange={e => setNewK(k => ({...k, full_name:e.target.value}))} required placeholder="नाम"/>
              </div>
              <div>
                <label className="lf-label">जन्म तिथि *</label>
                <input type="date" value={newK.dob} onChange={e => setNewK(k => ({...k, dob:e.target.value}))} required/>
              </div>
              <div>
                <label className="lf-label">जन्म समय *</label>
                <input type="time" value={newK.birth_time} onChange={e => setNewK(k => ({...k, birth_time:e.target.value}))} required/>
              </div>
              <div style={{ gridColumn:'1 / -1' }}>
                <label className="lf-label">जन्म स्थान *</label>
                <div style={{ display:'flex', gap:'8px' }}>
                  <input value={newK.birth_place} onChange={e => { setNewK(k => ({...k, birth_place:e.target.value, latitude:'', longitude:''})); setGeoResults([]); }} required placeholder="जैसे: Delhi, India" style={{ flex:1 }}/>
                  <button type="button" onClick={geocodePlace} disabled={geocoding} style={{ padding:'8px 14px', fontSize:'13px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', whiteSpace:'nowrap', color:'var(--color-text-primary)', flexShrink:0 }}>
                    {geocoding ? '...' : 'खोजें'}
                  </button>
                </div>
                {geoResults.length > 0 && (
                  <div style={{ marginTop:'6px', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', overflow:'hidden' }}>
                    <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', padding:'6px 10px', margin:0, borderBottom:'0.5px solid var(--color-border-tertiary)' }}>कई स्थान मिले — सही चुनें:</p>
                    {geoResults.map((r, i) => (
                      <div key={i} onClick={() => selectLocation(r)} style={{ padding:'8px 10px', fontSize:'13px', cursor:'pointer', borderBottom: i < geoResults.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none', color:'var(--color-text-primary)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {r.display_name}
                        <span style={{ display:'block', fontSize:'11px', color:'var(--color-text-tertiary)' }}>{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="lf-label">Latitude</label>
                <input type="number" step="0.0001" value={newK.latitude} onChange={e => setNewK(k => ({...k, latitude:e.target.value}))} placeholder="auto-fill"/>
              </div>
              <div>
                <label className="lf-label">Longitude</label>
                <input type="number" step="0.0001" value={newK.longitude} onChange={e => setNewK(k => ({...k, longitude:e.target.value}))} placeholder="auto-fill"/>
              </div>
              <div>
                <label className="lf-label">Ayanamsa</label>
                <select value={newK.ayanamsa} onChange={e => setNewK(k => ({...k, ayanamsa:e.target.value}))}>
                  <option value="lahiri">Lahiri</option>
                  <option value="raman">Raman</option>
                  <option value="kp">KP</option>
                </select>
              </div>
            </div>
            {geoError && <p style={{ fontSize:'12px', color:'var(--color-text-danger)', margin:0 }}>{geoError}</p>}
            {newK.latitude && newK.longitude && (
              <p style={{ fontSize:'12px', color:'var(--color-text-success)', margin:0 }}>✓ {newK.latitude}, {newK.longitude}</p>
            )}
            <button type="submit" disabled={analyzing} style={{ padding:'12px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>
              {analyzing ? 'AI analysis चल रहा है...' : 'कुंडली Save करें'}
            </button>
          </form>
        </div>
      )}

      {/* Kundli list */}
      {kundlis.length === 0 ? (
        <div style={{ textAlign:'center', padding:'2rem', color:'var(--color-text-tertiary)', fontSize:'13px', border:'0.5px dashed var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)' }}>
          अभी तक कोई कुंडली नहीं। ऊपर + बटन दबाएं।
        </div>
      ) : kundlis.map(k => {
        const a = k.planet_data?.analysis;
        const expanded = expandedKundli === k.id;
        const num = k.planet_data?.numerology;
        const vim = k.planet_data?.vimshottari;
        return (
        <div key={k.id} style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', marginBottom:'8px', overflow:'hidden' }}>

          {/* Card header — name + score + chat button always visible */}
          <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontWeight:'500', fontSize:'15px', margin:'0 0 2px', color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.label || k.full_name}</p>
              <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:0 }}>{k.dob} · {k.birth_place}</p>
            </div>
            <span style={{ fontSize:'11px', color:'var(--color-text-tertiary)', flexShrink:0 }}>{k.birth_time}</span>
            <button onClick={() => router.push(`/chat?kundliId=${k.id}`)} style={{ padding:'7px 14px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500', flexShrink:0 }}>
              Chat
            </button>
            <button onClick={() => setExpandedKundli(expanded ? null : k.id)} style={{ padding:'7px 10px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'12px', color:'var(--color-text-secondary)', flexShrink:0 }}>
              {expanded ? 'बंद करें ▲' : 'विश्लेषण ▼'}
            </button>
            <button onClick={() => deleteKundli(k.id)} title="हटाएं" style={{ background:'none', border:'none', cursor:'pointer', padding:'6px', color:'var(--color-text-tertiary)', flexShrink:0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>

          {expanded && a && (
            <div style={{ borderTop:'0.5px solid var(--color-border-tertiary)', padding:'1rem 1.25rem', display:'flex', flexDirection:'column', gap:'14px' }}>
              {a.analytical_insight && <p style={{ fontSize:'13px', color:'var(--color-text-primary)', margin:0, lineHeight:'1.6' }}>{a.analytical_insight}</p>}
              {a.key_yoga && <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0 }}>प्रमुख योग: <strong style={{ color:'var(--color-text-primary)' }}>{a.key_yoga}</strong></p>}

              {a.vedic_analysis && (
                <AnalysisSection title="वैदिक विश्लेषण" color="var(--color-text-info)">
                  <p style={{ margin:'0 0 4px' }}>{a.vedic_analysis.lagna_summary}</p>
                  <p style={{ margin:'0 0 4px' }}><strong>मजबूत:</strong> {a.vedic_analysis.strongest_planet}</p>
                  <p style={{ margin:'0 0 4px' }}><strong>कमजोर:</strong> {a.vedic_analysis.weakest_planet}</p>
                  <p style={{ margin:0 }}>{a.vedic_analysis.dasha_hint}</p>
                </AnalysisSection>
              )}

              {/* Vimshottari Dasha */}
              {vim?.current && (
                <AnalysisSection title="विंशोत्तरी दशा" color="var(--color-text-primary)">
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'8px' }}>
                    <div style={{ background:'var(--color-background-tertiary)', borderRadius:'var(--border-radius-md)', padding:'8px', textAlign:'center' }}>
                      <p style={{ fontSize:'10px', color:'var(--color-text-tertiary)', margin:'0 0 2px', textTransform:'uppercase' }}>महादशा</p>
                      <p style={{ fontSize:'16px', fontWeight:'600', color:'var(--color-text-primary)', margin:'0 0 2px' }}>{vim.current.mahaDasha.lordHi}</p>
                      <p style={{ fontSize:'10px', color:'var(--color-text-tertiary)', margin:0 }}>{vim.current.mahaDasha.daysLeft} दिन शेष</p>
                    </div>
                    <div style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'8px', textAlign:'center', border:'0.5px solid var(--color-border-secondary)' }}>
                      <p style={{ fontSize:'10px', color:'var(--color-text-tertiary)', margin:'0 0 2px', textTransform:'uppercase' }}>अंतर्दशा</p>
                      <p style={{ fontSize:'16px', fontWeight:'600', color:'var(--color-text-info)', margin:'0 0 2px' }}>{vim.current.antarDasha.lordHi}</p>
                      <p style={{ fontSize:'10px', color:'var(--color-text-tertiary)', margin:0 }}>{vim.current.antarDasha.daysLeft} दिन शेष</p>
                    </div>
                    <div style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'8px', textAlign:'center', border:'0.5px solid var(--color-border-secondary)' }}>
                      <p style={{ fontSize:'10px', color:'var(--color-text-tertiary)', margin:'0 0 2px', textTransform:'uppercase' }}>प्रत्यंतर</p>
                      <p style={{ fontSize:'16px', fontWeight:'600', color:'var(--color-text-warning)', margin:'0 0 2px' }}>{vim.current.pratyantarDasha.lordHi}</p>
                      <p style={{ fontSize:'10px', color:'var(--color-text-tertiary)', margin:0 }}>{vim.current.pratyantarDasha.daysLeft} दिन शेष</p>
                    </div>
                  </div>
                  <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:'0 0 4px' }}>
                    अंतर्दशा: {vim.current.antarDasha.start} → {vim.current.antarDasha.end}
                  </p>
                  <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:0 }}>
                    प्रत्यंतर: {vim.current.pratyantarDasha.startLabel} → {vim.current.pratyantarDasha.endLabel}
                  </p>
                  {/* All pratyantar dashas timeline */}
                  <div style={{ marginTop:'8px' }}>
                    <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:'0 0 4px' }}>सभी प्रत्यंतर दशाएं (वर्तमान अंतर्दशा में):</p>
                    {vim.current.allPratyantar?.map((pd, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', padding:'3px 0', borderBottom:'0.5px solid var(--color-border-tertiary)', color: pd.isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', fontWeight: pd.isCurrent ? '600' : '400' }}>
                        <span>{pd.isCurrent ? '▶ ' : ''}{pd.lordHi} ({pd.days} दिन)</span>
                        <span>{pd.startLabel}</span>
                      </div>
                    ))}
                  </div>
                </AnalysisSection>
              )}

              {(num || a.numerology_analysis) && (
                <AnalysisSection title="अंक ज्योतिष" color="var(--color-text-warning)">
                  {num && <p style={{ margin:'0 0 4px' }}>जीवन पथ: <strong>{num.lifePathNumber}</strong> — {num.lifePathMeaning?.title} · अभिव्यक्ति: <strong>{num.expressionNumber}</strong> · आत्मा: <strong>{num.soulUrgeNumber}</strong></p>}
                  {num?.loShu?.missing?.length > 0 && <p style={{ margin:'0 0 4px', color:'var(--color-text-danger)' }}>⚠ अनुपस्थित अंक: {num.loShu.missing.join(', ')}</p>}
                  {a.numerology_analysis?.life_path_summary && <p style={{ margin:'0 0 4px' }}>{a.numerology_analysis.life_path_summary}</p>}
                  {a.numerology_analysis?.numerology_remedy && <p style={{ margin:0, fontWeight:'500' }}>उपाय: {a.numerology_analysis.numerology_remedy}</p>}
                </AnalysisSection>
              )}

              {a.lal_kitab_analysis && (
                <AnalysisSection title="लाल किताब" color="var(--color-text-danger)">
                  <p style={{ margin:'0 0 4px' }}>{a.lal_kitab_analysis.key_observation}</p>
                  <p style={{ margin:'0 0 4px' }}><strong>उपाय:</strong> {a.lal_kitab_analysis.remedy}</p>
                  <p style={{ margin:'0 0 4px' }}><strong>समय:</strong> {a.lal_kitab_analysis.timing}</p>
                  <p style={{ margin:0, fontSize:'11px', color:'var(--color-text-tertiary)' }}>{a.lal_kitab_analysis.chapter_reference}</p>
                </AnalysisSection>
              )}

              {a.nadi_analysis && (
                <AnalysisSection title="नाड़ी ज्योतिष" color="var(--color-text-success)">
                  <p style={{ margin:'0 0 4px' }}>{a.nadi_analysis.karmic_theme}</p>
                  <p style={{ margin:'0 0 4px' }}><strong>क्षेत्र:</strong> {a.nadi_analysis.life_area_focus}</p>
                  <p style={{ margin:0 }}><strong>उपाय:</strong> {a.nadi_analysis.nadi_remedy}</p>
                </AnalysisSection>
              )}

              {a.hora_analysis && (
                <AnalysisSection title="होरा" color="var(--color-text-tertiary)">
                  <p style={{ margin:'0 0 4px' }}><strong>आज:</strong> {a.hora_analysis.ruling_planet_today}</p>
                  <p style={{ margin:'0 0 4px' }}>{a.hora_analysis.best_activity_now}</p>
                  <p style={{ margin:0, color:'var(--color-text-tertiary)' }}>{a.hora_analysis.avoid_now}</p>
                </AnalysisSection>
              )}

              {a.remedies && (
                <div style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>
                  <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'1px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:0 }}>उपाय — सभी प्रणालियाँ</p>
                  {a.remedies.vedic?.mantra && <div><p style={{ fontSize:'11px', fontWeight:'600', color:'var(--color-text-info)', margin:'0 0 2px', textTransform:'uppercase' }}>वैदिक</p><p style={{ fontSize:'13px', margin:0 }}><strong>मंत्र:</strong> {a.remedies.vedic.mantra}{a.remedies.vedic.gem && <><br/><strong>रत्न:</strong> {a.remedies.vedic.gem}</>}</p></div>}
                  {a.remedies.lal_kitab?.action && <div><p style={{ fontSize:'11px', fontWeight:'600', color:'var(--color-text-danger)', margin:'0 0 2px', textTransform:'uppercase' }}>लाल किताब</p><p style={{ fontSize:'13px', margin:0 }}>{a.remedies.lal_kitab.action}</p></div>}
                  {a.remedies.nadi_karma?.seva && <div><p style={{ fontSize:'11px', fontWeight:'600', color:'var(--color-text-success)', margin:'0 0 2px', textTransform:'uppercase' }}>नाड़ी/कर्म</p><p style={{ fontSize:'13px', margin:0 }}>{a.remedies.nadi_karma.seva} {a.remedies.nadi_karma.duration && <span style={{ color:'var(--color-text-tertiary)' }}>({a.remedies.nadi_karma.duration})</span>}</p></div>}
                  {a.remedies.numerology?.action && <div><p style={{ fontSize:'11px', fontWeight:'600', color:'var(--color-text-warning)', margin:'0 0 2px', textTransform:'uppercase' }}>अंक ज्योतिष</p><p style={{ fontSize:'13px', margin:0 }}>{a.remedies.numerology.action}</p></div>}
                  {a.remedies.color_day_direction?.color && <div><p style={{ fontSize:'11px', fontWeight:'600', color:'var(--color-text-secondary)', margin:'0 0 2px', textTransform:'uppercase' }}>रंग / दिन / दिशा</p><p style={{ fontSize:'13px', margin:0 }}>{a.remedies.color_day_direction.color} · {a.remedies.color_day_direction.day} · {a.remedies.color_day_direction.direction}</p></div>}
                </div>
              )}

              {a.actionable_seva_remedy && (
                <div style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'10px 12px' }}>
                  <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'1px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 4px' }}>सुझाई गई सेवा</p>
                  <p style={{ margin:'0 0 4px', fontSize:'13px', fontWeight:'500', color:'var(--color-text-primary)' }}>{a.actionable_seva_remedy.target_action}</p>
                  <p style={{ margin:'0 0 4px', fontSize:'12px', color:'var(--color-text-secondary)' }}>{a.actionable_seva_remedy.target_location_type}</p>
                  <p style={{ margin:0, fontSize:'11px', color:'var(--color-text-tertiary)' }}>{a.actionable_seva_remedy.shastric_reference}</p>
                </div>
              )}

              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'12px', color:'var(--color-text-tertiary)' }}>विश्लेषण कैसा था?</span>
                <button onClick={() => sendFeedback(k.id, 'up')} disabled={!!feedbackSent[k.id]} style={{ background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'5px 10px', cursor: feedbackSent[k.id] ? 'default' : 'pointer', fontSize:'14px', opacity: feedbackSent[k.id] && feedbackSent[k.id] !== 'up' ? 0.4 : 1 }}>👍</button>
                <button onClick={() => sendFeedback(k.id, 'down')} disabled={!!feedbackSent[k.id]} style={{ background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'5px 10px', cursor: feedbackSent[k.id] ? 'default' : 'pointer', fontSize:'14px', opacity: feedbackSent[k.id] && feedbackSent[k.id] !== 'down' ? 0.4 : 1 }}>👎</button>
                {feedbackSent[k.id] && <span style={{ fontSize:'12px', color:'var(--color-text-success)' }}>✓ धन्यवाद</span>}
              </div>
            </div>
          )}

          {expanded && !a && (
            <div style={{ borderTop:'0.5px solid var(--color-border-tertiary)', padding:'1rem 1.25rem' }}>
              <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>विस्तृत विश्लेषण उपलब्ध नहीं — पुरानी कुंडली। नई बनाएं।</p>
            </div>
          )}
        </div>
        );
      })}


      {profile.email === 'dendthdel@gmail.com' && (
        <button onClick={() => router.push('/admin')} style={{ width:'100%', marginTop:'1.5rem', padding:'10px', fontSize:'14px', color:'var(--color-text-primary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontWeight:'500' }}>
          Admin पैनल
        </button>
      )}

      <button onClick={signOut} style={{ width:'100%', marginTop:'8px', padding:'10px', fontSize:'14px', color:'var(--color-text-secondary)', background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer' }}>
        Logout
      </button>
    </div>
    </div>
  );
}

function AnalysisSection({ title, color, children }) {
  return (
    <div>
      <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'1.5px', textTransform:'uppercase', color, margin:'0 0 6px' }}>{title}</p>
      <div style={{ fontSize:'13px', color:'var(--color-text-primary)', lineHeight:'1.6' }}>
        {children}
      </div>
    </div>
  );
}

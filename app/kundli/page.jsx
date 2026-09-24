'use client';
// app/kundli/page.jsx
//
// Kundli hub — "मेरी कुंडलियाँ" (saved kundli list + add-kundli wizard,
// moved out of /profile so Kundli has its own dedicated bottom-nav
// destination) plus a card linking to /milan (कुंडली मिलान). Matchmaking
// itself stays a separate full page — no point duplicating that logic
// here, this is just the front door.
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import DateOfBirthInput from '@/components/DateOfBirthInput';
import EditKundliModal from '@/components/EditKundliModal';
import MissingKundliFieldsModal from '@/components/MissingKundliFieldsModal';
import { getMissingKundliFields } from '@/lib/kundli-form-validation';
import { t, getSavedUiLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const ANALYZING_STEPS = [
  'कुंडली बन रही है',
  'ग्रह स्थिति गणना हो रही है',
  'योग और दशा पहचाने जा रहे हैं',
  'AI विश्लेषण लिखा जा रहा है',
  'बस थोड़ी देर और',
];

export default function KundliPage() {
  const supabase = createClient();
  const router   = useRouter();
  const [profile,  setProfile]  = useState(null);
  const [kundlis,  setKundlis]  = useState([]);
  const [addOpen,  setAddOpen]  = useState(false);
  const [editingKundli, setEditingKundli] = useState(null);
  const [newK,     setNewK]     = useState({ label:'', full_name:'', dob:'', birth_time:'', birth_place:'', latitude:'', longitude:'', ayanamsa:'lahiri', gender:'' });
  const [analyzing,setAnalyzing]= useState(false);
  const [missingFields, setMissingFields] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [analyzingStepIdx, setAnalyzingStepIdx] = useState(0);

  const [geocoding, setGeocoding] = useState(false);
  const [geoError,  setGeoError]  = useState('');
  const [geoResults, setGeoResults] = useState([]);
  const [uiLang, setUiLang] = useState('hi');

  useEffect(() => { setUiLang(getSavedUiLang()); }, []);

  useEffect(() => {
    if (!analyzing) { setAnalyzingStepIdx(0); return; }
    const id = setInterval(() => {
      setAnalyzingStepIdx(i => (i + 1) % ANALYZING_STEPS.length);
    }, 1800);
    return () => clearInterval(id);
  }, [analyzing]);

  useEffect(() => {
    loadAll();
    // Same deep link /milan used to send into /profile?addKundli=1 —
    // now it lands here instead.
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('addKundli') === '1') {
      setAddOpen(true);
    }
    fetch('/api/warmup').catch(() => {});
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) loadAll();
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
    if (kundliError) console.error('[Kundli] saved_kundlis error:', kundliError);

    setProfile(prof || { id: session.user.id, email: session.user.email });
    setKundlis(kundlisData || []);
  }

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
        if (data.results.length === 1) selectLocation(data.results[0]);
        else setGeoResults(data.results);
      } else {
        setGeoError('स्थान नहीं मिला — Latitude/Longitude खुद डालें');
      }
    } catch {
      setGeoError('स्थान खोजने में समस्या — Latitude/Longitude खुद डालें');
    }
    setGeocoding(false);
  }

  function selectLocation(r) {
    setNewK(k => ({ ...k, birth_place: r.display_name, latitude: r.latitude.toFixed(4), longitude: r.longitude.toFixed(4) }));
    setGeoResults([]);
    setGeoError('');
  }

  async function deleteKundli(id) {
    if (!confirm('इस कुंडली को permanently delete करें? यह वापस नहीं आएगी।')) return;
    const res = await fetch(`/api/kundli?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setKundlis(prev => prev.filter(k => k.id !== id));
    } else {
      alert('Delete नहीं हो पाया: ' + (data.error || 'unknown error'));
    }
  }

  async function addKundli(e) {
    e.preventDefault();
    const missing = getMissingKundliFields(newK);
    if (missing.length > 0) {
      setMissingFields(missing);
      const fieldsByStep = { full_name: 1, dob: 1, gender: 1, birth_time: 2, birth_place: 3 };
      setWizardStep(fieldsByStep[missing[0].field] || 1);
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
      setWizardStep(1);
      setNewK({ label:'', full_name:'', dob:'', birth_time:'', birth_place:'', latitude:'', longitude:'', ayanamsa:'lahiri', gender:'' });
    } else if (data.error) {
      setGeoError(data.error);
    }
    setAnalyzing(false);
  }

  if (!profile) return (
    <div className="lf-page" style={{ maxWidth:'680px', margin:'0 auto', padding:'1.5rem 1rem' }}>
      <div className="lf-skeleton" style={{ height:'64px', marginBottom:'8px' }} />
      <div className="lf-skeleton" style={{ height:'64px', marginBottom:'8px' }} />
    </div>
  );

  return (
    <div className="lf-page" style={{ maxWidth:'680px', margin:'0 auto', padding:'1.5rem 1rem' }}>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
        <h2 style={{ fontSize:'18px', fontWeight:'500', color:'var(--color-text-primary)', margin:0 }}>{t('kundliTitle', uiLang)}</h2>
        <button onClick={() => router.push('/chat')} style={{ fontSize:'13px', color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'6px 12px', cursor:'pointer' }}>
          {t('backToChat', uiLang)}
        </button>
      </div>

      {/* Matchmaking — front door only, /milan owns the actual flow */}
      <button onClick={() => router.push('/milan')} style={{ width:'100%', display:'flex', alignItems:'center', gap:'12px', padding:'14px', background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', cursor:'pointer', textAlign:'left', marginBottom:'1.25rem' }}>
        <span style={{ fontSize:'26px' }}>💍</span>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:'14px', fontWeight:'500', color:'var(--color-text-primary)', margin:'0 0 2px' }}>{t('kundliMilan', uiLang)}</p>
          <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0 }}>{kundlis.length >= 2 ? (uiLang === 'en' ? 'Match guna milan' : 'गुण मिलाएं') : (uiLang === 'en' ? 'Add 1 more kundli to match' : 'गुण मिलाने के लिए 1 और कुंडली जोड़ें')}</p>
        </div>
        <span style={{ color:'var(--color-text-tertiary)' }}>→</span>
      </button>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
        <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:0 }}>{t('myKundlis', uiLang)} ({kundlis.length})</p>
        <button onClick={() => { setAddOpen(a => !a); setWizardStep(1); }} style={{ fontSize:'13px', color:'var(--color-text-primary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', padding:'6px 12px', cursor:'pointer' }}>
          {t('addKundli', uiLang)}
        </button>
      </div>

      {addOpen && (
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-lg)', padding:'1.5rem', marginBottom:'1rem' }}>

          <div style={{ display:'flex', gap:'6px', marginBottom:'1.25rem', justifyContent:'center' }}>
            {[1,2,3].map(s => (
              <div key={s} style={{ width: wizardStep===s ? '24px' : '8px', height:'8px', borderRadius:'4px', background: s <= wizardStep ? 'var(--color-brand)' : 'var(--color-border-tertiary)', transition:'all 0.25s ease' }} />
            ))}
          </div>

          <form onSubmit={addKundli}>
            {wizardStep === 1 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div>
                  <label className="lf-label">पूरा नाम *</label>
                  <input value={newK.full_name} onChange={e => setNewK(k => ({...k, full_name:e.target.value}))} placeholder="अपना पूरा नाम लिखें" autoFocus style={{ width:'100%', fontSize:'15px' }}/>
                </div>
                <div>
                  <label className="lf-label">जन्म तिथि *</label>
                  <DateOfBirthInput value={newK.dob} onChange={dob => setNewK(k => ({...k, dob}))} style={{ fontSize:'15px' }}/>
                </div>
                <div>
                  <label className="lf-label">लिंग *</label>
                  <div style={{ display:'flex', gap:'8px' }}>
                    {[['male','पुरुष'],['female','महिला'],['other','अन्य']].map(([val, label]) => (
                      <button key={val} type="button" onClick={() => setNewK(k => ({...k, gender: val}))}
                        style={{ flex:1, padding:'9px', fontSize:'13px', borderRadius:'8px', cursor:'pointer',
                          border: `1px solid ${newK.gender === val ? 'var(--color-brand)' : 'var(--color-border-tertiary)'}`,
                          background: newK.gender === val ? 'var(--color-brand-light)' : 'var(--color-background-primary)',
                          color: newK.gender === val ? 'var(--color-brand)' : 'var(--color-text-secondary)' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" disabled={!newK.full_name.trim() || !newK.dob || !newK.gender} onClick={() => setWizardStep(2)}
                  style={{ padding:'12px', background: (!newK.full_name.trim() || !newK.dob || !newK.gender) ? 'var(--color-border-tertiary)' : 'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'10px', cursor: (!newK.full_name.trim() || !newK.dob || !newK.gender) ? 'default' : 'pointer', fontSize:'14px', fontWeight:'500', marginTop:'6px' }}>
                  आगे बढ़ें →
                </button>
              </div>
            )}

            {wizardStep === 2 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div style={{ textAlign:'center', marginBottom:'4px' }}>
                  <p style={{ fontSize:'15px', fontWeight:'500', color:'var(--color-text-primary)', margin:'0 0 4px' }}>जन्म का समय क्या था?</p>
                  <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0, lineHeight:'1.5' }}>जितना सटीक हो उतना अच्छा — जन्म प्रमाणपत्र या अस्पताल रिकॉर्ड से लें। 10-15 मिनट का अंतर भी असर डाल सकता है।</p>
                </div>
                <div>
                  <label className="lf-label">जन्म समय *</label>
                  <input type="time" value={newK.birth_time} onChange={e => setNewK(k => ({...k, birth_time:e.target.value}))} autoFocus style={{ width:'100%', fontSize:'18px', textAlign:'center', padding:'14px' }}/>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button type="button" onClick={() => setWizardStep(1)} style={{ flex:'0 0 80px', padding:'12px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'10px', cursor:'pointer', fontSize:'14px', color:'var(--color-text-secondary)' }}>← वापस</button>
                  <button type="button" disabled={!newK.birth_time} onClick={() => setWizardStep(3)}
                    style={{ flex:1, padding:'12px', background: !newK.birth_time ? 'var(--color-border-tertiary)' : 'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'10px', cursor: !newK.birth_time ? 'default' : 'pointer', fontSize:'14px', fontWeight:'500' }}>
                    आगे बढ़ें →
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div style={{ textAlign:'center', marginBottom:'4px' }}>
                  <p style={{ fontSize:'15px', fontWeight:'500', color:'var(--color-text-primary)', margin:'0 0 4px' }}>जन्म कहाँ हुआ था?</p>
                  <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0 }}>शहर का नाम लिखें, हम बाकी ढूंढ लेंगे</p>
                </div>
                <div>
                  <label className="lf-label">जन्म स्थान *</label>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <input value={newK.birth_place} onChange={e => { setNewK(k => ({...k, birth_place:e.target.value, latitude:'', longitude:''})); setGeoResults([]); }} placeholder="शहर का नाम लिखें" autoFocus style={{ flex:1, fontSize:'15px' }} onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); geocodePlace(); } }}/>
                    <button type="button" onClick={geocodePlace} disabled={geocoding} style={{ padding:'10px 16px', fontSize:'13px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'10px', cursor:'pointer', whiteSpace:'nowrap', color:'var(--color-text-primary)', flexShrink:0 }}>
                      {geocoding ? '...' : 'खोजें'}
                    </button>
                  </div>
                  {geoResults.length > 0 && (
                    <div style={{ marginTop:'8px', border:'0.5px solid var(--color-border-secondary)', borderRadius:'10px', overflow:'hidden' }}>
                      <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', padding:'6px 10px', margin:0, borderBottom:'0.5px solid var(--color-border-tertiary)' }}>सही स्थान चुनें:</p>
                      {geoResults.map((r, i) => (
                        <div key={i} onClick={() => selectLocation(r)} style={{ padding:'10px', fontSize:'13px', cursor:'pointer', borderBottom: i < geoResults.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none', color:'var(--color-text-primary)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {r.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                  {newK.latitude && newK.longitude && <p style={{ fontSize:'12px', color:'var(--color-text-success)', margin:'8px 0 0' }}>✓ स्थान मिल गया</p>}
                  {geoError && <p style={{ fontSize:'12px', color:'var(--color-text-danger)', margin:'8px 0 0' }}>{geoError}</p>}
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button type="button" onClick={() => setWizardStep(2)} style={{ flex:'0 0 80px', padding:'12px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'10px', cursor:'pointer', fontSize:'14px', color:'var(--color-text-secondary)' }}>← वापस</button>
                  <button type="submit" disabled={analyzing || !newK.latitude || !newK.longitude}
                    className={analyzing ? 'lf-btn-analyzing' : ''}
                    style={{ flex:1, padding:'12px', borderRadius:'10px', fontSize:'14px', fontWeight:'500', border:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                      ...(analyzing ? {} : { background: !newK.latitude ? 'var(--color-border-tertiary)' : 'var(--color-text-primary)', color:'var(--color-background-primary)', cursor: !newK.latitude ? 'default' : 'pointer' }) }}>
                    {analyzing ? <><span className="lf-spinner" /><span>{ANALYZING_STEPS[analyzingStepIdx]}...</span></> : 'कुंडली बनाएं →'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {kundlis.length === 0 ? (
        <div style={{ textAlign:'center', padding:'2rem', color:'var(--color-text-tertiary)', fontSize:'13px', border:'0.5px dashed var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)' }}>
          {t('noKundliMsg', uiLang)}
        </div>
      ) : kundlis.map(k => (
        <div key={k.id} style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', marginBottom:'8px', padding:'12px 14px', display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontWeight:'500', fontSize:'15px', margin:'0 0 2px', color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.label || k.full_name}</p>
            <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:0 }}>{k.dob} · {k.birth_time} · {k.birth_place}</p>
            {k.planet_data?.crossValidation?.length > 0 && (
              <span title={k.planet_data.crossValidation[0].textHi || k.planet_data.crossValidation[0].text} style={{ display:'inline-block', marginTop:'4px', fontSize:'10px', fontWeight:'600', color:'var(--color-text-success)', background:'var(--color-background-secondary)', borderRadius:'4px', padding:'2px 6px' }}>
                ✓ {k.planet_data.crossValidation.length > 1 ? `${k.planet_data.crossValidation.length} systems agree` : 'systems agree'}
              </span>
            )}
          </div>
          <button onClick={() => router.push(`/chat?kundliId=${k.id}`)} style={{ padding:'7px 14px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500', flexShrink:0 }}>
            {t('chatBtn', uiLang)}
          </button>
          <button onClick={() => setEditingKundli(k)} title="Edit" style={{ background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', padding:'7px', color:'var(--color-text-secondary)', flexShrink:0, display:'flex' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={() => deleteKundli(k.id)} title={t('deleteKundli', uiLang)} style={{ background:'none', border:'none', cursor:'pointer', padding:'7px', color:'var(--color-text-tertiary)', flexShrink:0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      ))}

      {editingKundli && (
        <EditKundliModal
          kundli={editingKundli}
          onClose={() => setEditingKundli(null)}
          onSaved={(updated) => {
            setKundlis(list => list.map(x => x.id === updated.id ? updated : x));
            setEditingKundli(null);
          }}
        />
      )}

      <MissingKundliFieldsModal missing={missingFields} onClose={() => setMissingFields(null)} />
    </div>
  );
}

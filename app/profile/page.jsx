'use client';
// app/profile/page.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import SiteRatingWidget from '@/components/SiteRatingWidget';
import DateOfBirthInput from '@/components/DateOfBirthInput';
import EditKundliModal from '@/components/EditKundliModal';

export const dynamic = 'force-dynamic';

// Rotating step-text while a kundli is being generated — cycles through
// the actual pipeline stages so the wait feels informative, not stuck.
const ANALYZING_STEPS = [
  'कुंडली बन रही है',
  'ग्रह स्थिति गणना हो रही है',
  'योग और दशा पहचाने जा रहे हैं',
  'AI विश्लेषण लिखा जा रहा है',
  'बस थोड़ी देर और',
];

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
  const [editingKundli, setEditingKundli] = useState(null); // kundli row being edited, or null
  const [newK,     setNewK]     = useState({ label:'', full_name:'', dob:'', birth_time:'', birth_place:'', latitude:'', longitude:'', ayanamsa:'lahiri', gender:'' });
  const [analyzing,setAnalyzing]= useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1=naam+dob, 2=time, 3=place
  const [analyzingStepIdx, setAnalyzingStepIdx] = useState(0);

  useEffect(() => {
    if (!analyzing) { setAnalyzingStepIdx(0); return; }
    const id = setInterval(() => {
      setAnalyzingStepIdx(i => (i + 1) % ANALYZING_STEPS.length);
    }, 1800);
    return () => clearInterval(id);
  }, [analyzing]);

  useEffect(() => {
    loadAll();
    // Warm up Render ephemeris service so it's ready when user saves kundli
    fetch('/api/warmup').catch(() => {});
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
    } else {
      alert('Delete नहीं हो पाया: ' + (data.error || 'unknown error'));
    }
  }

  async function addKundli(e) {
    e.preventDefault();
    if (!newK.gender) {
      setGeoError('कृपया लिंग चुनें — बेहतर विश्लेषण और संबोधन के लिए ज़रूरी है');
      setWizardStep(1);
      return;
    }
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
      setWizardStep(1);
      setNewK({ label:'', full_name:'', dob:'', birth_time:'', birth_place:'', latitude:'', longitude:'', ayanamsa:'lahiri', gender:'' });
    } else if (data.error) {
      setGeoError(data.error);
    }
    setAnalyzing(false);
  }


  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (!profile) return (
    <div className="lf-page" style={{ maxWidth:'680px', margin:'0 auto', padding:'1.5rem 1rem' }}>
      <div className="lf-skeleton" style={{ height:'100px', marginBottom:'12px' }} />
      <div className="lf-skeleton" style={{ height:'64px', marginBottom:'8px' }} />
      <div className="lf-skeleton" style={{ height:'64px', marginBottom:'8px' }} />
    </div>
  );

  const initials = (profile.full_name || profile.email || 'U').slice(0,2).toUpperCase();

  return (
    <div className="lf-page" style={{ maxWidth:'680px', margin:'0 auto', padding:'1.5rem 1rem' }}>

      {/* Simple page heading — no logo here, it's in the browser tab */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
        <h2 style={{ fontSize:'18px', fontWeight:'500', color:'var(--color-text-primary)', margin:0 }}>प्रोफाइल</h2>
        <button onClick={() => router.push('/chat')} style={{ fontSize:'13px', color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'6px 12px', cursor:'pointer' }}>
          ← Chat पर जाएं
        </button>
      </div>

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
        <button onClick={() => { setAddOpen(a => !a); setWizardStep(1); }} style={{ fontSize:'13px', color:'var(--color-text-primary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', padding:'6px 12px', cursor:'pointer' }}>
          + नई कुंडली
        </button>
      </div>

      {/* Add kundli wizard — one friendly step at a time, reduces drop-off */}
      {addOpen && (
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-lg)', padding:'1.5rem', marginBottom:'1rem' }}>

          {/* Progress dots */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'1.25rem', justifyContent:'center' }}>
            {[1,2,3].map(s => (
              <div key={s} style={{
                width: wizardStep===s ? '24px' : '8px', height:'8px', borderRadius:'4px',
                background: s <= wizardStep ? 'var(--color-brand)' : 'var(--color-border-tertiary)',
                transition:'all 0.25s ease',
              }} />
            ))}
          </div>

          <form onSubmit={addKundli}>

            {/* Step 1: Name + DOB */}
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
                      <button key={val} type="button"
                        onClick={() => setNewK(k => ({...k, gender: val}))}
                        style={{
                          flex:1, padding:'9px', fontSize:'13px', borderRadius:'8px', cursor:'pointer',
                          border: `1px solid ${newK.gender === val ? 'var(--color-brand)' : 'var(--color-border-tertiary)'}`,
                          background: newK.gender === val ? 'var(--color-brand-light)' : 'var(--color-background-primary)',
                          color: newK.gender === val ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button"
                  disabled={!newK.full_name.trim() || !newK.dob || !newK.gender}
                  onClick={() => setWizardStep(2)}
                  style={{ padding:'12px', background: (!newK.full_name.trim() || !newK.dob || !newK.gender) ? 'var(--color-border-tertiary)' : 'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'10px', cursor: (!newK.full_name.trim() || !newK.dob || !newK.gender) ? 'default' : 'pointer', fontSize:'14px', fontWeight:'500', marginTop:'6px' }}>
                  आगे बढ़ें →
                </button>
              </div>
            )}

            {/* Step 2: Birth Time */}
            {wizardStep === 2 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div style={{ textAlign:'center', marginBottom:'4px' }}>
                  <p style={{ fontSize:'15px', fontWeight:'500', color:'var(--color-text-primary)', margin:'0 0 4px' }}>जन्म का समय क्या था?</p>
                  <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0, lineHeight:'1.5' }}>
                    जितना सटीक हो उतना अच्छा — जन्म प्रमाणपत्र या अस्पताल रिकॉर्ड से लें। 10-15 मिनट का अंतर भी असर डाल सकता है।
                  </p>
                </div>
                <div>
                  <label className="lf-label">जन्म समय *</label>
                  <input type="time" value={newK.birth_time} onChange={e => setNewK(k => ({...k, birth_time:e.target.value}))} autoFocus style={{ width:'100%', fontSize:'18px', textAlign:'center', padding:'14px' }}/>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button type="button" onClick={() => setWizardStep(1)} style={{ flex:'0 0 80px', padding:'12px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'10px', cursor:'pointer', fontSize:'14px', color:'var(--color-text-secondary)' }}>
                    ← वापस
                  </button>
                  <button type="button"
                    disabled={!newK.birth_time}
                    onClick={() => setWizardStep(3)}
                    style={{ flex:1, padding:'12px', background: !newK.birth_time ? 'var(--color-border-tertiary)' : 'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'10px', cursor: !newK.birth_time ? 'default' : 'pointer', fontSize:'14px', fontWeight:'500' }}>
                    आगे बढ़ें →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Birth Place */}
            {wizardStep === 3 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div style={{ textAlign:'center', marginBottom:'4px' }}>
                  <p style={{ fontSize:'15px', fontWeight:'500', color:'var(--color-text-primary)', margin:'0 0 4px' }}>जन्म कहाँ हुआ था?</p>
                  <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0 }}>शहर का नाम लिखें, हम बाकी ढूंढ लेंगे</p>
                </div>
                <div>
                  <label className="lf-label">जन्म स्थान *</label>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <input
                      value={newK.birth_place}
                      onChange={e => { setNewK(k => ({...k, birth_place:e.target.value, latitude:'', longitude:''})); setGeoResults([]); }}
                      placeholder="शहर का नाम लिखें"
                      autoFocus
                      style={{ flex:1, fontSize:'15px' }}
                      onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); geocodePlace(); } }}
                    />
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
                  {newK.latitude && newK.longitude && (
                    <p style={{ fontSize:'12px', color:'var(--color-text-success)', margin:'8px 0 0' }}>✓ स्थान मिल गया</p>
                  )}
                  {geoError && <p style={{ fontSize:'12px', color:'var(--color-text-danger)', margin:'8px 0 0' }}>{geoError}</p>}
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button type="button" onClick={() => setWizardStep(2)} style={{ flex:'0 0 80px', padding:'12px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'10px', cursor:'pointer', fontSize:'14px', color:'var(--color-text-secondary)' }}>
                    ← वापस
                  </button>
                  <button type="submit" disabled={analyzing || !newK.latitude || !newK.longitude}
                    className={analyzing ? 'lf-btn-analyzing' : ''}
                    style={{
                      flex:1, padding:'12px', borderRadius:'10px', fontSize:'14px', fontWeight:'500', border:'none',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                      ...(analyzing
                        ? {} // colors/shadow/cursor come from .lf-btn-analyzing so they're never fought by inline low-contrast styles
                        : { background: !newK.latitude ? 'var(--color-border-tertiary)' : 'var(--color-text-primary)', color:'var(--color-background-primary)', cursor: !newK.latitude ? 'default' : 'pointer' }),
                    }}>
                    {analyzing
                      ? <><span className="lf-spinner" /><span>{ANALYZING_STEPS[analyzingStepIdx]}...</span></>
                      : 'कुंडली बनाएं →'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Kundli list — deliberately minimal: label + birth details +
          Edit/Delete/Chat only. Full vishleshan (analysis/faladesh/
          birth chart) lives inside the chat panel now (KundliDetailPanel)
          so people go into chat to see it, rather than reading
          everything here and leaving. */}
      {kundlis.length === 0 ? (
        <div style={{ textAlign:'center', padding:'2rem', color:'var(--color-text-tertiary)', fontSize:'13px', border:'0.5px dashed var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)' }}>
          अभी तक कोई कुंडली नहीं। ऊपर + बटन दबाएं।
        </div>
      ) : kundlis.map(k => (
        <div key={k.id} style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', marginBottom:'8px', padding:'12px 14px', display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontWeight:'500', fontSize:'15px', margin:'0 0 2px', color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.label || k.full_name}</p>
            <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:0 }}>{k.dob} · {k.birth_time} · {k.birth_place}</p>
          </div>
          <button onClick={() => router.push(`/chat?kundliId=${k.id}`)} style={{ padding:'7px 14px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500', flexShrink:0 }}>
            Chat
          </button>
          <button onClick={() => setEditingKundli(k)} title="Edit" style={{ background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', padding:'7px', color:'var(--color-text-secondary)', flexShrink:0, display:'flex' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={() => deleteKundli(k.id)} title="हटाएं" style={{ background:'none', border:'none', cursor:'pointer', padding:'7px', color:'var(--color-text-tertiary)', flexShrink:0 }}>
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


      {profile.email === 'dendthdel@gmail.com' && (
        <button onClick={() => router.push('/admin')} style={{ width:'100%', marginTop:'1.5rem', padding:'10px', fontSize:'14px', color:'var(--color-text-primary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontWeight:'500' }}>
          Admin पैनल
        </button>
      )}

      {kundlis.length >= 2 && (
        <button onClick={() => router.push('/milan')} style={{ width:'100%', marginTop:'8px', padding:'10px', fontSize:'14px', color:'var(--color-text-primary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontWeight:'500' }}>
          💍 कुंडली मिलान करें
        </button>
      )}

      <button onClick={() => router.push('/numerology')} style={{ width:'100%', marginTop:'8px', padding:'10px', fontSize:'14px', color:'var(--color-text-primary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontWeight:'500' }}>
        🔢 अंक ज्योतिष (नाम/कंपनी/दुकान जांचें)
      </button>

      {/* Site-wide open-to-all rating — every user sees the average +
          everyone's comments; each user can only submit/update their
          own (see app/api/ratings + migration_010). */}
      <div style={{ marginTop:'1.25rem' }}>
        <SiteRatingWidget feature="overall" title="Luckfixer को Rate करें (सबके लिए खुला)" />
      </div>

      <button onClick={signOut} style={{ width:'100%', marginTop:'8px', padding:'10px', fontSize:'14px', color:'var(--color-text-secondary)', background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer' }}>
        Logout
      </button>
    </div>
  );
}

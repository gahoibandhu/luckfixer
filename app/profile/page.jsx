'use client';
// app/profile/page.jsx
//
// Lean account page — profile info, usage, remedies status, support,
// admin link, logout, site rating. Kundli list/add-wizard moved to
// /kundli (its own bottom-nav destination); Ram Shalaka/Numerology/
// Milan quick-links dropped since the bottom nav + /kundli already
// cover them — no point duplicating navigation on every page.
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import SiteRatingWidget from '@/components/SiteRatingWidget';
import RectifyModal from '@/components/RectifyModal';
import LifeChips from '@/components/LifeChips';
import { labelFor, MARITAL_OPTIONS, CHILDREN_OPTIONS } from '@/lib/life-details';
import { getRemedyTimeStatus } from '@/lib/date-format';
import { t, getSavedUiLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const supabase = createClient();
  const router   = useRouter();
  const [profile,  setProfile]  = useState(null);
  const [usage,    setUsage]    = useState(null);
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState({ full_name:'', mobile:'' });
  const [saving,   setSaving]   = useState(false);
  const [remedies, setRemedies] = useState([]);
  const [uiLang, setUiLang] = useState('hi');
  const [kundlis, setKundlis] = useState([]);
  const [rectifying, setRectifying] = useState(null);
  const [lifeEditId, setLifeEditId] = useState(null);

  useEffect(() => { setUiLang(getSavedUiLang()); }, []);

  useEffect(() => {
    loadAll();
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

    const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle();

    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabase.from('usage_log').select('*').eq('user_id', session.user.id).eq('log_date', today).maybeSingle();

    setProfile(prof || { id: session.user.id, email: session.user.email });
    setForm({ full_name: prof?.full_name || '', mobile: prof?.mobile || '' });
    setUsage(usageData || { chat_count: 0, free_mins_used: 0 });
    loadRemedies();
    try {
      const { data: ks } = await supabase.from('saved_kundlis')
        .select('id, label, full_name, dob, birth_time, birth_time_source, life_events, marital_status, children_status, created_at')
        .eq('user_id', session.user.id).order('created_at', { ascending: true }).limit(6);
      setKundlis(ks || []);
    } catch { /* non-fatal — the card simply doesn't show */ }
  }


  async function saveLife(kundliId, body) {
    setKundlis(list => list.map(k => k.id === kundliId ? { ...k, ...Object.fromEntries(Object.entries(body).filter(([a]) => a === 'marital_status' || a === 'children_status')) } : k));
    try {
      await fetch('/api/kundli/life-details', { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ kundli_id: kundliId, ...body }) });
    } catch { /* non-fatal */ }
  }

  // ── Remedy tracking — full checklist lives on its own page now ──
  // (/remedies, consolidated like राम शलाका / कुंडली मिलान / अंक ज्योतिष).
  // Profile only needs enough to show a one-line status summary card.
  async function loadRemedies() {
    try {
      const res = await fetch('/api/remedies');
      const data = await res.json();
      setRemedies(data.remedies || []);
    } catch (e) {
      console.error('[Profile] loadRemedies error:', e);
    }
  }

  const pendingRemedies = remedies.filter(r => r.status === 'pending');
  const activeNowCount  = pendingRemedies.filter(r => getRemedyTimeStatus(r).phase === 'active').length;

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('user_profiles').upsert({ id: profile.id, ...form });
    setProfile(p => ({ ...p, ...form }));
    setEditing(false);
    setSaving(false);
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
        <h2 style={{ fontSize:'18px', fontWeight:'500', color:'var(--color-text-primary)', margin:0 }}>{t('profileTitle', uiLang)}</h2>
        <button onClick={() => router.push('/chat')} style={{ fontSize:'13px', color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'6px 12px', cursor:'pointer' }}>
          {t('backToChat', uiLang)}
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
            {editing ? t('closeEdit', uiLang) : t('editProfile', uiLang)}
          </button>
        </div>

        {editing ? (
          <form onSubmit={saveProfile} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <div><label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>{t('fullName', uiLang)}</label><input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} placeholder={t('fullName', uiLang)}/></div>
              <div><label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>{t('mobileLabel', uiLang)}</label><input value={form.mobile} onChange={e => setForm(f => ({...f, mobile: e.target.value}))} placeholder="+91 9999999999"/></div>
            </div>
            <button type="submit" disabled={saving} style={{ padding:'9px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>
              {saving ? t('saving', uiLang) : t('save', uiLang)}
            </button>
          </form>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'13px' }}>
            <div><span style={{ color:'var(--color-text-tertiary)' }}>{t('mobileLabel', uiLang)}: </span><span style={{ color:'var(--color-text-primary)' }}>{profile.mobile || '—'}</span></div>
            {usage && <div><span style={{ color:'var(--color-text-tertiary)' }}>{t('todaysChats', uiLang)}: </span><span style={{ color:'var(--color-text-primary)' }}>{usage.chat_count}</span></div>}
          </div>
        )}
      </div>

      {/* Birth-time confirmation + life details — one clear, tappable entry point */}
      {kundlis.length > 0 && (
        <div style={{ marginBottom:'1rem', display:'flex', flexDirection:'column', gap:'10px' }}>
          {kundlis.slice(0, 3).map(k => {
            const src = k.birth_time_source || 'exact';
            const needs = src === 'unknown' || src === 'approx';
            const statusText = src === 'unknown' ? (uiLang === 'en' ? 'Birth time not known' : 'जन्म समय पता नहीं')
              : src === 'approx' ? (uiLang === 'en' ? 'Birth time is approximate' : 'जन्म समय अनुमानित है')
              : src === 'rectified' ? (uiLang === 'en' ? 'Birth time confirmed from life events' : 'जन्म समय घटनाओं से पुष्ट')
              : (uiLang === 'en' ? 'Birth time recorded' : 'जन्म समय दर्ज');
            const editing = lifeEditId === k.id;
            return (
              <div key={k.id} style={{ background: needs ? 'var(--color-background-warning)' : 'var(--color-background-primary)', border:`0.5px solid ${needs ? 'var(--color-border-secondary)' : 'var(--color-border-tertiary)'}`, borderRadius:'var(--border-radius-lg)', padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'var(--color-background-secondary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>🕐</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontSize:'14px', fontWeight:500, color: needs ? 'var(--color-text-warning)' : 'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.label || k.full_name}</p>
                    <p style={{ margin:'2px 0 0', fontSize:'12px', color: needs ? 'var(--color-text-warning)' : 'var(--color-text-tertiary)' }}>{statusText}</p>
                  </div>
                  {needs ? (
                    <button onClick={() => setRectifying(k)} style={{ padding:'9px 14px', fontSize:'13px', fontWeight:600, cursor:'pointer', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', whiteSpace:'nowrap' }}>
                      {uiLang === 'en' ? 'Confirm now' : 'अभी पुष्टि करें'}
                    </button>
                  ) : (
                    <button onClick={() => setRectifying(k)} style={{ padding:'6px 4px', fontSize:'12px', cursor:'pointer', background:'none', border:'none', color:'var(--color-text-info)', textDecoration:'underline', whiteSpace:'nowrap' }}>
                      {uiLang === 'en' ? 'Not sure of the time?' : 'समय पक्का नहीं?'}
                    </button>
                  )}
                </div>

                {/* Life details — visible and editable, so the user always sees what is kept */}
                <div style={{ marginTop:'12px', paddingTop:'10px', borderTop:'0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
                    <p style={{ margin:0, fontSize:'12px', color:'var(--color-text-secondary)' }}>
                      {(k.marital_status || k.children_status) ? (
                        <>
                          {k.marital_status && <span>{labelFor(MARITAL_OPTIONS, k.marital_status, uiLang)}</span>}
                          {k.marital_status && k.children_status && <span> · </span>}
                          {k.children_status && <span>{uiLang === 'en' ? 'Children: ' : 'संतान: '}{labelFor(CHILDREN_OPTIONS, k.children_status, uiLang)}</span>}
                        </>
                      ) : (
                        <span style={{ color:'var(--color-text-tertiary)' }}>{uiLang === 'en' ? 'Life details: not added' : 'जीवन विवरण: जोड़ा नहीं'}</span>
                      )}
                    </p>
                    <button onClick={() => setLifeEditId(editing ? null : k.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'var(--color-text-info)', padding:'4px' }}>
                      {editing ? (uiLang === 'en' ? 'Done' : 'हो गया') : (uiLang === 'en' ? 'Edit' : 'बदलें')}
                    </button>
                  </div>
                  {editing && (
                    <div style={{ marginTop:'8px' }}>
                      <p style={{ margin:'0 0 6px', fontSize:'11px', color:'var(--color-text-tertiary)' }}>{uiLang === 'en' ? 'Status' : 'स्थिति'}</p>
                      <LifeChips field="marital" value={k.marital_status} lang={uiLang} compact onPick={(v) => saveLife(k.id, { marital_status: v })} />
                      <p style={{ margin:'10px 0 6px', fontSize:'11px', color:'var(--color-text-tertiary)' }}>{uiLang === 'en' ? 'Children' : 'संतान'}</p>
                      <LifeChips field="children" value={k.children_status} lang={uiLang} compact onPick={(v) => saveLife(k.id, { children_status: v })} />
                      {(k.marital_status || k.children_status) && (
                        <button onClick={() => { saveLife(k.id, { clear: ['marital', 'children'] }); setKundlis(list => list.map(x => x.id === k.id ? { ...x, marital_status: null, children_status: null } : x)); }} style={{ marginTop:'10px', background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'var(--color-text-danger)', padding:0 }}>
                          {uiLang === 'en' ? 'Remove these details' : 'ये जानकारी हटाएँ'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rectifying && (
        <RectifyModal
          kundli={rectifying}
          uiLang={uiLang}
          onClose={() => setRectifying(null)}
          onApplied={(updated) => {
            setKundlis(list => list.map(x => x.id === updated.id ? { ...x, birth_time: updated.birth_time, birth_time_source: updated.birth_time_source } : x));
            setRectifying(null);
          }}
        />
      )}

      {/* Quick links — only the things without their own bottom-nav
          tab: remedies tracker and contact/support. Kundli, Numerology,
          Ram Shalaka all live one tap away in the bottom nav now. */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'10px', marginBottom:'1.5rem' }}>
        <button onClick={() => router.push('/remedies')} style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:'6px', padding:'14px', background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', cursor:'pointer', textAlign:'left' }}>
          <span style={{ fontSize:'22px' }}>🪔</span>
          <span style={{ fontSize:'13px', fontWeight:'500', color:'var(--color-text-primary)' }}>{t('myRemedies', uiLang)}</span>
          <span style={{ fontSize:'11px', color:'var(--color-text-tertiary)' }}>{activeNowCount > 0 ? `${activeNowCount} ${uiLang === 'en' ? 'active now' : 'अभी चल रहे हैं'}` : t('remedyStart', uiLang)}</span>
        </button>

        <button onClick={() => router.push('/support')} style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:'6px', padding:'14px', background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', cursor:'pointer', textAlign:'left' }}>
          <span style={{ fontSize:'22px' }}>💬</span>
          <span style={{ fontSize:'13px', fontWeight:'500', color:'var(--color-text-primary)' }}>{t('contactUs', uiLang)}</span>
          <span style={{ fontSize:'11px', color:'var(--color-text-tertiary)' }}>{t('contactUsSub', uiLang)}</span>
        </button>
      </div>

      {profile.email === 'dendthdel@gmail.com' && (
        <button onClick={() => router.push('/admin')} style={{ width:'100%', marginBottom:'8px', padding:'10px', fontSize:'14px', color:'var(--color-text-primary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontWeight:'500' }}>
          {t('adminPanel', uiLang)}
        </button>
      )}

      <button onClick={signOut} style={{ width:'100%', padding:'10px', fontSize:'14px', color:'var(--color-text-secondary)', background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer' }}>
        {t('logout', uiLang)}
      </button>

      {/* Rating — kept at the very bottom of the page, on its own,
          so it doesn't compete with the actions above it. The 1-5
          star average is public (everyone sees it); the written note
          is private, read only by the Luckfixer team. */}
      <div style={{ marginTop:'2rem' }}>
        <SiteRatingWidget feature="overall" title={uiLang === 'en' ? 'Rate Luckfixer' : 'Luckfixer को Rate करें'} />
      </div>
    </div>
  );
}

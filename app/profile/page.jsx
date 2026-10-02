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
import EditKundliModal from '@/components/EditKundliModal';
import { t, getSavedUiLang, setSavedUiLang } from '@/lib/i18n';

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
  const [infoOpenId, setInfoOpenId] = useState(null);   // which kundli's "Additional info" is expanded
  const [editingKundli, setEditingKundli] = useState(null);

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
        .select('id, label, full_name, dob, birth_time, birth_time_source, birth_place, latitude, longitude, ayanamsa, life_events, marital_status, children_status, created_at')
        .eq('user_id', session.user.id).order('created_at', { ascending: true }).limit(10);
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

  async function deleteKundli(id) {
    if (!confirm(t('confirmDeleteKundli', uiLang))) return;
    try {
      const res = await fetch(`/api/kundli?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setKundlis(list => list.filter(k => k.id !== id));
      else alert(`${t('deleteFailed', uiLang)}: ${data.error || 'unknown error'}`);
    } catch {
      alert(t('deleteFailed', uiLang));
    }
  }

  function toggleLang() {
    const next = uiLang === 'en' ? 'hi' : 'en';
    setUiLang(next);
    setSavedUiLang(next);   // persists for every other page; no reload needed here
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
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <button onClick={toggleLang} aria-label="Switch language" title="Switch language" style={{ fontSize:'12px', fontWeight:600, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'6px 10px', cursor:'pointer' }}>
            {t('switchLang', uiLang)}
          </button>
          <button onClick={() => router.push('/chat')} style={{ fontSize:'13px', color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'6px 12px', cursor:'pointer' }}>
            {t('backToChat', uiLang)}
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem', marginBottom:'1rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'1rem' }}>
          <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'var(--color-background-info)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'500', fontSize:'15px', color:'var(--color-text-info)', flexShrink:0 }}>{initials}</div>
          <div style={{ flex:1 }}>
            <p style={{ fontWeight:'500', fontSize:'16px', margin:'0', color:'var(--color-text-primary)' }}>{profile.full_name || t('noName', uiLang)}</p>
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

      {/* Kundli cards — birth-time validation, Edit/Delete, and the optional
          "Additional info" (marital status + children) tucked behind a link so
          the card stays clean by default. */}
      {/* Add kundli — always reachable from Profile, on mobile and desktop.
          (Previously Profile had no way to add one; with zero kundlis the page showed nothing.) */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', margin:'0 0 10px' }}>
        <p style={{ margin:0, fontSize:'11px', fontWeight:500, letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)' }}>
          {t('myKundlisHeading', uiLang)} ({kundlis.length})
        </p>
        <button onClick={() => router.push('/kundli?addKundli=1')} style={{ minHeight:'40px', padding:'8px 14px', fontSize:'13px', fontWeight:600, cursor:'pointer', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', whiteSpace:'nowrap' }}>
          + {t('addKundli', uiLang)}
        </button>
      </div>
      {kundlis.length === 0 && (
        <div onClick={() => router.push('/kundli?addKundli=1')} role="button" tabIndex={0} style={{ textAlign:'center', padding:'1.5rem 1rem', marginBottom:'1rem', cursor:'pointer', border:'0.5px dashed var(--color-border-secondary)', borderRadius:'var(--border-radius-lg)', background:'var(--color-background-primary)' }}>
          <p style={{ margin:'0 0 4px', fontSize:'14px', fontWeight:500, color:'var(--color-text-primary)' }}>{t('noKundliYet', uiLang)}</p>
          <p style={{ margin:0, fontSize:'12px', color:'var(--color-text-tertiary)' }}>{t('noKundliHint', uiLang)}</p>
        </div>
      )}
      {kundlis.length > 0 && (
        <div style={{ marginBottom:'1rem', display:'flex', flexDirection:'column', gap:'10px' }}>
          {kundlis.map(k => {
            const src = k.birth_time_source || 'exact';
            const needs = src === 'unknown' || src === 'approx';
            const statusText = src === 'unknown' ? t('btUnknown', uiLang)
              : src === 'approx' ? t('btApprox', uiLang)
              : src === 'rectified' ? t('btRectified', uiLang)
              : t('btRecorded', uiLang);
            const infoOpen = infoOpenId === k.id;
            const hasInfo = !!(k.marital_status || k.children_status);
            const iconBtn = { background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', padding:'7px', display:'flex', color:'var(--color-text-secondary)', flexShrink:0 };
            const linkBtn = { background:'none', border:'none', cursor:'pointer', padding:'4px 0', fontSize:'12px', color:'var(--color-text-info)', textDecoration:'underline', whiteSpace:'nowrap' };
            return (
              <div key={k.id} style={{ background: needs ? 'var(--color-background-warning)' : 'var(--color-background-primary)', border:`0.5px solid ${needs ? 'var(--color-border-secondary)' : 'var(--color-border-tertiary)'}`, borderRadius:'var(--border-radius-lg)', padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'var(--color-background-secondary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>🕐</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontSize:'14px', fontWeight:500, color: needs ? 'var(--color-text-warning)' : 'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.label || k.full_name}</p>
                    <p style={{ margin:'2px 0 0', fontSize:'12px', color: needs ? 'var(--color-text-warning)' : 'var(--color-text-tertiary)' }}>{k.dob} · {statusText}</p>
                  </div>
                  <button onClick={() => setEditingKundli(k)} title={t('editKundli', uiLang)} aria-label={t('editKundli', uiLang)} style={iconBtn}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => deleteKundli(k.id)} title={t('deleteKundliBtn', uiLang)} aria-label={t('deleteKundliBtn', uiLang)} style={{ ...iconBtn, background:'none', border:'none', color:'var(--color-text-tertiary)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>

                <div style={{ marginTop:'10px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap:'wrap' }}>
                  {needs ? (
                    <button onClick={() => setRectifying(k)} style={{ padding:'8px 14px', fontSize:'13px', fontWeight:600, cursor:'pointer', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', whiteSpace:'nowrap' }}>
                      {t('validateBirthTime', uiLang)}
                    </button>
                  ) : src === 'rectified' ? (
                    // already found from events once — keep a quiet way to redo it
                    <button onClick={() => setRectifying(k)} style={linkBtn}>{t('validateBirthTime', uiLang)}</button>
                  ) : null /* birth time was ENTERED (exact): never nudge those users to "find" it */}
                  <button onClick={() => setInfoOpenId(infoOpen ? null : k.id)} style={{ ...linkBtn, marginLeft:'auto' }} aria-expanded={infoOpen}>
                    {t('additionalInfo', uiLang)} {infoOpen ? '▴' : '▾'}
                  </button>
                </div>

                {infoOpen && (
                  <div style={{ marginTop:'10px', paddingTop:'10px', borderTop:'0.5px solid var(--color-border-tertiary)' }}>
                    <p style={{ margin:'0 0 8px', fontSize:'12px', color:'var(--color-text-secondary)' }}>
                      {hasInfo ? (
                        <>
                          {k.marital_status && <span>{labelFor(MARITAL_OPTIONS, k.marital_status, uiLang)}</span>}
                          {k.marital_status && k.children_status && <span> · </span>}
                          {k.children_status && <span>{t('childrenPrefix', uiLang)}{labelFor(CHILDREN_OPTIONS, k.children_status, uiLang)}</span>}
                        </>
                      ) : (
                        <span style={{ color:'var(--color-text-tertiary)' }}>{t('infoNotAdded', uiLang)}</span>
                      )}
                    </p>
                    <p style={{ margin:'0 0 6px', fontSize:'11px', color:'var(--color-text-tertiary)' }}>{t('maritalLabel', uiLang)}</p>
                    <LifeChips field="marital" value={k.marital_status} lang={uiLang} compact onPick={(v) => saveLife(k.id, { marital_status: v })} />
                    <p style={{ margin:'10px 0 6px', fontSize:'11px', color:'var(--color-text-tertiary)' }}>{t('childrenLabel', uiLang)}</p>
                    <LifeChips field="children" value={k.children_status} lang={uiLang} compact onPick={(v) => saveLife(k.id, { children_status: v })} />
                    {hasInfo && (
                      <button onClick={() => { saveLife(k.id, { clear: ['marital', 'children'] }); setKundlis(list => list.map(x => x.id === k.id ? { ...x, marital_status: null, children_status: null } : x)); }} style={{ marginTop:'10px', background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'var(--color-text-danger)', padding:0 }}>
                        {t('removeDetails', uiLang)}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingKundli && (
        <EditKundliModal
          kundli={editingKundli}
          lang={uiLang}
          onClose={() => setEditingKundli(null)}
          onSaved={(updated) => {
            setKundlis(list => list.map(x => x.id === updated.id ? { ...x, ...updated } : x));
            setEditingKundli(null);
          }}
        />
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
          <span style={{ fontSize:'11px', color:'var(--color-text-tertiary)' }}>{activeNowCount > 0 ? `${activeNowCount} ${t('activeNow', uiLang)}` : t('remedyStart', uiLang)}</span>
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
        <SiteRatingWidget feature="overall" lang={uiLang} title={t('rateTitle', uiLang)} />
      </div>
    </div>
  );
}

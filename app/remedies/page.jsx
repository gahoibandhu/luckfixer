'use client';
// app/remedies/page.jsx — Standalone "मेरे उपाय" (My Remedies) tool
// Consolidated here instead of scattered across the profile page —
// same pattern as /numerology, /ram-shalaka, /milan. Shows WHEN a
// remedy should start, for how long, and only surfaces what's
// actually active right now (see migration_017, lib/date-format.js).

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { getHindiWeekday, getRemedyTimeStatus } from '@/lib/date-format';
import { t, getSavedUiLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const REMEDY_TYPE_ICON     = { lal_kitab: '🪔', vedic_mantra: '🕉️', gemstone: '💎', dosha_remedy: '⚠️' };
// Suggested duration when starting a remedy — editable by the user,
// not asserted as precise classical fact (see migration_017 notes).
// Donation-type Lal Kitab acts are typically one-time; mantra/dosha
// remedies follow the widely-cited general 43-day Lal Kitab convention;
// gemstones have no time limit once worn.
const DEFAULT_DURATION_DAYS = { lal_kitab: 1, vedic_mantra: 43, gemstone: null, dosha_remedy: 43 };
const REMEDY_TYPE_PRIORITY  = { dosha_remedy: 0, lal_kitab: 1, vedic_mantra: 2, gemstone: 3 };

function remedyLabel(r) {
  if (r.remedy_type === 'lal_kitab') {
    return `${r.day_of_week || ''} — ${r.donate || 'दान'} करें${r.avoid ? ` (सावधानी: ${r.avoid})` : ''}`.trim();
  }
  if (r.remedy_type === 'vedic_mantra') {
    return `"${r.mantra}"${r.mantra_count ? ` — ${r.mantra_count} बार जाप` : ''}`;
  }
  if (r.remedy_type === 'gemstone') {
    return `${r.gem_name}${r.gem_reason ? ` — ${r.gem_reason}` : ''}`;
  }
  if (r.remedy_type === 'dosha_remedy') {
    return r.remedy_text || r.yoga_name || 'उपाय';
  }
  return 'उपाय';
}

const TABS = [
  { id: 'active',      key: 'tabActive' },
  { id: 'not_started', key: 'tabNotStarted' },
  { id: 'done',        key: 'tabDone' },
];

export default function RemediesPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [profile,   setProfile]   = useState(null);
  const [kundlis,   setKundlis]   = useState([]);
  const [remedies,  setRemedies]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('active');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  // { [remedyId]: durationDays } — while the user is adjusting the
  // suggested duration before confirming "शुरू करें"
  const [startDraft, setStartDraft] = useState({});
  const [uiLang, setUiLang] = useState('hi');

  useEffect(() => { setUiLang(getSavedUiLang()); }, []);

  const todayWeekday = getHindiWeekday();

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const [{ data: prof }, { data: kundlisData }] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle(),
      supabase.from('saved_kundlis').select('id, label, full_name').eq('user_id', session.user.id).order('created_at', { ascending: false }),
    ]);
    setProfile(prof || { id: session.user.id, email: session.user.email });
    setKundlis(kundlisData || []);
    await loadRemedies();
    setLoading(false);
  }

  async function loadRemedies() {
    const res = await fetch('/api/remedies');
    const data = await res.json();
    setRemedies(data.remedies || []);
  }

  async function toggleEmailReminders() {
    const next = !profile.email_remedy_reminders;
    setProfile(p => ({ ...p, email_remedy_reminders: next }));
    await supabase.from('user_profiles').update({ email_remedy_reminders: next }).eq('id', profile.id);
  }

  async function startRemedy(r) {
    const duration = startDraft[r.id] !== undefined ? startDraft[r.id] : DEFAULT_DURATION_DAYS[r.remedy_type];
    const res = await fetch('/api/remedies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, action: 'start', duration_days: duration || null }),
    });
    const data = await res.json();
    if (data.remedy) {
      setRemedies(list => list.map(x => x.id === r.id ? data.remedy : x));
      setStartDraft(d => { const n = { ...d }; delete n[r.id]; return n; });
    }
  }

  async function updateStatus(id, status) {
    setRemedies(list => list.map(r => r.id === id ? { ...r, status, completed_at: status === 'done' ? new Date().toISOString() : null, start_date: status === 'pending' ? null : r.start_date, duration_days: status === 'pending' ? null : r.duration_days } : r));
    const res = await fetch('/api/remedies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (data.remedy) setRemedies(list => list.map(r => r.id === id ? data.remedy : r));
  }

  function sortRemedies(list) {
    return [...list].sort((a, b) => {
      const aToday = a.day_of_week === todayWeekday ? 0 : 1;
      const bToday = b.day_of_week === todayWeekday ? 0 : 1;
      if (aToday !== bToday) return aToday - bToday;
      return (REMEDY_TYPE_PRIORITY[a.remedy_type] ?? 9) - (REMEDY_TYPE_PRIORITY[b.remedy_type] ?? 9);
    });
  }

  function groupByKundli(list) {
    const groups = {};
    list.forEach(r => { (groups[r.kundli_id] ||= []).push(r); });
    return groups;
  }

  if (loading) {
    return <div style={{ padding:'2rem', textAlign:'center', color:'var(--color-text-secondary)', fontSize:'14px' }}>{t('remediesLoading', uiLang)}</div>;
  }

  // ── Bucket remedies by tab ────────────────────────────────────
  const pending = remedies.filter(r => r.status === 'pending');
  const done    = remedies.filter(r => r.status === 'done');
  const active      = pending.filter(r => r.start_date && getRemedyTimeStatus(r).phase !== 'expired');
  const notStarted  = pending.filter(r => !r.start_date);
  const expired     = pending.filter(r => r.start_date && getRemedyTimeStatus(r).phase === 'expired');

  const tabCounts = { active: active.length, not_started: notStarted.length, done: done.length };
  const visibleList = tab === 'active' ? [...expired, ...active] : tab === 'not_started' ? notStarted : done;

  return (
    <div style={{ maxWidth:'680px', margin:'0 auto', padding:'1.5rem 1rem' }}>
      <button onClick={() => router.push('/profile')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-secondary)', fontSize:'14px', padding:0, marginBottom:'1rem' }}>{t('backBtn', uiLang)}</button>

      <p style={{ fontSize:'11px', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 4px' }}>Luckfixer</p>
      <h1 style={{ fontSize:'22px', fontWeight:'500', margin:'0 0 1rem', color:'var(--color-text-primary)' }}>{t('remediesTitle', uiLang)}</h1>

      {remedies.length === 0 ? (
        <div style={{ textAlign:'center', padding:'2rem', color:'var(--color-text-tertiary)', fontSize:'13px', border:'0.5px dashed var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)' }}>
          {t('noRemediesYet', uiLang)}
        </div>
      ) : (
        <>
          {/* Email reminder opt-in — default is in-app only; email is an
              explicit additional channel, off by default. */}
          <label style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color:'var(--color-text-secondary)', margin:'0 0 14px', cursor:'pointer' }}>
            <input type="checkbox" checked={!!profile.email_remedy_reminders} onChange={toggleEmailReminders} style={{ width:'auto', padding:0 }} />
            {t('emailReminderLabel', uiLang)}
          </label>

          {/* Tabs */}
          <div style={{ display:'flex', gap:'4px', marginBottom:'1.25rem', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
            {TABS.map(tb => (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                padding:'8px 12px', fontSize:'13px', border:'none', background:'none', cursor:'pointer',
                color: tab===tb.id ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                borderBottom: tab===tb.id ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                fontWeight: tab===tb.id ? '500' : '400',
              }}>{t(tb.key, uiLang)} ({tabCounts[tb.id]})</button>
            ))}
          </div>

          {visibleList.length === 0 && (
            <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)', textAlign:'center', padding:'1.5rem 0' }}>
              {tab === 'done' ? t('noneDoneYet', uiLang) : tab === 'active' ? t('noneActiveNow', uiLang) : t('allDoneOrActive', uiLang)}
            </p>
          )}

          {Object.entries(groupByKundli(visibleList)).map(([kundliId, list]) => {
            const kundliLabel = kundlis.find(k => k.id === kundliId)?.label || kundlis.find(k => k.id === kundliId)?.full_name || 'कुंडली';
            const collapsed = collapsedGroups[kundliId];
            const sorted = sortRemedies(list);
            return (
              <div key={kundliId} style={{ marginBottom:'14px' }}>
                {kundlis.length > 1 && (
                  <button onClick={() => setCollapsedGroups(g => ({ ...g, [kundliId]: !g[kundliId] }))} style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:'pointer', padding:'4px 0', fontSize:'12px', fontWeight:'500', color:'var(--color-text-secondary)' }}>
                    <span style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', display:'inline-block', fontSize:'10px' }}>▾</span>
                    {kundliLabel} ({list.length})
                  </button>
                )}
                {!collapsed && sorted.map(r => {
                  const timeStatus = getRemedyTimeStatus(r);
                  const isToday = r.day_of_week === todayWeekday;
                  const isExpired = timeStatus.phase === 'expired';
                  return (
                    <div key={r.id} style={{ background:'var(--color-background-primary)', border: isExpired ? '1px solid var(--color-text-danger)' : (isToday && r.status === 'pending') ? '1px solid var(--color-text-warning)' : '0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', marginBottom:'8px', padding:'12px 14px', opacity: r.status === 'done' ? 0.6 : 1 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
                        <span style={{ fontSize:'18px', flexShrink:0 }}>{REMEDY_TYPE_ICON[r.remedy_type] || '✨'}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          {isExpired && (
                            <span style={{ display:'inline-block', fontSize:'10px', fontWeight:'600', color:'var(--color-text-danger)', background:'var(--color-background-warning)', borderRadius:'4px', padding:'2px 6px', marginBottom:'4px' }}>{t('expiredBadge', uiLang)}</span>
                          )}
                          {!isExpired && isToday && r.status === 'pending' && r.remedy_type === 'lal_kitab' && (
                            <span style={{ display:'inline-block', fontSize:'10px', fontWeight:'600', color:'var(--color-text-warning)', background:'var(--color-background-warning)', borderRadius:'4px', padding:'2px 6px', marginBottom:'4px' }}>{t('doTodayBadge', uiLang)} · {todayWeekday}</span>
                          )}
                          {!isExpired && timeStatus.phase === 'active' && timeStatus.daysRemaining != null && (
                            <span style={{ display:'inline-block', fontSize:'10px', fontWeight:'600', color:'var(--color-text-success)', background:'var(--color-background-secondary)', borderRadius:'4px', padding:'2px 6px', marginBottom:'4px' }}>{timeStatus.daysRemaining} {t('daysRemainingSuffix', uiLang)}</span>
                          )}
                          <p style={{ fontSize:'13px', color:'var(--color-text-primary)', margin:'0 0 3px', lineHeight:'1.5', textDecoration: r.status === 'done' ? 'line-through' : 'none' }}>{remedyLabel(r)}</p>
                          <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:0 }}>
                            {(r.planet_hi || r.planet) && `${r.planet_hi || r.planet} · `}{kundlis.length === 1 ? kundliLabel : ''}
                            {r.start_date && ` · ${t('startedOnPrefix', uiLang)} ${r.start_date.slice(8,10)}-${r.start_date.slice(5,7)}-${r.start_date.slice(0,4)}`}
                          </p>
                        </div>
                      </div>

                      {/* Not started yet — offer to start, with an editable
                          suggested duration (see DEFAULT_DURATION_DAYS above). */}
                      {r.status === 'pending' && !r.start_date && (
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'10px', flexWrap:'wrap' }}>
                          {DEFAULT_DURATION_DAYS[r.remedy_type] !== null && (
                            <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'var(--color-text-secondary)' }}>
                              {t('howManyDays', uiLang)}
                              <input type="number" min="1" style={{ width:'56px', padding:'4px 6px', fontSize:'12px' }}
                                value={startDraft[r.id] !== undefined ? startDraft[r.id] : DEFAULT_DURATION_DAYS[r.remedy_type]}
                                onChange={e => setStartDraft(d => ({ ...d, [r.id]: parseInt(e.target.value) || 1 }))} />
                            </label>
                          )}
                          <button onClick={() => startRemedy(r)} style={{ background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', padding:'6px 12px', cursor:'pointer', fontSize:'12px', fontWeight:'500' }}>
                            {t('startRemedyBtn', uiLang)}
                          </button>
                        </div>
                      )}

                      {/* Started (active or expired) — done / skip / restart */}
                      {r.status === 'pending' && r.start_date && (
                        <div style={{ display:'flex', gap:'6px', marginTop:'10px', flexWrap:'wrap' }}>
                          <button onClick={() => updateStatus(r.id, 'done')} style={{ background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'6px 10px', cursor:'pointer', fontSize:'12px', color:'var(--color-text-success)' }}>
                            {t('markDoneBtn', uiLang)}
                          </button>
                          {isExpired && (
                            <button onClick={() => startRemedy(r)} style={{ background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'6px 10px', cursor:'pointer', fontSize:'12px', color:'var(--color-text-primary)' }}>
                              {t('restartBtn', uiLang)}
                            </button>
                          )}
                          <button onClick={() => updateStatus(r.id, 'skipped')} style={{ background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'6px 10px', cursor:'pointer', fontSize:'12px', color:'var(--color-text-tertiary)' }}>
                            {t('skipBtn', uiLang)}
                          </button>
                        </div>
                      )}

                      {/* Done — allow reopening */}
                      {r.status === 'done' && (
                        <button onClick={() => updateStatus(r.id, 'pending')} style={{ marginTop:'8px', background:'none', border:'none', cursor:'pointer', fontSize:'11px', color:'var(--color-text-tertiary)' }}>
                          {t('undoBtn', uiLang)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

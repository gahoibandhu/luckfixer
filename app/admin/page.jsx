'use client';
// app/admin/page.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

const ADMIN_EMAIL = 'dendthdel@gmail.com';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [authorized, setAuthorized] = useState(null); // null = checking
  const [tab, setTab] = useState('overview');

  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [activeKundli, setActiveKundli] = useState(null);

  const [planForm, setPlanForm] = useState({ free_mins_day: '', free_chats_day: '', charge_per_min: '', plan_type: 'chat' });

  const [broadcastForm, setBroadcastForm] = useState({
    subject: '', headline: 'नमस्ते! 🙏', bodyText: '', ctaLabel: 'Login करें →', ctaUrl: '',
    audience: 'all', userIds: [],
  });
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);
  const [broadcastConfirm, setBroadcastConfirm] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [broadcastHistoryLoaded, setBroadcastHistoryLoaded] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // [{id, email, full_name}]

  // ── Migrations tab state ──────────────────────────────────
  const [kundliList, setKundliList] = useState([]);
  const [kundliSummary, setKundliSummary] = useState(null);
  const [kundliListLoaded, setKundliListLoaded] = useState(false);
  const [selectedKundliIds, setSelectedKundliIds] = useState([]);
  const [kundliMigrating, setKundliMigrating] = useState(false);
  const [kundliMigrateResult, setKundliMigrateResult] = useState(null);

  const [searchingUsers, setSearchingUsers] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [planMsg, setPlanMsg] = useState('');
  const [demoUsers, setDemoUsers] = useState([]);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoMsg, setDemoMsg] = useState('');
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [lifeDomainsStatus, setLifeDomainsStatus] = useState(null);
  const [lifeDomainsMigrating, setLifeDomainsMigrating] = useState(false);
  const [lifeDomainsAutoRunning, setLifeDomainsAutoRunning] = useState(false);
  const [lifeDomainsLastBatch, setLifeDomainsLastBatch] = useState(null);
  const [migrating, setMigrating] = useState(false);

  // ── Feedback tab state ──────────────────────────────────────
  const [feedbackData, setFeedbackData] = useState(null);
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);

  // ── Users tab state ──────────────────────────────────────────
  const [usersData, setUsersData] = useState(null);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userListSearch, setUserListSearch] = useState('');
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [userDetail, setUserDetail] = useState(null); // detail payload for expandedUserId, or 'loading'
  const [featuresData, setFeaturesData] = useState(null);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    if (session.user.email !== ADMIN_EMAIL) {
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
    loadStats();
    checkMigrationStatus();
    checkLifeDomainsStatus();
  }

  async function loadStats() {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    setStats(data);
    if (data.plan) {
      setPlanForm({
        free_mins_day:  data.plan.free_mins_day,
        free_chats_day: data.plan.free_chats_day,
        charge_per_min: data.plan.charge_per_min,
        plan_type:      data.plan.plan_type || 'chat',
      });
    }
    loadFeatures(); // feature-adoption cards render inside Overview, the default tab, so load immediately rather than waiting for a switchTab call
  }

  async function loadSessions(deleted = false, date = dateFilter) {
    const params = new URLSearchParams();
    if (deleted) params.set('deleted', 'true');
    if (date) params.set('date', date);
    const res = await fetch(`/api/admin/chats${params.toString() ? '?' + params.toString() : ''}`);
    const data = await res.json();
    setSessions(data.sessions || []);
    setActiveSession(null);
    setMessages([]);
    setActiveKundli(null);
  }

  async function toggleDeletedView() {
    const next = !showDeleted;
    setShowDeleted(next);
    await loadSessions(next);
  }

  function applyDateFilter(date) {
    setDateFilter(date);
    loadSessions(showDeleted, date);
  }

  async function openSession(sessionId) {
    // Toggle: clicking the already-open session collapses it instead of
    // re-fetching / staying stuck open — this was the reported bug
    // ("chat audit expand hota hai collapse nahi").
    if (activeSession === sessionId) {
      setActiveSession(null);
      setMessages([]);
      setActiveKundli(null);
      return;
    }
    setActiveSession(sessionId);
    const res = await fetch(`/api/admin/chats?sessionId=${sessionId}`);
    const data = await res.json();
    setMessages(data.messages || []);
    setActiveKundli(data.kundli || null);
  }

  async function adminDeleteSession(sessionId) {
    if (!confirm('इस session को permanently delete करें?')) return;
    await fetch(`/api/chat/delete?sessionId=${sessionId}&adminDelete=true`, { method: 'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSession === sessionId) { setActiveSession(null); setMessages([]); }
  }

  async function checkMigrationStatus() {
    const res = await fetch('/api/admin/migrate-kundlis');
    const data = await res.json();
    setMigrationStatus(data);
  }

  async function runMigration() {
    setMigrating(true);
    const res = await fetch('/api/admin/migrate-kundlis', { method: 'POST' });
    const data = await res.json();
    setMigrationStatus(prev => ({ ...prev, lastRun: data }));
    setMigrating(false);
    checkMigrationStatus();
  }

  // ── life_domains backfill (calls the AI, so processed in small
  // batches — click "अगला बैच" repeatedly, or use runAllLifeDomainBatches
  // to auto-loop until done). ─────────────────────────────────────
  async function checkLifeDomainsStatus() {
    const res = await fetch('/api/admin/migrate-life-domains');
    const data = await res.json();
    setLifeDomainsStatus(data);
  }

  async function runLifeDomainsBatch() {
    setLifeDomainsMigrating(true);
    const res = await fetch('/api/admin/migrate-life-domains', { method: 'POST' });
    const data = await res.json();
    setLifeDomainsLastBatch(data);
    setLifeDomainsMigrating(false);
    checkLifeDomainsStatus();
    return data;
  }

  async function runAllLifeDomainBatches() {
    setLifeDomainsAutoRunning(true);
    let remaining = 1;
    while (remaining > 0) {
      const data = await runLifeDomainsBatch();
      if (!data || data.processed === 0) break;
      const statusRes = await fetch('/api/admin/migrate-life-domains');
      const status = await statusRes.json();
      remaining = status.remaining;
      setLifeDomainsStatus(status);
      await new Promise(r => setTimeout(r, 1500)); // brief pause between batches
    }
    setLifeDomainsAutoRunning(false);
  }

  async function loadDemoUsers() {
    const res = await fetch('/api/admin/demo');
    const data = await res.json();
    setDemoUsers(data.users || []);
  }

  async function addDemoUser(e) {
    e.preventDefault();
    setDemoMsg('');
    const res = await fetch('/api/admin/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: demoEmail }),
    });
    const data = await res.json();
    if (data.success) {
      setDemoMsg('✓ Demo access दे दिया गया');
      setDemoEmail('');
      loadDemoUsers();
    } else {
      setDemoMsg('Error: ' + (data.error || 'unknown'));
    }
  }

  async function removeDemoUser(userId) {
    await fetch(`/api/admin/demo?userId=${userId}`, { method: 'DELETE' });
    setDemoUsers(prev => prev.filter(u => u.user_id !== userId));
  }

  async function sendBroadcast() {
    setBroadcastSending(true);
    setBroadcastResult(null);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastForm),
      });
      const data = await res.json();
      setBroadcastResult(res.ok ? data : { error: data.error || 'Bhejne mein error aaya' });
      if (res.ok) loadBroadcastHistory(); // refresh history to show this new send
    } catch (e) {
      setBroadcastResult({ error: e.message });
    }
    setBroadcastSending(false);
    setBroadcastConfirm(false);
  }

  async function searchUsers() {
    if (userSearch.trim().length < 2) { setUserResults([]); return; }
    setSearchingUsers(true);
    try {
      const res = await fetch(`/api/admin/broadcast?q=${encodeURIComponent(userSearch)}`);
      const data = await res.json();
      setUserResults(data.users || []);
    } catch (e) {
      setUserResults([]);
    }
    setSearchingUsers(false);
  }

  function toggleUserSelect(u) {
    setSelectedUsers(prev => {
      const exists = prev.some(s => s.id === u.id);
      const next = exists ? prev.filter(s => s.id !== u.id) : [...prev, u];
      setBroadcastForm(f => ({ ...f, userIds: next.map(s => s.id) }));
      return next;
    });
  }

  // Predefined promotional templates — one click fills the whole form
  const BROADCAST_TEMPLATES = [
    {
      label: '🆕 नया फीचर',
      subject: 'आपकी कुंडली में नया अपडेट है 🔮',
      headline: 'कुछ नया आया है आपके लिए! 🙏',
      bodyText: 'नमस्ते! Luckfixer 2.0 में हमने एक नया फीचर जोड़ा है जो आपकी कुंडली का विश्लेषण और बेहतर बनाता है। एक बार ज़रूर देखें — शायद आपकी अगली बड़ी जानकारी यहीं छुपी हो।',
      ctaLabel: 'अभी देखें →',
    },
    {
      label: '👋 वापस आइए',
      subject: 'आपकी कुंडली आपका इंतज़ार कर रही है 🙏',
      headline: 'कुछ दिनों से आप नहीं आए...',
      bodyText: 'हमें आपकी याद आई! आपकी कुंडली में शायद कुछ नया दिख रहा हो — दशा बदल गई हो, या कोई गोचर सक्रिय हो गया हो। दो मिनट निकालिए और देखिए अभी आपके लिए क्या खास है।',
      ctaLabel: 'वापस चलें →',
    },
    {
      label: '🪔 त्योहार शुभकामनाएं',
      subject: 'त्योहार की हार्दिक शुभकामनाएं 🪔',
      headline: 'त्योहार की शुभकामनाएं! 🙏',
      bodyText: 'इस शुभ अवसर पर Luckfixer 2.0 परिवार की ओर से आपको और आपके परिवार को हार्दिक शुभकामनाएं। यह समय नए संकल्प और सही दिशा तय करने का है — अपनी कुंडली देखकर जानिए आने वाला समय आपके लिए कैसा रहेगा।',
      ctaLabel: 'कुंडली देखें →',
    },
  ];

  function applyTemplate(t) {
    setBroadcastForm(f => ({ ...f, subject: t.subject, headline: t.headline, bodyText: t.bodyText, ctaLabel: t.ctaLabel }));
  }

  async function savePlan(e) {
    e.preventDefault();
    setPlanSaving(true);
    setPlanMsg('');
    const res = await fetch('/api/admin/plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_name: 'free',
        free_mins_day:  parseFloat(planForm.free_mins_day),
        free_chats_day: parseInt(planForm.free_chats_day),
        charge_per_min: parseFloat(planForm.charge_per_min),
        plan_type:      planForm.plan_type,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setPlanMsg('✓ सेव हो गया — 60 सेकंड में लागू होगा');
      loadStats();
    } else {
      setPlanMsg('Error: ' + (data.error || 'unknown'));
    }
    setPlanSaving(false);
  }

  function switchTab(t) {
    setTab(t);
    if (t === 'chats' && sessions.length === 0) loadSessions();
    if (t === 'demo' && demoUsers.length === 0) loadDemoUsers();
    if (t === 'broadcast' && !broadcastHistoryLoaded) loadBroadcastHistory();
    if (t === 'migrations' && !kundliListLoaded) loadKundliList();
    if (t === 'feedback' && !feedbackLoaded) loadFeedback();
    if (t === 'users' && !usersLoaded) loadUsers();
  }

  async function loadUsers(search = '') {
    const res = await fetch(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    const data = await res.json();
    setUsersData(data);
    setUsersLoaded(true);
  }

  async function loadFeatures() {
    const res = await fetch('/api/admin/features');
    const data = await res.json();
    setFeaturesData(data);
  }

  async function toggleUserDetail(userId) {
    if (expandedUserId === userId) { setExpandedUserId(null); setUserDetail(null); return; }
    setExpandedUserId(userId);
    setUserDetail('loading');
    const res = await fetch(`/api/admin/user-detail?userId=${userId}`);
    const data = await res.json();
    setUserDetail(data);
  }

  async function loadFeedback() {
    const res = await fetch('/api/admin/feedback');
    const data = await res.json();
    setFeedbackData(data);
    setFeedbackLoaded(true);
  }

  async function loadBroadcastHistory() {
    const res = await fetch('/api/admin/broadcast');
    const data = await res.json();
    setBroadcastHistory(data.history || []);
    setBroadcastHistoryLoaded(true);
  }

  // ── Migrations tab ─────────────────────────────────────────
  async function loadKundliList() {
    const res = await fetch('/api/admin/kundlis');
    const data = await res.json();
    setKundliList(data.kundlis || []);
    setKundliSummary(data);
    setKundliListLoaded(true);
  }

  function toggleKundliSelect(id) {
    setSelectedKundliIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  // Cheap path — offline, no AI call, only fills supportChain/remedyPlan
  // from data already stored on each row. Does NOT fix stale
  // varshaphal/मासिक dates (that needs the full re-analyze below).
  async function runSupportChainMigration() {
    setKundliMigrating(true);
    setKundliMigrateResult(null);
    const res = await fetch('/api/admin/migrate-support-chain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setKundliMigrateResult({ type: 'support-chain', ...data });
    setKundliMigrating(false);
    loadKundliList();
  }

  // Full path — costs one AI call per kundli, fixes EVERYTHING
  // (varshaphal date-anchoring/मासिक tab, supportChain, remedyPlan,
  // whatever the current AI schema is) by literally re-running the
  // whole pipeline. Batched at 25 per request (see route.js comment)
  // so a large selection is sent in sequential chunks from here.
  async function runFullReanalyzeBatch(ids) {
    setKundliMigrating(true);
    setKundliMigrateResult(null);
    const chunks = [];
    for (let i = 0; i < ids.length; i += 25) chunks.push(ids.slice(i, i + 25));

    const combined = { succeeded: [], failed: [], retryable: [] };
    for (const chunk of chunks) {
      const res = await fetch('/api/admin/kundlis/reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: chunk }),
      });
      const data = await res.json();
      if (data.succeeded) combined.succeeded.push(...data.succeeded);
      if (data.failed) combined.failed.push(...data.failed);
      if (data.retryable) combined.retryable.push(...data.retryable);
      setKundliMigrateResult({ type: 'full-reanalyze', ...combined, inProgress: true, done: combined.succeeded.length + combined.failed.length + combined.retryable.length, total: ids.length });
    }
    setKundliMigrateResult({ type: 'full-reanalyze', ...combined, inProgress: false });
    setKundliMigrating(false);
    setSelectedKundliIds([]);
    loadKundliList();
  }


  if (authorized === null) {
    return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--color-text-secondary)', fontSize:'14px' }}>लोड हो रहा है...</div>;
  }

  if (authorized === false) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'8px' }}>
        <p style={{ fontSize:'16px', fontWeight:'500', color:'var(--color-text-primary)' }}>Access Denied</p>
        <p style={{ fontSize:'13px', color:'var(--color-text-secondary)' }}>यह पेज सिर्फ admin के लिए है।</p>
      </div>
    );
  }

  return (
    <div>
      <Header subtitle="Admin Panel" />
    <div style={{ maxWidth:'900px', margin:'0 auto', padding:'1.5rem 1rem' }}>
      <p style={{ fontSize:'11px', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 4px' }}>Luckfixer Admin</p>
      <h1 style={{ fontSize:'22px', fontWeight:'500', margin:'0 0 1.5rem', color:'var(--color-text-primary)' }}>एडमिन पैनल</h1>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'1.5rem', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
        {[
          { id:'overview', label:'Overview' },
          { id:'users',    label:'👥 Users' },
          { id:'usage',    label:'📊 Usage' },
          { id:'chats',    label:'Chat Audit' },
          { id:'feedback', label:'⭐ Feedback' },
          { id:'plan',     label:'Plan Config' },
          { id:'demo',     label:'Demo Users' },
          { id:'broadcast',label:'📢 Broadcast' },
          { id:'migrations',label:'🔄 Migrations' },
        ].map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)} style={{
            padding:'8px 16px', fontSize:'14px', border:'none', background:'none', cursor:'pointer',
            color: tab===t.id ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            borderBottom: tab===t.id ? '2px solid var(--color-text-primary)' : '2px solid transparent',
            fontWeight: tab===t.id ? '500' : '400',
          }}>{t.label}</button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && stats && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'12px', marginBottom:'1.5rem' }}>
            <MetricCard label="कुल Users" value={stats.totalUsers} />
            <MetricCard label="कुल Kundlis" value={stats.totalKundlis} />
            <MetricCard label="आज Visitors" value={stats.todayVisitors ?? '—'} />
            <MetricCard label="आज Active (Chat)" value={stats.activeToday} />
            <MetricCard label="आज की Chats" value={stats.today.chats} />
            <MetricCard label="आज के Minutes" value={stats.today.mins.toFixed(1)} />
            <MetricCard label="आज के Tokens" value={stats.today.tokens.toLocaleString()} />
            {stats.outcomeStats && <>
              <MetricCard label="Tracked Predictions" value={stats.outcomeStats.total_tracked || 0} />
              <MetricCard label="Accuracy %" value={stats.outcomeStats.accuracy_pct != null ? `${stats.outcomeStats.accuracy_pct}%` : '—'} />
            </>}
          </div>
          <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:'-10px 0 1.5rem' }}>
            Visitors = आज login किया (भले chat ना किया हो) · Active (Chat) = आज कम से कम एक chat message भेजा
          </p>

          {/* Model usage breakdown — shows how much traffic is landing on
              Gemini (primary) vs weaker fallback providers. If chat/prediction
              quality feels inconsistent, check this first: a high fallback %
              usually means Gemini's rate limit is being hit under real load,
              and SambaNova/OpenRouter/HuggingFace/Groq don't follow the full
              system prompt as reliably as Gemini does. */}
          {stats.modelBreakdown && stats.modelBreakdown.length > 0 && (
            <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1rem 1.25rem', marginBottom:'1.5rem' }}>
              <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 10px' }}>AI Model Usage (पिछले 7 दिन)</p>
              {stats.modelBreakdown.map(m => (
                <div key={m.model} style={{ marginBottom:'8px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'3px' }}>
                    <span style={{ color: m.model.includes('gemini') ? 'var(--color-text-success)' : 'var(--color-text-warning)', fontWeight:'500' }}>{m.model}</span>
                    <span style={{ color:'var(--color-text-secondary)' }}>{m.count} ({m.pct}%)</span>
                  </div>
                  <div style={{ height:'6px', background:'var(--color-background-secondary)', borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${m.pct}%`, background: m.model.includes('gemini') ? 'var(--color-text-success)' : 'var(--color-text-warning)' }} />
                  </div>
                </div>
              ))}
              {stats.modelBreakdown.filter(m => !m.model.includes('gemini')).reduce((a,m) => a + m.pct, 0) > 30 && (
                <p style={{ fontSize:'11px', color:'var(--color-text-warning)', margin:'8px 0 0' }}>
                  ⚠️ 30% से ज़्यादा chats fallback providers pe जा रही हैं — Gemini का free-tier rate limit check karo, quality inconsistency isi ki wajah se ho sakti hai।
                </p>
              )}
            </div>
          )}

          {/* Kundli Migration */}
          {migrationStatus && migrationStatus.needsMigration > 0 && (
            <div style={{ background:'var(--color-background-warning)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1rem 1.25rem', marginBottom:'1.5rem' }}>
              <p style={{ fontSize:'13px', fontWeight:'500', color:'var(--color-text-warning)', margin:'0 0 6px' }}>
                ⚠️ {migrationStatus.needsMigration} पुरानी कुंडलियां lagna/houses/event-scores डेटा के बिना हैं
              </p>
              <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:'0 0 10px' }}>
                ये naye features (career/marriage/health score, lagna-based yogas) इस्तेमाल नहीं कर पाएंगी जब तक migrate ना हों। AI दोबारा call नहीं होगी — सिर्फ deterministic data refresh होगा, free है।
              </p>
              <button onClick={runMigration} disabled={migrating} style={{ padding:'8px 16px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500' }}>
                {migrating ? 'Migrate हो रहा है...' : `सभी ${migrationStatus.needsMigration} कुंडली Migrate करें`}
              </button>
              {migrationStatus.lastRun && (
                <p style={{ fontSize:'12px', color:'var(--color-text-success)', margin:'8px 0 0' }}>
                  ✓ Migrated: {migrationStatus.lastRun.migrated} · Skipped: {migrationStatus.lastRun.skipped} · Failed: {migrationStatus.lastRun.failed}
                </p>
              )}
            </div>
          )}
          {migrationStatus && migrationStatus.needsMigration === 0 && (
            <p style={{ fontSize:'12px', color:'var(--color-text-success)', margin:'0 0 1.5rem' }}>✓ सभी कुंडलियां up-to-date हैं (lagna/houses/event-scores सहित)</p>
          )}

          {/* Backfill for BOTH life_domains AND annual_timeline (new
              birthday-bound transit periods) — one AI call fills both
              at once for a kundli missing either. DOES call the AI
              (unlike the migration above), so it's batch-processed
              with a small per-request limit. "पूरा Migrate करें"
              auto-loops through all batches with a short pause between
              each. */}
          {lifeDomainsStatus && lifeDomainsStatus.remaining > 0 && (
            <div style={{ background:'var(--color-background-info)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1rem 1.25rem', marginBottom:'1.5rem' }}>
              <p style={{ fontSize:'13px', fontWeight:'500', color:'var(--color-text-info)', margin:'0 0 6px' }}>
                📖 {lifeDomainsStatus.remaining} कुंडलियां नए Vishleshan format (life_domains / वार्षिक Faladesh) के बिना हैं
              </p>
              <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:'0 0 10px' }}>
                यह AI दोबारा call करता है (हर कुंडली के लिए) — इसलिए {5}-{5} के batch में चलता है। "पूरा Migrate करें" अपने आप सभी batches चला देगा।
              </p>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                <button onClick={runLifeDomainsBatch} disabled={lifeDomainsMigrating || lifeDomainsAutoRunning} style={{ padding:'8px 16px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500', color:'var(--color-text-primary)' }}>
                  {lifeDomainsMigrating && !lifeDomainsAutoRunning ? 'चल रहा है...' : 'अगला बैच (5)'}
                </button>
                <button onClick={runAllLifeDomainBatches} disabled={lifeDomainsMigrating || lifeDomainsAutoRunning} style={{ padding:'8px 16px', background:'var(--color-text-info)', color:'#fff', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500' }}>
                  {lifeDomainsAutoRunning ? `चल रहा है... (${lifeDomainsStatus.remaining} बाकी)` : 'पूरा Migrate करें (सभी batches)'}
                </button>
              </div>
              {lifeDomainsLastBatch && (
                <p style={{ fontSize:'12px', color:'var(--color-text-success)', margin:'8px 0 0' }}>
                  ✓ पिछला batch: {lifeDomainsLastBatch.processed} processed
                  {lifeDomainsLastBatch.results?.some(r => r.status === 'error') && (
                    <span style={{ color:'var(--color-text-danger)' }}> · {lifeDomainsLastBatch.results.filter(r => r.status === 'error').length} failed</span>
                  )}
                </p>
              )}
            </div>
          )}
          {lifeDomainsStatus && lifeDomainsStatus.remaining === 0 && (
            <p style={{ fontSize:'12px', color:'var(--color-text-success)', margin:'0 0 1.5rem' }}>✓ सभी कुंडलियां नए Vishleshan format (life_domains / वार्षिक Faladesh) के साथ up-to-date हैं</p>
          )}

          {/* Feature adoption — before migration_012 + this route,
              Milan and Ram Shalaka wrote nothing to the database at
              all, so there was zero signal here on whether people
              actually use them. */}
          <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 10px' }}>Feature Adoption</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'12px', marginBottom:'1.5rem' }}>
            {!featuresData ? (
              <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)' }}>लोड हो रहा है...</p>
            ) : featuresData.features.map(f => (
              <div key={f.key} style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'1rem' }}>
                <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:'0 0 4px' }}>{f.label}</p>
                <p style={{ fontSize:'22px', fontWeight:'500', color:'var(--color-text-primary)', margin:0 }}>{f.total.toLocaleString()}</p>
                <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:'2px 0 0' }}>{f.last7d} पिछले 7 दिन में</p>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'0 0 10px' }}>
            <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:0 }}>हाल के Users</p>
            <button onClick={() => switchTab('users')} style={{ fontSize:'12px', color:'var(--color-text-info)', background:'none', border:'none', cursor:'pointer', padding:0 }}>पूरी सूची + पूरा data देखें →</button>
          </div>
          <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden' }}>
            {stats.recentUsers.length === 0 ? (
              <p style={{ padding:'1rem', fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>कोई users नहीं</p>
            ) : stats.recentUsers.map((u, i) => (
              <div key={u.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', borderBottom: i < stats.recentUsers.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none', fontSize:'13px' }}>
                <div>
                  <span style={{ color:'var(--color-text-primary)', fontWeight:'500' }}>{u.full_name || '(no name)'}</span>
                  <span style={{ color:'var(--color-text-tertiary)', marginLeft:'8px' }}>{u.email}</span>
                </div>
                <span style={{ color:'var(--color-text-tertiary)' }}>{new Date(u.created_at).toLocaleDateString('hi-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USERS TAB — full user list (not just the last 20), with real
          per-user micro-stats, search, and a click-to-expand
          drill-down showing everything that user has done on the
          site: kundlis, sessions, full usage history, numerology
          queries, milan/ram-shalaka uses, ratings and feedback given.
          This is the "on click sab dikhe" view. */}
      {tab === 'users' && (
        <div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
            <input
              value={userListSearch}
              onChange={e => setUserListSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') loadUsers(userListSearch); }}
              placeholder="नाम या email से खोजें..."
              style={{ flex:1, fontSize:'13px' }}
            />
            <button onClick={() => loadUsers(userListSearch)} style={{ padding:'8px 16px', fontSize:'13px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', color:'var(--color-text-primary)' }}>खोजें</button>
            {userListSearch && (
              <button onClick={() => { setUserListSearch(''); loadUsers(''); }} style={{ padding:'8px 12px', fontSize:'13px', background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', color:'var(--color-text-tertiary)' }}>Clear</button>
            )}
          </div>

          {!usersData ? (
            <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)' }}>लोड हो रहा है...</p>
          ) : (
            <>
              <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:'0 0 10px' }}>{usersData.count} users {userListSearch && `— "${userListSearch}" से match`} · सबसे ज़्यादा tokens इस्तेमाल करने वाले पहले</p>
              <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1.8fr 0.6fr 0.9fr 0.9fr', gap:'8px', padding:'8px 14px', fontSize:'11px', fontWeight:'500', color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
                  <span>User</span><span>Kundlis</span><span>Tokens</span><span>Last Active</span>
                </div>
                {usersData.users.length === 0 ? (
                  <p style={{ padding:'1rem', fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>कोई user नहीं मिला</p>
                ) : usersData.users.map((u, i) => (
                  <div key={u.id}>
                    <div
                      onClick={() => toggleUserDetail(u.id)}
                      style={{ display:'grid', gridTemplateColumns:'1.8fr 0.6fr 0.9fr 0.9fr', gap:'8px', padding:'10px 14px', fontSize:'13px', cursor:'pointer', borderBottom: (i < usersData.users.length-1 || expandedUserId===u.id) ? '0.5px solid var(--color-border-tertiary)' : 'none', background: expandedUserId===u.id ? 'var(--color-background-secondary)' : 'transparent' }}
                    >
                      <div style={{ minWidth:0 }}>
                        <p style={{ margin:0, fontWeight:'500', color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.full_name || '(no name)'} {expandedUserId===u.id ? '▲' : '▼'}</p>
                        <p style={{ margin:0, fontSize:'11px', color:'var(--color-text-tertiary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</p>
                      </div>
                      <span style={{ color:'var(--color-text-secondary)' }}>{u.kundlis}</span>
                      <span style={{ color:'var(--color-text-secondary)' }}>{u.total_tokens.toLocaleString()}</span>
                      <span style={{ color:'var(--color-text-tertiary)', fontSize:'12px' }}>{u.last_active ? new Date(u.last_active).toLocaleDateString('hi-IN') : '—'}</span>
                    </div>

                    {expandedUserId === u.id && (
                      <div style={{ padding:'14px', background:'var(--color-background-secondary)', borderBottom: i < usersData.users.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                        {userDetail === 'loading' ? (
                          <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0 }}>लोड हो रहा है...</p>
                        ) : userDetail?.error ? (
                          <p style={{ fontSize:'12px', color:'var(--color-text-danger)', margin:0 }}>{userDetail.error}</p>
                        ) : userDetail && (
                          <UserDetailPanel detail={userDetail} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* USAGE TAB — per-user token/minute/chat breakdown for today,
          plus the 7-day trend. Overview gives site-wide totals; this
          answers "kisne kitna use kiya" at the individual level, and
          "trend" over the last week so a spike/drop is visible without
          exporting the DB. */}
      {tab === 'usage' && stats && (
        <div>
          <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 10px' }}>आज — User के हिसाब से Usage</p>
          <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden', marginBottom:'1.5rem' }}>
            {(!stats.todayUsersDetailed || stats.todayUsersDetailed.length === 0) ? (
              <p style={{ padding:'1rem', fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>आज अभी तक किसी ने इस्तेमाल नहीं किया</p>
            ) : (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'8px', padding:'8px 14px', fontSize:'11px', fontWeight:'500', color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
                  <span>User</span><span>Chats</span><span>Minutes</span><span>Tokens</span>
                </div>
                {stats.todayUsersDetailed.map((u, i) => (
                  <div key={u.user_id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'8px', padding:'9px 14px', fontSize:'13px', borderBottom: i < stats.todayUsersDetailed.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                    <div style={{ minWidth:0 }}>
                      <p style={{ margin:0, fontWeight:'500', color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.full_name || '(no name)'}</p>
                      <p style={{ margin:0, fontSize:'11px', color:'var(--color-text-tertiary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</p>
                    </div>
                    <span style={{ color:'var(--color-text-secondary)' }}>{u.chats}</span>
                    <span style={{ color:'var(--color-text-secondary)' }}>{u.mins}</span>
                    <span style={{ color: i === 0 ? 'var(--color-text-warning)' : 'var(--color-text-secondary)', fontWeight: i === 0 ? '600' : '400' }}>{u.tokens.toLocaleString()}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 10px' }}>पिछले 7 दिन — Trend</p>
          <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden' }}>
            {(!stats.weekTrend || stats.weekTrend.length === 0) ? (
              <p style={{ padding:'1rem', fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>कोई डेटा नहीं</p>
            ) : (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr 1fr 1fr', gap:'8px', padding:'8px 14px', fontSize:'11px', fontWeight:'500', color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
                  <span>तारीख</span><span>Active Users</span><span>Chats</span><span>Minutes</span><span>Tokens</span>
                </div>
                {stats.weekTrend.map((d, i) => (
                  <div key={d.date} style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr 1fr 1fr', gap:'8px', padding:'9px 14px', fontSize:'13px', borderBottom: i < stats.weekTrend.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                    <span style={{ color:'var(--color-text-primary)', fontWeight:'500' }}>{new Date(d.date).toLocaleDateString('hi-IN', { day:'numeric', month:'short' })}</span>
                    <span style={{ color:'var(--color-text-secondary)' }}>{d.users}</span>
                    <span style={{ color:'var(--color-text-secondary)' }}>{d.chats}</span>
                    <span style={{ color:'var(--color-text-secondary)' }}>{d.mins.toFixed(1)}</span>
                    <span style={{ color:'var(--color-text-secondary)' }}>{d.tokens.toLocaleString()}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* FEEDBACK TAB — the private written feedback (star-rating
          comments + kundli thumbs/correction notes) users leave.
          These are intentionally NOT shown to other users (see
          migration_011 + app/api/admin/feedback) — this is the one
          place they surface. */}
      {tab === 'feedback' && (
        <div>
          {!feedbackData ? (
            <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)' }}>लोड हो रहा है...</p>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'12px', marginBottom:'1.5rem' }}>
                <MetricCard label="कुल Ratings" value={feedbackData.summary.totalRatings} />
                <MetricCard label="Ratings के साथ Comment" value={feedbackData.summary.totalComments} />
                <MetricCard label="Kundli Feedback (👍/👎)" value={feedbackData.summary.totalFeedback} />
                <MetricCard label="👍 Up" value={feedbackData.summary.thumbsUp} />
                <MetricCard label="👎 Down" value={feedbackData.summary.thumbsDown} />
              </div>

              <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 10px' }}>Rating Comments (निजी)</p>
              <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden', marginBottom:'1.5rem' }}>
                {feedbackData.ratingsWithComment.length === 0 ? (
                  <p style={{ padding:'1rem', fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>अभी तक कोई written feedback नहीं</p>
                ) : feedbackData.ratingsWithComment.map((r, i) => (
                  <div key={r.id} style={{ padding:'10px 14px', borderBottom: i < feedbackData.ratingsWithComment.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                      <span style={{ fontSize:'12px', fontWeight:'500', color:'var(--color-text-primary)' }}>{'⭐'.repeat(r.stars)} · {r.feature}</span>
                      <span style={{ fontSize:'11px', color:'var(--color-text-tertiary)' }}>{new Date(r.created_at).toLocaleDateString('hi-IN')}</span>
                    </div>
                    <p style={{ margin:'0 0 3px', fontSize:'13px', color:'var(--color-text-primary)', lineHeight:'1.5' }}>{r.comment}</p>
                    <p style={{ margin:0, fontSize:'11px', color:'var(--color-text-tertiary)' }}>{r.user}</p>
                  </div>
                ))}
              </div>

              <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 10px' }}>Kundli Feedback — Correction Notes</p>
              <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden' }}>
                {feedbackData.feedbackWithNote.length === 0 ? (
                  <p style={{ padding:'1rem', fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>अभी तक कोई correction note नहीं</p>
                ) : feedbackData.feedbackWithNote.map((f, i) => (
                  <div key={f.id} style={{ padding:'10px 14px', borderBottom: i < feedbackData.feedbackWithNote.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                      <span style={{ fontSize:'12px', fontWeight:'500', color: f.rating === 'up' ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}>{f.rating === 'up' ? '👍' : '👎'} · {f.section}</span>
                      <span style={{ fontSize:'11px', color:'var(--color-text-tertiary)' }}>{new Date(f.created_at).toLocaleDateString('hi-IN')}</span>
                    </div>
                    <p style={{ margin:'0 0 3px', fontSize:'13px', color:'var(--color-text-primary)', lineHeight:'1.5' }}>{f.correction_note}</p>
                    <p style={{ margin:0, fontSize:'11px', color:'var(--color-text-tertiary)' }}>{f.user}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* CHAT AUDIT TAB */}
      {tab === 'chats' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', flexWrap:'wrap', gap:'8px' }}>
            <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:0 }}>
              {showDeleted ? 'Deleted Sessions (Record Management)' : 'Active Sessions'}
            </p>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <input
                type="date"
                value={dateFilter}
                onChange={e => applyDateFilter(e.target.value)}
                style={{ fontSize:'12px', padding:'5px 8px' }}
              />
              {dateFilter && (
                <button onClick={() => applyDateFilter('')} style={{ fontSize:'11px', padding:'5px 8px', background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', color:'var(--color-text-tertiary)' }}>
                  ✕ Clear
                </button>
              )}
              <button onClick={toggleDeletedView} style={{ fontSize:'12px', padding:'6px 12px', background: showDeleted ? 'var(--color-background-secondary)' : 'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', color:'var(--color-text-primary)' }}>
                {showDeleted ? '← सामान्य view' : 'Deleted देखें'}
              </button>
            </div>
          </div>
        <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
          <div style={{ flex:'1 1 280px', background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden', maxHeight:'500px', overflowY:'auto' }}>
            {sessions.length === 0 ? (
              <p style={{ padding:'1rem', fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>{showDeleted ? 'कोई deleted sessions नहीं' : 'कोई sessions नहीं'}</p>
            ) : sessions.map(s => (
              <div key={s.id} style={{ borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
                <div style={{ display:'flex', alignItems:'center' }}>
                  <div onClick={() => openSession(s.id)} style={{ flex:1, padding:'10px 14px', cursor:'pointer', fontSize:'13px', background: activeSession===s.id ? 'var(--color-background-secondary)' : 'transparent' }}>
                    <p style={{ margin:'0 0 2px', fontWeight:'500', color:'var(--color-text-primary)' }}>{s.user_email}</p>
                    <p style={{ margin:0, color:'var(--color-text-tertiary)', fontSize:'12px' }}>{s.title} · {s.message_count} messages</p>
                    {s.kundli_name && (
                      <p style={{ margin:'2px 0 0', color:'var(--color-text-info)', fontSize:'11px' }}>📊 {s.kundli_name} · {s.kundli_dob}{s.kundli_luck_score != null ? ` · Score ${s.kundli_luck_score}` : ''}</p>
                    )}
                    <p style={{ margin:0, color:'var(--color-text-tertiary)', fontSize:'11px' }}>{new Date(s.updated_at).toLocaleString('hi-IN')}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); adminDeleteSession(s.id); }} title="Delete session" style={{ background:'none', border:'none', cursor:'pointer', padding:'8px 10px', color:'var(--color-text-danger)', fontSize:'14px', flexShrink:0 }}>🗑</button>
                </div>

                {/* Mobile-only accordion: expands right here on click, so users
                    don't have to scroll past the whole session list first.
                    Hidden on desktop via .lf-chat-audit-inline CSS (globals.css) —
                    desktop keeps the classic side-by-side panel below instead.
                    Clicking the same session again collapses it (openSession
                    toggles activeSession back to null). */}
                {activeSession === s.id && (
                  <div className="lf-chat-audit-inline" style={{ padding:'10px 14px', borderTop:'0.5px dashed var(--color-border-tertiary)', background:'var(--color-background-secondary)' }}>
                    {activeKundli && (
                      <div style={{ padding:'8px 10px', marginBottom:'10px', background:'var(--color-background-info)', borderRadius:'8px', fontSize:'12px', color:'var(--color-text-info)' }}>
                        <p style={{ margin:'0 0 2px', fontWeight:'500' }}>{activeKundli.label || activeKundli.full_name}</p>
                        <p style={{ margin:0 }}>{activeKundli.dob} · {activeKundli.birth_time} · {activeKundli.birth_place} {activeKundli.luck_score != null ? `· Score ${activeKundli.luck_score}` : ''}</p>
                      </div>
                    )}
                    {messages.length === 0 ? (
                      <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0 }}>कोई messages नहीं</p>
                    ) : messages.map(m => (
                      <div key={m.id} style={{ marginBottom:'10px' }}>
                        <p style={{ margin:'0 0 2px', fontSize:'11px', fontWeight:'500', color: m.role==='user' ? 'var(--color-text-info)' : 'var(--color-text-success)', letterSpacing:'1px', textTransform:'uppercase' }}>
                          {m.role} {m.model_used ? `· ${m.model_used}` : ''}
                        </p>
                        <p style={{ margin:0, fontSize:'13px', color:'var(--color-text-primary)', lineHeight:'1.6', whiteSpace:'pre-wrap' }}>{m.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="lf-chat-audit-panel" style={{ flex:'1 1 380px', background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1rem', maxHeight:'500px', overflowY:'auto' }}>
            {!activeSession ? (
              <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>एक session चुनें</p>
            ) : (
              <>
                {activeKundli && (
                  <div style={{ padding:'10px 12px', marginBottom:'12px', background:'var(--color-background-info)', borderRadius:'8px', fontSize:'12px', color:'var(--color-text-info)' }}>
                    <p style={{ margin:'0 0 2px', fontWeight:'500' }}>📊 {activeKundli.label || activeKundli.full_name}</p>
                    <p style={{ margin:0 }}>{activeKundli.dob} · {activeKundli.birth_time} · {activeKundli.birth_place} {activeKundli.luck_score != null ? `· Score ${activeKundli.luck_score}` : ''}</p>
                  </div>
                )}
                {messages.length === 0 ? (
                  <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>कोई messages नहीं</p>
                ) : messages.map(m => (
                  <div key={m.id} style={{ marginBottom:'10px' }}>
                    <p style={{ margin:'0 0 2px', fontSize:'11px', fontWeight:'500', color: m.role==='user' ? 'var(--color-text-info)' : 'var(--color-text-success)', letterSpacing:'1px', textTransform:'uppercase' }}>
                      {m.role} {m.model_used ? `· ${m.model_used}` : ''}
                    </p>
                    <p style={{ margin:0, fontSize:'13px', color:'var(--color-text-primary)', lineHeight:'1.6', whiteSpace:'pre-wrap' }}>{m.content}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        </div>
      )}

      {/* PLAN CONFIG TAB */}
      {tab === 'plan' && (
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem', maxWidth:'420px' }}>
          <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 1rem' }}>Free Tier Settings</p>
          <form onSubmit={savePlan} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

            {/* Plan Type */}
            <div>
              <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'8px' }}>Plan Type</label>
              <div style={{ display:'flex', gap:'8px' }}>
                {[['chat','Chat Based'],['time','Time Based'],['both','Both']].map(([val, label]) => (
                  <label key={val} style={{ display:'flex', alignItems:'center', gap:'5px', cursor:'pointer', padding:'6px 12px', border:`0.5px solid ${planForm.plan_type===val ? 'var(--color-text-primary)' : 'var(--color-border-tertiary)'}`, borderRadius:'var(--border-radius-md)', fontSize:'13px', fontWeight: planForm.plan_type===val ? '500' : '400', background: planForm.plan_type===val ? 'var(--color-background-secondary)' : 'transparent' }}>
                    <input type="radio" name="plan_type" value={val} checked={planForm.plan_type===val} onChange={() => setPlanForm(f => ({...f, plan_type: val}))} style={{ display:'none' }}/>
                    {label}
                  </label>
                ))}
              </div>
              <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:'4px 0 0' }}>
                {planForm.plan_type === 'chat' ? 'सिर्फ chat count से limit होगी' : planForm.plan_type === 'time' ? 'सिर्फ minutes से limit होगी' : 'Chat count AND minutes दोनों से limit होगी'}
              </p>
            </div>

            {(planForm.plan_type === 'chat' || planForm.plan_type === 'both') && (
              <div>
                <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>रोज़ Free Chats</label>
                <input type="number" value={planForm.free_chats_day} onChange={e => setPlanForm(f => ({...f, free_chats_day: e.target.value}))} />
              </div>
            )}

            {(planForm.plan_type === 'time' || planForm.plan_type === 'both') && (
              <div>
                <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>रोज़ Free Minutes</label>
                <input type="number" step="0.5" value={planForm.free_mins_day} onChange={e => setPlanForm(f => ({...f, free_mins_day: e.target.value}))} />
              </div>
            )}

            <div>
              <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>Charge per Minute (₹) — future billing</label>
              <input type="number" step="0.01" value={planForm.charge_per_min} onChange={e => setPlanForm(f => ({...f, charge_per_min: e.target.value}))} />
            </div>

            {planMsg && <p style={{ fontSize:'12px', color: planMsg.startsWith('✓') ? 'var(--color-text-success)' : 'var(--color-text-danger)', margin:0 }}>{planMsg}</p>}
            <button type="submit" disabled={planSaving} style={{ padding:'10px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>
              {planSaving ? 'Save हो रहा है...' : 'Save करें'}
            </button>
          </form>
        </div>
      )}

      {/* DEMO USERS TAB */}
      {tab === 'demo' && (
        <div>
          <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem', maxWidth:'420px', marginBottom:'1rem' }}>
            <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 12px' }}>Demo Access दें</p>
            <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:'0 0 12px' }}>Demo users को unlimited chats/minutes मिलते हैं — testing के लिए।</p>
            <form onSubmit={addDemoUser} style={{ display:'flex', gap:'8px' }}>
              <input type="email" value={demoEmail} onChange={e => setDemoEmail(e.target.value)} placeholder="user@email.com" required style={{ flex:1, fontSize:'13px' }}/>
              <button type="submit" style={{ padding:'8px 14px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', fontWeight:'500', whiteSpace:'nowrap' }}>Access दें</button>
            </form>
            {demoMsg && <p style={{ fontSize:'12px', color: demoMsg.startsWith('✓') ? 'var(--color-text-success)' : 'var(--color-text-danger)', margin:'8px 0 0' }}>{demoMsg}</p>}
          </div>

          <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
              <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:0 }}>Current Demo Users ({demoUsers.length})</p>
            </div>
            {demoUsers.length === 0 ? (
              <p style={{ padding:'1rem', fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>कोई demo user नहीं है।</p>
            ) : demoUsers.map((u, i) => (
              <div key={u.user_id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom: i < demoUsers.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none', fontSize:'13px' }}>
                <div>
                  <p style={{ margin:'0 0 2px', fontWeight:'500', color:'var(--color-text-primary)' }}>{u.email || u.user_id}</p>
                  <p style={{ margin:0, fontSize:'11px', color:'var(--color-text-tertiary)' }}>
                    Added: {new Date(u.created_at).toLocaleDateString('hi-IN')}
                    {u.expires_at ? ` · Expires: ${new Date(u.expires_at).toLocaleDateString('hi-IN')}` : ' · No expiry'}
                    {u.note ? ` · ${u.note}` : ''}
                  </p>
                </div>
                <button onClick={() => removeDemoUser(u.user_id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-danger)', fontSize:'13px', padding:'4px 8px' }}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'broadcast' && (
        <div style={{ maxWidth:'560px' }}>
          <div style={{ background:'var(--color-background-warning)', borderRadius:'var(--border-radius-md)', padding:'10px 14px', marginBottom:'1rem', fontSize:'12px', color:'var(--color-text-warning)' }}>
            ⚠️ यह असली users को असली email भेजेगा। भेजने से पहले content ध्यान से check करें।
          </div>

          {/* Predefined promotional templates */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'1rem', flexWrap:'wrap' }}>
            {BROADCAST_TEMPLATES.map(t => (
              <button key={t.label} type="button" onClick={() => applyTemplate(t)}
                style={{ padding:'8px 14px', fontSize:'12px', borderRadius:'20px', cursor:'pointer', border:'0.5px solid var(--color-border-secondary)', background:'var(--color-background-primary)', color:'var(--color-text-primary)' }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem' }}>
            <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 14px' }}>📢 Broadcast Email</p>

            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <div>
                <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>Audience</label>
                <div style={{ display:'flex', gap:'8px' }}>
                  {[['all','सभी Users'],['active_30d','Active (30 din)'],['specific','चुने हुए Users']].map(([val,label]) => (
                    <button key={val} type="button" onClick={() => setBroadcastForm(f => ({...f, audience: val}))}
                      style={{
                        flex:1, padding:'8px', fontSize:'12px', borderRadius:'8px', cursor:'pointer',
                        border: `1px solid ${broadcastForm.audience===val ? 'var(--color-brand)' : 'var(--color-border-tertiary)'}`,
                        background: broadcastForm.audience===val ? 'var(--color-brand-light)' : 'var(--color-background-primary)',
                        color: broadcastForm.audience===val ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {broadcastForm.audience === 'specific' && (
                <div style={{ border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'10px' }}>
                  <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchUsers()}
                      placeholder="नाम या email से खोजें..." style={{ flex:1, fontSize:'13px' }}/>
                    <button type="button" onClick={searchUsers} disabled={searchingUsers}
                      style={{ padding:'8px 14px', fontSize:'12px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', cursor:'pointer' }}>
                      {searchingUsers ? '...' : 'खोजें'}
                    </button>
                  </div>

                  {userResults.length > 0 && (
                    <div style={{ maxHeight:'160px', overflowY:'auto', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'8px', marginBottom:'8px' }}>
                      {userResults.map(u => {
                        const checked = selectedUsers.some(s => s.id === u.id);
                        return (
                          <label key={u.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 10px', fontSize:'12px', cursor:'pointer', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleUserSelect(u)} />
                            <span style={{ color:'var(--color-text-primary)' }}>{u.full_name || '(no name)'}</span>
                            <span style={{ color:'var(--color-text-tertiary)' }}>{u.email}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {selectedUsers.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                      {selectedUsers.map(u => (
                        <span key={u.id} onClick={() => toggleUserSelect(u)} style={{ fontSize:'11px', padding:'4px 8px', background:'var(--color-background-secondary)', borderRadius:'12px', cursor:'pointer', color:'var(--color-text-primary)' }}>
                          {u.email} ✕
                        </span>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:'6px 0 0' }}>{selectedUsers.length} user चुने गए</p>
                </div>
              )}

              <div>
                <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>Subject Line *</label>
                <input value={broadcastForm.subject} onChange={e => setBroadcastForm(f => ({...f, subject:e.target.value}))} placeholder="जैसे: आपकी कुंडली में नया अपडेट है 🔮" style={{ width:'100%', fontSize:'13px' }}/>
              </div>

              <div>
                <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>Headline (email के अंदर बड़ा टेक्स्ट)</label>
                <input value={broadcastForm.headline} onChange={e => setBroadcastForm(f => ({...f, headline:e.target.value}))} style={{ width:'100%', fontSize:'13px' }}/>
              </div>

              <div>
                <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>Message *</label>
                <textarea value={broadcastForm.bodyText} onChange={e => setBroadcastForm(f => ({...f, bodyText:e.target.value}))} rows={5} placeholder="अपना संदेश यहाँ लिखें..." style={{ width:'100%', fontSize:'13px', padding:'8px 10px', borderRadius:'8px', border:'0.5px solid var(--color-border-tertiary)', fontFamily:'inherit', resize:'vertical' }}/>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>Button Text</label>
                  <input value={broadcastForm.ctaLabel} onChange={e => setBroadcastForm(f => ({...f, ctaLabel:e.target.value}))} style={{ width:'100%', fontSize:'13px' }}/>
                </div>
                <div>
                  <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' }}>Button Link (optional)</label>
                  <input value={broadcastForm.ctaUrl} onChange={e => setBroadcastForm(f => ({...f, ctaUrl:e.target.value}))} placeholder="default: /login" style={{ width:'100%', fontSize:'13px' }}/>
                </div>
              </div>

              {!broadcastConfirm ? (
                <button
                  type="button"
                  disabled={!broadcastForm.subject.trim() || !broadcastForm.bodyText.trim() || (broadcastForm.audience === 'specific' && selectedUsers.length === 0)}
                  onClick={() => setBroadcastConfirm(true)}
                  style={{ padding:'11px', background: (!broadcastForm.subject.trim() || !broadcastForm.bodyText.trim() || (broadcastForm.audience === 'specific' && selectedUsers.length === 0)) ? 'var(--color-border-tertiary)' : 'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}
                >
                  Preview & Send →
                </button>
              ) : (
                <div style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'12px' }}>
                  <p style={{ fontSize:'13px', fontWeight:'600', color:'var(--color-text-primary)', margin:'0 0 6px' }}>पक्का भेजना है?</p>
                  <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:'0 0 12px' }}>
                    Audience: <strong>{broadcastForm.audience === 'all' ? 'सभी Users' : broadcastForm.audience === 'active_30d' ? 'Active (30 din)' : `${selectedUsers.length} चुने हुए Users`}</strong> को email जाएगा। यह undo नहीं हो सकता।
                  </p>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button onClick={() => setBroadcastConfirm(false)} style={{ flex:1, padding:'9px', background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'8px', cursor:'pointer', fontSize:'13px', color:'var(--color-text-secondary)' }}>रद्द करें</button>
                    <button onClick={sendBroadcast} disabled={broadcastSending} style={{ flex:1, padding:'9px', background:'var(--color-text-danger)', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                      {broadcastSending ? 'भेज रहे हैं...' : 'हाँ, भेजें'}
                    </button>
                  </div>
                </div>
              )}

              {broadcastResult && (
                <div style={{ padding:'10px 12px', background: broadcastResult.error ? 'var(--color-background-warning)' : 'var(--color-background-info)', borderRadius:'8px', fontSize:'12px', color: broadcastResult.error ? 'var(--color-text-warning)' : 'var(--color-text-info)' }}>
                  {broadcastResult.error
                    ? `Error: ${broadcastResult.error}`
                    : `✓ ${broadcastResult.sent} email भेजे गए, ${broadcastResult.failed} fail हुए (कुल ${broadcastResult.totalRecipients} recipients)`}
                </div>
              )}
            </div>
          </div>

          {/* Broadcast history summary */}
          <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden', marginTop:'1rem' }}>
            <div style={{ padding:'10px 14px', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
              <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:0 }}>Pichhle Broadcasts</p>
            </div>
            {broadcastHistory.length === 0 ? (
              <p style={{ padding:'1rem', fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>अभी तक कोई broadcast नहीं भेजा गया।</p>
            ) : broadcastHistory.map((b, i) => (
              <div key={b.id} style={{ padding:'10px 14px', borderBottom: i < broadcastHistory.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px' }}>
                  <p style={{ margin:'0 0 3px', fontSize:'13px', fontWeight:'500', color:'var(--color-text-primary)' }}>{b.subject}</p>
                  <span style={{ fontSize:'11px', color:'var(--color-text-tertiary)', whiteSpace:'nowrap', flexShrink:0 }}>{new Date(b.created_at).toLocaleDateString('hi-IN')}</span>
                </div>
                <p style={{ margin:0, fontSize:'12px', color:'var(--color-text-secondary)' }}>
                  {b.audience === 'all' ? 'सभी Users' : b.audience === 'active_30d' ? 'Active (30 din)' : 'चुने हुए Users'} · <span style={{ color:'var(--color-text-success)' }}>{b.sent_count} sent</span>
                  {b.failed_count > 0 && <span style={{ color:'var(--color-text-danger)' }}> · {b.failed_count} failed</span>}
                  {' '}· कुल {b.total_recipients}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'migrations' && (
        <div style={{ maxWidth:'760px' }}>
          {!kundliSummary ? (
            <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)' }}>लोड हो रहा है...</p>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'12px', marginBottom:'1.25rem' }}>
                <MetricCard label="कुल Kundlis" value={kundliSummary.total} />
                <MetricCard label="Gender missing" value={kundliSummary.needsGender} />
                <MetricCard label="Support-Chain बाकी" value={kundliSummary.needsSupportChainOnly} />
                <MetricCard label="पूरा Rebuild चाहिए" value={kundliSummary.needsFullRebuild} />
              </div>

              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'1rem' }}>
                <button type="button" disabled={kundliMigrating || kundliSummary.needsSupportChainOnly === 0} onClick={runSupportChainMigration}
                  style={{ padding:'9px 14px', fontSize:'13px', fontWeight:'500', borderRadius:'8px', cursor: kundliMigrating ? 'wait' : 'pointer', border:'0.5px solid var(--color-border-secondary)', background:'var(--color-background-secondary)', color:'var(--color-text-primary)', opacity: kundliSummary.needsSupportChainOnly === 0 ? 0.5 : 1 }}>
                  ⚡ Support-Chain केवल — सभी {kundliSummary.needsSupportChainOnly} (तेज़, बिना AI cost)
                </button>
                <button type="button" disabled={kundliMigrating || selectedKundliIds.length === 0} onClick={() => runFullReanalyzeBatch(selectedKundliIds)}
                  style={{ padding:'9px 14px', fontSize:'13px', fontWeight:'500', borderRadius:'8px', cursor: kundliMigrating ? 'wait' : 'pointer', border:'none', background: selectedKundliIds.length === 0 ? 'var(--color-border-tertiary)' : 'var(--color-brand)', color:'#fff' }}>
                  {kundliMigrating ? '⏳ चल रहा है...' : `🔄 पूरा Re-analyze — चुने हुए ${selectedKundliIds.length} (मासिक/varshaphal fix सहित, AI cost लगेगी)`}
                </button>
              </div>

              <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:'0 0 1rem' }}>
                "Support-Chain केवल" सिर्फ नए remedy/उपाय data जोड़ता है — मुफ़्त और तुरंत। "पूरा Re-analyze" हर चीज़ ताज़ा करता है (मासिक tab की तारीख़ वाली bug भी इसी से ठीक होगी) लेकिन हर कुंडली पर एक AI call लगती है, इसलिए नीचे table से चुनकर, थोड़े-थोड़े batch में चलाएं।
              </p>

              {kundliMigrateResult && (
                <div style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'12px 14px', marginBottom:'1rem', fontSize:'12px' }}>
                  {kundliMigrateResult.type === 'support-chain' ? (
                    <p style={{ margin:0 }}>✓ Migrated: {kundliMigrateResult.migrated} · Skipped: {kundliMigrateResult.skipped} · Failed: {kundliMigrateResult.failed}</p>
                  ) : (
                    <>
                      <p style={{ margin:'0 0 4px' }}>
                        {kundliMigrateResult.inProgress ? `⏳ चल रहा है — ${kundliMigrateResult.done}/${kundliMigrateResult.total}` : '✓ पूरा हुआ'}
                        {' '}· Succeeded: {kundliMigrateResult.succeeded?.length || 0} · Failed: {kundliMigrateResult.failed?.length || 0} · Retryable: {kundliMigrateResult.retryable?.length || 0}
                      </p>
                      {kundliMigrateResult.retryable?.length > 0 && (
                        <p style={{ margin:'0 0 4px', color:'var(--color-text-warning)' }}>Retryable (ephemeris service अस्थायी रूप से unavailable था) — थोड़ी देर बाद इन्हीं ids को दोबारा चुनकर चलाएं: {kundliMigrateResult.retryable.map(r => r.id.slice(0,8)).join(', ')}</p>
                      )}
                      {kundliMigrateResult.failed?.length > 0 && (
                        <p style={{ margin:0, color:'var(--color-text-danger)' }}>Failed: {kundliMigrateResult.failed.map(f => `${f.id.slice(0,8)} (${f.error})`).join('; ')}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 14px', borderBottom:'0.5px solid var(--color-border-tertiary)', fontSize:'11px', color:'var(--color-text-tertiary)' }}>
                  <input type="checkbox" checked={kundliList.length > 0 && selectedKundliIds.length === kundliList.length}
                    onChange={e => setSelectedKundliIds(e.target.checked ? kundliList.map(k => k.id) : [])} />
                  <span>सभी चुनें</span>
                </div>
                {kundliList.length === 0 ? (
                  <p style={{ padding:'1rem', fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>कोई kundli नहीं</p>
                ) : kundliList.map((k, i) => (
                  <div key={k.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 14px', borderBottom: i < kundliList.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none', fontSize:'12px' }}>
                    <input type="checkbox" checked={selectedKundliIds.includes(k.id)} onChange={() => toggleKundliSelect(k.id)} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:'0 0 2px', fontWeight:'500', color:'var(--color-text-primary)' }}>{k.full_name} <span style={{ color:'var(--color-text-tertiary)', fontWeight:'400' }}>· {k.dob}</span></p>
                      <p style={{ margin:0, color:'var(--color-text-tertiary)' }}>
                        {k.gender ? `लिंग: ${k.gender}` : <span style={{ color:'var(--color-text-warning)' }}>लिंग missing</span>}
                        {' · '}{k.hasLagna ? '✓ lagna' : '✗ lagna'}
                        {' · '}{k.hasSupportChain ? '✓ support-chain' : '✗ support-chain'}
                        {k.engineUsed && k.engineUsed !== 'pyswisseph' && <span style={{ color:'var(--color-text-warning)' }}> · engine: {k.engineUsed}</span>}
                        {k.last_analysis && ` · last: ${new Date(k.last_analysis).toLocaleDateString('hi-IN')}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'1rem' }}>
      <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:'0 0 4px' }}>{label}</p>
      <p style={{ fontSize:'24px', fontWeight:'500', color:'var(--color-text-primary)', margin:0 }}>{value}</p>
    </div>
  );
}

// Full drill-down for one user, rendered inline under their row in
// the Users tab (see /api/admin/user-detail). Everything a single
// click can surface: profile, kundlis, sessions, full usage history,
// numerology queries, milan/ram-shalaka uses, ratings + feedback.
function UserDetailPanel({ detail }) {
  const { profile, kundlis, sessions, usage, numerology, milanUses, ramShalakaUses, ratings, feedback } = detail;
  const Section = ({ title, children }) => (
    <div style={{ marginBottom:'12px' }}>
      <p style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 6px' }}>{title}</p>
      {children}
    </div>
  );

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px' }}>
      <div>
        <Section title="प्रोफाइल">
          <p style={{ fontSize:'12px', margin:'0 0 2px', color:'var(--color-text-primary)' }}>{profile.full_name || '(no name)'}</p>
          <p style={{ fontSize:'12px', margin:'0 0 2px', color:'var(--color-text-secondary)' }}>{profile.email}</p>
          <p style={{ fontSize:'12px', margin:'0 0 2px', color:'var(--color-text-secondary)' }}>{profile.mobile || 'mobile: —'}</p>
          <p style={{ fontSize:'11px', margin:0, color:'var(--color-text-tertiary)' }}>Signed up: {new Date(profile.created_at).toLocaleDateString('hi-IN')}</p>
        </Section>

        <Section title={`Usage (lifetime) — ${usage.activeDays} active days`}>
          <p style={{ fontSize:'12px', margin:'0 0 2px', color:'var(--color-text-primary)' }}>{usage.totals.chats} chats · {usage.totals.mins} min · {usage.totals.tokens.toLocaleString()} tokens</p>
          <p style={{ fontSize:'11px', margin:0, color:'var(--color-text-tertiary)' }}>
            {usage.firstActive ? `पहली बार: ${new Date(usage.firstActive).toLocaleDateString('hi-IN')}` : ''} {usage.lastActive ? `· आख़िरी बार: ${new Date(usage.lastActive).toLocaleDateString('hi-IN')}` : ''}
          </p>
        </Section>

        <Section title={`Feature Usage`}>
          <p style={{ fontSize:'12px', margin:'0 0 2px', color:'var(--color-text-primary)' }}>🔢 अंक ज्योतिष: {numerology.length}</p>
          <p style={{ fontSize:'12px', margin:'0 0 2px', color:'var(--color-text-primary)' }}>💍 कुंडली मिलान: {milanUses.length}</p>
          <p style={{ fontSize:'12px', margin:0, color:'var(--color-text-primary)' }}>🕉️ राम शलाका: {ramShalakaUses.length}</p>
        </Section>
      </div>

      <div>
        <Section title={`कुंडली (${kundlis.length})`}>
          {kundlis.length === 0 ? <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0 }}>कोई नहीं</p> :
            kundlis.slice(0, 6).map(k => (
              <p key={k.id} style={{ fontSize:'12px', margin:'0 0 3px', color:'var(--color-text-primary)' }}>
                {k.label || k.full_name} · <span style={{ color:'var(--color-text-tertiary)' }}>{k.dob} · Luck {k.luck_score ?? '—'}</span>
              </p>
            ))}
        </Section>

        <Section title={`हाल के Sessions (${sessions.length})`}>
          {sessions.length === 0 ? <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0 }}>कोई नहीं</p> :
            sessions.slice(0, 5).map(s => (
              <p key={s.id} style={{ fontSize:'12px', margin:'0 0 3px', color:'var(--color-text-primary)' }}>
                {s.title || 'Chat'} · <span style={{ color:'var(--color-text-tertiary)' }}>{new Date(s.updated_at).toLocaleDateString('hi-IN')}</span>
              </p>
            ))}
        </Section>
      </div>

      <div>
        <Section title={`Ratings दिए (${ratings.length})`}>
          {ratings.length === 0 ? <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0 }}>कोई नहीं</p> :
            ratings.map((r, i) => (
              <p key={i} style={{ fontSize:'12px', margin:'0 0 3px', color:'var(--color-text-primary)' }}>
                {'⭐'.repeat(r.stars)} ({r.feature}) {r.comment ? `— "${r.comment}"` : ''}
              </p>
            ))}
        </Section>

        <Section title={`Kundli Feedback (${feedback.length})`}>
          {feedback.length === 0 ? <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0 }}>कोई नहीं</p> :
            feedback.map((f, i) => (
              <p key={i} style={{ fontSize:'12px', margin:'0 0 3px', color: f.rating === 'up' ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}>
                {f.rating === 'up' ? '👍' : '👎'} ({f.section}) {f.correction_note ? `— "${f.correction_note}"` : ''}
              </p>
            ))}
        </Section>
      </div>
    </div>
  );
}

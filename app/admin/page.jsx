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

  const [planForm, setPlanForm] = useState({ free_mins_day: '', free_chats_day: '', charge_per_min: '', plan_type: 'chat' });
  const [planSaving, setPlanSaving] = useState(false);
  const [planMsg, setPlanMsg] = useState('');
  const [demoUsers, setDemoUsers] = useState([]);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoMsg, setDemoMsg] = useState('');

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
  }

  async function loadSessions(deleted = false) {
    const res = await fetch(`/api/admin/chats${deleted ? '?deleted=true' : ''}`);
    const data = await res.json();
    setSessions(data.sessions || []);
    setActiveSession(null);
    setMessages([]);
  }

  async function toggleDeletedView() {
    const next = !showDeleted;
    setShowDeleted(next);
    await loadSessions(next);
  }

  async function openSession(sessionId) {
    setActiveSession(sessionId);
    const res = await fetch(`/api/admin/chats?sessionId=${sessionId}`);
    const data = await res.json();
    setMessages(data.messages || []);
  }

  async function adminDeleteSession(sessionId) {
    if (!confirm('इस session को permanently delete करें?')) return;
    await fetch(`/api/chat/delete?sessionId=${sessionId}&adminDelete=true`, { method: 'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSession === sessionId) { setActiveSession(null); setMessages([]); }
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
          { id:'chats',    label:'Chat Audit' },
          { id:'plan',     label:'Plan Config' },
          { id:'demo',     label:'Demo Users' },
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
            <MetricCard label="आज Active" value={stats.activeToday} />
            <MetricCard label="आज की Chats" value={stats.today.chats} />
            <MetricCard label="आज के Minutes" value={stats.today.mins.toFixed(1)} />
            <MetricCard label="आज के Tokens" value={stats.today.tokens.toLocaleString()} />
          </div>

          <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 10px' }}>हाल के Users</p>
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

      {/* CHAT AUDIT TAB */}
      {tab === 'chats' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
            <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:0 }}>
              {showDeleted ? 'Deleted Sessions (Record Management)' : 'Active Sessions'}
            </p>
            <button onClick={toggleDeletedView} style={{ fontSize:'12px', padding:'6px 12px', background: showDeleted ? 'var(--color-background-secondary)' : 'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', color:'var(--color-text-primary)' }}>
              {showDeleted ? '← सामान्य view' : 'Deleted देखें'}
            </button>
          </div>
        <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
          <div style={{ flex:'1 1 280px', background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden', maxHeight:'500px', overflowY:'auto' }}>
            {sessions.length === 0 ? (
              <p style={{ padding:'1rem', fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>{showDeleted ? 'कोई deleted sessions नहीं' : 'कोई sessions नहीं'}</p>
            ) : sessions.map(s => (
              <div key={s.id} style={{ borderBottom:'0.5px solid var(--color-border-tertiary)', display:'flex', alignItems:'center' }}>
                <div onClick={() => openSession(s.id)} style={{ flex:1, padding:'10px 14px', cursor:'pointer', fontSize:'13px', background: activeSession===s.id ? 'var(--color-background-secondary)' : 'transparent' }}>
                  <p style={{ margin:'0 0 2px', fontWeight:'500', color:'var(--color-text-primary)' }}>{s.user_email}</p>
                  <p style={{ margin:0, color:'var(--color-text-tertiary)', fontSize:'12px' }}>{s.title} · {s.message_count} messages</p>
                  <p style={{ margin:0, color:'var(--color-text-tertiary)', fontSize:'11px' }}>{new Date(s.updated_at).toLocaleString('hi-IN')}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); adminDeleteSession(s.id); }} title="Delete session" style={{ background:'none', border:'none', cursor:'pointer', padding:'8px 10px', color:'var(--color-text-danger)', fontSize:'14px', flexShrink:0 }}>🗑</button>
              </div>
            ))}
          </div>

          <div style={{ flex:'1 1 380px', background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1rem', maxHeight:'500px', overflowY:'auto' }}>
            {!activeSession ? (
              <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>एक session चुनें</p>
            ) : messages.length === 0 ? (
              <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>कोई messages नहीं</p>
            ) : messages.map(m => (
              <div key={m.id} style={{ marginBottom:'10px' }}>
                <p style={{ margin:'0 0 2px', fontSize:'11px', fontWeight:'500', color: m.role==='user' ? 'var(--color-text-info)' : 'var(--color-text-success)', letterSpacing:'1px', textTransform:'uppercase' }}>
                  {m.role} {m.model_used ? `· ${m.model_used}` : ''}
                </p>
                <p style={{ margin:0, fontSize:'13px', color:'var(--color-text-primary)', lineHeight:'1.6', whiteSpace:'pre-wrap' }}>{m.content}</p>
              </div>
            ))}
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

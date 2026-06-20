'use client';
// app/chat/page.jsx
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

const LOGO_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';

export default function ChatPage() {
  const supabase      = createClient();
  const router        = useRouter();
  const messagesEnd   = useRef(null);

  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [sessionId,  setSessionId]  = useState(null);          // null until first message sent
  const [pendingKundliId, setPendingKundliId] = useState(null); // kundli to attach when session is created
  const [kundli,     setKundli]     = useState(null);
  const [usage,      setUsage]      = useState({ freeChatsLeft: 5, freeMinsLeft: 10 });
  const [sessions,   setSessions]   = useState([]);
  const [userId,     setUserId]     = useState(null);
  const [limitErr,   setLimitErr]   = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langPref,   setLangPref]   = useState('auto'); // 'auto' | 'hi' | 'en'

  useEffect(() => { init(); }, []);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  async function init() {
    const urlKundliId = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('kundliId')
      : null;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    setUserId(session.user.id);

    // Load all non-deleted sessions for this user
    await loadSessionsList(session.user.id);

    // Load kundli context if provided
    let k = null;
    if (urlKundliId) {
      const { data } = await supabase.from('saved_kundlis').select('*').eq('id', urlKundliId).maybeSingle();
      k = data;
      setKundli(k);
    }

    startNewSession(urlKundliId, k);
  }

  async function loadSessionsList(uid) {
    const { data: sList } = await supabase.from('chat_sessions')
      .select('id, title, updated_at, kundli_id')
      .eq('user_id', uid)
      .or('deleted_by_user.is.null,deleted_by_user.eq.false')
      .order('updated_at', { ascending:false })
      .limit(20);
    setSessions(sList || []);
  }

  // Reset the chat view for a new conversation — does NOT write to the
  // database yet. A chat_sessions row is only created on the first
  // sendMessage(), so empty chats are never saved.
  // kundliOverride: pass the freshly-fetched kundli directly to avoid a
  // stale-closure read of the `kundli` state right after setKundli().
  async function startNewSession(kId, kundliOverride) {
    setSessionId(null);
    setPendingKundliId(kId || null);
    setMessages([{ role: 'assistant', content: '...' }]);

    const k = kundliOverride !== undefined ? kundliOverride : kundli;

    // Fetch a personalised greeting from the API (no usage cost, local generation)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isGreeting: true,
          messages: [{ role: 'user', content: 'hello' }],
          kundliContext: kId && k ? {
            full_name:      k.full_name,
            dob:            k.dob,
            birth_place:    k.birth_place,
            analysis:       k.planet_data?.analysis,
            factSheet:      k.planet_data?.factSheet,
            vimshottari:    k.planet_data?.vimshottari?.current,
            allMahadashas:  k.planet_data?.vimshottari?.mahadashas,
            numerology:     k.planet_data?.numerology,
            specialist:     k.planet_data?.specialist,
          } : null,
        }),
      });
      const data = await res.json();
      setMessages([{ role: 'assistant', content: data.content }]);
    } catch {
      setMessages([{ role: 'assistant', content: kId
        ? 'नमस्ते! आपकी कुंडली लोड हो गई है। कोई भी प्रश्न पूछें।'
        : 'नमस्ते! मैं Luckfixer 2.0 हूँ। आप कोई भी प्रश्न पूछें।' }]);
    }
  }

  async function loadSession(sessId) {
    setSessionId(sessId);
    setPendingKundliId(null);
    const { data: msgs } = await supabase.from('chat_messages')
      .select('role, content')
      .eq('session_id', sessId)
      .order('id', { ascending:true });
    setMessages(msgs || []);
  }

  async function deleteSession(sessId) {
    if (!confirm('इस chat को delete करें?')) return;
    await fetch(`/api/chat/delete?sessionId=${sessId}`, { method: 'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== sessId));
    if (sessId === sessionId) {
      startNewSession(null);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLimitErr('');

    const userMsg = { role: 'user', content: input };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);

    // Create the chat session row now, on first message — never before.
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const { data: sess } = await supabase.from('chat_sessions').insert({
        user_id:   userId,
        kundli_id: pendingKundliId || null,
        title:     pendingKundliId ? 'Kundli Chat' : 'New Chat',
      }).select().single();
      if (sess) {
        activeSessionId = sess.id;
        setSessionId(sess.id);
        setSessions(prev => [{ id: sess.id, title: sess.title, updated_at: sess.updated_at, kundli_id: sess.kundli_id }, ...prev]);
      }
    }

    const kundliContext = kundli ? {
      full_name:   kundli.full_name,
      dob:         kundli.dob,
      birth_time:  kundli.birth_time,
      birth_place: kundli.birth_place,
      planets:     kundli.planet_data?.planets,
      luck_score:  kundli.luck_score,
      analysis:    kundli.planet_data?.analysis,
      vimshottari: kundli.planet_data?.vimshottari?.current,
      numerology:  kundli.planet_data?.numerology,
      specialist:  kundli.planet_data?.specialist,
    } : null;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...messages, userMsg].filter(m => m.role !== 'system').slice(-10),
        sessionId: activeSessionId,
        kundliContext,
        langPref,
      }),
    });

    const data = await res.json();

    if (res.status === 429) {
      setLimitErr(data.error);
      setMessages(m => m.slice(0,-1)); // remove unsent user msg
      setLoading(false);
      return;
    }

    setMessages(m => {
      const last = m[m.length - 1];
      const newMsg = { role:'assistant', content: data.content };
      // Prevent duplicate if same content already shown
      if (last?.role === 'assistant' && last?.content === data.content) return m;
      return [...m, newMsg];
    });
    if (data.usage) setUsage(data.usage);
    setLoading(false);
  }

  const intensityColor = (score) => score >= 60 ? 'var(--color-text-success)' : score >= 40 ? 'var(--color-text-warning)' : 'var(--color-text-danger)';

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', position:'relative' }}>

      {/* Mobile overlay when sidebar open */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="lf-sidebar-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:20 }} />
      )}

      {/* Sidebar — session history */}
      <div className={`lf-sidebar ${sidebarOpen ? 'lf-sidebar-open' : ''}`} style={{ width:'220px', flexShrink:0, borderRight:'0.5px solid var(--color-border-tertiary)', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--color-background-primary)' }}>
        <div style={{ padding:'12px', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
          <div onClick={() => router.push('/profile')} style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', marginBottom:'10px' }}>
            <img src={LOGO_URL} alt="Luckfixer" className="lf-logo-sm" />
            <span style={{ fontSize:'13px', fontWeight:'500', color:'var(--color-text-primary)' }}>Luckfixer 2.0</span>
          </div>
          <button onClick={() => { startNewSession(null); setSidebarOpen(false); }} style={{ width:'100%', padding:'8px', fontSize:'13px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', color:'var(--color-text-primary)' }}>+ New Chat</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
          {sessions.map(s => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'2px' }}>
              <div onClick={() => { loadSession(s.id); setSidebarOpen(false); }} style={{ flex:1, padding:'8px 10px', borderRadius:'var(--border-radius-md)', cursor:'pointer', background: s.id === sessionId ? 'var(--color-background-secondary)' : 'transparent', fontSize:'13px', color:'var(--color-text-primary)' }}>
                {s.title}
                <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', margin:'2px 0 0' }}>{new Date(s.updated_at).toLocaleDateString('hi-IN')}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} aria-label="Delete chat" title="Delete" style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 6px', color:'var(--color-text-tertiary)', fontSize:'14px', flexShrink:0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          ))}
        </div>
        <div style={{ padding:'12px', borderTop:'0.5px solid var(--color-border-tertiary)', fontSize:'12px', color:'var(--color-text-tertiary)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
            <span>Free chats</span><span style={{ color:'var(--color-text-primary)', fontWeight:'500' }}>{usage.freeChatsLeft}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span>Free mins</span><span style={{ color:'var(--color-text-primary)', fontWeight:'500' }}>{usage.freeMinsLeft?.toFixed(1)}</span>
          </div>
          <button onClick={() => router.push('/profile')} style={{ width:'100%', marginTop:'10px', padding:'7px', fontSize:'12px', background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', color:'var(--color-text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            होम / प्रोफाइल
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Mobile top bar */}
        <div className="lf-mobile-topbar" style={{ display:'none', alignItems:'center', justifyContent:'space-between', gap:'10px', padding:'10px 12px', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <button onClick={() => setSidebarOpen(true)} aria-label="Menu" style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', display:'flex' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <span style={{ fontSize:'14px', fontWeight:'500', color:'var(--color-text-primary)' }}>Luckfixer Chat</span>
          </div>
          <button onClick={() => router.push('/profile')} aria-label="Home" style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', display:'flex', color:'var(--color-text-secondary)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </button>
        </div>

        {/* Kundli context bar */}
        {kundli && (
          <div style={{ padding:'10px 16px', borderBottom:'0.5px solid var(--color-border-tertiary)', display:'flex', alignItems:'center', gap:'10px', background:'var(--color-background-secondary)', fontSize:'13px', flexWrap:'wrap' }}>
            <span style={{ color:'var(--color-text-secondary)' }}>कुंडली:</span>
            <span style={{ fontWeight:'500', color:'var(--color-text-primary)' }}>{kundli.full_name}</span>
            <span style={{ color:'var(--color-text-tertiary)' }}>{kundli.dob} · {kundli.birth_time} · {kundli.birth_place}</span>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'1rem' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom:'12px' }}>
              <div className="lf-msg-bubble" style={{
                maxWidth:'75%', padding:'10px 14px', borderRadius:'var(--border-radius-lg)',
                background: m.role === 'user' ? 'var(--color-text-primary)' : 'var(--color-background-secondary)',
                color: m.role === 'user' ? 'var(--color-background-primary)' : 'var(--color-text-primary)',
                fontSize:'14px', lineHeight:'1.6',
                borderBottomRightRadius: m.role === 'user' ? '4px' : 'var(--border-radius-lg)',
                borderBottomLeftRadius:  m.role === 'assistant' ? '4px' : 'var(--border-radius-lg)',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', marginBottom:'12px' }}>
              <div style={{ padding:'10px 14px', borderRadius:'var(--border-radius-lg)', background:'var(--color-background-secondary)', fontSize:'14px', color:'var(--color-text-secondary)' }}>
                सोच रहा हूँ...
              </div>
            </div>
          )}
          {limitErr && (
            <div style={{ padding:'12px 14px', borderRadius:'var(--border-radius-md)', background:'var(--color-background-warning)', color:'var(--color-text-warning)', fontSize:'13px', marginBottom:'12px' }}>
              {limitErr}
            </div>
          )}
          <div ref={messagesEnd}/>
        </div>

        {/* Language selector */}
        <div style={{ padding:'6px 12px', borderTop:'0.5px solid var(--color-border-tertiary)', display:'flex', alignItems:'center', gap:'12px', background:'var(--color-background-secondary)' }}>
          <span style={{ fontSize:'11px', color:'var(--color-text-tertiary)', flexShrink:0 }}>भाषा:</span>
          {[['auto','Auto'], ['hi','हिंदी'], ['en','English']].map(([val, label]) => (
            <label key={val} style={{ display:'flex', alignItems:'center', gap:'4px', cursor:'pointer', fontSize:'12px', color: langPref === val ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
              <input type="radio" name="lang" value={val} checked={langPref === val} onChange={() => setLangPref(val)} style={{ width:'12px', height:'12px', border:'none', padding:0, cursor:'pointer', accentColor:'var(--color-text-primary)' }}/>
              {label}
            </label>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} style={{ padding:'12px', borderTop:'0.5px solid var(--color-border-tertiary)', display:'flex', gap:'8px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="अपना प्रश्न पूछें..."
            disabled={loading}
            style={{ flex:1, fontSize:'14px' }}
          />
          <button type="submit" disabled={loading || !input.trim()} style={{ padding:'8px 16px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>
            भेजें
          </button>
        </form>
      </div>
    </div>
  );
}

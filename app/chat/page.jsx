'use client';
// app/chat/page.jsx — Claude-style layout
// Left: kundli selector + nav. Right: chat opens when kundli selected.

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

const LOGO_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';

// ── Quick action configs ──────────────────────────────────────
// Each action either asks 1-2 clarifying questions first (so the AI
// gets a precise, specific question instead of a vague one — this
// saves tokens on follow-up clarification and gives sharper predictions)
// or fires immediately if no clarification is needed (e.g. "आज का गोचर").
function dashaInfoOf(k) {
  const vim = k?.planet_data?.vimshottari?.current;
  return vim ? `(${vim.mahaDasha?.lordHi} MD, ${vim.antarDasha?.lordHi} AD)` : '';
}
function nameOf(k) { return k?.full_name?.split(' ')[0] || ''; }
function ageOf(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const QUICK_ACTION_CONFIG = {
  career: {
    label: '💼 करियर',
    questions: [
      { key:'detail', label:'अपनी situation बताएं (job/business/company/koi specific sawal)', type:'text', placeholder:'जैसे: IT job dhund raha hoon, ya Oriana Power mein interview hai, ya business shuru karna hai...' },
    ],
    buildPrompt: (k, ans) => {
      const name = nameOf(k), dasha = dashaInfoOf(k);
      const detail = ans.detail?.trim() ? ans.detail.trim() : 'general career outlook';
      return `${name} ka career ke baare mein sawal hai: "${detail}". Janam ${k?.dob}, abhi ${dasha} chal raha hai. Career score, supporting/opposing factors, relevant yoga, aur agle 6 mahine ka specific date window batao jab career sabse active rahega. Unke exact sawal ka direct jawab do.`;
    },
  },
  marriage: {
    label: '💍 विवाह',
    questions: [
      { key:'detail', label:'अपना सवाल बताएं (status/specific concern)', type:'text', placeholder:'जैसे: shaadi kab hogi, ya abhi tak kyun nahi hui, ya rishta sahi hai kya...' },
    ],
    buildPrompt: (k, ans) => {
      const name = nameOf(k), dasha = dashaInfoOf(k);
      const detail = ans.detail?.trim() ? ans.detail.trim() : 'vivah/relationship ka status';
      const age = ageOf(k?.dob);
      const ageNote = age && age >= 30
        ? ` IMPORTANT: ${name} ki age abhi ${age} saal hai. Agar already vivah ho chuka ho ya past mein strong yog the (jaise 27-32 ke beech), woh window bhi mention karo taaki prediction sirf future ke liye na ho — past ko bhi acknowledge karo jisse trust bane. Agar abhi tak nahi hua, toh honestly bolo ki kya delay hai aur aage ka realistic window kya hai.`
        : '';
      return `${name} ka vivah/relationship sawal: "${detail}".${ageNote} 7th lord, D9 chart, Venus position, marriage yoga, aur sabse strong vivah timing window batao (past aur future dono, jo bhi relevant ho). ${dasha} chal raha hai — isse connect karo. Unke exact sawal ka direct jawab do.`;
    },
  },
  remedy: {
    label: '🪔 उपाय',
    questions: [
      { key:'detail', label:'किस क्षेत्र के लिए उपाय चाहिए?', type:'text', placeholder:'जैसे: career ke liye, health ke liye, ya sirf general upay...' },
    ],
    buildPrompt: (k, ans) => {
      const name = nameOf(k), dasha = dashaInfoOf(k);
      const area = ans.detail?.trim() ? ans.detail.trim() : 'general life improvement';
      return `${name} ki kundli mein "${area}" ke liye sabse zaroori upay kya hai abhi? ${dasha} dasha ke hisaab se ek focused, specific upay batao — exact mantra/daan/din/sankhya ke saath. Generic upay mat do, unke weakest planet ke specific basis pe do.`;
    },
  },
  dasha: {
    label: '📅 दशा',
    questions: [],
    buildPrompt: (k) => {
      const name = nameOf(k), dasha = dashaInfoOf(k);
      return `${name} ki abhi ${dasha} chal rahi hai — iska career, relationships aur health par kya exact prabhav hai? Agla antardasha change kab hoga aur kya naya laayega?`;
    },
  },
  transit: {
    label: '🔭 गोचर',
    questions: [],
    buildPrompt: (k) => {
      const name = nameOf(k);
      return `${name} ke liye abhi kaun se planets transit kar rahe hain? Sade Sati active hai ya nahi, aur ashtakavarga bindus ke hisaab se kaunsa transit strongest impact de raha hai?`;
    },
  },
  annual: {
    label: '📆 इस साल',
    questions: [],
    buildPrompt: (k) => {
      const name = nameOf(k);
      return `${name} ke liye ${new Date().getFullYear()} ka varshaphal kya hai? Muntha kahan hai, varshesh kaun hai, aur career/vivah/health mein kya expect karein?`;
    },
  },
};

export default function ChatPage() {
  const supabase    = createClient();
  const router      = useRouter();
  const messagesEnd = useRef(null);
  const inputRef    = useRef(null);

  const [userId,           setUserId]           = useState(null);
  const [kundlis,          setKundlis]          = useState([]);
  const [kundli,           setKundli]           = useState(null);
  const [sessions,         setSessions]         = useState([]);
  const [sessionId,        setSessionId]        = useState(null);
  const [pendingKundliId,  setPendingKundliId]  = useState(null);
  const [pendingFollowUpId,setPendingFollowUpId]= useState(null);
  const [messages,         setMessages]         = useState([]);
  const [input,            setInput]            = useState('');
  const [loading,          setLoading]          = useState(false);
  const [usage,            setUsage]            = useState({ freeChatsLeft:5, freeMinsLeft:10 });
  const [limitErr,         setLimitErr]         = useState('');
  const [langPref,         setLangPref]         = useState('auto');
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [panel,            setPanel]            = useState('sessions'); // 'sessions'|'kundlis'
  const [activeQuickForm,  setActiveQuickForm]  = useState(null); // which quick-action form is open
  const [quickFormAnswers, setQuickFormAnswers] = useState({});

  useEffect(() => { init(); }, []);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  async function init() {
    const urlKundliId = new URLSearchParams(window.location.search).get('kundliId');
    const { data:{ session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    setUserId(session.user.id);

    const { data: ks } = await supabase
      .from('saved_kundlis').select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending:false });
    setKundlis(ks || []);

    const { data: sess } = await supabase
      .from('chat_sessions')
      .select('id,title,updated_at,kundli_id')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending:false })
      .limit(30);
    setSessions(sess || []);

    if (urlKundliId && ks) {
      const k = ks.find(x => x.id === urlKundliId);
      if (k) { selectKundli(k, session.user.id); return; }
    }
    if (ks?.length === 1) { selectKundli(ks[0], session.user.id); return; }
  }

  function buildContext(k) {
    if (!k) return null;
    return {
      full_name: k.full_name, dob: k.dob, birth_time: k.birth_time,
      birth_place: k.birth_place, latitude: k.latitude, longitude: k.longitude,
      analysis: k.planet_data?.analysis, factSheet: k.planet_data?.factSheet,
      vimshottari: k.planet_data?.vimshottari?.current,
      allMahadashas: k.planet_data?.vimshottari?.mahadashas,
      numerology: k.planet_data?.numerology, specialist: k.planet_data?.specialist,
      jaimini: k.planet_data?.jaimini, crossValidation: k.planet_data?.crossValidation,
      yogas: k.planet_data?.yogas, ashtakavarga: k.planet_data?.ashtakavarga,
      nakshatra: k.planet_data?.nakshatra, varshaphal: k.planet_data?.varshaphal,
    };
  }

  async function selectKundli(k) {
    setKundli(k); setPendingKundliId(k.id);
    setSidebarOpen(false); setSessionId(null); setLimitErr('');
    setMessages([{ role:'assistant', content:'...' }]);
    try {
      const res = await fetch('/api/chat', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ isGreeting:true, messages:[{ role:'user', content:'hello' }], kundliContext: buildContext(k) }),
      });
      const data = await res.json();
      setMessages([{ role:'assistant', content: data.content }]);
      if (data.pendingFollowUpId) setPendingFollowUpId(data.pendingFollowUpId);
    } catch {
      setMessages([{ role:'assistant', content:`नमस्ते! ${k.full_name} की कुंडली लोड हो गई। कोई भी प्रश्न पूछें।` }]);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  }

  async function loadSession(s) {
    setSessionId(s.id); setSidebarOpen(false);
    const kForSession = kundlis.find(k => k.id === s.kundli_id);
    if (kForSession && kundli?.id !== kForSession.id) { setKundli(kForSession); setPendingKundliId(kForSession.id); }
    const { data: msgs } = await supabase.from('chat_messages')
      .select('role,content').eq('session_id', s.id).order('id', { ascending:true });
    setMessages(msgs || []);
  }

  async function newChat() {
    setSessionId(null); setMessages([]); setLimitErr('');
    if (kundli) selectKundli(kundli);
    else setMessages([]);
  }

  async function sendMessage(e, quickPrompt) {
    if (e) e.preventDefault();
    const text = quickPrompt || input;
    if (!text?.trim() || loading) return;
    setLimitErr(''); setInput('');
    const userMsg = { role:'user', content: text };
    setMessages(m => [...m, userMsg]);
    setLoading(true);

    let sid = sessionId;
    if (!sid && userId) {
      const { data: newSess } = await supabase.from('chat_sessions').insert({
        user_id: userId, kundli_id: pendingKundliId || null, title: text.slice(0,40),
      }).select().single();
      if (newSess) { sid = newSess.id; setSessionId(sid); setSessions(prev => [newSess, ...prev]); }
    }

    const res = await fetch('/api/chat', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        messages: [...messages, userMsg].filter(m => m.role !== 'system').slice(-10),
        sessionId: sid, kundliId: pendingKundliId || kundli?.id || null,
        kundliContext: buildContext(kundli), langPref,
        pendingFollowUpId: pendingFollowUpId || null,
      }),
    });
    const data = await res.json();
    if (pendingFollowUpId) setPendingFollowUpId(null);
    if (res.status === 429) { setLimitErr(data.error); setMessages(m => m.slice(0,-1)); }
    else { setMessages(m => [...m, { role:'assistant', content: data.content }]); if (data.usage) setUsage(data.usage); }
    setLoading(false);
  }

  async function deleteSession(sessId, e) {
    e.stopPropagation();
    await fetch(`/api/chat/delete?sessionId=${sessId}`, { method:'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== sessId));
    if (sessId === sessionId) { setSessionId(null); setMessages([]); }
  }

  async function signOut() { await supabase.auth.signOut(); router.push('/login'); }

  // ── SIDEBAR ────────────────────────────────────────────────
  const sidebarStyle = {
    width: '240px', flexShrink: 0,
    background: 'var(--color-background-primary)',
    borderRight: '0.5px solid var(--color-border-tertiary)',
    display: 'flex', flexDirection: 'column', height: '100vh',
  };

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--color-background-tertiary)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:20 }} />}

      {/* ── SIDEBAR ── */}
      <div className={`lf-sidebar ${sidebarOpen ? 'lf-sidebar-open' : ''}`} style={sidebarStyle}>

        {/* Header */}
        <div style={{ padding:'12px 12px 8px', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'9px', marginBottom:'10px' }}>
            <img src={LOGO_URL} alt="LF" style={{ width:'32px', height:'32px', borderRadius:'18%', objectFit:'cover', flexShrink:0 }} />
            <div>
              <p style={{ fontSize:'13px', fontWeight:'600', color:'var(--color-text-primary)', margin:0 }}>Luckfixer 2.0</p>
              <p style={{ fontSize:'10px', color:'var(--color-brand)', margin:0 }}>✦ Vedic AI</p>
            </div>
          </div>
          <button onClick={newChat} style={{ width:'100%', padding:'7px', fontSize:'13px', fontWeight:'500', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'8px', cursor:'pointer' }}>
            + नई Chat
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'0.5px solid var(--color-border-tertiary)', flexShrink:0 }}>
          {[['sessions','💬 Chats'],['kundlis','🪐 कुंडली']].map(([id,label]) => (
            <button key={id} onClick={() => setPanel(id)} style={{
              flex:1, padding:'8px 4px', fontSize:'11px', border:'none', background:'none', cursor:'pointer',
              color: panel===id ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
              borderBottom: panel===id ? `2px solid var(--color-brand)` : '2px solid transparent',
              fontWeight: panel===id ? '600' : '400', transition:'all 0.15s',
            }}>{label}</button>
          ))}
        </div>

        {/* Sessions */}
        {panel === 'sessions' && (
          <div style={{ flex:1, overflowY:'auto', padding:'6px' }}>
            {sessions.length === 0
              ? <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', padding:'12px', textAlign:'center' }}>अभी कोई chat नहीं</p>
              : sessions.map(s => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'2px', marginBottom:'2px' }}>
                  <div onClick={() => loadSession(s)} style={{
                    flex:1, padding:'7px 8px', borderRadius:'7px', cursor:'pointer', fontSize:'12px',
                    background: s.id===sessionId ? 'var(--color-background-secondary)' : 'transparent',
                    color:'var(--color-text-primary)',
                  }}>
                    <p style={{ margin:'0 0 1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'160px' }}>{s.title || 'Chat'}</p>
                    <p style={{ margin:0, fontSize:'10px', color:'var(--color-text-tertiary)' }}>{new Date(s.updated_at).toLocaleDateString('hi-IN')}</p>
                  </div>
                  <button onClick={e => deleteSession(s.id,e)} style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', color:'var(--color-text-tertiary)', fontSize:'11px', opacity:0.5, flexShrink:0 }}>✕</button>
                </div>
              ))
            }
          </div>
        )}

        {/* Kundlis */}
        {panel === 'kundlis' && (
          <div style={{ flex:1, overflowY:'auto', padding:'6px' }}>
            {kundlis.length === 0 && (
              <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', padding:'12px', textAlign:'center' }}>कोई कुंडली नहीं</p>
            )}
            {kundlis.map(k => (
              <div key={k.id} onClick={() => selectKundli(k)} style={{
                padding:'9px 10px', borderRadius:'8px', cursor:'pointer', marginBottom:'3px',
                background: kundli?.id===k.id ? 'var(--color-background-info)' : 'transparent',
                border: `0.5px solid ${kundli?.id===k.id ? 'var(--color-border-secondary)' : 'transparent'}`,
                transition:'all 0.12s',
              }}>
                <p style={{ margin:'0 0 1px', fontSize:'13px', fontWeight:'500', color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.label || k.full_name}</p>
                <p style={{ margin:0, fontSize:'10px', color:'var(--color-text-tertiary)' }}>{k.dob} · {k.birth_place?.split(',')[0]}</p>
              </div>
            ))}
            <button onClick={() => router.push('/profile')} style={{ width:'100%', marginTop:'6px', padding:'7px', fontSize:'12px', background:'none', border:'1px dashed var(--color-border-tertiary)', borderRadius:'8px', cursor:'pointer', color:'var(--color-text-tertiary)' }}>
              + नई कुंडली
            </button>
          </div>
        )}

        {/* Bottom nav */}
        <div style={{ borderTop:'0.5px solid var(--color-border-tertiary)', padding:'8px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'var(--color-text-tertiary)', marginBottom:'8px', padding:'0 2px' }}>
            <span>Chats: <strong style={{ color:'var(--color-text-primary)' }}>{usage.freeChatsLeft}</strong></span>
            <span>Mins: <strong style={{ color:'var(--color-text-primary)' }}>{typeof usage.freeMinsLeft === 'number' ? usage.freeMinsLeft.toFixed(1) : usage.freeMinsLeft}</strong></span>
          </div>
          {[['💍 मिलान','/milan'],['👤 प्रोफाइल','/profile']].map(([label,path]) => (
            <button key={path} onClick={() => router.push(path)} style={{ width:'100%', padding:'6px', marginBottom:'3px', fontSize:'12px', background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'7px', cursor:'pointer', color:'var(--color-text-secondary)', textAlign:'left' }}>
              {label}
            </button>
          ))}
          <button onClick={signOut} style={{ width:'100%', padding:'6px', fontSize:'11px', background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary)' }}>Logout</button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Topbar */}
        <div style={{ padding:'10px 14px', borderBottom:'0.5px solid var(--color-border-tertiary)', display:'flex', alignItems:'center', gap:'10px', background:'var(--color-background-primary)', minHeight:'50px', flexShrink:0 }}>
          <button onClick={() => setSidebarOpen(s=>!s)} className="lf-mobile-only" style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:'4px', color:'var(--color-text-secondary)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          {kundli ? (
            <>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#4ade80', flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:'14px', fontWeight:'500', color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{kundli.label || kundli.full_name}</p>
                <p style={{ margin:0, fontSize:'11px', color:'var(--color-text-tertiary)' }}>{kundli.dob} · {kundli.birth_place?.split(',')[0]}</p>
              </div>
              <button onClick={() => { setPanel('kundlis'); setSidebarOpen(true); }} style={{ flexShrink:0, padding:'4px 10px', fontSize:'11px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'20px', cursor:'pointer', color:'var(--color-text-secondary)' }}>बदलें</button>
            </>
          ) : (
            <p style={{ flex:1, fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>← बाईं तरफ से कुंडली चुनें</p>
          )}
          <select value={langPref} onChange={e => setLangPref(e.target.value)} style={{ fontSize:'11px', padding:'4px 6px', borderRadius:'6px', border:'0.5px solid var(--color-border-tertiary)', background:'var(--color-background-secondary)', color:'var(--color-text-secondary)', cursor:'pointer', flexShrink:0 }}>
            <option value="auto">Auto</option>
            <option value="hi">हिंदी</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Welcome state */}
        {messages.length === 0 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'2rem', textAlign:'center' }}>
            <img src={LOGO_URL} alt="LF" style={{ width:'64px', height:'64px', borderRadius:'20%', objectFit:'cover', marginBottom:'16px', opacity:0.8 }} />
            <h2 style={{ fontSize:'18px', fontWeight:'500', color:'var(--color-text-primary)', margin:'0 0 8px' }}>
              {kundlis.length === 0 ? 'पहले कुंडली जोड़ें' : 'कुंडली चुनें और शुरू करें'}
            </h2>
            <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)', margin:'0 0 20px', maxWidth:'260px', lineHeight:'1.6' }}>
              {kundlis.length === 0 ? 'प्रोफाइल में जाकर अपनी जन्म कुंडली जोड़ें।' : 'बाईं तरफ से कुंडली select करें या नीचे click करें।'}
            </p>
            {kundlis.length === 0 ? (
              <button onClick={() => router.push('/profile')} style={{ padding:'10px 20px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>कुंडली जोड़ें →</button>
            ) : (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', justifyContent:'center', maxWidth:'340px' }}>
                {kundlis.map(k => (
                  <button key={k.id} onClick={() => selectKundli(k)} style={{ padding:'8px 16px', fontSize:'13px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'20px', cursor:'pointer', color:'var(--color-text-primary)', transition:'all 0.15s' }}>
                    {k.label || k.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 8px' }}>
            {messages.map((m,i) => (
              <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start', marginBottom:'14px', alignItems:'flex-end', gap:'8px' }}>
                {m.role==='assistant' && <img src={LOGO_URL} alt="" style={{ width:'26px', height:'26px', borderRadius:'7px', objectFit:'cover', flexShrink:0 }} />}
                <div style={{
                  maxWidth:'72%', padding:'10px 14px', fontSize:'14px', lineHeight:'1.65',
                  borderRadius: m.role==='user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  background: m.role==='user' ? 'var(--color-text-primary)' : 'var(--color-background-primary)',
                  color: m.role==='user' ? 'var(--color-background-primary)' : 'var(--color-text-primary)',
                  border: m.role==='assistant' ? '0.5px solid var(--color-border-tertiary)' : 'none',
                  boxShadow: m.role==='assistant' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
                  animation: 'lf-slideUp 0.2s ease both',
                }}>
                  {m.content === '...'
                    ? <div className="lf-thinking"><div className="lf-thinking-dot"/><div className="lf-thinking-dot"/><div className="lf-thinking-dot"/></div>
                    : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:'flex', marginBottom:'14px', alignItems:'flex-end', gap:'8px' }}>
                <img src={LOGO_URL} alt="" style={{ width:'26px', height:'26px', borderRadius:'7px', objectFit:'cover', flexShrink:0 }} />
                <div className="lf-thinking"><div className="lf-thinking-dot"/><div className="lf-thinking-dot"/><div className="lf-thinking-dot"/></div>
              </div>
            )}
            {limitErr && <div style={{ padding:'10px 14px', borderRadius:'8px', background:'var(--color-background-warning)', color:'var(--color-text-warning)', fontSize:'13px', marginBottom:'12px' }}>{limitErr}</div>}
            <div ref={messagesEnd}/>
          </div>
        )}

        {/* Quick action clarifying form — opens above quick buttons when active */}
        {activeQuickForm && kundli && (
          <div style={{ padding:'10px 12px', background:'var(--color-background-secondary)', borderTop:'0.5px solid var(--color-border-tertiary)', flexShrink:0 }}>
            {(() => {
              const config = QUICK_ACTION_CONFIG[activeQuickForm];
              if (!config) return null;
              return (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                    <p style={{ fontSize:'12px', fontWeight:'600', color:'var(--color-text-primary)', margin:0 }}>{config.label} — पहले बताएं</p>
                    <button onClick={() => { setActiveQuickForm(null); setQuickFormAnswers({}); }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary)', fontSize:'14px', padding:'2px 6px' }}>✕</button>
                  </div>
                  {config.questions.map((q) => (
                    <div key={q.key} style={{ marginBottom:'8px' }}>
                      <p style={{ fontSize:'11px', color:'var(--color-text-secondary)', margin:'0 0 4px' }}>{q.label}</p>
                      {q.type === 'choice' ? (
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                          {q.options.map(opt => (
                            <button key={opt} onClick={() => setQuickFormAnswers(a => ({ ...a, [q.key]: opt }))}
                              style={{
                                padding:'5px 10px', fontSize:'11px', borderRadius:'14px', cursor:'pointer',
                                border: `1px solid ${quickFormAnswers[q.key]===opt ? 'var(--color-brand)' : 'var(--color-border-tertiary)'}`,
                                background: quickFormAnswers[q.key]===opt ? 'var(--color-brand-light)' : 'var(--color-background-primary)',
                                color: quickFormAnswers[q.key]===opt ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                              }}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          autoFocus
                          value={quickFormAnswers[q.key] || ''}
                          onChange={e => setQuickFormAnswers(a => ({ ...a, [q.key]: e.target.value }))}
                          placeholder={q.placeholder}
                          style={{ width:'100%', fontSize:'12px', padding:'6px 10px' }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const prompt = config.buildPrompt(kundli, { ...quickFormAnswers, [q.key]: e.target.value });
                              sendMessage(null, prompt);
                              setActiveQuickForm(null);
                              setQuickFormAnswers({});
                            }
                          }}
                        />
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const prompt = config.buildPrompt(kundli, quickFormAnswers);
                      sendMessage(null, prompt);
                      setActiveQuickForm(null);
                      setQuickFormAnswers({});
                    }}
                    style={{ width:'100%', marginTop:'4px', padding:'8px', fontSize:'12px', fontWeight:'600', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'8px', cursor:'pointer' }}
                  >
                    जवाब पूछें →
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Quick actions */}
        {kundli && messages.length > 0 && !activeQuickForm && (
          <div style={{ padding:'8px 12px 0', display:'flex', gap:'6px', flexWrap:'wrap', borderTop:'0.5px solid var(--color-border-tertiary)', flexShrink:0 }}>
            {Object.entries(QUICK_ACTION_CONFIG).map(([key, config]) => (
              <button key={key} disabled={loading} onClick={() => {
                if (config.questions.length === 0) {
                  sendMessage(null, config.buildPrompt(kundli, {}));
                } else {
                  setActiveQuickForm(key);
                }
              }} className="lf-quick-btn" style={{ fontSize:'11px', padding:'5px 10px' }}>
                {config.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding:'10px 12px 12px', background:'var(--color-background-primary)', borderTop: messages.length>0 ? '0.5px solid var(--color-border-tertiary)' : 'none', flexShrink:0 }}>
          {!kundli ? (
            <div style={{ display:'flex', gap:'8px' }}>
              <input disabled placeholder="पहले बाईं तरफ से कुंडली चुनें..." style={{ flex:1, fontSize:'14px', opacity:0.45, cursor:'not-allowed', borderRadius:'10px' }}/>
              <button disabled style={{ padding:'10px 16px', background:'var(--color-border-tertiary)', color:'var(--color-text-tertiary)', border:'none', borderRadius:'10px', fontSize:'14px' }}>भेजें</button>
            </div>
          ) : (
            <form onSubmit={sendMessage} style={{ display:'flex', gap:'8px' }}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="अपना प्रश्न पूछें..." disabled={loading} style={{ flex:1, fontSize:'14px', borderRadius:'10px' }} onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(e);}}}/>
              <button type="submit" disabled={loading||!input.trim()} style={{ padding:'10px 16px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'14px', fontWeight:'500', flexShrink:0, opacity: loading||!input.trim()?0.5:1 }}>भेजें</button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .lf-mobile-only { display: flex !important; }
          .lf-sidebar { position:fixed; top:0; left:0; z-index:30; transform:translateX(-100%); transition:transform 0.22s cubic-bezier(0.4,0,0.2,1); box-shadow:2px 0 20px rgba(0,0,0,0.15); }
          .lf-sidebar-open { transform:translateX(0) !important; }
        }
        @keyframes lf-slideUp { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
      `}</style>
    </div>
  );
}

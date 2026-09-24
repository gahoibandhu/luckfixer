'use client';
// app/support/page.jsx
//
// Shared feedback + support entry point (items 4 & 10). Same form,
// same route — the only difference is `type`: 'feedback' is one-way
// (no reply expected), 'support' is ticket-style and shows the
// admin's reply back here once answered.
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function SupportPage() {
  const supabase = createClient();
  const router   = useRouter();
  const [mode,     setMode]     = useState('feedback'); // 'feedback' | 'support'
  const [subject,  setSubject]  = useState('');
  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);
  const [sentMsg,  setSentMsg]  = useState('');
  const [history,  setHistory]  = useState([]);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => { checkAuthAndLoad(); }, []);

  async function checkAuthAndLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    load();
  }

  async function load() {
    const res = await fetch('/api/support');
    const data = await res.json();
    setHistory(data.messages || []);
    setLoaded(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setSentMsg('');
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: mode, subject, message }),
    });
    const data = await res.json();
    if (data.success) {
      setSentMsg(mode === 'feedback' ? '✓ धन्यवाद! आपकी राय मिल गई।' : '✓ भेज दिया — जवाब यहीं दिखेगा।');
      setSubject('');
      setMessage('');
      load();
    } else {
      setSentMsg('Error: ' + (data.error || 'unknown'));
    }
    setSending(false);
  }

  const supportHistory = history.filter(h => h.type === 'support');

  return (
    <div className="lf-page" style={{ maxWidth:'640px', margin:'0 auto', padding:'1.5rem 1rem' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
        <h2 style={{ fontSize:'18px', fontWeight:'500', color:'var(--color-text-primary)', margin:0 }}>Contact Us / Feedback</h2>
        <button onClick={() => router.push('/profile')} style={{ fontSize:'13px', color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'6px 12px', cursor:'pointer' }}>
          ← प्रोफाइल
        </button>
      </div>

      {/* Mode toggle */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'1rem', background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'4px' }}>
        {[['feedback', 'राय / सुझाव'], ['support', 'सहायता चाहिए']].map(([val, label]) => (
          <button key={val} onClick={() => { setMode(val); setSentMsg(''); }}
            style={{ flex:1, padding:'8px', fontSize:'13px', fontWeight:'500', border:'none', borderRadius:'6px', cursor:'pointer',
              background: mode === val ? 'var(--color-background-primary)' : 'transparent',
              color: mode === val ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              boxShadow: mode === val ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:'0 0 1rem' }}>
        {mode === 'feedback'
          ? 'साइट के बारे में कोई भी राय, सुझाव या शिकायत — यह सीधे टीम तक पहुँचता है। (कुंडली विश्लेषण की rating चैट में ही दें।)'
          : 'कोई समस्या या सवाल? हम जवाब यहीं इस पेज पर देंगे — दोबारा आकर चेक करें।'}
      </p>

      <form onSubmit={submit} style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1.25rem', display:'flex', flexDirection:'column', gap:'10px', marginBottom:'1.5rem' }}>
        {mode === 'support' && (
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="विषय (optional)" style={{ fontSize:'14px' }} />
        )}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={mode === 'feedback' ? 'आपकी राय...' : 'अपनी समस्या बताएं...'}
          maxLength={2000}
          rows={5}
          required
          style={{ fontSize:'14px', fontFamily:'inherit', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', padding:'10px', resize:'vertical', background:'var(--color-background-primary)', color:'var(--color-text-primary)' }}
        />
        {sentMsg && <p style={{ fontSize:'12px', color: sentMsg.startsWith('✓') ? 'var(--color-text-success)' : 'var(--color-text-danger)', margin:0 }}>{sentMsg}</p>}
        <button type="submit" disabled={sending || !message.trim()} style={{ padding:'10px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>
          {sending ? 'भेजा जा रहा है...' : 'भेजें'}
        </button>
      </form>

      {mode === 'support' && loaded && supportHistory.length > 0 && (
        <div>
          <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 10px' }}>आपकी पिछली रिक्वेस्ट</p>
          {supportHistory.map(h => (
            <div key={h.id} style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1rem 1.25rem', marginBottom:'8px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', marginBottom:'4px' }}>
                <p style={{ margin:0, fontSize:'13px', fontWeight:'500', color:'var(--color-text-primary)' }}>{h.subject || 'बिना विषय'}</p>
                <span style={{ fontSize:'11px', flexShrink:0, padding:'2px 8px', borderRadius:'10px', fontWeight:'500',
                  color: h.status === 'answered' ? 'var(--color-text-success)' : 'var(--color-text-warning)',
                  background: h.status === 'answered' ? 'var(--color-background-secondary)' : 'var(--color-background-warning)' }}>
                  {h.status === 'answered' ? '✓ जवाब मिला' : '⏳ प्रतीक्षा में'}
                </span>
              </div>
              <p style={{ margin:'0 0 8px', fontSize:'13px', color:'var(--color-text-secondary)', whiteSpace:'pre-line' }}>{h.message}</p>
              {h.admin_reply && (
                <div style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'10px 12px', marginTop:'6px' }}>
                  <p style={{ margin:'0 0 3px', fontSize:'11px', fontWeight:'500', color:'var(--color-text-tertiary)' }}>Luckfixer टीम का जवाब:</p>
                  <p style={{ margin:0, fontSize:'13px', color:'var(--color-text-primary)', whiteSpace:'pre-line' }}>{h.admin_reply}</p>
                </div>
              )}
              <p style={{ margin:'6px 0 0', fontSize:'11px', color:'var(--color-text-tertiary)' }}>{new Date(h.created_at).toLocaleDateString('hi-IN')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

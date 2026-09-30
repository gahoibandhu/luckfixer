'use client';
// components/AdminAiProviders.jsx
// Admin tab: add / reorder / test / disable AI provider keys (extra to the env-var chain).
// Full keys are never shown — only the last 4 characters.

import { useState, useEffect } from 'react';

const card = { background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'1rem 1.1rem', marginBottom:'10px' };
const lbl  = { fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' };
const STATUS_STYLE = {
  ok:           { color:'var(--color-text-success)', text:'✓ working' },
  new:          { color:'var(--color-text-tertiary)', text:'untested' },
  error:        { color:'var(--color-text-warning)', text:'error' },
  rate_limited: { color:'var(--color-text-warning)', text:'rate limited (cooldown)' },
  invalid:      { color:'var(--color-text-danger)', text:'invalid key — disabled' },
};

export default function AdminAiProviders() {
  const [keys, setKeys] = useState([]);
  const [presets, setPresets] = useState({});
  const [vaultOk, setVaultOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [testResult, setTestResult] = useState({});
  const [form, setForm] = useState({ provider:'sambanova', label:'', api_key:'', model:'', base_url:'', priority:'100' });
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai-keys');
      const data = await res.json();
      if (!res.ok) { setMsg(data.error + (data.hint ? ' — ' + data.hint : '')); }
      else { setKeys(data.keys || []); setPresets(data.presets || {}); setVaultOk(!!data.vaultConfigured); setMsg(''); }
    } catch { setMsg('Load failed'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const preset = presets[form.provider] || {};

  async function addKey(e) {
    e.preventDefault(); setAdding(true); setMsg('');
    const res = await fetch('/api/admin/ai-keys', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) { setForm(f => ({ ...f, label:'', api_key:'' })); await load(); setMsg('✓ Key add ho gayi — Test button se check karein'); }
    else setMsg('Error: ' + (data.error || 'unknown'));
    setAdding(false);
  }

  async function patch(id, body) {
    setBusyId(id);
    const res = await fetch('/api/admin/ai-keys', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, ...body }) });
    const data = await res.json();
    if (!data.success) setMsg('Error: ' + (data.error || 'unknown'));
    await load(); setBusyId(null);
  }

  async function remove(id) {
    if (!confirm('यह key permanently delete करें?')) return;
    setBusyId(id);
    await fetch('/api/admin/ai-keys?id=' + id, { method:'DELETE' });
    await load(); setBusyId(null);
  }

  async function test(id) {
    setBusyId(id); setTestResult(r => ({ ...r, [id]: 'testing…' }));
    const res = await fetch('/api/admin/ai-keys', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
    const data = await res.json();
    setTestResult(r => ({ ...r, [id]: data.ok ? `✓ OK (${data.ms} ms) · ${data.model}` : `✗ ${data.error}` }));
    await load(); setBusyId(null);
  }

  return (
    <div>
      <p style={{ fontSize:'13px', color:'var(--color-text-secondary)', margin:'0 0 12px', lineHeight:1.6 }}>
        Yahan jodi gayi keys Vercel env wali keys (Gemini, Groq, SambaNova, OpenRouter, HuggingFace) ke <b>saath</b> chalti hain, unki jagah nahi.
        Fallback order priority se hota hai — chhota number pehle try hota hai (built-in: Gemini 10, Groq 20, SambaNova 30, OpenRouter 40, HuggingFace 50).
      </p>

      {!vaultOk && (
        <div style={{ ...card, background:'var(--color-background-warning)', color:'var(--color-text-warning)', fontSize:'13px' }}>
          <b>KEY_ENCRYPTION_SECRET</b> Vercel env mein set nahi hai (kam se kam 16 characters ka random string). Jab tak set nahi hoga, nayi key add nahi hogi.
        </div>
      )}

      {msg && <p style={{ fontSize:'13px', color: msg.startsWith('✓') ? 'var(--color-text-success)' : 'var(--color-text-danger)', margin:'0 0 10px' }}>{msg}</p>}

      <form onSubmit={addKey} style={card}>
        <p style={{ fontSize:'11px', fontWeight:'500', letterSpacing:'2px', textTransform:'uppercase', color:'var(--color-text-tertiary)', margin:'0 0 10px' }}>नई Key जोड़ें</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'10px' }}>
          <div>
            <label style={lbl}>Provider</label>
            <select value={form.provider} onChange={e => setForm(f => ({ ...f, provider:e.target.value, model:'', base_url:'' }))} style={{ width:'100%' }}>
              {Object.entries(presets).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Label</label><input value={form.label} onChange={e => setForm(f => ({ ...f, label:e.target.value }))} placeholder={`${preset.label || 'Provider'} key 3`} style={{ width:'100%' }} /></div>
          <div><label style={lbl}>Model</label><input value={form.model} onChange={e => setForm(f => ({ ...f, model:e.target.value }))} placeholder={preset.model || 'model id'} style={{ width:'100%' }} /></div>
          <div><label style={lbl}>Priority</label><input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority:e.target.value }))} style={{ width:'100%' }} /></div>
        </div>
        {form.provider === 'custom' && (
          <div style={{ marginTop:'10px' }}><label style={lbl}>Base URL (https, OpenAI-compatible)</label><input value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url:e.target.value }))} placeholder="https://api.example.com/v1" style={{ width:'100%' }} /></div>
        )}
        <div style={{ marginTop:'10px' }}>
          <label style={lbl}>API Key</label>
          <input type="password" autoComplete="off" value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key:e.target.value }))} placeholder="paste key — save ke baad dobara nahi dikhegi" style={{ width:'100%' }} />
        </div>
        <button type="submit" disabled={adding || !vaultOk || !form.api_key} style={{ marginTop:'12px', padding:'9px 16px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>
          {adding ? 'Save हो रहा है...' : 'Key जोड़ें'}
        </button>
      </form>

      {loading ? <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)' }}>लोड हो रहा है...</p>
        : keys.length === 0 ? <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)' }}>अभी कोई extra key नहीं — env keys ही चल रही हैं।</p>
        : keys.map(k => {
          const st = STATUS_STYLE[k.status] || STATUS_STYLE.new;
          const cooling = k.cooldown_until && new Date(k.cooldown_until) > new Date();
          return (
            <div key={k.id} style={{ ...card, opacity: k.enabled ? 1 : 0.65 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:0, fontWeight:'500', fontSize:'14px', color:'var(--color-text-primary)' }}>{k.label} <span style={{ fontWeight:400, color:'var(--color-text-tertiary)', fontSize:'12px' }}>· {k.provider} · ••••{k.key_last4}</span></p>
                  <p style={{ margin:'2px 0 0', fontSize:'12px', color:'var(--color-text-tertiary)', wordBreak:'break-all' }}>{k.model}</p>
                </div>
                <span style={{ fontSize:'12px', fontWeight:500, color: st.color }}>{st.text}{cooling ? ' · cooldown' : ''}</span>
              </div>
              {k.last_error && <p style={{ margin:'6px 0 0', fontSize:'11px', color:'var(--color-text-danger)', wordBreak:'break-word' }}>{k.last_error}</p>}
              {testResult[k.id] && <p style={{ margin:'6px 0 0', fontSize:'12px', color: String(testResult[k.id]).startsWith('✓') ? 'var(--color-text-success)' : 'var(--color-text-secondary)' }}>{testResult[k.id]}</p>}
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center', marginTop:'10px' }}>
                <label style={{ fontSize:'12px', color:'var(--color-text-secondary)' }}>Priority</label>
                <input type="number" defaultValue={k.priority} onBlur={e => { if (Number(e.target.value) !== k.priority) patch(k.id, { priority: Number(e.target.value) }); }} style={{ width:'72px', padding:'5px 8px', fontSize:'13px' }} />
                <button onClick={() => test(k.id)} disabled={busyId === k.id} style={{ padding:'6px 12px', fontSize:'13px', cursor:'pointer' }}>Test</button>
                <button onClick={() => patch(k.id, { enabled: !k.enabled })} disabled={busyId === k.id} style={{ padding:'6px 12px', fontSize:'13px', cursor:'pointer' }}>{k.enabled ? 'Disable' : 'Enable'}</button>
                <button onClick={() => { const nk = prompt('नई API key paste करें (पुरानी replace हो जाएगी):'); if (nk) patch(k.id, { api_key: nk }); }} disabled={busyId === k.id} style={{ padding:'6px 12px', fontSize:'13px', cursor:'pointer' }}>Key बदलें</button>
                <button onClick={() => remove(k.id)} disabled={busyId === k.id} style={{ padding:'6px 12px', fontSize:'13px', cursor:'pointer', color:'var(--color-text-danger)' }}>Delete</button>
              </div>
            </div>
          );
        })}
    </div>
  );
}

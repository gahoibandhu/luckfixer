'use client';
// components/PlacePicker.jsx — search a birth place (OpenStreetMap via our /api/geocode proxy) and pick a result.
import { useState } from 'react';
import { useUiLang } from '@/lib/i18n';

export default function PlacePicker({ value, onPick }) {
  const en = useUiLang() === 'en';
  const [q, setQ] = useState(value?.label || '');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [err, setErr] = useState('');

  async function search() {
    if (!q.trim()) { setErr(en ? 'Enter a place name' : 'जगह का नाम लिखें'); return; }
    setBusy(true); setErr(''); setResults([]);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.found && data.results?.length) {
        if (data.results.length === 1) pick(data.results[0]); else setResults(data.results);
      } else setErr(en ? 'Place not found — try the nearest big city' : 'स्थान नहीं मिला — नज़दीकी बड़ा शहर आज़माएँ');
    } catch { setErr(en ? 'Could not search right now' : 'अभी खोज नहीं हो पाई'); }
    setBusy(false);
  }
  function pick(r) { setQ(r.display_name); setResults([]); onPick({ lat: r.latitude, lng: r.longitude, label: r.display_name }); }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input value={q} onChange={e => { setQ(e.target.value); onPick(null); setResults([]); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
          placeholder={en ? 'e.g. Orai, Uttar Pradesh' : 'जैसे: ओरई, उत्तर प्रदेश'} style={{ flex: 1, minWidth: 0 }} />
        <button type="button" onClick={search} disabled={busy} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>{busy ? '…' : (en ? 'Search' : 'खोजें')}</button>
      </div>
      {results.length > 0 && (
        <div style={{ marginTop: '6px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
          {results.map((r, i) => (
            <div key={i} role="button" tabIndex={0} onClick={() => pick(r)} onKeyDown={e => { if (e.key === 'Enter') pick(r); }}
              style={{ padding: '8px 10px', fontSize: '13px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none', color: 'var(--color-text-primary)' }}>{r.display_name}</div>
          ))}
        </div>
      )}
      {value && <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-text-success)' }}>✓ {en ? 'Place set' : 'स्थान चुना गया'}</p>}
      {err && <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-text-danger)' }}>{err}</p>}
    </div>
  );
}

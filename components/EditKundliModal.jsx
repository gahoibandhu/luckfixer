'use client';
// components/EditKundliModal.jsx
//
// Edit an existing kundli. Two paths, mirrored from app/api/kundli
// PATCH route:
//   - Label only  -> instant save, no recompute.
//   - DOB/Time/Place/Ayanamsa changed -> user gets a one-line warning
//     ("ye change karne se kundli phir se calculate aur AI-analyze
//     hogi") before submitting, then the same loading experience as
//     adding a new kundli (cycling step text) while the server reruns
//     the full deterministic + AI pipeline.

import { useState, useEffect } from 'react';
import DateOfBirthInput from './DateOfBirthInput';

const ANALYZING_STEPS = [
  'कुंडली दोबारा बन रही है',
  'ग्रह स्थिति गणना हो रही है',
  'योग और दशा पहचाने जा रहे हैं',
  'AI विश्लेषण फिर से लिखा जा रहा है',
  'बस थोड़ी देर और',
];

export default function EditKundliModal({ kundli, onClose, onSaved }) {
  const [form, setForm] = useState({
    label:       kundli.label || '',
    full_name:   kundli.full_name || '',
    dob:         kundli.dob || '',
    birth_time:  kundli.birth_time || '',
    birth_place: kundli.birth_place || '',
    latitude:    kundli.latitude != null ? String(kundli.latitude) : '',
    longitude:   kundli.longitude != null ? String(kundli.longitude) : '',
    ayanamsa:    kundli.ayanamsa || 'lahiri',
  });
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stepIdx, setStepIdx] = useState(0);

  const [geocoding, setGeocoding] = useState(false);
  const [geoResults, setGeoResults] = useState([]);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    if (!saving) { setStepIdx(0); return; }
    const id = setInterval(() => setStepIdx(i => (i + 1) % ANALYZING_STEPS.length), 1800);
    return () => clearInterval(id);
  }, [saving]);

  const birthFieldsChanged =
    form.full_name !== (kundli.full_name || '') ||
    form.dob !== (kundli.dob || '') ||
    form.birth_time !== (kundli.birth_time || '') ||
    form.birth_place !== (kundli.birth_place || '') ||
    form.latitude !== (kundli.latitude != null ? String(kundli.latitude) : '') ||
    form.longitude !== (kundli.longitude != null ? String(kundli.longitude) : '') ||
    form.ayanamsa !== (kundli.ayanamsa || 'lahiri');

  async function geocodePlace() {
    if (!form.birth_place.trim()) { setGeoError('कृपया पहले जन्म स्थान भरें'); return; }
    setGeocoding(true); setGeoError(''); setGeoResults([]);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(form.birth_place)}`);
      const data = await res.json();
      if (data.found && data.results?.length > 0) {
        if (data.results.length === 1) selectLocation(data.results[0]);
        else setGeoResults(data.results);
      } else {
        setGeoError('स्थान नहीं मिला — Latitude/Longitude खुद डालें');
      }
    } catch {
      setGeoError('स्थान खोजने में समस्या — Latitude/Longitude खुद डालें');
    }
    setGeocoding(false);
  }

  function selectLocation(r) {
    setForm(f => ({ ...f, birth_place: r.display_name, latitude: r.latitude.toFixed(4), longitude: r.longitude.toFixed(4) }));
    setGeoResults([]); setGeoError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.latitude || !form.longitude) {
      setError('कृपया जन्म स्थान डालकर "खोजें" दबाएं, या Latitude/Longitude खुद भरें');
      return;
    }
    if (birthFieldsChanged && !confirming) {
      setConfirming(true);
      return;
    }
    doSave();
  }

  async function doSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/kundli', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: kundli.id, ...form }),
      });
      const data = await res.json();
      if (data.kundli) {
        onSaved(data.kundli);
      } else {
        setError(data.error || 'Save नहीं हो पाया');
        setConfirming(false);
      }
    } catch {
      setError('कुछ गड़बड़ हुई — दोबारा कोशिश करें');
      setConfirming(false);
    }
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }} onClick={() => !saving && onClose()}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', padding: '1.5rem', maxWidth: '440px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <p style={{ fontSize: '15px', fontWeight: '500', color: 'var(--color-text-primary)', margin: 0 }}>कुंडली एडिट करें</p>
          <button onClick={() => !saving && onClose()} style={{ background: 'none', border: 'none', cursor: saving ? 'default' : 'pointer', fontSize: '18px', color: 'var(--color-text-tertiary)' }}>✕</button>
        </div>

        {!confirming ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="lf-label">Label</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="मेरी कुंडली" style={{ width: '100%', fontSize: '14px' }} />
            </div>
            <div>
              <label className="lf-label">पूरा नाम *</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required style={{ width: '100%', fontSize: '14px' }} />
            </div>
            <div>
              <label className="lf-label">जन्म तिथि *</label>
              <DateOfBirthInput value={form.dob} onChange={dob => setForm(f => ({ ...f, dob }))} required />
            </div>
            <div>
              <label className="lf-label">जन्म समय *</label>
              <input type="time" value={form.birth_time} onChange={e => setForm(f => ({ ...f, birth_time: e.target.value }))} required style={{ width: '100%', fontSize: '14px' }} />
            </div>
            <div>
              <label className="lf-label">जन्म स्थान *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={form.birth_place}
                  onChange={e => { setForm(f => ({ ...f, birth_place: e.target.value, latitude: '', longitude: '' })); setGeoResults([]); }}
                  required
                  style={{ flex: 1, fontSize: '14px' }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); geocodePlace(); } }}
                />
                <button type="button" onClick={geocodePlace} disabled={geocoding} style={{ padding: '8px 14px', fontSize: '13px', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', color: 'var(--color-text-primary)' }}>
                  {geocoding ? '...' : 'खोजें'}
                </button>
              </div>
              {geoResults.length > 0 && (
                <div style={{ marginTop: '6px', border: '0.5px solid var(--color-border-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                  {geoResults.map((r, i) => (
                    <div key={i} onClick={() => selectLocation(r)} style={{ padding: '8px 10px', fontSize: '13px', cursor: 'pointer', borderBottom: i < geoResults.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none', color: 'var(--color-text-primary)' }}>
                      {r.display_name}
                    </div>
                  ))}
                </div>
              )}
              {form.latitude && form.longitude && (
                <p style={{ fontSize: '11px', color: 'var(--color-text-success)', margin: '6px 0 0' }}>✓ स्थान: {form.latitude}, {form.longitude}</p>
              )}
              {geoError && <p style={{ fontSize: '11px', color: 'var(--color-text-danger)', margin: '6px 0 0' }}>{geoError}</p>}
            </div>
            <div>
              <label className="lf-label">Ayanamsa</label>
              <select value={form.ayanamsa} onChange={e => setForm(f => ({ ...f, ayanamsa: e.target.value }))} style={{ width: '100%', fontSize: '14px' }}>
                <option value="lahiri">Lahiri</option>
                <option value="raman">Raman</option>
                <option value="kp">KP</option>
              </select>
            </div>

            {error && <p style={{ fontSize: '12px', color: 'var(--color-text-danger)', margin: 0 }}>{error}</p>}

            <button type="submit" style={{ padding: '11px', background: 'var(--color-text-primary)', color: 'var(--color-background-primary)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>
              {birthFieldsChanged ? 'आगे बढ़ें' : 'Save करें'}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'var(--color-background-warning)', borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-warning)', lineHeight: '1.6' }}>
                ⚠️ जन्म तिथि/समय/स्थान बदल रहे हैं — इससे कुंडली दोबारा calculate होगी और AI विश्लेषण फिर से लिखा जाएगा। पुराना विश्लेषण overwrite हो जाएगा।
              </p>
            </div>
            {error && <p style={{ fontSize: '12px', color: 'var(--color-text-danger)', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" disabled={saving} onClick={() => setConfirming(false)} style={{ flex: '0 0 80px', padding: '11px', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '10px', cursor: saving ? 'default' : 'pointer', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                ← वापस
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={doSave}
                className={saving ? 'lf-btn-analyzing' : ''}
                style={{
                  flex: 1, padding: '11px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  ...(saving ? {} : { background: 'var(--color-text-primary)', color: 'var(--color-background-primary)', cursor: 'pointer' }),
                }}
              >
                {saving ? <><span className="lf-spinner" /><span>{ANALYZING_STEPS[stepIdx]}...</span></> : 'हाँ, पुनः विश्लेषण करें'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

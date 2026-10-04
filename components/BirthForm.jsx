'use client';
// components/BirthForm.jsx — date, optional time (IST) and place of birth. Used by every public birth-based tool.
import { useState } from 'react';
import DateOfBirthInput from '@/components/DateOfBirthInput';
import PlacePicker from '@/components/PlacePicker';
import { useUiLang } from '@/lib/i18n';

const lbl = { fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', margin: '0 0 4px' };

export default function BirthForm({ onSubmit, busy, submitLabel, timeRequired = false, compact = false, title, hideSubmit = false, onChange }) {
  const en = useUiLang() === 'en';
  const [dob, setDob] = useState('');
  const [time, setTime] = useState('');
  const [noTime, setNoTime] = useState(false);
  const [place, setPlace] = useState(null);
  const [err, setErr] = useState('');

  const values = () => ({ dob, time: noTime ? null : (time || null), lat: place?.lat, lng: place?.lng });
  const push = (patch) => { if (onChange) setTimeout(() => onChange({ ...values(), ...patch }), 0); };

  function submit(e) {
    e?.preventDefault();
    if (!dob) return setErr(en ? 'Enter the date of birth' : 'जन्म तिथि भरें');
    if (timeRequired && (noTime || !time)) return setErr(en ? 'Birth time is needed for this check' : 'इस जाँच के लिए जन्म समय ज़रूरी है');
    if (!place) return setErr(en ? 'Search and pick the place of birth' : 'जन्म स्थान खोजकर चुनें');
    setErr(''); onSubmit({ ...values(), placeLabel: place.label });
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {title && <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>{title}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div><label style={lbl}>{en ? 'Date of birth *' : 'जन्म तिथि *'}</label>
          <DateOfBirthInput value={dob} onChange={(v) => { setDob(v); push({ dob: v }); }} required style={{ width: '100%' }} /></div>
        <div><label style={lbl}>{en ? 'Time of birth (IST)' : 'जन्म समय (भारतीय समय)'}{timeRequired ? ' *' : ''}</label>
          <input type="time" value={time} disabled={noTime} onChange={e => { setTime(e.target.value); push({ time: e.target.value }); }} style={{ width: '100%' }} />
          {!timeRequired && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              <input type="checkbox" checked={noTime} onChange={e => { setNoTime(e.target.checked); push({ time: e.target.checked ? null : time }); }} style={{ width: 'auto' }} />
              {en ? 'I do not know the time' : 'मुझे समय नहीं पता'}
            </label>
          )}
        </div>
      </div>
      <div><label style={lbl}>{en ? 'Place of birth *' : 'जन्म स्थान *'}</label>
        <PlacePicker value={place} onPick={(p) => { setPlace(p); push({ lat: p?.lat, lng: p?.lng }); }} /></div>
      {err && <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-danger)' }}>{err}</p>}
      {!hideSubmit && (
        <button type="submit" disabled={busy} style={{ padding: '11px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: 'var(--color-text-primary)', color: 'var(--color-background-primary)', border: 'none', borderRadius: 'var(--border-radius-md)' }}>
          {busy ? (en ? 'Calculating…' : 'गणना हो रही है…') : submitLabel}
        </button>
      )}
    </form>
  );
}

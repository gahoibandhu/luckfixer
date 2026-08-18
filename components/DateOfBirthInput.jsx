'use client';
// components/DateOfBirthInput.jsx
//
// Birth-date entry — free text (DD/MM/YYYY) as the PRIMARY way to enter
// a date, with a small calendar-icon button as a secondary option.
// Why: native <input type="date"> pickers open on the current month by
// default, so entering a birth year from decades ago means clicking
// "previous month" dozens or hundreds of times — genuinely tedious.
// Typing "15/03/1984" directly is much faster once you know the date,
// which is virtually always true for a birth date (unlike, say, picking
// an unknown future appointment date, where a calendar makes sense).
//
// `value` / `onChange` work with the same ISO 'YYYY-MM-DD' string a
// plain <input type="date"> would use, so this drops in as a direct
// replacement wherever that was used.

import { useState, useEffect, useRef } from 'react';

function isoToDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

// Parses "15/3/1984", "15-3-1984", "15.3.1984", "15031984" etc. into
// an ISO 'YYYY-MM-DD' string, or null if not (yet) a valid complete date.
function parseToIso(text) {
  const cleaned = text.trim().replace(/[.\s]/g, '/').replace(/-/g, '/');
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const day = parseInt(d, 10), month = parseInt(m, 10), year = parseInt(y, 10);
  if (month < 1 || month > 12) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;
  if (year < 1900 || year > new Date().getFullYear()) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function DateOfBirthInput({ value, onChange, required, style }) {
  const [text, setText] = useState(isoToDisplay(value));
  const [error, setError] = useState('');
  const hiddenDateRef = useRef(null);

  // Keep the visible text in sync if `value` changes from outside
  // (e.g. picked via the native calendar, or form reset).
  useEffect(() => { setText(isoToDisplay(value)); }, [value]);

  function handleTextChange(raw) {
    // Auto-insert slashes as the person types digits: "15031984" -> "15/03/1984"
    // Rebuilt from the raw digit count every keystroke (rather than only
    // when no "/" exists yet) — otherwise, once the day/month slash was
    // auto-inserted, `raw` already contained a "/" and the month/year
    // slash would never get inserted automatically.
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 8);
    let cleaned = digitsOnly;
    if (digitsOnly.length > 4) {
      cleaned = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
    } else if (digitsOnly.length > 2) {
      cleaned = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}`;
    }
    setText(cleaned);

    const iso = parseToIso(cleaned);
    if (iso) {
      setError('');
      onChange(iso);
    } else if (cleaned.length >= 8) {
      setError('तारीख सही नहीं लग रही — DD/MM/YYYY जैसे 15/03/1984');
    } else {
      setError('');
    }
  }

  function openCalendar() {
    if (hiddenDateRef.current?.showPicker) {
      try { hiddenDateRef.current.showPicker(); } catch { hiddenDateRef.current.click(); }
    } else {
      hiddenDateRef.current?.click();
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          inputMode="numeric"
          value={text}
          onChange={e => handleTextChange(e.target.value)}
          placeholder="DD/MM/YYYY"
          required={required}
          style={{ flex: 1, fontSize: '15px', ...style }}
        />
        <button
          type="button"
          onClick={openCalendar}
          title="कैलेंडर से चुनें"
          style={{ flexShrink: 0, width: '42px', padding: 0, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '8px', cursor: 'pointer', fontSize: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          📅
        </button>
        {/* Native picker — visually hidden, opened only via the button
            above (showPicker()). Still fully keyboard/screen-reader
            operable as a fallback since it's a real input, just not the
            primary interaction. */}
        <input
          ref={hiddenDateRef}
          type="date"
          value={value || ''}
          onChange={e => { onChange(e.target.value); setError(''); }}
          style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      {error && <p style={{ fontSize: '11px', color: 'var(--color-text-danger)', margin: '4px 0 0' }}>{error}</p>}
    </div>
  );
}

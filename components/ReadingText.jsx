'use client';
// Large, calm reading view for aarti / chalisa text with a text-size control (read during puja, often at arm's length).
import { useState } from 'react';
import { useUiLang } from '@/lib/i18n';

export default function ReadingText({ text }) {
  const en = useUiLang() === 'en';
  const [size, setSize] = useState(20);
  const btn = { minHeight: '36px', minWidth: '44px', padding: '0 12px', cursor: 'pointer', borderRadius: '10px', border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontWeight: 700 };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
        <span>{en ? 'Text size' : 'अक्षर का आकार'}</span>
        <button type="button" style={btn} onClick={() => setSize(s => Math.max(15, s - 2))} aria-label="smaller">A−</button>
        <button type="button" style={btn} onClick={() => setSize(s => Math.min(34, s + 2))} aria-label="larger">A+</button>
      </div>
      <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '16px', padding: '18px 16px', textAlign: 'center' }}>
        {text.map((st, i) => (
          <p key={i} style={{ margin: st.length === 1 && st[0].startsWith('॥') ? '18px 0 6px' : '0 0 18px', fontSize: size + 'px', lineHeight: 1.95, fontWeight: st.length === 1 && st[0].startsWith('॥') ? 700 : 400, color: st.length === 1 && st[0].startsWith('॥') ? 'var(--color-text-info)' : 'var(--color-text-primary)' }}>
            {st.map((l, j) => <span key={j}>{l}{j < st.length - 1 && <br />}</span>)}
          </p>
        ))}
      </div>
    </div>
  );
}

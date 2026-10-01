'use client';
// components/LifeChips.jsx
// Tap-to-answer chips for marital status / children. Used in chat (inline under the
// bot's question) and on the Profile page (edit). Big, colourful, one tap — no typing.

import { MARITAL_OPTIONS, CHILDREN_OPTIONS } from '@/lib/life-details';

export default function LifeChips({ field, value, onPick, onLater, lang = 'hi', disabled = false, compact = false }) {
  const options = field === 'children' ? CHILDREN_OPTIONS : MARITAL_OPTIONS;
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap: compact ? '6px' : '8px', marginTop: compact ? 0 : '10px' }}>
      {options.map((o, i) => {
        const selected = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            disabled={disabled}
            onClick={() => onPick(o.v)}
            className="lf-chip"
            style={{
              animationDelay: `${i * 45}ms`,
              display:'inline-flex', alignItems:'center', gap:'6px',
              padding: compact ? '7px 11px' : '10px 15px',
              fontSize: compact ? '12px' : '14px', fontWeight: selected ? 600 : 500,
              borderRadius:'999px', cursor: disabled ? 'default' : 'pointer',
              border: `1px solid ${selected ? 'var(--color-brand, var(--color-text-primary))' : 'var(--color-border-secondary)'}`,
              background: selected ? 'var(--color-brand-light, var(--color-background-secondary))' : 'var(--color-background-primary)',
              color: selected ? 'var(--color-brand, var(--color-text-primary))' : 'var(--color-text-primary)',
              opacity: disabled && !selected ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: compact ? '14px' : '17px', lineHeight:1 }}>{o.icon}</span>
            {lang === 'en' ? o.en : o.hi}
          </button>
        );
      })}
      {onLater && !disabled && (
        <button type="button" onClick={onLater} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'var(--color-text-tertiary)', padding:'10px 6px', textDecoration:'underline' }}>
          {lang === 'en' ? 'Later' : 'बाद में'}
        </button>
      )}
    </div>
  );
}

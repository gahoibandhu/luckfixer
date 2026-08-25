'use client';
// components/MissingKundliFieldsModal.jsx
//
// Shown when someone tries to submit the add-kundli form (profile
// page's wizard OR chat page's inline form) with something missing.
// Previously the only feedback was inline red text — easy to miss
// entirely on the profile page's wizard, since resetting to an
// earlier step could leave that text rendered on a step that isn't
// even showing. A popup can't be missed, and it lists EVERY missing
// field at once instead of one at a time.

export default function MissingKundliFieldsModal({ missing, onClose }) {
  if (!missing || missing.length === 0) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)',
          padding: '1.5rem', maxWidth: '360px', width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '22px' }}>⚠️</span>
          <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0 }}>
            कुछ जानकारी अधूरी है
          </p>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 12px', lineHeight: '1.6' }}>
          सही कुंडली बनाने के लिए ये भरना ज़रूरी है:
        </p>
        <ul style={{ margin: '0 0 18px', padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {missing.map((m) => (
            <li key={m.field} style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
              {m.label}
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '11px', background: 'var(--color-text-primary)', color: 'var(--color-background-primary)',
            border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
          }}
        >
          ठीक है, भरता हूं
        </button>
      </div>
    </div>
  );
}

import PublicShell from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { BRAND } from '@/lib/brand';

// Simple document layout: title, a short Hindi summary, then English sections.
export default function LegalPage({ titleHi, titleEn, summaryHi, sections, updated }) {
  return (
    <PublicShell>
      <h1 style={{ fontSize: '28px', margin: '0 0 6px' }}><Bi hi={titleHi} en={titleEn} /></h1>
      <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{updated}</p>
      <p style={{ margin: '0 0 18px', fontSize: '14px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>{summaryHi}</p>
      {sections.map((s, i) => (
        <section key={i} style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '17px', margin: '0 0 6px' }}>{s.h}</h2>
          {(s.p || []).map((t, j) => <p key={j} style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: 1.85, color: 'var(--color-text-secondary)' }}>{t}</p>)}
          {s.ul && <ul style={{ margin: '0 0 8px', paddingLeft: '20px', fontSize: '14px', lineHeight: 1.85, color: 'var(--color-text-secondary)' }}>{s.ul.map((u, k) => <li key={k}>{u}</li>)}</ul>}
        </section>
      ))}
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        <b>Contact:</b> {BRAND.contactEmail ? <a href={`mailto:${BRAND.contactEmail}`} style={{ color: 'var(--color-text-info)' }}>{BRAND.contactEmail}</a> : 'use the Support / Feedback page inside the app after signing in.'}
      </p>
    </PublicShell>
  );
}

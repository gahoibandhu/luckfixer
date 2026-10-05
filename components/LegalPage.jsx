import PageHero from '@/components/PageHero';
import PublicShell from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { BRAND } from '@/lib/brand';

// Simple document layout: title, a short Hindi summary, then English sections.
export default function LegalPage({ titleHi, titleEn, summaryHi, sections, updated }) {
  return (
    <PublicShell>
      <PageHero glyph="§" title={<Bi hi={titleHi} en={titleEn} />} sub={<>{summaryHi}<br /><span style={{ opacity: .7, fontSize: '12px' }}>{updated}</span></>} />
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

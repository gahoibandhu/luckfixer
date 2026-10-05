import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { RASHIS } from '@/lib/public-content';

export const metadata = {
  title: 'राशि गाइड — 12 राशियों का स्वभाव, करियर और रिश्ते | 12 Rashi Guide',
  description: 'मेष से मीन तक 12 राशियों का स्वभाव, ताकत, करियर, रिश्ते और सरल उपाय। A plain-language guide to all 12 Vedic moon signs.',
  alternates: { canonical: '/rashi' },
};

export default function RashiIndex() {
  return (
    <PublicShell>
      <PageHero glyph="✦"
        title={<><Bi hi="12 राशियाँ — सरल गाइड" en="The 12 rashis — a simple guide" /></>}
        sub={<><Bi hi="राशि आपके जन्म के समय चंद्रमा जिस राशि में था, उससे तय होती है (वैदिक/निरयन गणना)। अपनी राशि चुनें और स्वभाव, ताकत, करियर और रिश्तों पर सामान्य जानकारी पढ़ें।"
            en="Your rashi is the sign the Moon was in at your birth (Vedic / sidereal calculation). Pick your rashi to read general notes on temperament, strengths, career and relationships." /></>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
        {RASHIS.map(r => (
          <Link key={r.slug} href={`/rashi/${r.slug}`} style={{ ...card, textDecoration: 'none', display: 'block' }}>
            <div style={{ fontSize: '26px' }}>{r.sym}</div>
            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '4px' }}><Bi hi={r.hi} en={r.en} /></div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}><Bi hi={`स्वामी: ${r.lord.hi}`} en={`Ruler: ${r.lord.en}`} /></div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: 1.5 }}><Bi hi={r.summary.hi} en={r.summary.en} /></div>
          </Link>
        ))}
      </div>
      <p style={{ marginTop: '18px', fontSize: '14px' }}><Link href="/rashifal" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ आज का राशिफल देखें" en="→ See today’s horoscope" /></Link></p>
    </PublicShell>
  );
}

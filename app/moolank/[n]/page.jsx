import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { MOOLANK } from '@/lib/public-content';

export function generateStaticParams() { return Object.keys(MOOLANK).map(n => ({ n })); }
const get = (n) => MOOLANK[Number(n)] ? { n: Number(n), ...MOOLANK[Number(n)] } : null;

export async function generateMetadata({ params }) {
  const { n } = await params; const m = get(n); if (!m) return {};
  return {
    title: `मूलांक ${m.n} (${m.planet.hi}) — स्वभाव, करियर, रिश्ते | Moolank ${m.n} (${m.planet.en}) Numerology`,
    description: `मूलांक ${m.n}, स्वामी ${m.planet.hi}: ${m.summary.hi} जन्म तिथियाँ ${m.days.join(', ')}. Moolank ${m.n} personality, strengths, career and relationships.`,
    alternates: { canonical: `/moolank/${m.n}` },
  };
}

const Sec = ({ t, d }) => (
  <section style={{ ...card, marginBottom: '12px' }}>
    <h2 style={{ fontSize: '15px', margin: '0 0 6px' }}>{t}</h2>
    <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}><Bi hi={d.hi} en={d.en} /></p>
  </section>
);

export default async function MoolankNumber({ params }) {
  const { n } = await params; const m = get(n); if (!m) notFound();
  return (
    <PublicShell>
      <p style={{ margin: '0 0 4px', fontSize: '13px' }}><Link href="/moolank" style={{ color: 'var(--color-text-info)' }}><Bi hi="← सभी अंक" en="← All numbers" /></Link></p>
      <h1 style={{ fontSize: '30px', margin: '0 0 6px' }}><Bi hi={`मूलांक ${m.n} — ${m.planet.hi}`} en={`Moolank ${m.n} — ${m.planet.en}`} /></h1>
      <p style={{ margin: '0 0 8px', fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.75 }}><Bi hi={m.summary.hi} en={m.summary.en} /></p>
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--color-text-tertiary)' }}><Bi hi={`जन्म तारीख़ें: ${m.days.join(', ')}`} en={`Born on: ${m.days.join(', ')} of any month`} /></p>
      <Sec t="✦ ताकत / Strengths" d={m.strengths} />
      <Sec t="⚠ ध्यान रखें / Watch out for" d={m.watch} />
      <Sec t="💼 करियर / Career" d={m.career} />
      <Sec t="♡ रिश्ते / Relationships" d={m.love} />
      <Sec t="🪔 सरल उपाय / Simple practice" d={m.upay} />
      <div style={{ ...card, background: 'var(--color-background-info)', marginBottom: '12px' }}>
        <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--color-text-info)', lineHeight: 1.6 }}><Bi hi="ये सामान्य बातें हैं; आपकी पूरी कुंडली और दशा कहीं ज़्यादा निजी तस्वीर देती है।" en="These are general notes; your full kundli and dasha give a far more personal picture." /></p>
        <Link href="/login" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-info)' }}><Bi hi="→ अपनी कुंडली बनाएँ" en="→ Create your kundli" /></Link>
      </div>
      <nav aria-label="Prev next" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
        <Link href={`/moolank/${m.n === 1 ? 9 : m.n - 1}`} style={{ color: 'var(--color-text-secondary)' }}>← {m.n === 1 ? 9 : m.n - 1}</Link>
        <Link href={`/moolank/${m.n === 9 ? 1 : m.n + 1}`} style={{ color: 'var(--color-text-secondary)' }}>{m.n === 9 ? 1 : m.n + 1} →</Link>
      </nav>
    </PublicShell>
  );
}

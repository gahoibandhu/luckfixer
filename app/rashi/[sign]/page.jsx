import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { RASHIS, rashiBySlug, friendlyRashis } from '@/lib/public-content';

export function generateStaticParams() { return RASHIS.map(r => ({ sign: r.slug })); }

export async function generateMetadata({ params }) {
  const { sign } = await params;
  const r = rashiBySlug(sign);
  if (!r) return {};
  return {
    title: `${r.hi} राशि — स्वभाव, करियर, रिश्ते | ${r.en} (${r.sym}) Rashi`,
    description: `${r.hi} राशि (${r.en}): ${r.summary.hi} स्वामी ${r.lord.hi}, तत्व ${r.element.hi}. ${r.en} moon sign — traits, strengths, career and relationships.`,
    alternates: { canonical: `/rashi/${r.slug}` },
  };
}

const Section = ({ title, hi, en }) => (
  <section style={{ ...card, marginBottom: '12px' }}>
    <h2 style={{ fontSize: '15px', margin: '0 0 6px', color: 'var(--color-text-primary)' }}>{title}</h2>
    <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.75, color: 'var(--color-text-secondary)' }}><Bi hi={hi} en={en} /></p>
  </section>
);

export default async function RashiPage({ params }) {
  const { sign } = await params;
  const r = rashiBySlug(sign);
  if (!r) notFound();
  const prev = RASHIS[(r.idx + 11) % 12], next = RASHIS[(r.idx + 1) % 12];
  return (
    <PublicShell>
      <p style={{ margin: '0 0 4px', fontSize: '12px' }}><Link href="/rashi" style={{ color: 'var(--color-text-info)' }}><Bi hi="← सभी राशियाँ" en="← All rashis" /></Link></p>
      <h1 style={{ fontSize: '26px', margin: '0 0 4px', color: 'var(--color-text-primary)' }}>{r.sym} <Bi hi={`${r.hi} राशि`} en={`${r.en} (${r.hi}) rashi`} /></h1>
      <p style={{ margin: '0 0 14px', fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}><Bi hi={r.summary.hi} en={r.summary.en} /></p>

      <div style={{ ...card, marginBottom: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', fontSize: '13px' }}>
        <div><div style={{ color: 'var(--color-text-tertiary)', fontSize: '11px' }}><Bi hi="स्वामी ग्रह" en="Ruling planet" /></div><b style={{ color: 'var(--color-text-primary)' }}><Bi hi={r.lord.hi} en={r.lord.en} /></b></div>
        <div><div style={{ color: 'var(--color-text-tertiary)', fontSize: '11px' }}><Bi hi="तत्व" en="Element" /></div><b style={{ color: 'var(--color-text-primary)' }}><Bi hi={r.element.hi} en={r.element.en} /></b></div>
        <div><div style={{ color: 'var(--color-text-tertiary)', fontSize: '11px' }}><Bi hi="गुण" en="Quality" /></div><b style={{ color: 'var(--color-text-primary)' }}><Bi hi={r.mode.hi} en={r.mode.en} /></b></div>
      </div>

      <Section title="✦ ताकत / Strengths" hi={r.strengths.hi} en={r.strengths.en} />
      <Section title="⚠ ध्यान रखें / Watch out for" hi={r.watch.hi} en={r.watch.en} />
      <Section title="💼 करियर / Career" hi={r.career.hi} en={r.career.en} />
      <Section title="♡ रिश्ते / Relationships" hi={r.love.hi} en={r.love.en} />
      <Section title="🪔 सरल उपाय / Simple practice" hi={r.upay.hi} en={r.upay.en} />

      <section style={{ ...card, marginBottom: '12px' }}>
        <h2 style={{ fontSize: '15px', margin: '0 0 8px', color: 'var(--color-text-primary)' }}><Bi hi="सामंजस्य वाली राशियाँ (तत्व के आधार पर)" en="Easy-fit signs (by element)" /></h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {friendlyRashis(r).map(o => <Link key={o.slug} href={`/rashi/${o.slug}`} style={{ fontSize: '13px', padding: '5px 10px', border: '0.5px solid var(--color-border-secondary)', borderRadius: '999px', textDecoration: 'none', color: 'var(--color-text-primary)' }}>{o.sym} <Bi hi={o.hi} en={o.en} /></Link>)}
        </div>
      </section>

      <div style={{ ...card, marginBottom: '12px', background: 'var(--color-background-info)' }}>
        <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--color-text-info)', lineHeight: 1.6 }}><Bi hi="ये सामान्य बातें हैं। आपकी पूरी कुंडली (लग्न, दशा, ग्रह-स्थिति) इससे कहीं ज़्यादा निजी तस्वीर देती है।" en="These are general notes. Your full kundli (lagna, dasha, planetary positions) gives a far more personal picture." /></p>
        <Link href="/login" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-info)' }}><Bi hi="→ अपनी कुंडली बनाएँ और AI से पूछें" en="→ Create your kundli and ask the AI" /></Link>
      </div>

      <p style={{ margin: '0 0 8px', fontSize: '14px' }}><Link href={`/rashifal/${r.slug}`} style={{ color: 'var(--color-text-info)' }}><Bi hi={`→ आज का ${r.hi} राशिफल`} en={`→ Today’s ${r.en} horoscope`} /></Link></p>
      <nav aria-label="Prev next" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
        <Link href={`/rashi/${prev.slug}`} style={{ color: 'var(--color-text-secondary)' }}>← {prev.sym} <Bi hi={prev.hi} en={prev.en} /></Link>
        <Link href={`/rashi/${next.slug}`} style={{ color: 'var(--color-text-secondary)' }}><Bi hi={next.hi} en={next.en} /> {next.sym} →</Link>
      </nav>
    </PublicShell>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import ReadingText from '@/components/ReadingText';
import { AARTIS, aartiBySlug } from '@/lib/aarti';

export function generateStaticParams() { return AARTIS.map(a => ({ slug: a.slug })); }

export async function generateMetadata({ params }) {
  const { slug } = await params; const a = aartiBySlug(slug); if (!a) return {};
  return {
    title: `${a.hi} — पूरा पाठ | ${a.en} Lyrics`,
    description: `${a.hi} का पूरा पाठ बड़े अक्षरों में। ${a.deity.hi} — ${a.days.hi}. Full text of the ${a.en} in Hindi.`,
    alternates: { canonical: `/aarti/${a.slug}` },
  };
}

export default async function AartiPage({ params }) {
  const { slug } = await params; const a = aartiBySlug(slug); if (!a) notFound();
  const i = AARTIS.findIndex(x => x.slug === a.slug), prev = AARTIS[(i + AARTIS.length - 1) % AARTIS.length], next = AARTIS[(i + 1) % AARTIS.length];
  return (
    <PublicShell>
      <PageHero glyph={a.kind === 'chalisa' ? '🕉' : '🪔'} title={<Bi hi={a.hi} en={a.en} />}
        sub={<Bi hi={`${a.deity.hi} · ${a.days.hi} · रचना: ${a.by.hi}`} en={`${a.deity.en} · ${a.days.en} · By: ${a.by.en}`} />} />
      <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}><Bi hi={a.note.hi} en={a.note.en} /></p>
      <ReadingText text={a.text} />
      <section style={{ ...card, marginTop: '14px', fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)' }}>
        <b style={{ color: 'var(--color-text-primary)' }}><Bi hi="आरती कैसे करें" en="How to offer the aarti" /></b>
        <p style={{ margin: '6px 0 0' }}><Bi hi="दीपक (घी या तेल का) और कपूर जलाएँ, थाली में फूल और अक्षत रखें। इष्टदेव के सामने थाली को घड़ी की दिशा में, चरणों से मुख तक घुमाते हुए गाएँ; घंटी या ताली बजा सकते हैं। आरती के बाद थाली पर हाथ फेरकर आँखों से लगाएँ और प्रसाद बाँटें।" en="Light a lamp (ghee or oil) and camphor, and keep flowers and rice on the plate. Sing while moving the plate clockwise before the deity, from the feet up to the face; a bell or clapping may accompany it. Afterwards pass your hands over the flame and touch your eyes, then share the prasad." /></p>
      </section>
      <nav aria-label="Prev next" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '14px', fontSize: '14px' }}>
        <Link href={`/aarti/${prev.slug}`} style={{ color: 'var(--color-text-secondary)' }}>← <Bi hi={prev.hi} en={prev.en} /></Link>
        <Link href={`/aarti/${next.slug}`} style={{ color: 'var(--color-text-secondary)', textAlign: 'right' }}><Bi hi={next.hi} en={next.en} /> →</Link>
      </nav>
      <p style={{ marginTop: '12px', fontSize: '14px' }}><Link href="/aarti" style={{ color: 'var(--color-text-info)' }}><Bi hi="← सभी आरती और चालीसा" en="← All aartis and chalisa" /></Link></p>
    </PublicShell>
  );
}

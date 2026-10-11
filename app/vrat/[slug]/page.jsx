import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { VRATS, vratBySlug } from '@/lib/vrat-guides';
import { aartiBySlug } from '@/lib/aarti';

export function generateStaticParams() { return VRATS.map(v => ({ slug: v.slug })); }
export async function generateMetadata({ params }) {
  const { slug } = await params; const v = vratBySlug(slug); if (!v) return {};
  return { title: `${v.hi} — पूजा विधि, नियम और कथा | ${v.en}`, description: `${v.hi}: ${v.about.hi.slice(0, 120)} Puja vidhi, rules, parana and katha.`, alternates: { canonical: `/vrat/${v.slug}` } };
}

const H = ({ children }) => <h2 style={{ fontSize: '17px', margin: '0 0 8px' }}>{children}</h2>;
const List = ({ items, ordered }) => {
  const Tag = ordered ? 'ol' : 'ul';
  return <Tag style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: 1.85, color: 'var(--color-text-secondary)' }}>{items.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}><Bi hi={s.hi} en={s.en} /></li>)}</Tag>;
};

export default async function VratGuide({ params }) {
  const { slug } = await params; const v = vratBySlug(slug); if (!v) notFound();
  const aarti = v.aarti ? aartiBySlug(v.aarti) : null;
  return (
    <PublicShell>
      <PageHero glyph={v.glyph} title={<Bi hi={v.hi} en={v.en} />} sub={<Bi hi={v.deity.hi} en={v.deity.en} />} />
      <p style={{ margin: '0 0 14px', fontSize: '15px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}><Bi hi={v.about.hi} en={v.about.en} /></p>

      <section style={{ ...card, marginBottom: '12px' }}><H><Bi hi="नियम" en="Rules" /></H><List items={v.niyam} /></section>
      <section style={{ ...card, marginBottom: '12px' }}><H><Bi hi="पूजन सामग्री" en="Puja materials" /></H><p style={{ margin: 0, fontSize: '14px', lineHeight: 1.85, color: 'var(--color-text-secondary)' }}><Bi hi={v.samagri.hi} en={v.samagri.en} /></p></section>
      <section style={{ ...card, marginBottom: '12px' }}><H><Bi hi="पूजा विधि" en="Puja vidhi" /></H><List items={v.vidhi} ordered /></section>
      {v.parana && <section style={{ ...card, marginBottom: '12px' }}><H><Bi hi="पारण (व्रत खोलना)" en="Parana (breaking the fast)" /></H><p style={{ margin: 0, fontSize: '14px', lineHeight: 1.85, color: 'var(--color-text-secondary)' }}><Bi hi={v.parana.hi} en={v.parana.en} /></p></section>}
      <section style={{ ...card, marginBottom: '12px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi="मंत्र" en="Mantra" /></div>
        <div style={{ fontSize: '22px', fontWeight: 600, margin: '4px 0' }}>{v.mantra}</div>
      </section>
      {v.katha && (
        <section style={{ ...card, marginBottom: '12px' }}>
          <H><Bi hi={`कथा — ${v.katha.title.hi}`} en={`Katha — ${v.katha.title.en}`} /></H>
          {v.katha.body.map((p, i) => <p key={i} style={{ margin: '0 0 10px', fontSize: '15px', lineHeight: 1.9 }}><Bi hi={p.hi} en={p.en} /></p>)}
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi="परंपरागत कथा का संक्षिप्त पुनःकथन; अलग-अलग ग्रंथों और क्षेत्रों में रूप थोड़ा भिन्न मिलता है।" en="A short retelling of a traditional account; versions differ slightly between texts and regions." /></p>
        </section>
      )}
      {v.note && <p style={{ ...card, margin: '0 0 12px', fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)', background: 'var(--color-background-warning)' }}><Bi hi={v.note.hi} en={v.note.en} /></p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
        {aarti && <Link href={`/aarti/${aarti.slug}`} style={{ color: 'var(--color-text-info)', fontWeight: 600 }}>🪔 <Bi hi={`${aarti.hi} पढ़ें`} en={`Read the ${aarti.en}`} /></Link>}
        {v.cal && <Link href="/vrat-calendar" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ अगली तारीख़ें और तिथि का सटीक समय" en="→ Next dates and the exact tithi timings" /></Link>}
        <Link href="/vrat" style={{ color: 'var(--color-text-info)' }}><Bi hi="← सभी व्रत" en="← All vrats" /></Link>
      </div>
    </PublicShell>
  );
}

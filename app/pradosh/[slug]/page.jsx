import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { DateRow, dm } from '@/components/SeriesBits';
import { pradoshOccurrences } from '@/lib/vrat-series';
import { PRADOSH } from '@/lib/series-content';
import { pradoshWindow } from '@/lib/pradosh-window';
import { todayIST } from '@/lib/rashifal';

export function generateStaticParams() { return Object.keys(PRADOSH.variants).map(slug => ({ slug })); }
export async function generateMetadata({ params }) {
  const { slug } = await params; const v = PRADOSH.variants[slug]; if (!v) return {};
  return { title: `${v.hi} 2026, 2027, 2028 — तिथि और महत्त्व | ${v.en} dates`, description: `${v.hi}: ${v.why.hi.slice(0, 100)}… सभी तारीख़ें और प्रदोष काल। ${v.en} dates and Pradosh Kaal.`, alternates: { canonical: `/pradosh/${slug}` } };
}

export default async function PradoshVariant({ params }) {
  const { slug } = await params; const v = PRADOSH.variants[slug]; if (!v) notFound();
  const today = todayIST().iso;
  const list = pradoshOccurrences().filter(o => o.variant === slug);
  return (
    <PublicShell>
      <PageHero glyph="☽" title={<Bi hi={v.hi} en={v.en} />} sub={<Bi hi={v.alt.hi} en={v.alt.en} />} />
      <section style={{ ...card, marginBottom: '14px' }}>
        <h2 className="display" style={{ margin: '0 0 6px', fontSize: '18px' }}><Bi hi="महत्त्व" en="Significance" /></h2>
        <p style={{ margin: 0, lineHeight: 1.9, fontSize: '15px' }}><Bi hi={v.why.hi} en={v.why.en} /></p>
        <p style={{ margin: '10px 0 0', lineHeight: 1.85, fontSize: '14px', color: 'var(--color-text-secondary)' }}><Bi hi={PRADOSH.intro.hi} en={PRADOSH.intro.en} /></p>
      </section>
      <section style={{ ...card, padding: '2px 14px', marginBottom: '14px' }}>
        <h2 className="display" style={{ margin: '12px 0 4px', fontSize: '18px' }}><Bi hi={`${v.hi} की तारीख़ें (2026–2028)`} en={`${v.en} dates (2026–2028)`} /></h2>
        {list.map((o, i) => { const w = pradoshWindow(o.date); return (
          <DateRow key={o.date} o={o} wd={o.weekday} first={!i} past={o.date < today}
            sub={<Bi hi={`${o.paksha === 'shukla' ? 'शुक्ल' : 'कृष्ण'} पक्ष त्रयोदशी`} en={`${o.paksha === 'shukla' ? 'Shukla' : 'Krishna'} paksha Trayodashi`} />}
            extra={<><Bi hi={`त्रयोदशी: ${dm(o.start)} से ${dm(o.end)} (IST)`} en={`Trayodashi: ${dm(o.start)} to ${dm(o.end)} (IST)`} />{w && <><br /><Bi hi={`प्रदोष काल लगभग ${w.from} से ${w.to} (दिल्ली)`} en={`Pradosh Kaal about ${w.from} to ${w.to} (Delhi)`} /></>}</>} />
        ); })}
      </section>
      <section style={{ ...card, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Link href="/pradosh" className="pub-btn pub-btn-gold" style={{ minHeight: '42px', fontSize: '14px' }}><Bi hi="सभी प्रदोष" en="All Pradosh dates" /></Link>
        <Link href="/vrat/pradosh" className="pub-btn pub-btn-line" style={{ minHeight: '42px', fontSize: '14px', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}><Bi hi="व्रत-विधि" en="Vrat vidhi" /></Link>
      </section>
    </PublicShell>
  );
}

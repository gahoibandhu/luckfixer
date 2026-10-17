import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { DateRow, dm, fdate } from '@/components/SeriesBits';
import { purnimaOf, weekdayOf, PURNIMA_SLUGS } from '@/lib/vrat-series';
import { PURNIMA } from '@/lib/series-content';
import { FEST_SLUG_BY_KEY, festivalOccurrences } from '@/lib/festival-pages';
import { todayIST } from '@/lib/rashifal';

export function generateStaticParams() { return PURNIMA_SLUGS.map(slug => ({ slug })); }
export async function generateMetadata({ params }) {
  const { slug } = await params; const c = PURNIMA[slug]; if (!c) return {};
  const first = purnimaOf(slug)[0];
  return { title: `${c.hi} — तिथि, महत्त्व और व्रत-त्योहार | ${c.en}${first ? ' ' + first.date.slice(0, 4) : ''}`, description: `${c.hi}: ${c.why.hi.slice(0, 100)}… तारीख़ें और तिथि का समय। ${c.en} dates and tithi timing.`, alternates: { canonical: `/purnima/${slug}` } };
}

export default async function PurnimaPage({ params }) {
  const { slug } = await params; const c = PURNIMA[slug]; if (!c) notFound();
  const today = todayIST().iso;
  const list = purnimaOf(slug);
  const i = PURNIMA_SLUGS.indexOf(slug);
  const prev = PURNIMA_SLUGS[(i + PURNIMA_SLUGS.length - 1) % PURNIMA_SLUGS.length], nxt = PURNIMA_SLUGS[(i + 1) % PURNIMA_SLUGS.length];
  return (
    <PublicShell>
      <PageHero glyph="○" title={<Bi hi={c.hi} en={c.en} />} sub={<Bi hi="पूर्णिमा — तिथि और महत्त्व" en="Purnima — dates and significance" />} />
      <section style={{ ...card, marginBottom: '14px' }}>
        <h2 className="display" style={{ margin: '0 0 6px', fontSize: '18px' }}><Bi hi="महत्त्व" en="Significance" /></h2>
        <p style={{ margin: 0, lineHeight: 1.9, fontSize: '15px' }}><Bi hi={c.why.hi} en={c.why.en} /></p>
        {c.fests.length > 0 && (
          <p style={{ margin: '12px 0 0', fontSize: '14px', lineHeight: 1.9 }}>
            <b><Bi hi="इस दिन के पर्व: " en="Observances: " /></b>
            {c.fests.map((f, k) => {
              const pg = f.fk && FEST_SLUG_BY_KEY[f.fk];
              const node = <Bi hi={f.hi} en={f.en} />;
              return <span key={k}>{k > 0 && ' · '}{f.fk ? <Link href={pg ? `/tyohar/${pg}` : `/tyohar#${f.fk}`} style={{ color: 'var(--color-text-info)' }}>{node}</Link> : node}</span>;
            })}
          </p>
        )}
      </section>
      <section style={{ ...card, padding: '2px 14px', marginBottom: '14px' }}>
        <h2 className="display" style={{ margin: '12px 0 4px', fontSize: '18px' }}><Bi hi="तारीख़ें (2026–2028)" en="Dates (2026–2028)" /></h2>
        {list.length === 0 && <p style={{ margin: '8px 0 12px', fontSize: '14px', color: 'var(--color-text-secondary)' }}><Bi hi="यह पूर्णिमा 2026–2028 में नहीं आती (अधिक मास के बिना)।" en="This Purnima does not fall in 2026–2028 (it needs an adhika masa)." /></p>}
        {list.map((o, k) => {
          const fests = (c.fests || []).filter(f => f.fk).map(f => ({ f, d: festivalOccurrences(f.fk).find(x => x.p.slice(0, 4) === o.date.slice(0, 4)) })).filter(x => x.d);
          return (
            <DateRow key={o.date} o={o} wd={weekdayOf(o.date)} first={!k} past={o.date < today}
              extra={<><Bi hi={`पूर्णिमा तिथि: ${dm(o.start)} से ${dm(o.end)} (IST)`} en={`Purnima tithi: ${dm(o.start)} to ${dm(o.end)} (IST)`} />
                {fests.map(({ f, d }, j) => <span key={j}><br /><Bi hi={`${f.hi}: ${fdate(d.p, 'hi')}`} en={`${f.en}: ${fdate(d.p, 'en')}`} /></span>)}</>} />
          );
        })}
      </section>
      <section style={{ ...card, display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <Link href="/vrat/purnima" className="pub-btn pub-btn-gold" style={{ minHeight: '42px', fontSize: '14px' }}><Bi hi="पूर्णिमा व्रत-विधि और कथा" en="Purnima vrat vidhi and katha" /></Link>
        <Link href="/purnima" className="pub-btn pub-btn-line" style={{ minHeight: '42px', fontSize: '14px', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}><Bi hi="सभी पूर्णिमा" en="All Purnimas" /></Link>
      </section>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13px' }}>
        <Link href={`/purnima/${prev}`} style={{ color: 'var(--color-text-info)' }}>← <Bi hi={PURNIMA[prev].hi} en={PURNIMA[prev].en} /></Link>
        <Link href={`/purnima/${nxt}`} style={{ color: 'var(--color-text-info)' }}><Bi hi={PURNIMA[nxt].hi} en={PURNIMA[nxt].en} /> →</Link>
      </div>
    </PublicShell>
  );
}

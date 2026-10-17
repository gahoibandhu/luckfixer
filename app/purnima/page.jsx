import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { DateRow, chip, dm, WDN, fdate } from '@/components/SeriesBits';
import { purnimaOccurrences, weekdayOf, PURNIMA_SLUGS } from '@/lib/vrat-series';
import { PURNIMA } from '@/lib/series-content';
import { todayIST } from '@/lib/rashifal';

export const metadata = {
  title: 'पूर्णिमा 2026, 2027, 2028 — तिथि, वार और हर महीने की पूर्णिमा | Purnima dates',
  description: 'चैत्र से फाल्गुन तक हर पूर्णिमा की तारीख़, वार और तिथि का समय, उसके व्रत-त्योहारों के साथ। Purnima dates with weekday and tithi timing, month by month.',
  alternates: { canonical: '/purnima' },
};

export default async function PurnimaIndex({ searchParams }) {
  const sp = await searchParams; const today = todayIST().iso;
  const all = purnimaOccurrences();
  const year = [2026, 2027, 2028].includes(Number(sp?.y)) ? Number(sp.y) : (['2026', '2027', '2028'].includes(today.slice(0, 4)) ? Number(today.slice(0, 4)) : 2026);
  const list = all.filter(o => o.date.startsWith(String(year)));
  const next = all.find(o => o.date >= today);
  return (
    <PublicShell>
      <PageHero glyph="○" title={<Bi hi="पूर्णिमा — तिथि, वार और महीने के अनुसार" en="Purnima — dates, weekday and month by month" />} sub={<Bi hi="हर महीने की पूर्णिमा, उस पर पड़ने वाले व्रत-त्योहार और तिथि का समय।" en="The full moon of every month, the festivals that fall on it and the tithi timing." />} />
      {next && (
        <Link href={`/purnima/${next.slug}`} style={{ ...card, display: 'block', textDecoration: 'none', color: 'var(--color-text-primary)', borderColor: 'var(--pub-gold)', marginBottom: '14px' }}>
          <small style={{ color: 'var(--color-text-tertiary)' }}><Bi hi="अगली पूर्णिमा" en="Next Purnima" /></small>
          <div className="display" style={{ fontSize: '20px', margin: '2px 0' }}><Bi hi={PURNIMA[next.slug].hi} en={PURNIMA[next.slug].en} /></div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}><Bi hi={`${WDN[weekdayOf(next.date)][0]}, ${fdate(next.date, 'hi')}`} en={`${WDN[weekdayOf(next.date)][1]}, ${fdate(next.date, 'en')}`} /></div>
        </Link>
      )}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[2026, 2027, 2028].map(y => <Link key={y} href={`/purnima?y=${y}`} style={chip(y === year)}>{y}</Link>)}
        <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi={`${list.length} पूर्णिमा`} en={`${list.length} Purnimas`} /></span>
      </div>
      <section style={{ ...card, padding: '2px 14px', marginBottom: '14px' }}>
        {list.map((o, i) => { const c = PURNIMA[o.slug]; return (
          <DateRow key={o.date} o={o} wd={weekdayOf(o.date)} first={!i} past={o.date < today} href={`/purnima/${o.slug}`}
            label={<Bi hi={c.hi} en={c.en} />}
            sub={c.fests.length ? <Bi hi={c.fests.map(f => f.hi).join(' · ')} en={c.fests.map(f => f.en).join(' · ')} /> : null}
            extra={<Bi hi={`पूर्णिमा तिथि: ${dm(o.start)} से ${dm(o.end)} (IST)`} en={`Purnima tithi: ${dm(o.start)} to ${dm(o.end)} (IST)`} />} />
        ); })}
      </section>
      <section style={{ ...card, marginBottom: '14px' }}>
        <h2 className="display" style={{ margin: '0 0 8px', fontSize: '18px' }}><Bi hi="महीने के अनुसार पूर्णिमा" en="Purnima by month" /></h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px 14px', fontSize: '14px' }}>
          {PURNIMA_SLUGS.map(k => <Link key={k} href={`/purnima/${k}`} style={{ color: 'var(--color-text-info)' }}><Bi hi={PURNIMA[k].hi} en={PURNIMA[k].en} /></Link>)}
        </div>
      </section>
      <section style={{ ...card, display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <Link href="/vrat/purnima" className="pub-btn pub-btn-gold" style={{ minHeight: '42px', fontSize: '14px' }}><Bi hi="पूर्णिमा व्रत-विधि और कथा" en="Purnima vrat vidhi and katha" /></Link>
        <Link href="/calendar?v=agenda&t=purnima" className="pub-btn pub-btn-line" style={{ minHeight: '42px', fontSize: '14px', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}>📅 <Bi hi="कैलेंडर में देखें" en="See in calendar" /></Link>
      </section>
      <p style={{ ...card, fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)', background: 'var(--color-background-warning)' }}>
        <Bi hi="यहाँ पूर्णिमा तिथि का दिन दिखाया गया है। रक्षाबंधन, शरद पूर्णिमा, होलिका दहन जैसे पर्वों के अपने नियम हैं (भद्रा, रात्रि, प्रदोष), इसलिए उनका दिन एक दिन आगे-पीछे हो सकता है — उनकी तारीख़ त्योहार के पेज पर देखें। गणना दिल्ली (IST) के लिए है।" en="This shows the day of the Purnima tithi. Festivals such as Raksha Bandhan, Sharad Purnima and Holika Dahan have their own rules (Bhadra, night, Pradosh), so their day can differ by one — see the festival’s own page for its date. Computed for Delhi (IST)." />
      </p>
    </PublicShell>
  );
}

import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { DateRow, chip, dm, WDN, fdate } from '@/components/SeriesBits';
import { amavasyaOccurrences } from '@/lib/vrat-series';
import { AMAVASYA } from '@/lib/series-content';
import { eventsByDate } from '@/lib/calendar-events';
import { todayIST } from '@/lib/rashifal';

export const metadata = {
  title: 'अमावस्या 2026, 2027, 2028 — तिथि, वार, सोमवती और शनि अमावस्या | Amavasya dates',
  description: 'हर अमावस्या की तारीख़, वार और तिथि का समय; सोमवती और शनि अमावस्या चिह्नित। Amavasya dates with weekday and tithi timing, Somvati and Shani Amavasya marked.',
  alternates: { canonical: '/amavasya' },
};

export default async function AmavasyaIndex({ searchParams }) {
  const sp = await searchParams; const today = todayIST().iso;
  const all = amavasyaOccurrences();
  const year = [2026, 2027, 2028].includes(Number(sp?.y)) ? Number(sp.y) : (['2026', '2027', '2028'].includes(today.slice(0, 4)) ? Number(today.slice(0, 4)) : 2026);
  const list = all.filter(o => o.date.startsWith(String(year)));
  const next = all.find(o => o.date >= today);
  const fest = eventsByDate(year, ['tyohar']);                                   // festivals that fall on an Amavasya (Diwali, Mauni Amavasya...)
  const lab = (o) => o.variant ? <Bi hi={AMAVASYA[o.variant].hi} en={AMAVASYA[o.variant].en} /> : null;
  return (
    <PublicShell>
      <PageHero glyph="●" title={<Bi hi="अमावस्या — तिथि, वार और पितृ-स्मरण" en="Amavasya — dates, weekday and remembering ancestors" />} sub={<Bi hi="हर अमावस्या की तारीख़ और वार; सोमवती और शनि अमावस्या अलग से चिह्नित।" en="Every Amavasya with its weekday; Somvati and Shani Amavasya marked separately." />} />
      {next && (
        <Link href={`/panchang/${next.date}`} style={{ ...card, display: 'block', textDecoration: 'none', color: 'var(--color-text-primary)', borderColor: 'var(--pub-gold)', marginBottom: '14px' }}>
          <small style={{ color: 'var(--color-text-tertiary)' }}><Bi hi="अगली अमावस्या" en="Next Amavasya" /></small>
          <div className="display" style={{ fontSize: '20px', margin: '2px 0' }}>{next.variant ? <Bi hi={AMAVASYA[next.variant].hi} en={AMAVASYA[next.variant].en} /> : <Bi hi="अमावस्या" en="Amavasya" />}</div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}><Bi hi={`${WDN[next.weekday][0]}, ${fdate(next.date, 'hi')}`} en={`${WDN[next.weekday][1]}, ${fdate(next.date, 'en')}`} /></div>
        </Link>
      )}
      <section style={{ ...card, marginBottom: '14px' }}>
        <p style={{ margin: 0, lineHeight: 1.9, fontSize: '15px' }}><Bi hi={AMAVASYA.intro.hi} en={AMAVASYA.intro.en} /></p>
        {['somvati', 'shani'].map(k => <p key={k} style={{ margin: '10px 0 0', lineHeight: 1.85, fontSize: '14px' }}><b><Bi hi={AMAVASYA[k].hi} en={AMAVASYA[k].en} />: </b><Bi hi={AMAVASYA[k].why.hi} en={AMAVASYA[k].why.en} /></p>)}
      </section>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[2026, 2027, 2028].map(y => <Link key={y} href={`/amavasya?y=${y}`} style={chip(y === year)}>{y}</Link>)}
        <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi={`${list.length} अमावस्या`} en={`${list.length} Amavasyas`} /></span>
      </div>
      <section style={{ ...card, padding: '2px 14px', marginBottom: '14px' }}>
        {list.map((o, i) => {
          const f = (fest[o.date] || []).filter(e => e.first);
          return (
            <DateRow key={o.date} o={o} wd={o.weekday} first={!i} past={o.date < today} label={lab(o)}
              sub={f.length ? <Bi hi={f.map(e => e.hi).join(' · ')} en={f.map(e => e.en).join(' · ')} /> : null}
              extra={<Bi hi={`अमावस्या तिथि: ${dm(o.start)} से ${dm(o.end)} (IST)`} en={`Amavasya tithi: ${dm(o.start)} to ${dm(o.end)} (IST)`} />} />
          );
        })}
      </section>
      <section style={{ ...card, display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <Link href="/vrat/amavasya" className="pub-btn pub-btn-gold" style={{ minHeight: '42px', fontSize: '14px' }}><Bi hi="अमावस्या व्रत-विधि" en="Amavasya vrat vidhi" /></Link>
        <Link href="/vrat/shraddh" className="pub-btn pub-btn-line" style={{ minHeight: '42px', fontSize: '14px', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}><Bi hi="पितृ-श्राद्ध विधि" en="Pitru shraddh vidhi" /></Link>
      </section>
      <p style={{ ...card, fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)', background: 'var(--color-background-warning)' }}>
        <Bi hi="तिथि और वार दिल्ली (IST) के लिए गणना किए गए हैं। अमावस्या कभी-कभी दो दिन तक फैली होती है; श्राद्ध और पितृ-कर्म में मध्याह्न के नियम से दिन तय होता है — अपने पंडित जी या स्थानीय पंचांग से पुष्टि करें।" en="Dates and weekdays are computed for Delhi (IST). Amavasya sometimes spans two days; for shraddh and pitru rites the day is fixed by the midday rule — confirm with your priest or local panchang." />
      </p>
    </PublicShell>
  );
}

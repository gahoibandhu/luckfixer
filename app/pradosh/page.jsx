import Link from '@/components/PLink';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { DateRow, chip, dm, WDN, fdate } from '@/components/SeriesBits';
import { pradoshOccurrences } from '@/lib/vrat-series';
import { PRADOSH } from '@/lib/series-content';
import { pradoshWindow } from '@/lib/pradosh-window';
import { todayIST } from '@/lib/rashifal';

export const metadata = {
  title: 'प्रदोष व्रत 2026, 2027, 2028 — तिथि, सोम-भौम-शनि प्रदोष, पूजा का समय | Pradosh Vrat dates',
  description: 'सभी प्रदोष व्रत की तारीख़ और वार (सोम, भौम, शनि प्रदोष), त्रयोदशी तिथि का समय और प्रदोष काल (दिल्ली)। Pradosh vrat dates with weekday, Trayodashi timing and Pradosh Kaal.',
  alternates: { canonical: '/pradosh' },
};
const pk = (p) => (p === 'shukla' ? ['शुक्ल', 'Shukla'] : ['कृष्ण', 'Krishna']);

export default async function PradoshIndex({ searchParams }) {
  const sp = await searchParams; const today = todayIST().iso;
  const all = pradoshOccurrences();
  const year = [2026, 2027, 2028].includes(Number(sp?.y)) ? Number(sp.y) : (['2026', '2027', '2028'].includes(today.slice(0, 4)) ? Number(today.slice(0, 4)) : 2026);
  const list = all.filter(o => o.date.startsWith(String(year)));
  const next = all.find(o => o.date >= today);
  const V = PRADOSH.variants;
  const lab = (o) => o.variant ? <Bi hi={V[o.variant].hi} en={V[o.variant].en} /> : null;

  return (
    <PublicShell>
      <PageHero glyph="☽" title={<Bi hi="प्रदोष व्रत — तिथि और पूजा का समय" en="Pradosh Vrat — dates and puja time" />} sub={<Bi hi="हर पक्ष की त्रयोदशी को भगवान शिव का व्रत। सोम, भौम और शनि प्रदोष अलग से चिह्नित।" en="Lord Shiva’s vrat on the Trayodashi of each fortnight, with Som, Bhauma and Shani Pradosh marked." />} />
      {next && (() => { const w = pradoshWindow(next.date); return (
        <Link href={`/panchang/${next.date}`} style={{ ...card, display: 'block', textDecoration: 'none', color: 'var(--color-text-primary)', borderColor: 'var(--pub-gold)', marginBottom: '14px' }}>
          <small style={{ color: 'var(--color-text-tertiary)' }}><Bi hi="अगला प्रदोष" en="Next Pradosh" /></small>
          <div className="display" style={{ fontSize: '20px', margin: '2px 0' }}>{next.variant ? <Bi hi={V[next.variant].hi} en={V[next.variant].en} /> : <Bi hi="प्रदोष व्रत" en="Pradosh Vrat" />}</div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}><DateLine o={next} />{w && <> · <Bi hi={`प्रदोष काल ≈ ${w.from}–${w.to}`} en={`Pradosh Kaal ≈ ${w.from}–${w.to}`} /></>}</div>
        </Link>); })()}

      <section style={{ ...card, marginBottom: '14px' }}>
        <p style={{ margin: 0, lineHeight: 1.9, fontSize: '15px' }}><Bi hi={PRADOSH.intro.hi} en={PRADOSH.intro.en} /></p>
        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: 'var(--color-text-tertiary)', lineHeight: 1.7 }}><Bi hi={PRADOSH.kaal.hi} en={PRADOSH.kaal.en} /></p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '14px' }}>
        {Object.entries(V).map(([k, v]) => (
          <Link key={k} href={`/pradosh/${k}`} style={{ ...card, textDecoration: 'none', color: 'var(--color-text-primary)' }}>
            <b><Bi hi={v.hi} en={v.en} /></b><br /><small style={{ color: 'var(--color-text-tertiary)' }}><Bi hi={v.alt.hi} en={v.alt.en} /></small>
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[2026, 2027, 2028].map(y => <Link key={y} href={`/pradosh?y=${y}`} style={chip(y === year)}>{y}</Link>)}
        <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi={`${list.length} प्रदोष`} en={`${list.length} Pradoshas`} /></span>
      </div>
      <section style={{ ...card, padding: '2px 14px', marginBottom: '14px' }}>
        {list.map((o, i) => { const w = pradoshWindow(o.date), p = pk(o.paksha); return (
          <DateRow key={o.date} o={o} wd={o.weekday} first={!i} past={o.date < today} label={lab(o)}
            sub={<Bi hi={`${p[0]} पक्ष त्रयोदशी`} en={`${p[1]} paksha Trayodashi`} />}
            extra={<><Bi hi={`त्रयोदशी: ${dm(o.start)} से ${dm(o.end)} (IST)`} en={`Trayodashi: ${dm(o.start)} to ${dm(o.end)} (IST)`} />{w && <><br /><Bi hi={`सूर्यास्त ${w.sunset} · प्रदोष काल लगभग ${w.from} से ${w.to} (दिल्ली)`} en={`Sunset ${w.sunset} · Pradosh Kaal about ${w.from} to ${w.to} (Delhi)`} /></>}</>} />
        ); })}
      </section>

      <section style={{ ...card, display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <Link href="/vrat/pradosh" className="pub-btn pub-btn-gold" style={{ minHeight: '42px', fontSize: '14px' }}><Bi hi="व्रत-विधि, कथा और नियम" en="Vrat vidhi, katha and rules" /></Link>
        <Link href="/aarti/shiv-aarti" className="pub-btn pub-btn-line" style={{ minHeight: '42px', fontSize: '14px', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}><Bi hi="शिव आरती" en="Shiv aarti" /></Link>
        <Link href="/aarti/shiv-chalisa" className="pub-btn pub-btn-line" style={{ minHeight: '42px', fontSize: '14px', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}><Bi hi="शिव चालीसा" en="Shiv Chalisa" /></Link>
      </section>
      <p style={{ ...card, fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)', background: 'var(--color-background-warning)' }}>
        <Bi hi="तिथियाँ और समय दिल्ली (IST) के लिए गणना किए गए हैं। प्रदोष काल आपके शहर के सूर्यास्त के अनुसार बदलता है और दो दिन तक फैली त्रयोदशी में परंपरा के अनुसार दिन भिन्न हो सकता है — अपने स्थानीय पंचांग या पंडित जी से पुष्टि कर लें।" en="Dates and times are computed for Delhi (IST). Pradosh Kaal moves with your city’s sunset, and when Trayodashi spans two days the observed day can differ by tradition — confirm with your local panchang or priest." />
      </p>
    </PublicShell>
  );
}
function DateLine({ o }) {
  return <Bi hi={`${WDN[o.weekday][0]}, ${fdate(o.date, 'hi')}`} en={`${WDN[o.weekday][1]}, ${fdate(o.date, 'en')}`} />;
}

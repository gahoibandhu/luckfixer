import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { SLUGS, MONTHS, occurrencesOf } from '@/lib/ekadashi';
import { EKADASHI } from '@/lib/ekadashi-content';
import { paranaFor } from '@/lib/ekadashi-parana';
import { formatDateLong } from '@/lib/date-format';
import { todayIST } from '@/lib/rashifal';

export function generateStaticParams() { return SLUGS.map(slug => ({ slug })); }

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const c = EKADASHI[slug];
  if (!c) return {};
  const occ = occurrencesOf(slug).map(o => o.date);
  const soon = occ.length ? `${formatDateLong(...occ[0].split('-').map(Number), 'en')}` : '';
  return {
    title: `${c.hi} — तिथि, कथा, पारण | ${c.en}${soon ? ' ' + occ[0].slice(0, 4) : ''}`,
    description: `${c.hi} (${c.alt.hi}): ${c.why.hi.slice(0, 90)}… तिथि, संक्षिप्त कथा और पारण का समय। ${c.en} dates, short katha and pāraṇa time.`,
    alternates: { canonical: `/ekadashi/${slug}` },
  };
}
const WD = [['रविवार', 'Sun'], ['सोमवार', 'Mon'], ['मंगलवार', 'Tue'], ['बुधवार', 'Wed'], ['गुरुवार', 'Thu'], ['शुक्रवार', 'Fri'], ['शनिवार', 'Sat']];
const wdOf = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const hhmm = (s) => s.slice(11);

export default async function EkadashiPage({ params }) {
  const { slug } = await params;
  const c = EKADASHI[slug];
  if (!c) notFound();
  const today = todayIST().iso;
  const occ = occurrencesOf(slug);
  const i = SLUGS.indexOf(slug);
  const first = occ[0];
  const meta = first ? (first.adhika ? [['अधिक मास', 'Adhika masa'], first.paksha] : [MONTHS[first.monthIdx], first.paksha]) : null;
  const fmtD = (iso, l) => formatDateLong(...iso.split('-').map(Number), l);

  return (
    <PublicShell>
      <PageHero glyph="☊" title={<Bi hi={c.hi} en={c.en} />} sub={<Bi hi={c.alt.hi} en={c.alt.en} />} />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '0 0 12px', fontSize: '13px' }}>
        {meta && <span style={{ padding: '5px 11px', borderRadius: '999px', background: 'var(--color-background-secondary)' }}><Bi hi={`${meta[0][0]} · ${meta[1] === 'shukla' ? 'शुक्ल' : 'कृष्ण'} पक्ष`} en={`${meta[0][1]} · ${meta[1] === 'shukla' ? 'Shukla' : 'Krishna'} paksha`} /></span>}
        <span style={{ padding: '5px 11px', borderRadius: '999px', background: 'var(--color-background-secondary)' }}><Bi hi="देवता: भगवान विष्णु" en="Deity: Lord Vishnu" /></span>
      </div>

      <section style={{ ...card, marginBottom: '14px' }}>
        <h2 className="display" style={{ margin: '0 0 6px', fontSize: '18px' }}><Bi hi="महत्त्व" en="Significance" /></h2>
        <p style={{ margin: 0, lineHeight: 1.85, fontSize: '15px' }}><Bi hi={c.why.hi} en={c.why.en} /></p>
      </section>

      <section style={{ ...card, marginBottom: '14px' }}>
        <h2 className="display" style={{ margin: '0 0 6px', fontSize: '18px' }}><Bi hi="कथा" en="Katha" /></h2>
        <p style={{ margin: 0, lineHeight: 1.85, fontSize: '15px', whiteSpace: 'pre-line' }}><Bi hi={c.katha.hi} en={c.katha.en} /></p>
        {c.msg && <p style={{ margin: '12px 0 0', lineHeight: 1.8, fontSize: '15px', fontWeight: 600 }}><Bi hi={c.msg.hi} en={c.msg.en} /></p>}
        {c.pray && <p style={{ margin: '12px 0 0', lineHeight: 1.8, fontSize: '15px', color: 'var(--color-text-info)' }}>🙏 <Bi hi={c.pray.hi} en={c.pray.en} /></p>}
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi="यह सरल हिन्दी में भक्ति-पाठ के लिए तैयार संक्षिप्त कथा है। अलग-अलग ग्रंथों और क्षेत्रों में नाम और विवरण भिन्न मिल सकते हैं; पूरी कथा अपनी परंपरा या पंडित जी से मिलाएँ।" en="A short devotional retelling in simple language. Names and details differ between texts and regions; check the full katha with your own tradition or priest." /></p>
      </section>

      <section style={{ ...card, marginBottom: '14px', padding: '10px 14px' }}>
        <h2 className="display" style={{ margin: '0 0 6px', fontSize: '18px' }}><Bi hi="तिथि और पारण (2026–2028, दिल्ली)" en="Dates and pāraṇa (2026–2028, Delhi)" /></h2>
        {occ.length === 0 ? <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}><Bi hi="यह एकादशी 2026–2028 में नहीं पड़ती (अधिक मास के बिना)।" en="This Ekadashi does not fall in 2026–2028 (it needs an adhika masa)." /></p> : occ.map((o, k) => {
          const p = paranaFor(o.date), past = o.date < today;
          return (
            <div key={k} style={{ padding: '11px 0', borderTop: k ? '1px solid var(--color-border-tertiary)' : 'none', opacity: past ? 0.55 : 1 }}>
              <Link href={`/panchang/${o.date}`} style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none' }}><Bi hi={`${WD[wdOf(o.date)][0]}, ${fmtD(o.date, 'hi')}`} en={`${WD[wdOf(o.date)][1]}, ${fmtD(o.date, 'en')}`} /></Link>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '3px', lineHeight: 1.7 }}>
                <Bi hi={`एकादशी तिथि: ${fmtD(o.start.slice(0, 10), 'hi')} ${hhmm(o.start)} से ${fmtD(o.end.slice(0, 10), 'hi')} ${hhmm(o.end)} तक`} en={`Tithi: ${fmtD(o.start.slice(0, 10), 'en')} ${hhmm(o.start)} to ${fmtD(o.end.slice(0, 10), 'en')} ${hhmm(o.end)}`} />
                {p && <><br /><Bi hi={`पारण: ${fmtD(p.date, 'hi')} को सूर्योदय (${p.sunrise}) के बाद${p.dwadashiEnds ? `, द्वादशी समाप्त होने (${p.dwadashiEnds}) से पहले` : ''}`} en={`Pāraṇa: ${fmtD(p.date, 'en')} after sunrise (${p.sunrise})${p.dwadashiEnds ? `, before Dwadashi ends (${p.dwadashiEnds})` : ''}`} /></>}
              </div>
            </div>
          );
        })}
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: 1.7 }}><Bi hi="समय IST में हैं। परंपरा अनुसार द्वादशी की पहली चौथाई (हरि वासर) में पारण नहीं किया जाता। वैष्णव परंपरा में व्रत अगले दिन हो सकता है; शहर के अनुसार भी एक दिन का अंतर संभव है — स्थानीय पंचांग से पुष्टि करें।" en="Times are IST. By tradition pāraṇa is not done in the first quarter of Dwadashi (Hari Vasara). Vaishnava observance can fall a day later, and cities can differ by a day — confirm with your local panchang." /></p>
      </section>

      <section style={{ ...card, marginBottom: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Link href="/vrat/ekadashi" className="pub-btn pub-btn-gold" style={{ minHeight: '42px', fontSize: '14px' }}><Bi hi="व्रत-विधि और नियम" en="Vrat vidhi and rules" /></Link>
        <Link href="/aarti/om-jai-jagdish-hare" className="pub-btn pub-btn-line" style={{ minHeight: '42px', fontSize: '14px', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}><Bi hi="विष्णु आरती" en="Vishnu aarti" /></Link>
        <Link href="/calendar?v=agenda&t=ekadashi" className="pub-btn pub-btn-line" style={{ minHeight: '42px', fontSize: '14px', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}><Bi hi="कैलेंडर में देखें" en="See in calendar" /></Link>
      </section>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13px' }}>
        <Link href={`/ekadashi/${SLUGS[(i + SLUGS.length - 1) % SLUGS.length]}`} style={{ color: 'var(--color-text-info)' }}>← <Bi hi={EKADASHI[SLUGS[(i + SLUGS.length - 1) % SLUGS.length]].hi} en={EKADASHI[SLUGS[(i + SLUGS.length - 1) % SLUGS.length]].en} /></Link>
        <Link href="/ekadashi" style={{ color: 'var(--color-text-info)' }}><Bi hi="सभी एकादशी" en="All Ekadashis" /></Link>
        <Link href={`/ekadashi/${SLUGS[(i + 1) % SLUGS.length]}`} style={{ color: 'var(--color-text-info)' }}><Bi hi={EKADASHI[SLUGS[(i + 1) % SLUGS.length]].hi} en={EKADASHI[SLUGS[(i + 1) % SLUGS.length]].en} /> →</Link>
      </div>
    </PublicShell>
  );
}

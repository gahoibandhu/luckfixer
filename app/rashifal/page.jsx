import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import StarMeter from '@/components/StarMeter';
import { RASHIS, VAAR } from '@/lib/public-content';
import { getDailyContext, buildRashifal, todayIST } from '@/lib/rashifal';
import { fmt } from '@/lib/panchang';
import { NAK_CAT_NOTE, TITHI_CAT_NOTE } from '@/lib/rashifal-content';

export const metadata = {
  title: 'आज का राशिफल — सभी 12 राशियाँ (करियर, धन, रिश्ते, सेहत) | Daily Horoscope Today',
  description: 'चंद्र गोचर, तिथि और नक्षत्र के आधार पर मेष से मीन तक सभी 12 राशियों का आज का राशिफल — करियर, धन, रिश्ते और सेहत के सुझावों के साथ। Daily Vedic horoscope for all 12 moon signs.',
  alternates: { canonical: '/rashifal' },
};

export const addDay = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const fmtDate = (iso, weekday) => {
  const d = new Date(iso + 'T00:00:00Z');
  const t = `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
  return { hi: `${VAAR[weekday].hi}, ${t}`, en: `${VAAR[weekday].en}, ${t}` };
};
export const when = (o) => `${fmt(o.min)}${o.dayOff ? ' (+1d)' : ''}`;

export default async function RashifalIndex({ searchParams }) {
  const sp = await searchParams;
  const ctx = await getDailyContext(sp?.d);
  const today = todayIST().iso;
  const date = fmtDate(ctx.iso, ctx.weekday);
  const q = (d) => `/rashifal?d=${d}`;
  return (
    <PublicShell>
      <PageHero glyph="♈" title={<Bi hi="राशिफल" en="Horoscope" />} sub={<Bi hi={date.hi} en={date.en} />} />
      <div style={{ display: 'flex', gap: '14px', fontSize: '14px', marginBottom: '14px' }}>
        <Link href={q(addDay(ctx.iso, -1))} style={{ color: 'var(--color-text-info)' }}>← <Bi hi="पिछला दिन" en="Previous day" /></Link>
        <Link href={q(today)} style={{ color: 'var(--color-text-info)' }}><Bi hi="आज" en="Today" /></Link>
        <Link href={q(addDay(ctx.iso, 1))} style={{ color: 'var(--color-text-info)' }}><Bi hi="अगला दिन" en="Next day" /> →</Link>
      </div>

      {ctx.ok ? (
        <section style={{ ...card, margin: '0 0 14px', fontSize: '14px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
          <b style={{ color: 'var(--color-text-primary)' }}><Bi hi="आज का आकाश" en="The sky today" /></b><br />
          <Bi hi={`चंद्रमा ${ctx.moonSegs.map((s, i) => `${RASHIS[s.idx].hi}${i < ctx.moonSegs.length - 1 ? ` (${fmt(s.to)} तक)` : ''}`).join(' → ')} · तिथि: ${ctx.tithi.paksha === 'shukla' ? 'शुक्ल' : 'कृष्ण'} ${ctx.tithi.hi} (${when(ctx.tithi.end)} तक) · नक्षत्र: ${ctx.nakshatra.hi} (${when(ctx.nakshatra.end)} तक)`}
              en={`Moon in ${ctx.moonSegs.map((s, i) => `${RASHIS[s.idx].en}${i < ctx.moonSegs.length - 1 ? ` (until ${fmt(s.to)})` : ''}`).join(' → ')} · Tithi: ${ctx.tithi.paksha === 'shukla' ? 'Shukla' : 'Krishna'} ${ctx.tithi.en} (until ${when(ctx.tithi.end)}) · Nakshatra: ${ctx.nakshatra.en} (until ${when(ctx.nakshatra.end)})`} /><br />
          <span style={{ fontSize: '13px' }}><Bi hi={`${TITHI_CAT_NOTE[ctx.tithi.cat].name.hi} तिथि: ${TITHI_CAT_NOTE[ctx.tithi.cat].t.hi}`} en={`${TITHI_CAT_NOTE[ctx.tithi.cat].name.en} tithi: ${TITHI_CAT_NOTE[ctx.tithi.cat].t.en}`} /></span>
        </section>
      ) : (
        <p style={{ ...card, margin: '0 0 14px', fontSize: '14px', color: 'var(--color-text-warning)' }}><Bi hi="इस तारीख का राशिफल उपलब्ध नहीं है (हम 2026–2028 की तारीखें दिखाते हैं)।" en="Horoscope for this date is not available (we cover 2026–2028)." /></p>
      )}

      <div className="pub-rashi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {RASHIS.map(r => {
          const f = ctx.ok ? buildRashifal(r.slug, ctx) : null;
          return (
            <Link key={r.slug} href={ctx.ok ? `/rashifal/${r.slug}?d=${ctx.iso}` : `/rashi/${r.slug}`} className="pub-rashi">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: '16px' }}>{r.sym} <Bi hi={r.hi} en={r.en} /></b>
                {f && <StarMeter stars={f.stars} />}
              </div>
              {f && <>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '6px 0', lineHeight: 1.45 }}><Bi hi={f.main.g.head.hi} en={f.main.g.head.en} /></div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                  {['💼', '₹', '♡', '🌿'].map((g, i) => <span key={i}>{g} {'●'.repeat(f.main.stars[i])}<span style={{ opacity: .25 }}>{'●'.repeat(5 - f.main.stars[i])}</span></span>)}
                </div>
                {f.second && <div style={{ fontSize: '11px', color: 'var(--color-text-warning)', marginTop: '4px' }}><Bi hi={`${fmt(f.main === f.parts[0] ? f.main.to : f.second.from)} के बाद बदलाव`} en={`Shifts after ${fmt(f.main === f.parts[0] ? f.main.to : f.second.from)}`} /></div>}
              </>}
            </Link>
          );
        })}
      </div>

      <section style={{ ...card, marginTop: '16px' }}>
        <h2 style={{ fontSize: '15px', margin: '0 0 6px' }}><Bi hi="यह राशिफल कैसे बनता है?" en="How is this horoscope made?" /></h2>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
          <Bi hi="हम रोज़ चंद्रमा की असली स्थिति (और उसके राशि बदलने का सटीक समय), तिथि और नक्षत्र निकालते हैं, फिर देखते हैं कि चंद्रमा आपकी राशि से कौन से भाव में है (चंद्र गोचर)। उसी से करियर, धन, रिश्ते और सेहत के सामान्य संकेत बनते हैं। ये एक राशि वाले सभी लोगों के लिए सामान्य सुझाव हैं — आपकी निजी कुंडली, दशा और बाकी ग्रह अलग तस्वीर दे सकते हैं।"
              en="Each day we work out the Moon’s real position (and the exact minute it changes sign), the tithi and the nakshatra, then see which house the Moon falls in from your rashi (Chandra gochar). That gives general pointers for career, money, relationships and wellbeing. They are general suggestions for everyone of a sign — your personal kundli, dasha and the other planets may paint a different picture." />
        </p>
      </section>
      <p style={{ marginTop: '14px', fontSize: '14px', lineHeight: 2 }}><Link href="/rashi" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ राशि गाइड पढ़ें" en="→ Read the rashi guide" /></Link><br /><Link href="/panchang" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ आज का पंचांग" en="→ Today’s panchang" /></Link></p>
    </PublicShell>
  );
}

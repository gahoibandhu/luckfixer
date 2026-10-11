import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import StarMeter from '@/components/StarMeter';
import { RASHIS, rashiBySlug } from '@/lib/public-content';
import { getDailyContext, buildRashifal, todayIST } from '@/lib/rashifal';
import { DOMAINS, NAK_CAT_NOTE, TITHI_CAT_NOTE } from '@/lib/rashifal-content';
import { fmt } from '@/lib/panchang';
import { fmtDate, addDay, when } from '../page';

export async function generateMetadata({ params }) {
  const { sign } = await params;
  const r = rashiBySlug(sign);
  if (!r) return {};
  return {
    title: `${r.hi} राशिफल आज — करियर, धन, रिश्ते, सेहत | ${r.en} (${r.sym}) Daily Horoscope`,
    description: `आज का ${r.hi} राशिफल — चंद्र गोचर, तिथि और नक्षत्र के आधार पर करियर, धन, रिश्तों और सेहत के सुझाव। Today’s ${r.en} horoscope with career, money, love and wellbeing pointers.`,
    alternates: { canonical: `/rashifal/${r.slug}` },
  };
}

const TONE = { good: ['var(--color-text-success)', 'अनुकूल', 'Supportive'], mixed: ['var(--color-text-warning)', 'मिला-जुला', 'Mixed'], careful: ['var(--color-text-danger)', 'सावधानी', 'Take care'] };

export default async function RashifalSign({ params, searchParams }) {
  const { sign } = await params;
  const sp = await searchParams;
  const r = rashiBySlug(sign);
  if (!r) notFound();
  const ctx = await getDailyContext(sp?.d);
  const f = buildRashifal(r.slug, ctx);
  const date = fmtDate(ctx.iso, ctx.weekday);
  const today = todayIST().iso;
  const q = (d) => `/rashifal/${r.slug}?d=${d}`;
  const idx = RASHIS.findIndex(x => x.slug === r.slug), prev = RASHIS[(idx + 11) % 12], next = RASHIS[(idx + 1) % 12];

  return (
    <PublicShell>
      <PageHero glyph={r.sym} title={<Bi hi={`${r.hi} राशिफल`} en={`${r.en} horoscope`} />} sub={<Bi hi={date.hi} en={date.en} />} />
      <div style={{ display: 'flex', gap: '14px', fontSize: '14px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <Link href={q(addDay(ctx.iso, -1))} style={{ color: 'var(--color-text-info)' }}>← <Bi hi="पिछला दिन" en="Previous day" /></Link>
        <Link href={q(today)} style={{ color: 'var(--color-text-info)' }}><Bi hi="आज" en="Today" /></Link>
        <Link href={q(addDay(ctx.iso, 1))} style={{ color: 'var(--color-text-info)' }}><Bi hi="अगला दिन" en="Next day" /> →</Link>
        <Link href={`/rashifal?d=${ctx.iso}`} style={{ color: 'var(--color-text-secondary)', marginLeft: 'auto' }}><Bi hi="सभी राशियाँ" en="All signs" /></Link>
      </div>

      {!f ? (
        <p style={{ ...card, fontSize: '14px', color: 'var(--color-text-warning)' }}><Bi hi="इस तारीख का राशिफल उपलब्ध नहीं है (हम 2026–2028 की तारीखें दिखाते हैं)।" en="Horoscope for this date is not available (we cover 2026–2028)." /></p>
      ) : (
        <>
          {/* overall */}
          <section style={{ ...card, marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '19px', margin: 0 }}><Bi hi={f.main.g.head.hi} en={f.main.g.head.en} /></h2>
              <StarMeter stars={f.stars} />
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: TONE[f.tone][0], marginBottom: '6px' }}><Bi hi={TONE[f.tone][1]} en={TONE[f.tone][2]} /></div>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.85, color: 'var(--color-text-secondary)' }}><Bi hi={f.main.g.body.hi} en={f.main.g.body.en} /></p>
          </section>

          {/* the day split when the Moon changes sign */}
          {f.parts.length > 1 && (
            <section style={{ ...card, marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', margin: '0 0 10px' }}><Bi hi="आज चंद्रमा राशि बदलता है — दिन के दो हिस्से" en="The Moon changes sign today — two parts of the day" /></h2>
              {f.parts.map((p, i) => (
                <div key={i} style={{ padding: '9px 0', borderTop: i ? '1px solid var(--color-border-tertiary)' : 'none' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{fmt(p.from)} – {fmt(p.to)} · <Bi hi={`चंद्रमा ${RASHIS[p.moonSign].hi} में (आपकी राशि से ${p.house}वें भाव में)`} en={`Moon in ${RASHIS[p.moonSign].en} (house ${p.house} from your sign)`} /></div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}><b style={{ color: TONE[p.g.tone][0] }}><Bi hi={p.g.head.hi} en={p.g.head.en} /></b> — <Bi hi={p.g.body.hi} en={p.g.body.en} /></div>
                </div>
              ))}
            </section>
          )}

          {/* four areas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            {DOMAINS.map(dm => (
              <section key={dm.key} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '15px', margin: 0 }}>{dm.g} <Bi hi={dm.t.hi} en={dm.t.en} /></h3>
                  <StarMeter stars={f.main.stars[dm.i]} />
                </div>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.75, color: 'var(--color-text-secondary)' }}><Bi hi={f.main.text[dm.key].hi} en={f.main.text[dm.key].en} /></p>
                {f.second && (
                  <p style={{ margin: '8px 0 0', fontSize: '13px', lineHeight: 1.65, color: 'var(--color-text-tertiary)' }}>
                    <b><Bi hi={`${fmt(f.second.from)} के बाद: `} en={`After ${fmt(f.second.from)}: `} /></b>
                    <Bi hi={f.second.text[dm.key].hi} en={f.second.text[dm.key].en} />
                  </p>
                )}
              </section>
            ))}
          </div>

          {/* tip + colour + mantra */}
          <section style={{ ...card, marginBottom: '12px', background: 'var(--color-background-info)' }}>
            <h3 style={{ fontSize: '15px', margin: '0 0 6px', color: 'var(--color-text-info)' }}><Bi hi="आज का एक काम" en="One thing for today" /></h3>
            <p style={{ margin: '0 0 8px', fontSize: '15px', lineHeight: 1.75, color: 'var(--color-text-primary)' }}><Bi hi={f.main.text.tip.hi} en={f.main.text.tip.en} /></p>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)' }}>
              <b><Bi hi={`${ctx.vaar.hi} (${ctx.vaar.planet.hi}): `} en={`${ctx.vaar.en} (${ctx.vaar.planet.en}): `} /></b><Bi hi={ctx.vaar.tip.hi} en={ctx.vaar.tip.en} />
              {' · '}<Bi hi="शुभ रंग: " en="Colour: " /><b><Bi hi={ctx.upay.color[0]} en={ctx.upay.color[1]} /></b>
              {' · '}<Bi hi="मंत्र: " en="Mantra: " /><b>{ctx.upay.mantra}</b>
            </p>
          </section>

          {/* timing */}
          <section style={{ ...card, marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', margin: '0 0 6px' }}><Bi hi="आज का समय (दिल्ली)" en="Timings today (Delhi)" /></h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px', fontSize: '14px' }}>
              <div><small style={{ display: 'block', color: 'var(--color-text-tertiary)' }}><Bi hi="अभिजित मुहूर्त (शुभ)" en="Abhijit muhurta (good)" /></small><b style={{ color: 'var(--color-text-success)' }}>{fmt(ctx.abhijit.from)} – {fmt(ctx.abhijit.to)}</b></div>
              <div><small style={{ display: 'block', color: 'var(--color-text-tertiary)' }}><Bi hi="राहुकाल (टालें)" en="Rahu Kaal (avoid)" /></small><b style={{ color: 'var(--color-text-danger)' }}>{fmt(ctx.rahukaal.from)} – {fmt(ctx.rahukaal.to)}</b></div>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '12px' }}><Link href="/panchang" style={{ color: 'var(--color-text-info)' }}><Bi hi="अपने शहर के लिए पूरा पंचांग →" en="Full panchang for your city →" /></Link></p>
          </section>

          {/* sky */}
          <section style={{ ...card, marginBottom: '12px', fontSize: '14px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
            <h3 style={{ fontSize: '15px', margin: '0 0 6px', color: 'var(--color-text-primary)' }}><Bi hi="आज का आकाश" en="Today’s sky" /></h3>
            <div><b><Bi hi="चंद्रमा: " en="Moon: " /></b><Bi hi={f.parts.map(p => `${RASHIS[p.moonSign].hi}${p.to < 1440 ? ` (${fmt(p.to)} तक)` : ''}`).join(' → ')} en={f.parts.map(p => `${RASHIS[p.moonSign].en}${p.to < 1440 ? ` (until ${fmt(p.to)})` : ''}`).join(' → ')} /></div>
            <div><b><Bi hi="तिथि: " en="Tithi: " /></b><Bi hi={`${ctx.tithi.paksha === 'shukla' ? 'शुक्ल' : 'कृष्ण'} ${ctx.tithi.hi} (${when(ctx.tithi.end)} तक) — ${TITHI_CAT_NOTE[ctx.tithi.cat].name.hi}: ${TITHI_CAT_NOTE[ctx.tithi.cat].t.hi}`} en={`${ctx.tithi.paksha === 'shukla' ? 'Shukla' : 'Krishna'} ${ctx.tithi.en} (until ${when(ctx.tithi.end)}) — ${TITHI_CAT_NOTE[ctx.tithi.cat].name.en}: ${TITHI_CAT_NOTE[ctx.tithi.cat].t.en}`} /></div>
            <div><b><Bi hi="नक्षत्र: " en="Nakshatra: " /></b><Bi hi={`${ctx.nakshatra.hi} (${when(ctx.nakshatra.end)} तक) — ${NAK_CAT_NOTE[ctx.nakshatra.cat].name.hi}: ${NAK_CAT_NOTE[ctx.nakshatra.cat].t.hi}`} en={`${ctx.nakshatra.en} (until ${when(ctx.nakshatra.end)}) — ${NAK_CAT_NOTE[ctx.nakshatra.cat].name.en}: ${NAK_CAT_NOTE[ctx.nakshatra.cat].t.en}`} /></div>
          </section>
        </>
      )}

      <div style={{ ...card, marginBottom: '12px', background: 'var(--color-background-info)' }}>
        <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--color-text-info)', lineHeight: 1.6 }}><Bi hi="यह आपकी राशि वाले सभी लोगों के लिए सामान्य राशिफल है। अपनी कुंडली के हिसाब से निजी गोचर जानना चाहें तो AI से पूछें।" en="This is a general reading for everyone of this sign. For a transit reading based on your own kundli, ask the AI." /></p>
        <Link href="/login" className="pub-btn pub-btn-gold" style={{ minHeight: '42px', fontSize: '14px' }}>💬 <Bi hi="अपनी कुंडली पर AI से पूछें" en="Ask the AI about your kundli" /></Link>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: 1.7 }}><Bi hi="राशिफल चंद्र गोचर पर आधारित सामान्य मार्गदर्शन है — चिकित्सा, कानूनी या वित्तीय सलाह नहीं।" en="The horoscope is general guidance based on the Moon’s transit — not medical, legal or financial advice." /></p>
      <p style={{ margin: '0 0 10px', fontSize: '14px' }}><Link href={`/rashi/${r.slug}`} style={{ color: 'var(--color-text-info)' }}><Bi hi={`→ ${r.hi} राशि का पूरा गाइड`} en={`→ Full ${r.en} guide`} /></Link></p>
      <nav aria-label="Prev next" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
        <Link href={`/rashifal/${prev.slug}?d=${ctx.iso}`} style={{ color: 'var(--color-text-secondary)' }}>← {prev.sym} <Bi hi={prev.hi} en={prev.en} /></Link>
        <Link href={`/rashifal/${next.slug}?d=${ctx.iso}`} style={{ color: 'var(--color-text-secondary)' }}><Bi hi={next.hi} en={next.en} /> {next.sym} →</Link>
      </nav>
    </PublicShell>
  );
}

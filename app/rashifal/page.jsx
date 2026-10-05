import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import StarMeter from '@/components/StarMeter';
import { RASHIS, VAAR } from '@/lib/public-content';
import { getDailyContext, buildRashifal } from '@/lib/rashifal';

export const revalidate = 900;   // re-built at most every 15 min; stale copy is served while it refreshes

export const metadata = {
  title: 'आज का राशिफल — सभी 12 राशियाँ | Daily Horoscope (Rashifal) Today',
  description: 'चंद्र गोचर और आज की तिथि के आधार पर मेष से मीन तक सभी 12 राशियों का आज का राशिफल। Today’s Vedic horoscope for all 12 moon signs, based on the Moon’s transit.',
  alternates: { canonical: '/rashifal' },
};

export const fmtDate = (iso, weekday) => {
  const d = new Date(iso + 'T00:00:00Z');
  return { hi: `${VAAR[weekday].hi}, ${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`, en: `${VAAR[weekday].en}, ${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}` };
};

export default async function RashifalIndex() {
  const ctx = await getDailyContext();
  const date = fmtDate(ctx.iso, ctx.weekday);
  return (
    <PublicShell>
      <PageHero glyph="♈"
        title={<><Bi hi="आज का राशिफल" en="Today’s horoscope" /></>}
        sub={<><Bi hi={date.hi} en={date.en} /></>} />

      {ctx.ok ? (
        <p style={{ ...card, margin: '0 0 14px', fontSize: '13px', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
          <Bi hi={`आज चंद्रमा ${RASHIS[ctx.moonAmSign].hi} राशि में है${ctx.moonPmSign !== ctx.moonAmSign ? `, और शाम तक ${RASHIS[ctx.moonPmSign].hi} में आ जाएगा` : ''} · नक्षत्र: ${ctx.moonNakshatra} · तिथि: ${ctx.paksha === 'shukla' ? 'शुक्ल' : 'कृष्ण'} ${ctx.tithi.hi}`}
              en={`The Moon is in ${RASHIS[ctx.moonAmSign].en}${ctx.moonPmSign !== ctx.moonAmSign ? ` and moves into ${RASHIS[ctx.moonPmSign].en} by evening` : ''} · Nakshatra: ${ctx.moonNakshatra} · Tithi: ${ctx.paksha === 'shukla' ? 'Shukla' : 'Krishna'} ${ctx.tithi.en}`} />
        </p>
      ) : (
        <p style={{ ...card, margin: '0 0 14px', fontSize: '13px', color: 'var(--color-text-warning)' }}>
          <Bi hi="आज का आकाशीय डेटा अभी लोड नहीं हो पाया। कुछ देर बाद दोबारा देखें — तब तक राशि गाइड पढ़ें।" en="Today’s sky data could not be loaded just now. Please check back shortly — meanwhile read the rashi guide." />
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
        {RASHIS.map(r => {
          const f = ctx.ok ? buildRashifal(r.slug, ctx) : null;
          return (
            <Link key={r.slug} href={ctx.ok ? `/rashifal/${r.slug}` : `/rashi/${r.slug}`} style={{ ...card, textDecoration: 'none', display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.sym} <Bi hi={r.hi} en={r.en} /></span>
                {f && <StarMeter stars={f.stars} />}
              </div>
              {f && <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: 1.5 }}><Bi hi={f.g1.head.hi} en={f.g1.head.en} /></div>}
            </Link>
          );
        })}
      </div>

      <section style={{ ...card, marginTop: '16px' }}>
        <h2 style={{ fontSize: '15px', margin: '0 0 6px', color: 'var(--color-text-primary)' }}><Bi hi="यह राशिफल कैसे बनता है?" en="How is this horoscope made?" /></h2>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)' }}>
          <Bi hi="हम रोज़ आकाश में चंद्रमा की असल स्थिति निकालते हैं और देखते हैं कि वह आपकी राशि से कौन से भाव में है (चंद्र गोचर)। इसी से दिन का सामान्य रुझान बनता है। ये सभी एक ही राशि वाले लोगों के लिए सामान्य संकेत हैं; आपकी निजी कुंडली, दशा और बाकी ग्रह अलग तस्वीर दे सकते हैं।"
              en="Every day we calculate the Moon’s real position and see which house it falls in from your rashi (Chandra gochar). That gives the day’s general tone. These are general pointers for everyone of a sign; your personal kundli, dasha and the other planets can paint a different picture." />
        </p>
      </section>
      <p style={{ marginTop: '14px', fontSize: '14px' }}><Link href="/rashi" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ राशि गाइड पढ़ें" en="→ Read the rashi guide" /></Link></p>
    </PublicShell>
  );
}

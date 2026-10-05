import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import StarMeter from '@/components/StarMeter';
import { RASHIS, rashiBySlug } from '@/lib/public-content';
import { getDailyContext, buildRashifal } from '@/lib/rashifal';
import { fmtDate } from '../page';

export const revalidate = 900;

export async function generateMetadata({ params }) {
  const { sign } = await params;
  const r = rashiBySlug(sign);
  if (!r) return {};
  return {
    title: `${r.hi} राशिफल आज | ${r.en} (${r.sym}) Daily Horoscope Today`,
    description: `आज का ${r.hi} राशिफल — चंद्र गोचर, तिथि और नक्षत्र के आधार पर। Today’s ${r.en} horoscope based on the Moon’s transit.`,
    alternates: { canonical: `/rashifal/${r.slug}` },
  };
}

export default async function RashifalSign({ params }) {
  const { sign } = await params;
  const r = rashiBySlug(sign);
  if (!r) notFound();
  const ctx = await getDailyContext();
  const f = buildRashifal(r.slug, ctx);
  const date = fmtDate(ctx.iso, ctx.weekday);
  return (
    <PublicShell>
      <PageHero glyph={r.sym}
        title={<><Bi hi={`${r.hi} राशिफल — आज`} en={`${r.en} horoscope — today`} /></>}
        sub={<><Bi hi={date.hi} en={date.en} /></>} />
      <p style={{ margin: '0 0 4px', fontSize: '12px' }}><Link href="/rashifal" style={{ color: 'var(--color-text-info)' }}><Bi hi="← सभी राशियाँ" en="← All signs" /></Link></p>

      {!f ? (
        <p style={{ ...card, fontSize: '14px', color: 'var(--color-text-warning)' }}><Bi hi="आज का डेटा अभी लोड नहीं हो पाया। कुछ देर बाद दोबारा देखें।" en="Today’s data could not be loaded just now. Please check back shortly." /></p>
      ) : (
        <>
          <section style={{ ...card, marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '17px', margin: 0, color: 'var(--color-text-primary)' }}><Bi hi={f.g1.head.hi} en={f.g1.head.en} /></h2>
              <StarMeter stars={f.stars} />
            </div>
            <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
              {f.g2 && <b style={{ color: 'var(--color-text-primary)' }}><Bi hi="सुबह/दिन: " en="Morning / daytime: " /></b>}
              <Bi hi={f.g1.body.hi} en={f.g1.body.en} />
            </p>
            {f.g2 && (
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
                <b style={{ color: 'var(--color-text-primary)' }}><Bi hi="शाम के बाद: " en="After evening: " /></b>
                <Bi hi={f.g2.body.hi} en={f.g2.body.en} />
              </p>
            )}
          </section>

          <section style={{ ...card, marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', margin: '0 0 6px', color: 'var(--color-text-primary)' }}><Bi hi={`${f.vaar.hi} का सुझाव`} en={`${f.vaar.en}’s tip`} /> · <Bi hi={f.vaar.planet.hi} en={f.vaar.planet.en} /></h2>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.75, color: 'var(--color-text-secondary)' }}><Bi hi={f.vaar.tip.hi} en={f.vaar.tip.en} /></p>
          </section>

          <section style={{ ...card, marginBottom: '12px', fontSize: '13px', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
            <b style={{ color: 'var(--color-text-primary)' }}><Bi hi="आज का आकाश: " en="Today’s sky: " /></b>
            <Bi hi={`चंद्रमा ${RASHIS[ctx.moonAmSign].hi} राशि में (आपकी राशि से ${f.house}वें भाव में), नक्षत्र ${ctx.moonNakshatra}, तिथि ${ctx.paksha === 'shukla' ? 'शुक्ल' : 'कृष्ण'} ${ctx.tithi.hi}।`}
                en={`Moon in ${RASHIS[ctx.moonAmSign].en} (house ${f.house} from your sign), nakshatra ${ctx.moonNakshatra}, tithi ${ctx.paksha === 'shukla' ? 'Shukla' : 'Krishna'} ${ctx.tithi.en}.`} />
          </section>
        </>
      )}

      <div style={{ ...card, marginBottom: '12px', background: 'var(--color-background-info)' }}>
        <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--color-text-info)', lineHeight: 1.6 }}><Bi hi="यह आपकी राशि वाले सभी लोगों के लिए सामान्य राशिफल है। अपनी कुंडली के हिसाब से निजी गोचर जानना चाहें तो AI से पूछें।" en="This is a general reading for everyone of this sign. For a transit reading based on your own kundli, ask the AI." /></p>
        <Link href="/login" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-info)' }}><Bi hi="→ अपनी कुंडली बनाएँ" en="→ Create your kundli" /></Link>
      </div>
      <p style={{ margin: 0, fontSize: '14px' }}><Link href={`/rashi/${r.slug}`} style={{ color: 'var(--color-text-info)' }}><Bi hi={`→ ${r.hi} राशि का पूरा गाइड`} en={`→ Full ${r.en} guide`} /></Link></p>
    </PublicShell>
  );
}

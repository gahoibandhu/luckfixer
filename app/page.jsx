import Link from 'next/link';
import PublicShell from '@/components/PublicShell';
import Bi from '@/components/Bi';
import StarMeter from '@/components/StarMeter';
import AuthRedirect from '@/components/AuthRedirect';
import { RASHIS } from '@/lib/public-content';
import { buildPanchang, inRange } from '@/lib/panchang-engine';
import { CITIES, fmt } from '@/lib/panchang';
import { getDailyContext, buildRashifal, todayIST } from '@/lib/rashifal';
import { gitaOfDay } from '@/lib/gita';
import { BRAND } from '@/lib/brand';

export const revalidate = 900;

export const metadata = {
  title: `${BRAND.name} — आज का पंचांग, राशिफल और AI ज्योतिष चैट | Daily Panchang, Horoscope & AI Astro Chat`,
  description: 'आज का पंचांग, राहुकाल, राशिफल, मेरी राशि, अंक ज्योतिष, साढ़ेसाती, राम शलाका — सब बिना लॉगिन। अपनी कुंडली पर AI से सीधे पूछें। Free Vedic astrology tools in Hindi and English.',
  alternates: { canonical: '/' },
  openGraph: { title: `${BRAND.name} — Vedic astrology, in plain words`, description: 'Daily panchang, horoscope and free Vedic astrology tools — plus an AI chat that knows your kundli.', type: 'website' },
};

const TOOLS = [
  { href: '/panchang', g: '☽', hi: 'आज का पंचांग', en: 'Daily panchang', dh: 'तिथि, नक्षत्र, योग, राहुकाल, चौघड़िया — अपने शहर के हिसाब से।', de: 'Tithi, nakshatra, yoga, Rahu Kaal, choghadiya — for your city.' },
  { href: '/meri-rashi', g: '♈', hi: 'मेरी राशि कौन सी है?', en: 'Find my rashi', dh: 'जन्म विवरण से चंद्र राशि, नक्षत्र और नामाक्षर।', de: 'Moon sign, nakshatra and name letter from your birth details.' },
  { href: '/moolank', g: '☉', hi: 'मूलांक और भाग्यांक', en: 'Moolank & Bhagyank', dh: 'जन्म तिथि से अंक, उनका स्वभाव और लो शू ग्रिड।', de: 'Your numbers, their temperament and the Lo Shu grid.' },
  { href: '/sade-sati', g: '♄', hi: 'साढ़ेसाती / ढैया', en: 'Sade Sati / Dhaiya', dh: 'शनि के असली गोचर से तारीखें।', de: 'Dates from Saturn’s actual transit.' },
  { href: '/manglik', g: '♂', hi: 'मांगलिक जाँच', en: 'Manglik check', dh: 'मंगल लग्न और चंद्रमा से किस भाव में है।', de: 'Which house Mars holds from Lagna and Moon.' },
  { href: '/vrat-calendar', g: '☊', hi: 'व्रत कैलेंडर', en: 'Vrat calendar', dh: 'एकादशी, पूर्णिमा, अमावस्या, प्रदोष और संक्रांति।', de: 'Ekadashi, Purnima, Amavasya, Pradosh and Sankranti.' },
  { href: '/ram-shalaka', g: '🕉', hi: 'राम शलाका', en: 'Ram Shalaka', dh: 'मन में प्रश्न रखकर रामचरितमानस से उत्तर।', de: 'Hold a question in mind and receive a Ramcharitmanas answer.' },
  { href: '/gita-shlok', g: '☸', hi: 'आज का गीता श्लोक', en: 'Gita verse of the day', dh: 'रोज़ एक श्लोक, सरल अर्थ के साथ।', de: 'One verse a day with a simple meaning.' },
];

const FAQ = [
  { q: { hi: 'पंचांग कितना सटीक है?', en: 'How accurate is the panchang?' },
    a: { hi: 'तिथि, नक्षत्र, योग और करण के समाप्ति-समय स्विस एफेमेरिस (लाहिड़ी अयनांश) से निकाले जाते हैं और अपने शहर के सूर्योदय के हिसाब से चुने जाते हैं। हमने इन्हें प्रकाशित दिल्ली पंचांग से मिलाकर देखा है; आम तौर पर फ़र्क़ एक-दो मिनट से ज़्यादा नहीं होता। व्रत-त्योहार के लिए स्थानीय पंचांग से भी मिलान कर लें।', en: 'Tithi, nakshatra, yoga and karana end-times come from the Swiss Ephemeris (Lahiri ayanamsa) and are picked by your city’s own sunrise. We checked them against a published Delhi panchang; the difference is normally a minute or two. For fasts and festivals, also confirm with your local almanac.' } },
  { q: { hi: 'राशिफल कैसे बनता है?', en: 'How is the horoscope made?' },
    a: { hi: 'हम रोज़ चंद्रमा की असली स्थिति निकालते हैं और देखते हैं कि वह आपकी राशि से कौन से भाव में है (चंद्र गोचर)। यह सभी एक राशि वालों के लिए सामान्य संकेत है — निजी फल पूरी कुंडली पर निर्भर करते हैं।', en: 'Every day we calculate the Moon’s real position and see which house it falls in from your rashi (Chandra gochar). It is a general pointer for everyone of a sign — personal results depend on your full kundli.' } },
  { q: { hi: 'क्या मेरा जन्म-विवरण सहेजा जाता है?', en: 'Is my birth data saved?' },
    a: { hi: 'इन मुफ़्त टूल में नहीं। जन्म तिथि, समय और स्थान सिर्फ़ गणना के लिए इस्तेमाल होते हैं और सहेजे नहीं जाते। कुंडली तभी सहेजी जाती है जब आप लॉगिन करके खुद बनाएँ।', en: 'Not in these free tools. Birth date, time and place are used only for the calculation and are not stored. A kundli is saved only when you log in and create one yourself.' } },
  { q: { hi: 'AI चैट क्या है?', en: 'What is the AI chat?' },
    a: { hi: 'आप अपनी कुंडली बनाकर उसी पर सवाल पूछ सकते हैं — करियर, रिश्ते, दशा, उपाय। ग्रहों की गणना सॉफ़्टवेयर करता है, AI केवल उसे सरल भाषा में समझाता है। यह मार्गदर्शन है, गारंटी नहीं।', en: 'You create your kundli and ask questions on it — career, relationships, dasha, remedies. Software does the planetary calculation; the AI only explains it in plain words. It is guidance, not a guarantee.' } },
  { q: { hi: 'क्या यह चिकित्सा या वित्तीय सलाह है?', en: 'Is this medical or financial advice?' },
    a: { hi: 'नहीं। ज्योतिष सामान्य मार्गदर्शन है। स्वास्थ्य, कानून और पैसों के फैसले योग्य विशेषज्ञ की सलाह से लें।', en: 'No. Astrology here is general guidance. Take health, legal and money decisions with a qualified professional.' } },
];

export default async function Home() {
  const { iso, weekday } = todayIST();
  const [y, m, d] = iso.split('-').map(Number);
  const delhi = CITIES[0];
  const pc = inRange(y) ? buildPanchang(y, m, d, delhi) : null;
  const ctx = await getDailyContext();
  const gita = gitaOfDay(iso);
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q.en, acceptedAnswer: { '@type': 'Answer', text: f.a.en } })) };

  return (
    <PublicShell flush>
      <AuthRedirect />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <section className="pub-hero">
        <div className="pub-wrap pub-hero-grid">
          <div>
            <h1><Bi hi="आज का आकाश, सीधी भाषा में" en="Today’s sky, in plain words" /></h1>
            <p style={{ margin: '0 0 22px', color: '#c9d1ee', fontSize: '17px', maxWidth: '34em' }}>
              <Bi hi="रोज़ का पंचांग, राशिफल और मुफ़्त वैदिक ज्योतिष टूल — बिना लॉगिन। अपनी कुंडली पर सवाल पूछना हो तो AI तैयार है।"
                  en="Daily panchang, horoscope and free Vedic astrology tools — no login. When you want to ask about your own kundli, the AI is ready." />
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link href="/panchang" className="pub-btn pub-btn-gold"><Bi hi="आज का पंचांग देखें" en="See today’s panchang" /></Link>
              <Link href="/meri-rashi" className="pub-btn pub-btn-line"><Bi hi="अपनी राशि पता करें" en="Find your rashi" /></Link>
            </div>
            <p style={{ margin: '14px 0 0', fontSize: '14px' }}><Link href="/login" style={{ color: '#f6d58a' }}><Bi hi="अपनी कुंडली पर AI से पूछें →" en="Ask the AI about your own kundli →" /></Link></p>
          </div>

          <div className="pub-sky" aria-label="Today’s sky">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <b style={{ fontSize: '16px' }}><Bi hi="आज का आकाश" en="Today’s sky" /></b>
              <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>{d}/{m}/{y} · <Bi hi={delhi.hi} en={delhi.en} /></span>
            </div>
            {pc ? (
              <dl>
                <div className="row"><dt><Bi hi="तिथि" en="Tithi" /></dt><dd><Bi hi={`${pc.tithi[0].label.paksha === 'shukla' ? 'शुक्ल' : 'कृष्ण'} ${pc.tithi[0].label.hi}`} en={`${pc.tithi[0].label.paksha === 'shukla' ? 'Shukla' : 'Krishna'} ${pc.tithi[0].label.en}`} /></dd></div>
                <div className="row"><dt><Bi hi="नक्षत्र" en="Nakshatra" /></dt><dd><Bi hi={pc.nakshatra[0].label.hi} en={pc.nakshatra[0].label.en} /></dd></div>
                <div className="row"><dt><Bi hi="चंद्र राशि" en="Moon sign" /></dt><dd><Bi hi={pc.moonSign[0].label.hi} en={pc.moonSign[0].label.en} /></dd></div>
                <div className="row"><dt><Bi hi="राहुकाल" en="Rahu Kaal" /></dt><dd style={{ color: 'var(--color-text-danger)' }}>{fmt(pc.rahukaal.from)} – {fmt(pc.rahukaal.to)}</dd></div>
                <div className="row"><dt><Bi hi="सूर्योदय / सूर्यास्त" en="Sunrise / Sunset" /></dt><dd>{fmt(pc.sunrise)} / {fmt(pc.sunset)}</dd></div>
              </dl>
            ) : <p style={{ margin: 0, fontSize: '14px' }}><Bi hi="आज का डेटा अभी उपलब्ध नहीं है।" en="Today’s data is not available right now." /></p>}
            <Link href="/panchang" style={{ display: 'block', marginTop: '10px', fontSize: '14px', color: 'var(--color-text-info)', fontWeight: 600 }}><Bi hi="पूरा पंचांग, अपने शहर के साथ →" en="Full panchang for your city →" /></Link>
          </div>
        </div>
      </section>

      <div className="pub-wrap">
        <section className="pub-section">
          <h2 className="display"><Bi hi="आज का राशिफल" en="Today’s horoscope" /></h2>
          <p className="lead"><Bi hi="चंद्रमा की आज की असली स्थिति के आधार पर, अपनी राशि चुनें।" en="Based on where the Moon actually is today — pick your sign." /></p>
          <div className="pub-rashi-grid">
            {RASHIS.map(r => {
              const f = ctx.ok ? buildRashifal(r.slug, ctx) : null;
              return (
                <Link key={r.slug} href={ctx.ok ? `/rashifal/${r.slug}` : `/rashi/${r.slug}`} className="pub-rashi">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: '16px' }}>{r.sym} <Bi hi={r.hi} en={r.en} /></b>
                    {f && <StarMeter stars={f.stars} />}
                  </div>
                  {f && <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: 1.45 }}><Bi hi={f.g1.head.hi} en={f.g1.head.en} /></div>}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="pub-section">
          <h2 className="display"><Bi hi="मुफ़्त ज्योतिष टूल" en="Free astrology tools" /></h2>
          <p className="lead"><Bi hi="सब बिना लॉगिन, आपका डेटा सहेजे बिना।" en="All without login, and without saving your data." /></p>
          <div className="pub-tools">
            {TOOLS.map(t => (
              <Link key={t.href} href={t.href} className="pub-tool">
                <span className="pub-glyph" aria-hidden="true">{t.g}</span>
                <span><b><Bi hi={t.hi} en={t.en} /></b><span className="d"><Bi hi={t.dh} en={t.de} /></span></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="pub-section">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '16px', padding: '20px' }}>
              <h2 className="display" style={{ fontSize: '20px', margin: '0 0 4px' }}><Bi hi="अपनी कुंडली से बात करें" en="Talk to your kundli" /></h2>
              <p style={{ margin: '0 0 14px', color: 'var(--color-text-secondary)', fontSize: '15px' }}><Bi hi="जन्म विवरण डालकर कुंडली बनाएँ, फिर करियर, रिश्ते, दशा या उपाय पर सीधे सवाल पूछें। गणना सॉफ़्टवेयर की, समझाना AI का।" en="Create your kundli from your birth details, then ask about career, relationships, dasha or remedies. The software does the calculation; the AI does the explaining." /></p>
              <div style={{ background: 'var(--color-background-secondary)', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', marginBottom: '14px', lineHeight: 1.6 }}>
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: '12px', marginBottom: '4px' }}><Bi hi="एक सवाल का उदाहरण" en="Example question" /></div>
                <Bi hi="“मेरी चल रही दशा नौकरी बदलने के लिए कैसी है?”" en="“How is my running dasha for changing jobs?”" />
              </div>
              <Link href="/login" className="pub-btn pub-btn-gold"><Bi hi="कुंडली बनाएँ और पूछें" en="Create kundli and ask" /></Link>
            </div>
            <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '16px', padding: '20px' }}>
              <h2 className="display" style={{ fontSize: '20px', margin: '0 0 4px' }}><Bi hi="आज का गीता श्लोक" en="Gita verse of the day" /> <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>{gita.ref}</span></h2>
              <p style={{ margin: '10px 0', fontSize: '17px', lineHeight: 1.9, whiteSpace: 'pre-line' }}>{gita.sa}</p>
              <p style={{ margin: '0 0 10px', fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}><Bi hi={gita.hi} en={gita.en} /></p>
              <Link href="/gita-shlok" style={{ fontSize: '14px', color: 'var(--color-text-info)', fontWeight: 600 }}><Bi hi="पूरा पढ़ें →" en="Read more →" /></Link>
            </div>
          </div>
        </section>

        <section className="pub-section pub-faq">
          <h2 className="display"><Bi hi="अक्सर पूछे जाने वाले सवाल" en="Common questions" /></h2>
          <div style={{ marginTop: '12px' }}>
            {FAQ.map((f, i) => <details key={i}><summary><Bi hi={f.q.hi} en={f.q.en} /></summary><p><Bi hi={f.a.hi} en={f.a.en} /></p></details>)}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}

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
  title: `${BRAND.name} — अपनी कुंडली से AI चैट | AI Vedic Astrology Chat, Panchang & Horoscope`,
  description: 'अपनी कुंडली बनाकर AI से करियर, रिश्ते, दशा और उपाय पर पूछें। साथ में आज का पंचांग, राहुकाल, राशिफल और मुफ़्त ज्योतिष टूल — हिंदी और English में। Chat with an AI about your own kundli; free panchang and horoscope tools.',
  alternates: { canonical: '/' },
  openGraph: { title: `${BRAND.name} — Vedic astrology, in plain words`, description: 'Daily panchang, horoscope and free Vedic astrology tools — plus an AI chat that knows your kundli.', type: 'website' },
};

const TOOLS = [
  { href: '/panchang', g: '☽', hi: 'आज का पंचांग', en: 'Daily panchang', dh: 'तिथि, नक्षत्र, योग, राहुकाल, चौघड़िया — अपने शहर के हिसाब से।', de: 'Tithi, nakshatra, yoga, Rahu Kaal, choghadiya — for your city.' },
  { href: '/meri-rashi', g: '♈', hi: 'मेरी राशि कौन सी है?', en: 'Find my rashi', dh: 'जन्म विवरण से चंद्र राशि, नक्षत्र और नामाक्षर।', de: 'Moon sign, nakshatra and name letter from your birth details.' },
  { href: '/moolank', g: '☉', hi: 'मूलांक और भाग्यांक', en: 'Moolank & Bhagyank', dh: 'जन्म तिथि से अंक, उनका स्वभाव और लो शू ग्रिड।', de: 'Your numbers, their temperament and the Lo Shu grid.' },
  { href: '/sade-sati', g: '♄', hi: 'साढ़ेसाती / ढैया', en: 'Sade Sati / Dhaiya', dh: 'शनि के असली गोचर से तारीखें।', de: 'Dates from Saturn’s actual transit.' },
  { href: '/manglik', g: '♂', hi: 'मांगलिक जाँच', en: 'Manglik check', dh: 'मंगल लग्न और चंद्रमा से किस भाव में है।', de: 'Which house Mars holds from Lagna and Moon.' },
  { href: '/tyohar', g: '🎆', hi: 'त्योहार कैलेंडर', en: 'Festival calendar', dh: 'दीपावली, होली, नवरात्रि और अन्य पर्व, तिथि के साथ।', de: 'Diwali, Holi, Navratri and more, with tithi timings.' },
  { href: '/vrat', g: '🙏', hi: 'व्रत विधि और कथा', en: 'Vrat vidhi & katha', dh: 'एकादशी, पूर्णिमा, प्रदोष की पूजा विधि और कथा।', de: 'Puja vidhi and katha for Ekadashi, Purnima, Pradosh.' },
  { href: '/aarti', g: '🪔', hi: 'आरती और चालीसा', en: 'Aarti & Chalisa', dh: 'हनुमान चालीसा और प्रमुख आरतियाँ, बड़े अक्षरों में।', de: 'Hanuman Chalisa and major aartis, in large type.' },
  { href: '/vrat-calendar', g: '☊', hi: 'व्रत कैलेंडर', en: 'Vrat calendar', dh: 'एकादशी, पूर्णिमा, अमावस्या, प्रदोष और संक्रांति।', de: 'Ekadashi, Purnima, Amavasya, Pradosh and Sankranti.' },
  { href: '/tyohar', g: '🪔', hi: 'त्योहार कैलेंडर', en: 'Festival calendar', dh: 'व्रत-त्योहार तिथि के सटीक समय के साथ।', de: 'Festivals with exact tithi timings.' },
  { href: '/vrat', g: '☊', hi: 'व्रत विधि और कथा', en: 'Vrat vidhi & katha', dh: 'एकादशी, पूर्णिमा, अमावस्या, प्रदोष की पूजा।', de: 'Puja for Ekadashi, Purnima, Amavasya, Pradosh.' },
  { href: '/aarti', g: '🔱', hi: 'आरती और चालीसा', en: 'Aarti & Chalisa', dh: 'हनुमान चालीसा और प्रमुख आरतियाँ, बड़े अक्षरों में।', de: 'Hanuman Chalisa and main aartis in large type.' },
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

const ASK = [
  { t: { hi: 'करियर', en: 'Career' }, q: { hi: 'मेरी चल रही दशा में नौकरी बदलना कैसा रहेगा?', en: 'Is my running dasha good for changing jobs?' } },
  { t: { hi: 'रिश्ते', en: 'Relationships' }, q: { hi: 'मेरी कुंडली में विवाह का योग कब बनता है?', en: 'When do marriage yogas show up in my kundli?' } },
  { t: { hi: 'दशा', en: 'Dasha' }, q: { hi: 'मेरी महादशा और अंतर्दशा का सार क्या है?', en: 'What is the gist of my mahadasha and antardasha?' } },
  { t: { hi: 'गोचर', en: 'Transit' }, q: { hi: 'आज का गोचर मेरी कुंडली पर कैसा असर डाल रहा है?', en: 'How is today’s transit affecting my kundli?' } },
  { t: { hi: 'उपाय', en: 'Remedies' }, q: { hi: 'मेरे लिए कौन-से सरल उपाय ठीक रहेंगे?', en: 'Which simple remedies suit my chart?' } },
  { t: { hi: 'पैसा', en: 'Money' }, q: { hi: 'मेरी कुंडली में धन के भाव कैसे हैं?', en: 'How do the wealth houses look in my kundli?' } },
];

export default async function Home() {
  const { iso } = todayIST();
  const [y, m, d] = iso.split('-').map(Number);
  const delhi = CITIES[0];
  const pc = inRange(y) ? buildPanchang(y, m, d, delhi) : null;
  const ctx = await getDailyContext();
  const gita = gitaOfDay(iso);
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q.en, acceptedAnswer: { '@type': 'Answer', text: f.a.en } })) };
  const appLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: BRAND.name, applicationCategory: 'LifestyleApplication', operatingSystem: 'Web', inLanguage: ['hi', 'en'], description: 'AI chat on your own Vedic kundli, plus free daily panchang, horoscope and astrology tools.' };

  return (
    <PublicShell flush>
      <AuthRedirect />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, appLd]) }} />

      {/* HERO — the AI chat is the product; everything else supports it */}
      <section className="pub-hero">
        <div className="pub-wrap pub-hero-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND.logo} alt={BRAND.name} width="72" height="72" className="pub-logo" style={{ width: 72, height: 72, borderRadius: 18, boxShadow: '0 0 0 2px rgba(240,168,28,.7), 0 10px 30px rgba(240,168,28,.25)' }} />
              <div>
                <div className="pub-brand" style={{ fontSize: '26px', lineHeight: 1.1 }}>{BRAND.name}</div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#f6d58a' }}><Bi hi="AI वैदिक ज्योतिष चैट" en="AI Vedic astrology chat" /></p>
              </div>
            </div>
            <h1><Bi hi="अपनी कुंडली से बात करें" en="Talk to your own kundli" /></h1>
            <p style={{ margin: '0 0 22px', color: '#c9d1ee', fontSize: '17px', maxWidth: '33em' }}>
              <Bi hi="जन्म विवरण डालकर एक मिनट में कुंडली बनाएँ, फिर करियर, रिश्ते, दशा और उपाय पर हिंदी या English में सीधे पूछें। ग्रहों की गणना सॉफ़्टवेयर करता है, AI उसे सरल भाषा में समझाता है।"
                  en="Create your kundli from your birth details in a minute, then ask about career, relationships, dasha and remedies in Hindi or English. Software does the planetary calculation; the AI explains it in plain words." />
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link href="/login" className="pub-btn pub-btn-gold" style={{ minHeight: '52px', fontSize: '16px' }}>💬 <Bi hi="लॉगिन करके चैट करें" en="Log in and chat" /></Link>
              <Link href="/tools" className="pub-btn pub-btn-line"><Bi hi="मुफ़्त टूल देखें" en="Free tools" /></Link>
            </div>
            <ul style={{ margin: '16px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: '14px', color: '#c9d1ee' }}>
              <li>✦ <Bi hi="आपकी असली कुंडली पर आधारित" en="Based on your real chart" /></li>
              <li>✦ <Bi hi="हिंदी + English" en="Hindi + English" /></li>
              <li>✦ <Bi hi="दशा, गोचर और उपाय" en="Dasha, transit and remedies" /></li>
            </ul>
          </div>

          <div className="pub-chat" aria-label="Chat preview">
            <div className="bar"><span className="dot" aria-hidden="true" /><b style={{ color: '#fff' }}>{BRAND.name}</b> · <Bi hi="उदाहरण बातचीत" en="Sample conversation" /></div>
            <div className="pub-bubble me"><Bi hi="मेरी चल रही दशा में नौकरी बदलना कैसा रहेगा?" en="Is my running dasha good for changing jobs?" /></div>
            <div className="pub-bubble ai">
              <Bi hi="आपकी चल रही दशा के स्वामी और करियर के भाव का रिश्ता देखकर बताया जाता है कि यह दौर बदलाव के लिए कितना अनुकूल है, और कौन-सा समय बेहतर रहेगा। साथ में एक सरल उपाय और आज करने लायक एक काम भी मिलता है।"
                  en="It looks at how the lord of your running dasha relates to your career houses, and tells you how supportive this period is for a change and which window is better. You also get one simple remedy and one thing to do today." />
              <div style={{ fontSize: '11px', color: '#8d98c9', marginTop: '6px' }}><Bi hi="* उदाहरण — आपका जवाब आपकी कुंडली के हिसाब से होगा" en="* Sample — your reply will follow your own kundli" /></div>
            </div>
            <Link href="/login" className="fake"><span><Bi hi="अपना सवाल पूछें…" en="Ask your question…" /></span><b><Bi hi="चैट शुरू करें" en="Start chat" /></b></Link>
          </div>
        </div>
      </section>

      <div className="pub-wrap">
        {/* Today's sky strip (live) */}
        <section style={{ marginTop: '-18px', position: 'relative' }}>
          {pc ? (
            <Link href="/panchang" className="pub-skybar" style={{ color: 'inherit' }}>
              <div><small><Bi hi="आज का आकाश" en="Today’s sky" /> · {d}/{m}/{y}</small><b><Bi hi={`${pc.tithi[0].label.paksha === 'shukla' ? 'शुक्ल' : 'कृष्ण'} ${pc.tithi[0].label.hi}`} en={`${pc.tithi[0].label.paksha === 'shukla' ? 'Shukla' : 'Krishna'} ${pc.tithi[0].label.en}`} /></b></div>
              <div><small><Bi hi="नक्षत्र" en="Nakshatra" /></small><b><Bi hi={pc.nakshatra[0].label.hi} en={pc.nakshatra[0].label.en} /></b></div>
              <div><small><Bi hi="चंद्र राशि" en="Moon sign" /></small><b><Bi hi={pc.moonSign[0].label.hi} en={pc.moonSign[0].label.en} /></b></div>
              <div><small><Bi hi="राहुकाल (दिल्ली)" en="Rahu Kaal (Delhi)" /></small><b style={{ color: 'var(--color-text-danger)' }}>{fmt(pc.rahukaal.from)} – {fmt(pc.rahukaal.to)}</b></div>
              <div><small><Bi hi="पूरा पंचांग →" en="Full panchang →" /></small><b>{fmt(pc.sunrise)} / {fmt(pc.sunset)}</b></div>
            </Link>
          ) : null}
        </section>

        <section className="pub-section">
          <h2 className="display"><Bi hi="चैट में आप क्या पूछ सकते हैं" en="What you can ask in the chat" /></h2>
          <p className="lead"><Bi hi="किसी भी सवाल पर टैप करें — लॉगिन के बाद चैट वहीं से शुरू होगी।" en="Tap any question — after login the chat starts right there." /></p>
          <div className="pub-ask">
            {ASK.map((a, i) => (
              <Link key={i} href="/login"><small><Bi hi={a.t.hi} en={a.t.en} /></small><Bi hi={a.q.hi} en={a.q.en} /></Link>
            ))}
          </div>
        </section>

        <section className="pub-section">
          <h2 className="display"><Bi hi="तीन कदम में शुरू करें" en="Start in three steps" /></h2>
          <div className="pub-steps" style={{ marginTop: '12px' }}>
            <div className="pub-step"><div className="n">1</div><b><Bi hi="लॉगिन करें" en="Log in" /></b><p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}><Bi hi="Google से या ईमेल के OTP से, कुछ सेकंड में।" en="With Google or an email one-time code, in seconds." /></p></div>
            <div className="pub-step"><div className="n">2</div><b><Bi hi="कुंडली बनाएँ" en="Create your kundli" /></b><p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}><Bi hi="जन्म तिथि, समय और स्थान डालें।" en="Enter date, time and place of birth." /></p></div>
            <div className="pub-step"><div className="n">3</div><b><Bi hi="पूछना शुरू करें" en="Start asking" /></b><p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}><Bi hi="करियर, रिश्ते, दशा, उपाय — जो भी मन में हो।" en="Career, relationships, dasha, remedies — whatever is on your mind." /></p></div>
          </div>
          <div style={{ marginTop: '16px' }}><Link href="/login" className="pub-btn pub-btn-gold"><Bi hi="अभी चैट शुरू करें" en="Start chatting now" /></Link></div>
        </section>

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
          <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '16px', padding: '20px', maxWidth: '640px' }}>
            <h2 className="display" style={{ fontSize: '20px', margin: '0 0 4px' }}><Bi hi="आज का गीता श्लोक" en="Gita verse of the day" /> <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>{gita.ref}</span></h2>
            <p style={{ margin: '10px 0', fontSize: '17px', lineHeight: 1.9, whiteSpace: 'pre-line' }}>{gita.sa}</p>
            <p style={{ margin: '0 0 10px', fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}><Bi hi={gita.hi} en={gita.en} /></p>
            <Link href="/gita-shlok" style={{ fontSize: '14px', color: 'var(--color-text-info)', fontWeight: 600 }}><Bi hi="पूरा पढ़ें →" en="Read more →" /></Link>
          </div>
        </section>

        <section className="pub-section pub-faq">
          <h2 className="display"><Bi hi="अक्सर पूछे जाने वाले सवाल" en="Common questions" /></h2>
          <div style={{ marginTop: '12px' }}>
            {FAQ.map((f, i) => <details key={i}><summary><Bi hi={f.q.hi} en={f.q.en} /></summary><p><Bi hi={f.a.hi} en={f.a.en} /></p></details>)}
          </div>
        </section>

        <section className="pub-section" style={{ paddingBottom: '10px' }}>
          <div className="pub-cta-band">
            <h2 className="display"><Bi hi="आपकी कुंडली आपका इंतज़ार कर रही है" en="Your kundli is waiting" /></h2>
            <p style={{ margin: '0 0 16px', color: '#c9d1ee' }}><Bi hi="लॉगिन करें, कुंडली बनाएँ और अपना पहला सवाल पूछें।" en="Log in, create your kundli and ask your first question." /></p>
            <Link href="/login" className="pub-btn pub-btn-gold" style={{ minHeight: '52px', fontSize: '16px' }}>💬 <Bi hi="लॉगिन करके चैट करें" en="Log in and chat" /></Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}

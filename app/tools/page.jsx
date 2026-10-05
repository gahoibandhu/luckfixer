import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell from '@/components/PublicShell';
import Bi from '@/components/Bi';

export const metadata = {
  title: 'सभी मुफ़्त ज्योतिष टूल | Free Vedic Astrology Tools',
  description: 'पंचांग, राशिफल, मेरी राशि, मूलांक, साढ़ेसाती, मांगलिक जाँच, व्रत कैलेंडर, राम शलाका और गीता श्लोक — सब बिना लॉगिन।',
  alternates: { canonical: '/tools' },
};

const GROUPS = [
  { hi: 'आज के लिए', en: 'For today', items: [
    { href: '/panchang', g: '☽', hi: 'आज का पंचांग', en: 'Daily panchang', dh: 'तिथि, नक्षत्र, योग, राहुकाल, चौघड़िया', de: 'Tithi, nakshatra, yoga, Rahu Kaal, choghadiya' },
    { href: '/rashifal', g: '♈', hi: 'आज का राशिफल', en: 'Daily horoscope', dh: 'चंद्र गोचर पर आधारित, 12 राशियाँ', de: 'Based on the Moon’s transit, all 12 signs' },
    { href: '/aaj-ka-upay', g: '🪔', hi: 'आज का उपाय', en: 'Today’s practice', dh: 'वार के हिसाब से सरल उपाय', de: 'A simple practice for the weekday' },
    { href: '/gita-shlok', g: '☸', hi: 'आज का गीता श्लोक', en: 'Gita verse of the day', dh: 'सरल अर्थ के साथ', de: 'With a simple meaning' } ] },
  { hi: 'अपने बारे में जानें', en: 'Know yourself', items: [
    { href: '/meri-rashi', g: '♎', hi: 'मेरी राशि और नामाक्षर', en: 'My rashi & name letter', dh: 'जन्म विवरण से चंद्र राशि, नक्षत्र, चरण', de: 'Moon sign, nakshatra, pada from birth details' },
    { href: '/moolank', g: '☉', hi: 'मूलांक, भाग्यांक, लो शू ग्रिड', en: 'Moolank, Bhagyank, Lo Shu', dh: 'जन्म तिथि से अंक और उनका स्वभाव', de: 'Your numbers and their temperament' },
    { href: '/rashi', g: '♌', hi: 'राशि गाइड', en: 'Rashi guide', dh: '12 राशियों का स्वभाव, करियर, रिश्ते', de: 'Temperament, career and relationships of 12 signs' } ] },
  { hi: 'समय और दोष', en: 'Timing & doshas', items: [
    { href: '/sade-sati', g: '♄', hi: 'साढ़ेसाती / ढैया', en: 'Sade Sati / Dhaiya', dh: 'शनि के असली गोचर से तारीखें', de: 'Dates from Saturn’s actual transit' },
    { href: '/manglik', g: '♂', hi: 'मांगलिक जाँच', en: 'Manglik check', dh: 'लग्न और चंद्रमा से मंगल का भाव', de: 'Mars house from Lagna and Moon' },
    { href: '/vrat-calendar', g: '☊', hi: 'व्रत कैलेंडर', en: 'Vrat calendar', dh: 'एकादशी, पूर्णिमा, अमावस्या, प्रदोष, संक्रांति', de: 'Ekadashi, Purnima, Amavasya, Pradosh, Sankranti' } ] },
  { hi: 'श्रद्धा', en: 'Devotion', items: [
    { href: '/ram-shalaka', g: '🕉', hi: 'राम शलाका', en: 'Ram Shalaka', dh: 'मन में प्रश्न रखकर रामचरितमानस से उत्तर', de: 'Hold a question in mind; receive a Ramcharitmanas answer' } ] },
];

export default function Tools() {
  return (
    <PublicShell>
      <PageHero glyph="✦"
        title={<><Bi hi="मुफ़्त ज्योतिष टूल" en="Free astrology tools" /></>}
        sub={<><Bi hi="सब बिना लॉगिन। आपका जन्म-विवरण सहेजा नहीं जाता।" en="All without login. Your birth details are not saved." /></>} />
      {GROUPS.map(g => (
        <section key={g.en} className="pub-section">
          <h2 className="display"><Bi hi={g.hi} en={g.en} /></h2>
          <div className="pub-tools" style={{ marginTop: '10px' }}>
            {g.items.map(t => (
              <Link key={t.href} href={t.href} className="pub-tool">
                <span className="pub-glyph" aria-hidden="true">{t.g}</span>
                <span><b><Bi hi={t.hi} en={t.en} /></b><span className="d"><Bi hi={t.dh} en={t.de} /></span></span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <section className="pub-section">
        <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '16px', padding: '20px' }}>
          <h2 className="display" style={{ margin: '0 0 6px' }}><Bi hi="अपनी कुंडली पर सीधे पूछें" en="Ask about your own kundli" /></h2>
          <p style={{ margin: '0 0 12px', color: 'var(--color-text-secondary)', fontSize: '15px' }}><Bi hi="कुंडली, दशा, उपाय और कुंडली मिलान — लॉगिन करके, AI के साथ।" en="Kundli, dasha, remedies and matching — after login, with the AI." /></p>
          <Link href="/login" className="pub-btn pub-btn-gold"><Bi hi="AI चैट खोलें" en="Open the AI chat" /></Link>
        </div>
      </section>
    </PublicShell>
  );
}

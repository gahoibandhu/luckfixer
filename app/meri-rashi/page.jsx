import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import RashiFinder from '@/components/RashiFinder';

export const metadata = {
  title: 'मेरी राशि कौन सी है? जन्म तिथि से चंद्र राशि, नक्षत्र और नामाक्षर | Find My Rashi',
  description: 'जन्म तिथि, समय और स्थान से अपनी वैदिक चंद्र राशि, नक्षत्र, चरण और पारंपरिक नामाक्षर जानें। Find your Vedic Moon sign, nakshatra, pada and traditional baby-name letter.',
  alternates: { canonical: '/meri-rashi' },
};

export default function MeriRashi() {
  return (
    <PublicShell>
      <h1 style={{ fontSize: '24px', margin: '0 0 6px', color: 'var(--color-text-primary)' }}><Bi hi="मेरी राशि कौन सी है?" en="Which is my rashi?" /></h1>
      <p style={{ margin: '0 0 14px', fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
        <Bi hi="वैदिक ज्योतिष में राशि का अर्थ जन्म के समय चंद्रमा की राशि है। अपनी जन्म तिथि, समय और जन्म स्थान डालें — हम आपकी चंद्र राशि, नक्षत्र, चरण और उस नक्षत्र-चरण का पारंपरिक नामाक्षर बताएँगे। जन्म समय न पता हो तो भी राशि निकल जाती है (अधिकतर)।"
            en="In Vedic astrology your rashi is the sign the Moon occupied at birth. Enter your date, time and place of birth to get your Moon sign, nakshatra, pada and the traditional name letter for that pada. If you do not know the birth time, the rashi can still usually be found." />
      </p>
      <RashiFinder />
      <section style={{ ...card, marginTop: '16px', fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)' }}>
        <b style={{ color: 'var(--color-text-primary)' }}><Bi hi="ध्यान दें" en="Good to know" /></b>
        <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
          <li><Bi hi="गणना लाहिड़ी (चित्रपक्ष) अयनांश से, भारतीय समय (IST) मानकर होती है। विदेश में जन्मे हों तो स्थानीय समय को IST में बदलकर डालें।" en="Calculated with the Lahiri (Chitrapaksha) ayanamsa, reading the birth time as Indian Standard Time (IST). If you were born abroad, convert the local time to IST first." /></li>
          <li><Bi hi="पश्चिमी (सायन) राशि और वैदिक (निरयन) राशि अलग हो सकती हैं — यहाँ वैदिक राशि बताई गई है।" en="Your western (tropical) sign and Vedic (sidereal) sign can differ — this page gives the Vedic one." /></li>
          <li><Bi hi="चंद्रमा लगभग हर सवा दो दिन में राशि बदलता है, इसलिए राशि-बदलाव वाले दिन जन्म समय के बिना राशि पक्की नहीं होती।" en="The Moon changes sign about every two and a quarter days, so on a sign-change day the rashi cannot be certain without the birth time." /></li>
          <li><Bi hi="आपका जन्म-विवरण सहेजा नहीं जाता।" en="Your birth details are not saved." /></li>
        </ul>
      </section>
    </PublicShell>
  );
}

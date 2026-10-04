import LegalPage from '@/components/LegalPage';
import { BRAND } from '@/lib/brand';
export const metadata = { title: `About ${BRAND.name} | हमारे बारे में`, description: 'How our panchang, horoscope and AI astrology chat are built, and what they can and cannot tell you.', alternates: { canonical: '/about' } };
export default function About() {
  return (
    <LegalPage titleHi="हमारे बारे में" titleEn={`About ${BRAND.name}`} updated="Updated October 2026"
      summaryHi={`${BRAND.name} एक वैदिक ज्योतिष मंच है: रोज़ का पंचांग, राशिफल, मुफ़्त टूल और अपनी कुंडली पर AI से बातचीत। ग्रहों की गणना सॉफ़्टवेयर करता है; AI केवल उसे सरल भाषा में समझाता है।`}
      sections={[
        { h: 'What we do', p: [`${BRAND.name} brings Vedic astrology to everyday questions in Hindi and English: a daily panchang for your city, a daily horoscope, free tools such as rashi, numerology, Sade Sati and Manglik checks, and a chat where you can ask questions about your own kundli.`] },
        { h: 'How the numbers are calculated', p: ['Planetary positions come from the Swiss Ephemeris. We use the Lahiri (Chitrapaksha) ayanamsa for sidereal positions. Tithi, nakshatra, yoga and karana timings are exact transition times converted to Indian Standard Time and picked by your city’s own sunrise, which we calculate from the city’s coordinates.', 'Almanacs can differ by a minute or two and sometimes by a day for a fast or festival, because of different methods and local traditions. For religious observances, please also check your local almanac or priest.'] },
        { h: 'What the AI does — and does not do', p: ['In the AI chat, software calculates your chart first. The AI is then asked only to explain those results in plain language. It can be wrong or incomplete, and it is not a replacement for a qualified astrologer or for professional advice.'] },
        { h: 'What astrology is here', p: ['Everything on this site is general guidance for reflection. It does not predict events with certainty and is not medical, legal, financial or relationship advice. Please take important decisions with qualified professionals.'] },
      ]} />
  );
}

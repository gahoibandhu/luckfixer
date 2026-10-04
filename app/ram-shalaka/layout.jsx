import Link from 'next/link';
import Bi from '@/components/Bi';

export const metadata = {
  title: 'राम शलाका — रामचरितमानस से प्रश्न का उत्तर | Ram Shalaka Prashnavali Online',
  description: 'मन में अपना प्रश्न रखकर राम शलाका चलाएँ और रामचरितमानस की चौपाई से मार्गदर्शन पाएँ — बिना लॉगिन। Ask Ram Shalaka online and receive a Ramcharitmanas answer, no login needed.',
  alternates: { canonical: '/ram-shalaka' },
};

// Static, original explanatory text under the tool: tells visitors (and search engines) what the page is.
export default function RamShalakaLayout({ children }) {
  const h = { fontSize: '17px', margin: '0 0 8px', color: 'var(--color-text-primary)' };
  const p = { margin: '0 0 12px', fontSize: '14px', lineHeight: 1.85, color: 'var(--color-text-secondary)' };
  return (
    <>
      {children}
      <section style={{ maxWidth: '720px', margin: '0 auto', padding: '8px 16px 96px' }}>
        <h2 style={h}><Bi hi="राम शलाका क्या है?" en="What is Ram Shalaka?" /></h2>
        <p style={p}><Bi hi="राम शलाका (राम प्रश्नावली) एक श्रद्धा-परंपरा है जिसमें श्रद्धालु मन में प्रभु राम का स्मरण करके अपना प्रश्न रखते हैं और रामचरितमानस की चौपाइयों से बने चक्र या सारणी से एक उत्तर पाते हैं। लोग इसे जीवन के किसी निर्णय पर एक शांत क्षण लेकर सोचने के लिए अपनाते हैं।" en="Ram Shalaka (Ram Prashnavali) is a devotional tradition in which a devotee holds a question in mind while remembering Lord Ram, then receives an answer drawn from the Ramcharitmanas chaupais through a wheel or grid. People use it to pause and reflect before a decision." /></p>
        <h2 style={h}><Bi hi="कैसे इस्तेमाल करें" en="How to use it" /></h2>
        <p style={p}><Bi hi="पहले कुछ क्षण शांत होकर प्रभु राम का स्मरण करें। फिर एक स्पष्ट, सच्चा प्रश्न मन में रखें — बेहतर है कि ‘हाँ/नहीं’ या ‘करूँ/रुकूँ’ जैसा हो। उसके बाद चक्र चलाएँ या सारणी से चुनें। जो उत्तर आए उसे दबाव की तरह नहीं, एक संकेत की तरह पढ़ें। एक ही प्रश्न बार-बार पूछने से बचें।" en="Take a quiet moment and remember Lord Ram. Hold one clear, sincere question — ideally something like ‘should I go ahead or wait?’. Then spin the wheel or pick from the grid. Read the answer as a hint, not a verdict, and avoid asking the same question again and again." /></p>
        <h2 style={h}><Bi hi="ध्यान रखें" en="Please remember" /></h2>
        <p style={p}><Bi hi="यह श्रद्धा और आत्म-चिंतन का साधन है, भविष्यवाणी या पेशेवर सलाह का विकल्प नहीं। स्वास्थ्य, कानून और पैसों के बड़े फैसले योग्य विशेषज्ञ की सलाह से लें। आपका प्रश्न कहीं सहेजा नहीं जाता।" en="This is a tool for faith and reflection, not a prediction or a substitute for professional advice. Take big health, legal and money decisions with a qualified expert. Your question is not saved anywhere." /></p>
        <p style={{ ...p, marginBottom: 0 }}>
          <Link href="/tools" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ और मुफ़्त ज्योतिष टूल" en="→ More free astrology tools" /></Link> · <Link href="/gita-shlok" style={{ color: 'var(--color-text-info)' }}><Bi hi="आज का गीता श्लोक" en="Gita verse of the day" /></Link>
        </p>
      </section>
    </>
  );
}

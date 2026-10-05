import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell from '@/components/PublicShell';
import Bi from '@/components/Bi';
import MoolankCalculator from '@/components/MoolankCalculator';
import { MOOLANK } from '@/lib/public-content';

export const metadata = {
  title: 'मूलांक और भाग्यांक कैलकुलेटर — जन्म तिथि से अंक ज्योतिष | Moolank & Bhagyank Calculator',
  description: 'जन्म तिथि से अपना मूलांक, भाग्यांक और लो शू ग्रिड निकालें और 1 से 9 अंकों का स्वभाव, करियर और रिश्ते पढ़ें। Free Indian numerology calculator.',
  alternates: { canonical: '/moolank' },
};

export default function MoolankPage() {
  return (
    <PublicShell>
      <PageHero glyph="☉"
        title={<><Bi hi="मूलांक, भाग्यांक और लो शू ग्रिड" en="Moolank, Bhagyank & Lo Shu grid" /></>}
        sub={<><Bi hi="भारतीय अंक ज्योतिष में जन्म-दिन से मूलांक और पूरी जन्म तिथि से भाग्यांक निकलता है। जन्म तिथि डालते ही दोनों अंक और आपका लो शू ग्रिड दिख जाता है — सब आपके ब्राउज़र में, कुछ भी सहेजा नहीं जाता।"
            en="In Indian numerology the birth day gives the Moolank and the whole date of birth gives the Bhagyank. Enter your date of birth to see both numbers and your Lo Shu grid — all in your browser, nothing is saved." /></>} />
      <MoolankCalculator />
      <section className="pub-section">
        <h2 className="display"><Bi hi="1 से 9 अंक" en="The numbers 1 to 9" /></h2>
        <div className="pub-rashi-grid" style={{ marginTop: '10px' }}>
          {Object.keys(MOOLANK).map(n => (
            <Link key={n} href={`/moolank/${n}`} className="pub-rashi">
              <b style={{ fontSize: '20px' }}>{n}</b> <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}><Bi hi={MOOLANK[n].planet.hi} en={MOOLANK[n].planet.en} /></span>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.45 }}><Bi hi={MOOLANK[n].summary.hi} en={MOOLANK[n].summary.en} /></div>
            </Link>
          ))}
        </div>
      </section>
      <section className="pub-section" style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
        <h2 className="display" style={{ color: 'var(--color-text-primary)' }}><Bi hi="मूलांक और भाग्यांक में फ़र्क़" en="Moolank vs Bhagyank" /></h2>
        <p><Bi hi="मूलांक आपका स्वभाव और रोज़ का व्यवहार दिखाता है — यह जन्म की तारीख़ (जैसे 29 → 2+9 = 11 → 1+1 = 2) से बनता है। भाग्यांक जीवन की दिशा और सीख का संकेत देता है — यह पूरी तिथि के सभी अंक जोड़कर बनता है (जैसे 06-03-1984 → 0+6+0+3+1+9+8+4 = 31 → 4)। दोनों 1 से 9 के बीच आते हैं।" en="The Moolank describes temperament and everyday manner — it comes from the day of birth (29 → 2+9 = 11 → 1+1 = 2). The Bhagyank points to life direction and lessons — it comes from adding every digit of the full date (06-03-1984 → 0+6+0+3+1+9+8+4 = 31 → 4). Both land between 1 and 9." /></p>
      </section>
    </PublicShell>
  );
}

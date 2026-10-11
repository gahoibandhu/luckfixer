import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { VRATS, COMMON_PUJA } from '@/lib/vrat-guides';

export const metadata = {
  title: 'व्रत की पूजा विधि और कथा — एकादशी, पूर्णिमा, अमावस्या, प्रदोष, श्राद्ध | Vrat Puja Vidhi & Katha',
  description: 'एकादशी, पूर्णिमा (सत्यनारायण), अमावस्या, प्रदोष और पितृपक्ष की पूजा विधि, नियम, पारण और कथा — सरल हिंदी और English में।',
  alternates: { canonical: '/vrat' },
};

export default function VratHub() {
  return (
    <PublicShell>
      <PageHero glyph="☊" title={<Bi hi="व्रत की पूजा विधि और कथा" en="Vrat puja vidhi and katha" />}
        sub={<Bi hi="नियम, सामग्री, चरण-दर-चरण पूजन, पारण और कथा — हर व्रत के लिए एक जगह।" en="Rules, materials, step-by-step puja, parana and katha — one place for each vrat." />} />
      <div className="pub-tools">
        {VRATS.map(v => (
          <Link key={v.slug} href={`/vrat/${v.slug}`} className="pub-tool">
            <span className="pub-glyph" aria-hidden="true">{v.glyph}</span>
            <span><b><Bi hi={v.hi} en={v.en} /></b><span className="d"><Bi hi={v.deity.hi} en={v.deity.en} /></span></span>
          </Link>
        ))}
      </div>
      <section style={{ ...card, marginTop: '16px' }}>
        <h2 style={{ fontSize: '17px', margin: '0 0 8px' }}><Bi hi={COMMON_PUJA.title.hi} en={COMMON_PUJA.title.en} /></h2>
        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: 1.85, color: 'var(--color-text-secondary)' }}>
          {COMMON_PUJA.steps.map((s, i) => <li key={i}><Bi hi={s.hi} en={s.en} /></li>)}
        </ol>
      </section>
      <p style={{ marginTop: '14px', fontSize: '14px', lineHeight: 2 }}>
        <Link href="/vrat-calendar" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ आने वाले व्रत की तिथियाँ" en="→ Upcoming vrat dates" /></Link><br />
        <Link href="/tyohar" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ त्योहार कैलेंडर" en="→ Festival calendar" /></Link><br />
        <Link href="/aarti" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ आरती और चालीसा" en="→ Aarti and Chalisa" /></Link>
      </p>
      <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: 1.7 }}><Bi hi="विधियाँ परिवार, क्षेत्र और संप्रदाय के अनुसार बदलती हैं। यहाँ प्रचलित सरल रूप दिया गया है; अपनी परंपरा या पुरोहित की बात सर्वोपरि मानें।" en="Procedures vary by family, region and sampradaya. This is the commonly followed simple form; your own tradition or priest comes first." /></p>
    </PublicShell>
  );
}

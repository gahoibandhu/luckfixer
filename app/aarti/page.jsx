import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { AARTIS } from '@/lib/aarti';

export const metadata = {
  title: 'आरती और चालीसा — हनुमान चालीसा, ॐ जय जगदीश हरे, शिव, गणेश, लक्ष्मी, दुर्गा | Aarti & Chalisa',
  description: 'हनुमान चालीसा और प्रमुख आरतियाँ पूरे पाठ के साथ — गणेश, जगदीश (विष्णु), शिव, हनुमान, लक्ष्मी, दुर्गा, सन्तोषी माता। बड़े अक्षरों में, पूजा के समय पढ़ने के लिए।',
  alternates: { canonical: '/aarti' },
};

export default function AartiIndex() {
  return (
    <PublicShell>
      <PageHero glyph="🪔" title={<Bi hi="आरती और चालीसा" en="Aarti & Chalisa" />}
        sub={<Bi hi="पूरा पाठ, बड़े अक्षरों में — पूजा के समय आसानी से पढ़ने के लिए। अक्षर का आकार अपने हिसाब से बढ़ा-घटा सकते हैं।" en="Full text in large type, easy to read during puja. You can enlarge or reduce the text size." />} />
      <div className="pub-tools">
        {AARTIS.map(a => (
          <Link key={a.slug} href={`/aarti/${a.slug}`} className="pub-tool">
            <span className="pub-glyph" aria-hidden="true">{a.kind === 'chalisa' ? '🕉' : '🪔'}</span>
            <span><b><Bi hi={a.hi} en={a.en} /></b>
              <span className="d"><Bi hi={`${a.deity.hi} · ${a.days.hi}`} en={`${a.deity.en} · ${a.days.en}`} /></span></span>
          </Link>
        ))}
      </div>
      <p style={{ ...card, marginTop: '16px', fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)' }}>
        <Bi hi="ये सदियों पुराने पारंपरिक पाठ हैं। लोक-आरतियों के शब्दों में अलग-अलग क्षेत्रों में थोड़ा अंतर मिलता है; यहाँ सबसे प्रचलित रूप दिया गया है। अपने परिवार या गुरु की परंपरा का पाठ भिन्न हो तो उसे ही अपनाएँ।"
            en="These are centuries-old traditional texts. The wording of folk aartis varies slightly from region to region; this is the commonly printed form. If your family or guru follows a different version, use that one." />
      </p>
      <p style={{ marginTop: '14px', fontSize: '14px' }}><Link href="/vrat" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ व्रत की पूजा विधि और कथा" en="→ Vrat puja vidhi and katha" /></Link></p>
    </PublicShell>
  );
}

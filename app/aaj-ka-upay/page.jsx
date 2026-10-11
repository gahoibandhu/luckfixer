import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { VAAR } from '@/lib/public-content';
import { UPAY } from '@/lib/vaar-upay';
import { todayIST } from '@/lib/rashifal';
import { buildPanchang, inRange } from '@/lib/panchang-engine';
import { CITIES, fmt } from '@/lib/panchang';

export const revalidate = 900;
export const metadata = {
  title: 'आज का उपाय — वार के हिसाब से सरल उपाय | Today’s Simple Practice by Weekday',
  description: 'आज के वार के ग्रह के अनुसार सरल उपाय, शुभ रंग और मंत्र — बिना डर और बिना दावों के। A simple weekday practice, colour and mantra.',
  alternates: { canonical: '/aaj-ka-upay' },
};

export default function AajKaUpay() {
  const { iso, weekday } = todayIST();
  const u = UPAY[weekday], v = VAAR[weekday];
  const [y, m, d] = iso.split('-').map(Number);
  const pc = inRange(y) ? buildPanchang(y, m, d, CITIES[0]) : null;
  return (
    <PublicShell>
      <PageHero glyph="🪔"
        title={<><Bi hi="आज का उपाय" en="Today’s practice" /></>}
        sub={<><Bi hi={`${v.hi} · ग्रह ${v.planet.hi} · ${u.deity[0]}`} en={`${v.en} · ruled by ${v.planet.en} · ${u.deity[1]}`} /></>} />

      <section style={{ ...card, marginBottom: '12px' }}>
        <h2 style={{ fontSize: '15px', margin: '0 0 6px' }}><Bi hi="आज का सरल उपाय" en="A simple practice for today" /></h2>
        <p style={{ margin: '0 0 8px', fontSize: '15px', lineHeight: 1.8 }}><Bi hi={u.do[0]} en={u.do[1]} /></p>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}><Bi hi={u.extra[0]} en={u.extra[1]} /></p>
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
        <section style={card}><div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi="आज का रंग" en="Colour of the day" /></div><div style={{ fontSize: '17px', fontWeight: 600, marginTop: '4px' }}><Bi hi={u.color[0]} en={u.color[1]} /></div></section>
        <section style={card}><div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi="मंत्र" en="Mantra" /></div><div style={{ fontSize: '17px', fontWeight: 600, marginTop: '4px' }}>{u.mantra}</div></section>
      </div>
      {pc && (
        <p style={{ ...card, margin: '0 0 12px', fontSize: '14px', lineHeight: 1.7 }}>
          <b><Bi hi="आज का राहुकाल (दिल्ली): " en="Today’s Rahu Kaal (Delhi): " /></b><span style={{ color: 'var(--color-text-danger)' }}>{fmt(pc.rahukaal.from)} – {fmt(pc.rahukaal.to)}</span> · <Link href="/panchang" style={{ color: 'var(--color-text-info)' }}><Bi hi="अपने शहर का पंचांग" en="Panchang for your city" /></Link>
        </p>
      )}
      <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: 1.7 }}><Bi hi="ये परंपरागत, सरल और रोज़मर्रा के काम हैं — इनके किसी परिणाम का दावा नहीं किया जाता। इन्हें श्रद्धा और सुविधा से अपनाएँ।" en="These are traditional, simple, everyday actions — no particular outcome is claimed. Take them up out of faith and convenience." /></p>
    </PublicShell>
  );
}

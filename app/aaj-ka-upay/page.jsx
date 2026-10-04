import Link from 'next/link';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { VAAR } from '@/lib/public-content';
import { todayIST } from '@/lib/rashifal';
import { buildPanchang, inRange } from '@/lib/panchang-engine';
import { CITIES, fmt } from '@/lib/panchang';

export const revalidate = 900;
export const metadata = {
  title: 'आज का उपाय — वार के हिसाब से सरल उपाय | Today’s Simple Practice by Weekday',
  description: 'आज के वार के ग्रह के अनुसार सरल उपाय, शुभ रंग और मंत्र — बिना डर और बिना दावों के। A simple weekday practice, colour and mantra.',
  alternates: { canonical: '/aaj-ka-upay' },
};

// Traditional weekday associations (deity, colour, mantra); the practices are gentle, everyday actions.
const UPAY = [
  { deity: ['सूर्य देव', 'Surya'], color: ['लाल / केसरिया', 'Red or saffron'], mantra: 'ॐ सूर्याय नमः', do: ['सुबह उगते सूर्य को जल दें और कुछ मिनट धूप में शांत बैठें।', 'Offer water to the rising Sun and sit quietly in the morning light for a few minutes.'], extra: ['पिता या गुरु का हाल पूछें।', 'Ask after your father or a teacher.'] },
  { deity: ['शिव जी', 'Shiva'], color: ['सफ़ेद', 'White'], mantra: 'ॐ नमः शिवाय', do: ['शिवलिंग पर जल चढ़ाएँ या पाँच मिनट शांत बैठकर मंत्र जपें।', 'Offer water at a Shivling or chant the mantra quietly for five minutes.'], extra: ['माँ या घर की बुज़ुर्ग महिला की सेवा करें।', 'Do some service for your mother or an elder woman at home.'] },
  { deity: ['हनुमान जी', 'Hanuman'], color: ['लाल', 'Red'], mantra: 'ॐ हनुमते नमः', do: ['हनुमान चालीसा पढ़ें या हनुमान मंदिर में दर्शन करें।', 'Read the Hanuman Chalisa or visit a Hanuman temple.'], extra: ['थोड़ा व्यायाम करें और गुस्से में पहले कुछ साँसें गिनें।', 'Exercise a little, and count a few breaths before reacting in anger.'] },
  { deity: ['गणेश जी', 'Ganesha'], color: ['हरा', 'Green'], mantra: 'ॐ गं गणपतये नमः', do: ['नया या ज़रूरी काम शुरू करने से पहले गणेश जी का स्मरण करें।', 'Remember Ganesha before starting a new or important task.'], extra: ['पक्षियों/गाय को दाना या हरा चारा दें।', 'Feed birds, or give green fodder to a cow.'] },
  { deity: ['विष्णु जी / गुरु', 'Vishnu / your teacher'], color: ['पीला', 'Yellow'], mantra: 'ॐ नमो भगवते वासुदेवाय', do: ['गुरु या शिक्षक का सम्मान करें और कुछ नया सीखें।', 'Honour a teacher and learn something new.'], extra: ['चना या केले जैसी पीली चीज़ किसी को दें।', 'Share something yellow, such as gram or bananas.'] },
  { deity: ['देवी लक्ष्मी / माँ', 'Goddess Lakshmi / the Mother'], color: ['सफ़ेद / गुलाबी', 'White or pink'], mantra: 'ॐ श्री महालक्ष्म्यै नमः', do: ['घर की सफ़ाई और सजावट करें; देवी के सामने दीपक जलाएँ।', 'Tidy and decorate the home; light a lamp before the Goddess.'], extra: ['किसी ज़रूरतमंद को वस्त्र या भोजन दें।', 'Give clothes or food to someone in need.'] },
  { deity: ['शनि देव', 'Shani'], color: ['नीला / काला', 'Blue or black'], mantra: 'ॐ शं शनैश्चराय नमः', do: ['अधूरे ज़िम्मेदारी वाले काम निपटाएँ और समय के पाबंद रहें।', 'Finish pending duties and keep to time.'], extra: ['श्रमिक, सफ़ाईकर्मी या ज़रूरतमंद की मदद करें; सरसों का तेल दान करें।', 'Help a worker, sanitation staff or someone in need; donate mustard oil.'] },
];

export default function AajKaUpay() {
  const { iso, weekday } = todayIST();
  const u = UPAY[weekday], v = VAAR[weekday];
  const [y, m, d] = iso.split('-').map(Number);
  const pc = inRange(y) ? buildPanchang(y, m, d, CITIES[0]) : null;
  return (
    <PublicShell>
      <h1 style={{ fontSize: '28px', margin: '0 0 4px' }}><Bi hi="आज का उपाय" en="Today’s practice" /></h1>
      <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--color-text-tertiary)' }}><Bi hi={`${v.hi} · ग्रह ${v.planet.hi} · ${u.deity[0]}`} en={`${v.en} · ruled by ${v.planet.en} · ${u.deity[1]}`} /></p>

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

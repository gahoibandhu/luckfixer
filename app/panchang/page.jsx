import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { buildPanchang, inRange } from '@/lib/panchang-engine';
import { CITIES, cityBySlug, fmt } from '@/lib/panchang';
import { VAAR, RASHIS } from '@/lib/public-content';
import { todayIST } from '@/lib/rashifal';

export const metadata = {
  title: 'आज का पंचांग — तिथि, नक्षत्र, योग, राहुकाल, चौघड़िया | Daily Panchang',
  description: 'अपने शहर का आज का पंचांग: तिथि, नक्षत्र, योग, करण, सूर्योदय-सूर्यास्त, राहुकाल, यमगण्ड, गुलिक, अभिजित मुहूर्त और दिन का चौघड़िया। Daily panchang with exact tithi, nakshatra, yoga and karana timings.',
  alternates: { canonical: '/panchang' },
};

const addDay = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const when = (e) => `${fmt(e.min)}${e.dayOff ? ` (+${e.dayOff}d)` : ''}`;
const Q = { good: ['var(--color-text-success)', 'शुभ', 'Good'], neutral: ['var(--color-text-secondary)', 'सामान्य', 'Neutral'], avoid: ['var(--color-text-danger)', 'अशुभ', 'Avoid'] };

function Row({ label, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px', padding: '9px 0', borderTop: '0.5px solid var(--color-border-tertiary)', fontSize: '14px' }}>
      <div style={{ color: 'var(--color-text-tertiary)', fontSize: '13px' }}>{label}</div>
      <div style={{ color: 'var(--color-text-primary)', lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}
const Segs = ({ list, pick = (l) => l, suffixHi, suffixEn }) => list.map((s, i) => (
  <div key={i}><b><Bi hi={pick(s.label).hi} en={pick(s.label).en} /></b> <span style={{ color: 'var(--color-text-secondary)' }}><Bi hi={`${when(s.end)} तक`} en={`until ${when(s.end)}`} /></span></div>
));

export default async function PanchangPage({ searchParams }) {
  const sp = await searchParams;
  const today = todayIST().iso;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(sp?.date || '') ? sp.date : today;
  const city = cityBySlug(sp?.city) || CITIES[0];
  const [y, m, d] = iso.split('-').map(Number);
  const pc = inRange(y) ? buildPanchang(y, m, d, city) : null;
  const q = (date) => `/panchang?date=${date}&city=${city.slug}`;

  return (
    <PublicShell>
      <PageHero glyph="☽"
        title={<><Bi hi="आज का पंचांग" en="Daily Panchang" /></>}
        sub={<><Bi hi="अपने शहर के सूर्योदय के अनुसार तिथि, नक्षत्र, योग, करण, राहुकाल और चौघड़िया" en="Tithi, nakshatra, yoga, karana, Rahu Kaal and choghadiya, by your city’s own sunrise" /></>} />

      <form method="get" style={{ ...card, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '14px' }}>
        <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}><Bi hi="शहर" en="City" /><br />
          <select name="city" defaultValue={city.slug} style={{ minWidth: '150px' }}>{CITIES.map(c => <option key={c.slug} value={c.slug}>{c.hi} / {c.en}</option>)}</select></label>
        <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}><Bi hi="तारीख" en="Date" /><br /><input type="date" name="date" defaultValue={iso} min="2026-01-01" max="2028-12-31" /></label>
        <button type="submit" style={{ padding: '8px 14px', cursor: 'pointer' }}><Bi hi="देखें" en="Show" /></button>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: '12px', fontSize: '13px' }}>
          <Link href={q(addDay(iso, -1))} style={{ color: 'var(--color-text-info)' }}>← <Bi hi="पिछला दिन" en="Prev" /></Link>
          <Link href={q(today)} style={{ color: 'var(--color-text-info)' }}><Bi hi="आज" en="Today" /></Link>
          <Link href={q(addDay(iso, 1))} style={{ color: 'var(--color-text-info)' }}><Bi hi="अगला दिन" en="Next" /> →</Link>
        </span>
      </form>

      {!pc ? (
        <p style={{ ...card, fontSize: '14px', color: 'var(--color-text-warning)' }}><Bi hi="इस तारीख का पंचांग उपलब्ध नहीं है। हमारा पंचांग 2026 से 2028 तक की तारीखों के लिए है।" en="Panchang for this date is not available. We currently cover 2026 to 2028." /></p>
      ) : (
        <>
          <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            <b style={{ color: 'var(--color-text-primary)' }}><Bi hi={`${VAAR[pc.weekday].hi}, ${d}/${m}/${y}`} en={`${VAAR[pc.weekday].en}, ${d}/${m}/${y}`} /></b> · <Bi hi={city.hi} en={city.en} /> · <Bi hi={`सूर्योदय ${fmt(pc.sunrise)} · सूर्यास्त ${fmt(pc.sunset)}`} en={`Sunrise ${fmt(pc.sunrise)} · Sunset ${fmt(pc.sunset)}`} />
          </p>

          <section style={{ ...card, marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', margin: '0 0 6px', color: 'var(--color-text-primary)' }}><Bi hi="पंचांग (सूर्योदय से अगले सूर्योदय तक)" en="Panchang (sunrise to next sunrise)" /></h2>
            <Row label={<Bi hi="तिथि" en="Tithi" />}>
              {pc.tithi.map((s, i) => (
                <div key={i}><b><Bi hi={`${s.label.paksha === 'shukla' ? 'शुक्ल' : 'कृष्ण'} ${s.label.hi}`} en={`${s.label.paksha === 'shukla' ? 'Shukla' : 'Krishna'} ${s.label.en}`} /></b> <span style={{ color: 'var(--color-text-secondary)' }}><Bi hi={`${when(s.end)} तक`} en={`until ${when(s.end)}`} /></span></div>
              ))}
            </Row>
            <Row label={<Bi hi="नक्षत्र" en="Nakshatra" />}><Segs list={pc.nakshatra} /></Row>
            <Row label={<Bi hi="योग" en="Yoga" />}><Segs list={pc.yoga} /></Row>
            <Row label={<Bi hi="करण" en="Karana" />}><Segs list={pc.karana} /></Row>
            <Row label={<Bi hi="चंद्र राशि" en="Moon sign" />}>{pc.moonSign.map((s, i) => <div key={i}><b><Bi hi={s.label.hi} en={s.label.en} /></b> <span style={{ color: 'var(--color-text-secondary)' }}>{s.end.dayOff === 0 || i < pc.moonSign.length - 1 ? <Bi hi={`${when(s.end)} तक`} en={`until ${when(s.end)}`} /> : <Bi hi="पूरे दिन" en="all day" />}</span></div>)}</Row>
            <Row label={<Bi hi="सूर्य राशि" en="Sun sign" />}><b><Bi hi={pc.sunSign[0].label.hi} en={pc.sunSign[0].label.en} /></b></Row>
          </section>

          <section style={{ ...card, marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', margin: '0 0 6px', color: 'var(--color-text-primary)' }}><Bi hi="शुभ-अशुभ समय" en="Auspicious and inauspicious times" /></h2>
            <Row label={<Bi hi="राहुकाल" en="Rahu Kaal" />}><span style={{ color: 'var(--color-text-danger)' }}>{fmt(pc.rahukaal.from)} – {fmt(pc.rahukaal.to)}</span></Row>
            <Row label={<Bi hi="यमगण्ड" en="Yamaganda" />}><span style={{ color: 'var(--color-text-danger)' }}>{fmt(pc.yamaganda.from)} – {fmt(pc.yamaganda.to)}</span></Row>
            <Row label={<Bi hi="गुलिक काल" en="Gulika Kaal" />}><span style={{ color: 'var(--color-text-danger)' }}>{fmt(pc.gulika.from)} – {fmt(pc.gulika.to)}</span></Row>
            <Row label={<Bi hi="अभिजित मुहूर्त" en="Abhijit Muhurta" />}><span style={{ color: 'var(--color-text-success)' }}>{fmt(pc.abhijit.from)} – {fmt(pc.abhijit.to)}</span></Row>
          </section>

          <section style={{ ...card, marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', margin: '0 0 6px', color: 'var(--color-text-primary)' }}><Bi hi="दिन का चौघड़िया" en="Day Choghadiya" /></h2>
            {pc.dayCho.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '7px 0', borderTop: i ? '0.5px solid var(--color-border-tertiary)' : 'none', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-primary)' }}><Bi hi={c.hi} en={c.en} /></span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{fmt(c.from)} – {fmt(c.to)}</span>
                <span style={{ color: Q[c.q][0], minWidth: '52px', textAlign: 'right', fontSize: '12px' }}><Bi hi={Q[c.q][1]} en={Q[c.q][2]} /></span>
              </div>
            ))}
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi="रात का चौघड़िया हम नहीं दिखाते, क्योंकि उसके क्रम पर अलग-अलग पंचांग एकमत नहीं हैं।" en="We do not show the night choghadiya, because almanacs do not agree on its sequence." /></p>
          </section>

          <section style={{ ...card, fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)' }}>
            <b style={{ color: 'var(--color-text-primary)' }}><Bi hi="गणना कैसे होती है" en="How this is calculated" /></b>
            <p style={{ margin: '6px 0 0' }}>
              <Bi hi="तिथि, नक्षत्र, योग और करण के समाप्ति-समय स्विस एफेमेरिस से निकाले गए हैं (लाहिड़ी/चित्रपक्ष अयनांश), और अपने शहर के सूर्योदय के अनुसार चुने गए हैं। सूर्योदय-सूर्यास्त और राहुकाल आदि चुने गए शहर के अक्षांश-देशांतर से बनते हैं। अलग-अलग पंचांगों में समय एक-दो मिनट का फ़र्क़ दे सकते हैं; व्रत-त्योहार की तिथि के लिए अपने स्थानीय पंडित/पंचांग से भी मिलान कर लें। समय भारतीय मानक समय (IST) में हैं।"
                  en="Tithi, nakshatra, yoga and karana end-times come from the Swiss Ephemeris (Lahiri / Chitrapaksha ayanamsa) and are picked by your city’s own sunrise. Sunrise, sunset, Rahu Kaal and the rest use the chosen city’s coordinates. Different almanacs can differ by a minute or two; for fasts and festivals, also confirm with your local priest or almanac. All times are Indian Standard Time (IST)." />
            </p>
          </section>
        </>
      )}
    </PublicShell>
  );
}

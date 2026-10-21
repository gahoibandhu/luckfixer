import Link from '@/components/PLink';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { DateRow, chip, dm, WDN, fdate } from '@/components/SeriesBits';
import { SANKASHTI as DATA } from '@/lib/sankashti-data';
import { SANKASHTI } from '@/lib/series-content';
import { weekdayOf } from '@/lib/vrat-series';
import { todayIST } from '@/lib/rashifal';

export const metadata = {
  title: 'संकष्टी चतुर्थी 2026, 2027, 2028 — तिथि, चंद्रोदय का समय, अंगारकी चतुर्थी | Sankashti Chaturthi dates',
  description: 'हर संकष्टी चतुर्थी की तारीख़, वार और चंद्रोदय का समय (दिल्ली); अंगारकी चतुर्थी चिह्नित। पूजा विधि और व्रत खोलने का नियम। Sankashti Chaturthi dates with moonrise time, Angarki marked.',
  alternates: { canonical: '/sankashti' },
};

export default async function SankashtiPage({ searchParams }) {
  const sp = await searchParams; const today = todayIST().iso;
  const year = [2026, 2027, 2028].includes(Number(sp?.y)) ? Number(sp.y) : (['2026', '2027', '2028'].includes(today.slice(0, 4)) ? Number(today.slice(0, 4)) : 2026);
  const list = DATA.filter(o => o.date.startsWith(String(year)));
  const next = DATA.find(o => o.date >= today || o.c.some(x => x >= today));
  const ang = (o) => weekdayOf(o.date) === 2;
  const name = (o) => ang(o) ? <Bi hi="अंगारकी संकष्टी चतुर्थी" en="Angarki Sankashti Chaturthi" /> : <Bi hi="संकष्टी चतुर्थी" en="Sankashti Chaturthi" />;
  return (
    <PublicShell>
      <PageHero glyph="🐘" title={<Bi hi="संकष्टी चतुर्थी — तिथि और चंद्रोदय" en="Sankashti Chaturthi — dates and moonrise" />} sub={<Bi hi="हर कृष्ण चतुर्थी का गणेश व्रत, चंद्रोदय के समय के साथ।" en="Ganesh’s vrat on every Krishna Chaturthi, with the moonrise time." />} />
      {next && (
        <Link href={`/panchang/${next.date}`} style={{ ...card, display: 'block', textDecoration: 'none', color: 'var(--color-text-primary)', borderColor: 'var(--pub-gold)', marginBottom: '14px' }}>
          <small style={{ color: 'var(--color-text-tertiary)' }}><Bi hi="अगली संकष्टी चतुर्थी" en="Next Sankashti Chaturthi" /></small>
          <div className="display" style={{ fontSize: '20px', margin: '2px 0' }}>{name(next)}</div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}><Bi hi={`${WDN[weekdayOf(next.date)][0]}, ${fdate(next.date, 'hi')} · चंद्रोदय ${next.moonrise} (दिल्ली)`} en={`${WDN[weekdayOf(next.date)][1]}, ${fdate(next.date, 'en')} · moonrise ${next.moonrise} (Delhi)`} /></div>
        </Link>
      )}
      <section style={{ ...card, marginBottom: '14px' }}>
        <p style={{ margin: 0, lineHeight: 1.9, fontSize: '15px' }}><Bi hi={SANKASHTI.intro.hi} en={SANKASHTI.intro.en} /></p>
        <p style={{ margin: '10px 0 0', lineHeight: 1.85, fontSize: '14px' }}><Bi hi={SANKASHTI.angarki.hi} en={SANKASHTI.angarki.en} /></p>
      </section>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[2026, 2027, 2028].map(y => <Link key={y} href={`/sankashti?y=${y}`} style={chip(y === year)}>{y}</Link>)}
        <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi={`${list.length} संकष्टी`} en={`${list.length} Sankashti days`} /></span>
      </div>
      <section style={{ ...card, padding: '2px 14px', marginBottom: '14px' }}>
        {list.map((o, i) => (
          <DateRow key={o.date} o={o} wd={weekdayOf(o.date)} first={!i} past={o.date < today && !o.c.some(x => x >= today)} label={name(o)}
            sub={<Bi hi={`चंद्रोदय ${o.moonrise} (दिल्ली)`} en={`Moonrise ${o.moonrise} (Delhi)`} />}
            extra={<>
              <Bi hi={`चतुर्थी: ${dm(o.start)} से ${dm(o.end)} (IST)`} en={`Chaturthi: ${dm(o.start)} to ${dm(o.end)} (IST)`} />
              {o.c.length > 1 && <><br /><Bi hi={`चतुर्थी ${o.c.map(x => fdate(x, 'hi')).join(' और ')} को चंद्रोदय पर मिलती है — ऊपर दिया दिन वह है जिस दिन तिथि चंद्रोदय के बाद अधिक देर रहती है; स्थानीय पंचांग देखें।`} en={`Chaturthi is present at moonrise on ${o.c.map(x => fdate(x, 'en')).join(' and ')} — the day shown is the one on which the tithi lasts longer after moonrise; check your local panchang.`} /></>}
              {o.fallback && <><br /><Bi hi="इस बार चतुर्थी दो चंद्रोदयों के बीच ही पूरी हो जाती है; यहाँ वह दिन दिखाया है जिसकी संध्या में तिथि सबसे अधिक रहती है।" en="This time the tithi begins and ends between two moonrises; the day shown is the one whose evening it covers most." /></>}
            </>} />
        ))}
      </section>

      <section style={{ ...card, marginBottom: '14px' }}>
        <h2 className="display" style={{ margin: '0 0 8px', fontSize: '18px' }}><Bi hi="पूजा विधि" en="Puja vidhi" /></h2>
        <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.9, fontSize: '15px' }}>{SANKASHTI.vidhi.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}><Bi hi={s.hi} en={s.en} /></li>)}</ol>
        <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: '21px', fontWeight: 600 }}>ॐ गं गणपतये नमः</p>
        <p style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: '10px', background: 'var(--color-background-warning)', fontSize: '13px', lineHeight: 1.75 }}><Bi hi={SANKASHTI.note.hi} en={SANKASHTI.note.en} /></p>
      </section>
      <section style={{ ...card, display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <Link href="/aarti/ganesh-aarti" className="pub-btn pub-btn-gold" style={{ minHeight: '42px', fontSize: '14px' }}><Bi hi="गणेश आरती" en="Ganesh aarti" /></Link>
        <Link href="/calendar" className="pub-btn pub-btn-line" style={{ minHeight: '42px', fontSize: '14px', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}>📅 <Bi hi="कैलेंडर में देखें" en="See in calendar" /></Link>
      </section>
      <p style={{ ...card, fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)', background: 'var(--color-background-warning)' }}>
        <Bi hi="तिथि और चंद्रोदय दिल्ली (IST) के लिए खगोलीय गणना से निकाले गए हैं; आपके शहर में चंद्रोदय कुछ मिनट आगे-पीछे होगा। जब चतुर्थी दो दिन चंद्रोदय पर मिलती है तो परंपरा के अनुसार दिन भिन्न हो सकता है — अपने पंचांग या पंडित जी से पुष्टि कर लें।" en="Tithi and moonrise are computed astronomically for Delhi (IST); in your city moonrise will differ by a few minutes. When Chaturthi is present at moonrise on two days the observed day can differ by tradition — confirm with your panchang or priest." />
      </p>
    </PublicShell>
  );
}

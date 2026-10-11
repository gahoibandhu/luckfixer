import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { FESTIVALS, MONTH_NAMES, PUBLISHED_2026 } from '@/lib/festivals';
import { FESTIVAL_DATES, FESTIVAL_RANGE, ADHIKA } from '@/lib/festival-data';
import { SANKRANTIS } from '@/lib/vrat-data';
import { RASHIS } from '@/lib/public-content';
import { todayIST } from '@/lib/rashifal';

export const metadata = {
  title: 'त्योहार कैलेंडर — व्रत, पर्व और क्षेत्रीय उत्सव (तिथि सहित) | Hindu Festival Calendar',
  description: 'सनातन धर्म के प्रमुख व्रत-त्योहार और क्षेत्रीय पर्व — उत्तर, दक्षिण, पूर्व और पश्चिम भारत के — तिथि के सटीक समय के साथ। Hindu festival calendar with exact tithi timings.',
  alternates: { canonical: '/tyohar' },
};

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MON_FULL = [['जनवरी','January'],['फ़रवरी','February'],['मार्च','March'],['अप्रैल','April'],['मई','May'],['जून','June'],['जुलाई','July'],['अगस्त','August'],['सितंबर','September'],['अक्टूबर','October'],['नवंबर','November'],['दिसंबर','December']];
const WD = [['रवि','Sun'],['सोम','Mon'],['मंगल','Tue'],['बुध','Wed'],['गुरु','Thu'],['शुक्र','Fri'],['शनि','Sat']];
const D = (iso) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return { y, m, d, w: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
const addDays = (iso, n) => { const x = new Date(iso.slice(0, 10) + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const dd = (iso) => { const x = D(iso); return `${x.d} ${MON[x.m - 1]}`; };
const range = (a, b) => (a === b ? dd(a) : `${dd(a)} – ${dd(b)}`);
const hm = (s) => { const [h, mi] = s.slice(11).split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(mi).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const REGION = { all: null, north: ['north', 'north-west'], south: ['south', 'west-south'], east: ['east'], west: ['west-south', 'north-west'] };
const RLABEL = { all: ['पूरे भारत में', 'Pan-India'], north: ['उत्तर भारत', 'North'], south: ['दक्षिण भारत', 'South'], east: ['पूर्व भारत', 'East'], 'west-south': ['पश्चिम/दक्षिण', 'West/South'], 'north-west': ['उत्तर/पश्चिम', 'North/West'] };

function build(year) {
  const rows = [], undated = [];
  for (const f of FESTIVALS) {
    if (f.k) {
      const occ = FESTIVAL_DATES[f.k].filter(o => o.p.startsWith(String(year)));
      for (const o of occ) {
        let a, b, sub = null;
        if (f.end) { const e = FESTIVAL_DATES[f.end].find(x => x.p >= o.p); a = o.p; b = e ? e.p : o.p; }
        else if (f.span) { a = addDays(o.p, f.span[0]); b = addDays(o.p, f.span[1]); }
        else { a = o.s.slice(0, 10); b = o.e.slice(0, 10); sub = { s: o.s, e: o.e }; }
        rows.push({ f, a, b, sub, pub: year === 2026 ? PUBLISHED_2026[f.k] : null, kshaya: !!o.f });
      }
    } else if (f.sol !== undefined) {
      for (const s of SANKRANTIS.filter(x => x.sign === f.sol && x.at.startsWith(String(year)))) rows.push({ f, a: s.at.slice(0, 10), b: s.at.slice(0, 10), sol: s });
    } else undated.push(f);
  }
  rows.sort((x, y) => x.a.localeCompare(y.a));
  return { rows, undated };
}

export default async function Tyohar({ searchParams }) {
  const sp = await searchParams;
  const today = todayIST().iso;
  const [y0, y1] = FESTIVAL_RANGE;
  const year = Math.min(y1, Math.max(y0, Number(sp?.y) || Number(today.slice(0, 4))));
  const region = REGION[sp?.r] !== undefined ? sp.r : 'all';
  const { rows, undated } = build(year);
  const keep = (f) => !REGION[region] || f.r === 'all' || REGION[region].includes(f.r);
  const list = rows.filter(r => keep(r.f)), und = undated.filter(keep);
  const byMonth = {}; list.forEach(r => { const m = D(r.a).m; (byMonth[m] ||= []).push(r); });
  const adhika = ADHIKA.filter(a => a[0].startsWith(String(year)));
  const link = (o) => { const p = new URLSearchParams({ y: String(o.y ?? year), r: o.r ?? region }); return `/tyohar?${p}`; };
  const chip = (on) => ({ padding: '7px 13px', borderRadius: '999px', fontSize: '13px', textDecoration: 'none', border: '1px solid ' + (on ? 'var(--pub-gold)' : 'var(--color-border-secondary)'), background: on ? 'var(--color-background-warning)' : 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontWeight: on ? 700 : 400 });

  return (
    <PublicShell>
      <PageHero glyph="🪔" title={<Bi hi={`त्योहार कैलेंडर ${year}`} en={`Festival calendar ${year}`} />}
        sub={<Bi hi="सनातन धर्म के प्रमुख व्रत, त्योहार और क्षेत्रीय पर्व — तिथि के सटीक समय के साथ।" en="The main fasts, festivals and regional celebrations of Sanatan Dharma — with the exact tithi timings." />} />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i).map(y => <Link key={y} href={link({ y })} style={chip(y === year)}>{y}</Link>)}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {Object.keys(REGION).map(r => <Link key={r} href={link({ r })} style={chip(r === region)}><Bi hi={RLABEL[r]?.[0] ?? ({ north: 'उत्तर', south: 'दक्षिण', east: 'पूर्व', west: 'पश्चिम' })[r]} en={RLABEL[r]?.[1] ?? ({ north: 'North', south: 'South', east: 'East', west: 'West' })[r]} /></Link>)}
      </div>

      <p style={{ ...card, margin: '0 0 14px', fontSize: '13px', lineHeight: 1.8, color: 'var(--color-text-secondary)', background: 'var(--color-background-warning)' }}>
        <Bi hi="जब तिथि दो दिनों में फैली हो, तो त्योहार किस दिन मनाया जाए यह परंपरा और स्थानीय पंचांग तय करते हैं (जैसे दीपावली प्रदोष में, करवा चौथ चंद्रोदय पर, राखी भद्रा के बाद)। इसलिए हम तिथि के सटीक शुरू-खत्म का समय (IST, दिल्ली) देते हैं, और 2026 के लिए जहाँ कई प्रकाशित पंचांग एक राय हैं वहाँ वह दिन भी दिखाते हैं। निर्णय से पहले अपने स्थानीय पंचांग/पंडित से मिलान करें।"
            en="When a tithi spans two days, tradition and your local almanac decide the day a festival is observed (Diwali at Pradosh, Karwa Chauth at moonrise, Rakhi after Bhadra). So we give the exact start and end of the tithi (IST, Delhi) and, for 2026, the day where several published calendars agree. Please confirm with your local almanac or priest before you decide." />
      </p>
      {adhika.map((a, i) => (
        <p key={i} style={{ ...card, margin: '0 0 14px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <b><Bi hi="अधिक मास:" en="Adhika masa:" /></b> {dd(a[0])} – {dd(a[1])} {a[0].slice(0, 4)} (<Bi hi={`अधिक ${MONTH_NAMES[a[2]][0]}`} en={`Adhika ${MONTH_NAMES[a[2]][1]}`} />) — <Bi hi="इस महीने में सामान्यतः व्रत-त्योहार नहीं मनाए जाते, इसलिए आगे के पर्व सामान्य से लगभग एक महीना देर से आते हैं।" en="festivals are normally not observed in this month, so the festivals after it fall about a month later than usual." />
        </p>
      ))}

      {Object.keys(byMonth).map(Number).sort((a, b) => a - b).map(m => (
        <section key={m} style={{ marginBottom: '16px' }}>
          <h2 className="display" style={{ fontSize: '20px', margin: '0 0 8px' }}><Bi hi={`${MON_FULL[m - 1][0]} ${year}`} en={`${MON_FULL[m - 1][1]} ${year}`} /></h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {byMonth[m].map((r, i) => {
              const f = r.f, w = D(r.a).w;
              return (
                <div key={i} style={{ ...card, display: 'grid', gridTemplateColumns: '92px 1fr', gap: '14px' }}>
                  <div style={{ textAlign: 'center', background: 'var(--color-background-secondary)', borderRadius: '10px', padding: '8px 4px', alignSelf: 'start' }}>
                    <div style={{ fontSize: r.a === r.b ? '24px' : '16px', fontWeight: 700, lineHeight: 1.2 }}>{range(r.a, r.b)}</div>
                    {r.a === r.b && <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}><Bi hi={WD[w][0]} en={WD[w][1]} /></div>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}><Bi hi={f.hi} en={f.en} /></div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: '2px 0 4px' }}><Bi hi={f.dh} en={f.de} /></div>
                    {f.rule && <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi={`तिथि: ${f.rule[0]}`} en={`Tithi: ${f.rule[1]}`} />{r.sub && <> · {dd(r.sub.s)}, {hm(r.sub.s)} → {dd(r.sub.e)}, {hm(r.sub.e)}</>}</div>}
                    {r.sol && <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi={`${RASHIS[r.sol.sign].hi} संक्रांति: ${dd(r.sol.at)}, ${hm(r.sol.at)} IST — मनाने का दिन क्षेत्रीय नियम से`} en={`${RASHIS[r.sol.sign].en} Sankranti: ${dd(r.sol.at)}, ${hm(r.sol.at)} IST — the observed day follows regional rules`} /></div>}
                    {r.pub && <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-success)', marginTop: '4px' }}>✓ <Bi hi={`प्रकाशित पंचांगों में प्रचलित दिन: ${dd(r.pub)}`} en={`Day in published calendars: ${dd(r.pub)}`} /></div>}
                    {r.kshaya && <div style={{ fontSize: '12px', color: 'var(--color-text-warning)' }}><Bi hi="इस वर्ष तिथि सूर्योदय आदि नियत क्षण पर नहीं पड़ती; तिथि शुरू होने का दिन दिखाया गया है।" en="This year the tithi does not fall at the usual moment of the day; the day it begins is shown." /></div>}
                    {f.note && <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}><Bi hi={f.note[0]} en={f.note[1]} /></div>}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--color-text-tertiary)' }}><Bi hi={RLABEL[f.r][0]} en={RLABEL[f.r][1]} /></span>
                      {f.guide && <Link href={`/${f.guide}`} style={{ color: 'var(--color-text-info)', fontWeight: 600 }}><Bi hi="पूजा / पाठ →" en="Puja / text →" /></Link>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {und.length > 0 && (
        <section style={{ marginBottom: '16px' }}>
          <h2 className="display" style={{ fontSize: '20px', margin: '0 0 8px' }}><Bi hi="क्षेत्रीय और लोक-पर्व (निश्चित तारीख़ नहीं)" en="Regional and folk festivals (no fixed date here)" /></h2>
          {und.map((f, i) => (
            <div key={i} style={{ ...card, marginBottom: '8px' }}>
              <div style={{ fontWeight: 700 }}><Bi hi={f.hi} en={f.en} /> <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--color-text-tertiary)' }}>· <Bi hi={MONTH_NAMES[f.m][0]} en={MONTH_NAMES[f.m][1]} /></span></div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.65 }}><Bi hi={f.dh} en={f.de} /></div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}><Bi hi="यह पर्व क्षेत्रीय (सौर/नक्षत्र/लोक) कैलेंडर से तय होता है — तारीख़ के लिए अपने क्षेत्र का पंचांग देखें।" en="Decided by a regional (solar, nakshatra or folk) calendar — see your region’s almanac for the date." /></div>
            </div>
          ))}
        </section>
      )}
      <p style={{ fontSize: '14px' }}><Link href="/vrat-calendar" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ एकादशी, पूर्णिमा, अमावस्या, प्रदोष के व्रत" en="→ Ekadashi, Purnima, Amavasya and Pradosh vrats" /></Link> · <Link href="/vrat" style={{ color: 'var(--color-text-info)' }}><Bi hi="व्रत की पूजा विधि और कथा" en="Vrat puja vidhi and katha" /></Link></p>
    </PublicShell>
  );
}

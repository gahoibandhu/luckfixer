import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { VRATS, SANKRANTIS, VRAT_RANGE } from '@/lib/vrat-data';
import { RASHIS } from '@/lib/public-content';
import { todayIST } from '@/lib/rashifal';

export const revalidate = 3600;
export const metadata = {
  title: 'व्रत कैलेंडर — एकादशी, पूर्णिमा, अमावस्या, प्रदोष, संक्रांति | Vrat Calendar',
  description: 'आने वाली एकादशी, पूर्णिमा, अमावस्या, प्रदोष और संक्रांति की तारीखें, तिथि के शुरू-खत्म होने के सटीक समय के साथ (भारतीय समय)।',
  alternates: { canonical: '/vrat-calendar' },
};

const KIND = {
  ekadashi: { hi: 'एकादशी', en: 'Ekadashi', g: '☊' }, purnima: { hi: 'पूर्णिमा', en: 'Purnima', g: '○' },
  amavasya: { hi: 'अमावस्या', en: 'Amavasya', g: '●' }, pradosh: { hi: 'प्रदोष', en: 'Pradosh', g: '☽' },
};
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WD = [['रवि','Sun'],['सोम','Mon'],['मंगल','Tue'],['बुध','Wed'],['गुरु','Thu'],['शुक्र','Fri'],['शनि','Sat']];
const dlabel = (iso) => { const [y, m, d] = iso.split('-').map(Number); const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return { d, mon: MON[m - 1], y, w: WD[w] }; };
const tlabel = (s) => { const [dd, tt] = s.split(' '); const [h, mi] = tt.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; const l = dlabel(dd); return `${((h + 11) % 12) + 1}:${String(mi).padStart(2, '0')} ${ap}, ${l.d} ${l.mon}`; };

export default function VratCalendar() {
  const today = todayIST().iso;
  const upcoming = VRATS.filter(v => (v.dates[0] || v.start.slice(0, 10)) >= today).slice(0, 36);
  const sank = SANKRANTIS.filter(s => s.at.slice(0, 10) >= today).slice(0, 4);
  return (
    <PublicShell>
      <PageHero glyph="☊"
        title={<><Bi hi="व्रत कैलेंडर" en="Vrat calendar" /></>}
        sub={<><Bi hi="एकादशी, पूर्णिमा, अमावस्या और प्रदोष की तारीखें तिथि के शुरू और खत्म होने के सटीक समय के साथ। समय भारतीय मानक समय (IST) में हैं।" en="Ekadashi, Purnima, Amavasya and Pradosh dates with the exact start and end of each tithi, in Indian Standard Time (IST)." /></>} />
      <p style={{ ...card, margin: '0 0 16px', fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)', background: 'var(--color-background-warning)' }}>
        <Bi hi="तारीख दिल्ली के सूर्योदय के नियम से दी गई है (प्रदोष के लिए सूर्यास्त के समय की तिथि)। परंपरा और शहर के अनुसार व्रत/त्योहार का दिन एक दिन आगे-पीछे हो सकता है — जैसे दिवाली प्रदोष-नियम से मनती है — इसलिए पक्का करने के लिए तिथि का समय देखें और अपने स्थानीय पंचांग/पंडित से मिलाएँ।"
            en="The date follows the Delhi-sunrise rule (for Pradosh, the tithi at sunset). By tradition and city a fast or festival can fall a day earlier or later — Diwali, for example, follows the Pradosh rule — so check the tithi times and confirm with your local almanac or priest." />
      </p>

      {sank.length > 0 && (
        <section style={{ ...card, marginBottom: '14px' }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 8px' }}><Bi hi="आने वाली संक्रांति (सूर्य का राशि-प्रवेश)" en="Upcoming Sankranti (Sun enters a sign)" /></h2>
          {sank.map((s, i) => { const l = dlabel(s.at.slice(0, 10)); return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '7px 0', borderTop: i ? '1px solid var(--color-border-tertiary)' : 'none', fontSize: '14px' }}>
              <b><Bi hi={`${RASHIS[s.sign].hi} संक्रांति`} en={`${RASHIS[s.sign].en} Sankranti`} /></b>
              <span style={{ color: 'var(--color-text-secondary)' }}>{tlabel(s.at)}</span>
            </div>); })}
        </section>
      )}

      <section style={{ ...card }}>
        <h2 style={{ fontSize: '16px', margin: '0 0 8px' }}><Bi hi="आने वाले व्रत" en="Upcoming vrats" /></h2>
        {upcoming.map((v, i) => {
          const day = v.dates[0] || v.start.slice(0, 10), l = dlabel(day), k = KIND[v.k];
          const name = (v.k === 'ekadashi' ? (v.p === 'shukla' ? ['शुक्ल एकादशी', 'Shukla Ekadashi'] : ['कृष्ण एकादशी', 'Krishna Ekadashi']) : v.k === 'pradosh' ? (v.p === 'shukla' ? ['शुक्ल प्रदोष', 'Shukla Pradosh'] : ['कृष्ण प्रदोष', 'Krishna Pradosh']) : [k.hi, k.en]);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: '12px', padding: '10px 0', borderTop: i ? '1px solid var(--color-border-tertiary)' : 'none' }}>
              <div style={{ textAlign: 'center', background: 'var(--color-background-secondary)', borderRadius: '10px', padding: '6px 0' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.1 }}>{l.d}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{l.mon} {l.y}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}><Bi hi={l.w[0]} en={l.w[1]} /></div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{k.g} <Bi hi={name[0]} en={name[1]} /></div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  <Bi hi={`तिथि: ${tlabel(v.start)} से ${tlabel(v.end)} तक`} en={`Tithi: ${tlabel(v.start)} to ${tlabel(v.end)}`} />
                  {v.dates.length > 1 && <> · <Bi hi={`दो दिन: ${v.dates.map(x => dlabel(x).d + ' ' + dlabel(x).mon).join(', ')}`} en={`Spans two days: ${v.dates.map(x => dlabel(x).d + ' ' + dlabel(x).mon).join(', ')}`} /></>}
                </div>
              </div>
            </div>);
        })}
        <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi={`${VRAT_RANGE[0]}–${VRAT_RANGE[1]} तक की तारीखें उपलब्ध हैं।`} en={`Dates available for ${VRAT_RANGE[0]}–${VRAT_RANGE[1]}.`} /></p>
      </section>
      <p style={{ marginTop: '14px', fontSize: '14px' }}><Link href="/panchang" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ आज का पंचांग" en="→ Today’s panchang" /></Link></p>
    </PublicShell>
  );
}

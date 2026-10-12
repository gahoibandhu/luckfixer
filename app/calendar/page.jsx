import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { eventsForYear, eventsByDate, matchesTypes, TYPES, TYPE_ORDER, CAL_RANGE } from '@/lib/calendar-events';
import { todayIST } from '@/lib/rashifal';

export const metadata = {
  title: 'हिंदू कैलेंडर — व्रत, त्योहार, एकादशी, प्रदोष, पूर्णिमा, अमावस्या | Hindu Calendar',
  description: 'साल, महीना और सूची — तीन व्यू में सभी व्रत और त्योहार, तिथि के सटीक समय के साथ। Google/Apple Calendar में जोड़ें। Year, month and agenda views of all Hindu fasts and festivals.',
  alternates: { canonical: '/calendar' },
};

const MON = [['जनवरी', 'January'], ['फ़रवरी', 'February'], ['मार्च', 'March'], ['अप्रैल', 'April'], ['मई', 'May'], ['जून', 'June'], ['जुलाई', 'July'], ['अगस्त', 'August'], ['सितंबर', 'September'], ['अक्टूबर', 'October'], ['नवंबर', 'November'], ['दिसंबर', 'December']];
const MON_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = [['र', 'S'], ['सो', 'M'], ['मं', 'T'], ['बु', 'W'], ['गु', 'T'], ['शु', 'F'], ['श', 'S']];
const WD_FULL = [['रवि', 'Sun'], ['सोम', 'Mon'], ['मंगल', 'Tue'], ['बुध', 'Wed'], ['गुरु', 'Thu'], ['शुक्र', 'Fri'], ['शनि', 'Sat']];
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const firstDow = (y, m) => new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
const wdOf = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const dnum = (s) => Number(s.slice(8, 10));

export default async function CalendarPage({ searchParams }) {
  const sp = await searchParams;
  const today = todayIST().iso;
  const [y0, y1] = CAL_RANGE;
  const year = Math.min(y1, Math.max(y0, Number(sp?.y) || Number(today.slice(0, 4))));
  const month = Math.min(12, Math.max(1, Number(sp?.m) || (String(year) === today.slice(0, 4) ? Number(today.slice(5, 7)) : 1)));
  const view = ['year', 'month', 'agenda'].includes(sp?.v) ? sp.v : 'month';
  const types = (sp?.t || '').split(',').filter(t => TYPE_ORDER.includes(t));
  const byDate = eventsByDate(year, types);
  const q = (o = {}) => {
    const p = new URLSearchParams({ v: o.v ?? view, y: String(o.y ?? year), m: String(o.m ?? month) });
    const t = o.t ?? types; if (t.length) p.set('t', t.join(','));
    return `/calendar?${p}`;
  };
  const chip = (on) => ({ padding: '7px 13px', borderRadius: '999px', fontSize: '13px', textDecoration: 'none', border: '1px solid ' + (on ? 'var(--pub-gold)' : 'var(--color-border-secondary)'), background: on ? 'var(--color-background-warning)' : 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontWeight: on ? 700 : 400, whiteSpace: 'nowrap' });
  const toggleType = (k) => (types.includes(k) ? types.filter(x => x !== k) : [...types, k]);
  const prev = view === 'month' ? (month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }) : { y: year - 1 };
  const next = view === 'month' ? (month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }) : { y: year + 1 };
  const canPrev = prev.y >= y0, canNext = next.y <= y1;
  const tq = types.length ? `&t=${types.join(',')}` : '';

  function MonthGrid({ m, big }) {
    const lead = firstDow(year, m), n = dim(year, m);
    const cells = [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: big ? '4px' : '2px' }}>
        {WD.map((w, i) => <div key={i} style={{ textAlign: 'center', fontSize: big ? '12px' : '10px', color: 'var(--color-text-tertiary)', padding: '2px 0', fontWeight: 600 }}><Bi hi={big ? WD_FULL[i][0] : w[0]} en={big ? WD_FULL[i][1] : w[1]} /></div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={'e' + i} />;
          const s = iso(year, m, d), ev = byDate[s] || [], isToday = s === today;
          const base = { display: 'block', textDecoration: 'none', color: 'var(--color-text-primary)', borderRadius: big ? '8px' : '6px', border: isToday ? '2px solid var(--pub-gold)' : '1px solid ' + (ev.length ? 'var(--color-border-secondary)' : 'transparent'), background: ev.length ? 'var(--color-background-secondary)' : 'transparent', padding: big ? '4px 5px' : '2px 0', textAlign: big ? 'left' : 'center', minHeight: big ? '66px' : '26px', overflow: 'hidden' };
          const label = ev.map(e => e.en).join(', ');
          return (
            <Link key={s} href={`/panchang/${s}`} style={base} aria-label={`${d} ${MON_S[m - 1]} ${year}${label ? ': ' + label : ''}`}>
              <span style={{ fontSize: big ? '13px' : '11px', fontWeight: isToday ? 800 : 500 }}>{d}</span>
              {big ? ev.slice(0, 2).map((e, k) => (
                <span key={k} style={{ display: 'block', fontSize: '10px', lineHeight: 1.25, marginTop: '2px', color: TYPES[e.type].color, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Bi hi={e.hi} en={e.en} /></span>
              )) : (
                <span style={{ display: 'flex', justifyContent: 'center', gap: '2px', height: '6px', marginTop: '1px' }}>
                  {[...new Set(ev.map(e => e.type))].slice(0, 3).map(t => <i key={t} style={{ width: '5px', height: '5px', borderRadius: '50%', background: TYPES[t].color, display: 'block' }} />)}
                </span>
              )}
              {big && ev.length > 2 && <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-tertiary)' }}>+{ev.length - 2}</span>}
            </Link>
          );
        })}
      </div>
    );
  }

  function Row({ e }) {
    const t = TYPES[e.type], wd = wdOf(e.date), multi = e.to !== e.date;
    return (
      <Link href={e.href} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid var(--color-border-tertiary)', textDecoration: 'none', color: 'var(--color-text-primary)' }}>
        <span style={{ minWidth: '58px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <b style={{ fontSize: '17px', color: 'var(--color-text-primary)' }}>{dnum(e.date)}</b> {MON_S[Number(e.date.slice(5, 7)) - 1]}<br />
          <small><Bi hi={WD_FULL[wd][0]} en={WD_FULL[wd][1]} />{multi ? ` → ${dnum(e.to)} ${MON_S[Number(e.to.slice(5, 7)) - 1]}` : ''}</small>
        </span>
        <span style={{ flex: 1, fontSize: '15px' }}><span aria-hidden="true" style={{ color: t.color }}>{t.glyph}</span> <Bi hi={e.hi} en={e.en} /></span>
        <span style={{ fontSize: '11px', color: t.color, border: `1px solid ${t.color}`, borderRadius: '999px', padding: '2px 8px', whiteSpace: 'nowrap' }}><Bi hi={t.hi} en={t.en} /></span>
      </Link>
    );
  }

  const yearEvents = eventsForYear(year).filter(e => matchesTypes(e, types));
  const monthEvents = yearEvents.filter(e => Number(e.date.slice(5, 7)) === month);

  return (
    <PublicShell>
      <PageHero glyph="📅" title={<Bi hi={`हिंदू कैलेंडर ${year}`} en={`Hindu calendar ${year}`} />}
        sub={<Bi hi="साल, महीना और सूची — सभी व्रत और त्योहार तिथि के सटीक समय के साथ। किसी भी तारीख़ पर टैप करें, उस दिन का पूरा पंचांग खुलेगा।" en="Year, month and list views of every fast and festival. Tap any date to open that day's full panchang." />} />

      {/* view + year switch */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
        {['year', 'month', 'agenda'].map(v => <Link key={v} href={q({ v })} style={chip(view === v)} aria-current={view === v ? 'page' : undefined}><Bi hi={{ year: 'साल', month: 'महीना', agenda: 'सूची' }[v]} en={{ year: 'Year', month: 'Month', agenda: 'List' }[v]} /></Link>)}
        <span style={{ flex: 1 }} />
        {Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i).map(y => <Link key={y} href={q({ y, m: y === year ? month : 1 })} style={chip(y === year)}>{y}</Link>)}
      </div>

      {/* type filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', overflowX: 'auto' }} role="group" aria-label="Filter">
        <Link href={q({ t: [] })} style={chip(!types.length)}><Bi hi="सभी" en="All" /></Link>
        {TYPE_ORDER.map(k => (
          <Link key={k} href={q({ t: toggleType(k) })} style={chip(types.includes(k))}>
            <i aria-hidden="true" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: TYPES[k].color, marginRight: '6px' }} /><Bi hi={TYPES[k].hi} en={TYPES[k].en} />
          </Link>
        ))}
      </div>

      {/* prev / next */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        {canPrev ? <Link href={q(prev)} style={{ color: 'var(--color-text-info)', fontSize: '14px' }}>← <Bi hi="पिछला" en="Previous" /></Link> : <span />}
        {view === 'month' && <h2 className="display" style={{ margin: 0, fontSize: '20px' }}><Bi hi={`${MON[month - 1][0]} ${year}`} en={`${MON[month - 1][1]} ${year}`} /></h2>}
        {canNext ? <Link href={q(next)} style={{ color: 'var(--color-text-info)', fontSize: '14px' }}><Bi hi="अगला" en="Next" /> →</Link> : <span />}
      </div>

      {view === 'year' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {MON.map((mn, i) => (
            <section key={i} style={{ ...card, padding: '10px 10px 12px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '15px' }}><Link href={q({ v: 'month', m: i + 1 })} style={{ color: 'var(--color-text-primary)', textDecoration: 'none' }}><Bi hi={mn[0]} en={mn[1]} /></Link></h3>
              <MonthGrid m={i + 1} />
            </section>
          ))}
        </div>
      )}

      {view === 'month' && (
        <>
          <div style={{ ...card, padding: '10px', marginBottom: '14px' }}><MonthGrid m={month} big /></div>
          <section style={{ ...card, padding: '6px 14px' }}>
            {monthEvents.length === 0
              ? <p style={{ margin: '12px 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}><Bi hi="इस महीने में चुने हुए फ़िल्टर का कोई व्रत/त्योहार नहीं।" en="No observances this month for the selected filter." /></p>
              : monthEvents.map((e, i) => <Row key={i} e={e} />)}
          </section>
        </>
      )}

      {view === 'agenda' && (
        <div>
          {MON.map((mn, i) => {
            const list = yearEvents.filter(e => Number(e.date.slice(5, 7)) === i + 1);
            if (!list.length) return null;
            return (
              <section key={i} id={`m${i + 1}`} style={{ marginBottom: '14px' }}>
                <h3 className="display" style={{ margin: '0 0 4px', fontSize: '17px' }}><Bi hi={`${mn[0]} ${year}`} en={`${mn[1]} ${year}`} /></h3>
                <div style={{ ...card, padding: '2px 14px' }}>{list.map((e, k) => <Row key={k} e={e} />)}</div>
              </section>
            );
          })}
        </div>
      )}

      {/* export */}
      <section style={{ ...card, marginTop: '8px' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '16px' }}><Bi hi="अपने फ़ोन के कैलेंडर में जोड़ें" en="Add to your phone's calendar" /></h3>
        <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
          <Bi hi="ICS फ़ाइल Google Calendar, Apple Calendar और Outlook में खुलती है। ऊपर जो फ़िल्टर चुना है, वही शामिल होगा।" en="The ICS file opens in Google Calendar, Apple Calendar and Outlook. It includes the filter you selected above." />
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a className="pub-btn pub-btn-gold" href={`/calendar/ics?y=${year}&l=hi${tq}`} style={{ minHeight: '42px', fontSize: '14px' }}>⬇ <Bi hi={`${year} (हिंदी)`} en={`${year} (Hindi names)`} /></a>
          <a className="pub-btn pub-btn-gold" href={`/calendar/ics?y=${year}&l=en${tq}`} style={{ minHeight: '42px', fontSize: '14px' }}>⬇ <Bi hi={`${year} (English)`} en={`${year} (English names)`} /></a>
          <a className="pub-btn pub-btn-gold" href={`/calendar/ics?y=all&l=hi${tq}`} style={{ minHeight: '42px', fontSize: '14px' }}>⬇ <Bi hi="2026–2028 सभी" en="All 2026–2028" /></a>
        </div>
      </section>

      <p style={{ ...card, margin: '14px 0 0', fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)', background: 'var(--color-background-warning)' }}>
        <Bi hi="यह कैलेंडर AstroBharat ने दिल्ली (IST) के लिए गणना से बनाया है। परंपरा और शहर के अनुसार व्रत/त्योहार का दिन एक दिन आगे-पीछे हो सकता है — कृपया अपने स्थानीय पंचांग या पंडित जी से पुष्टि कर लें। बहु-दिवसीय त्योहार हर दिन दिखते हैं।" en="This calendar is computed by AstroBharat for Delhi (IST). Depending on tradition and city, a fast or festival can fall a day earlier or later — please confirm with your local panchang or pandit. Multi-day festivals show on every day." />
      </p>
    </PublicShell>
  );
}

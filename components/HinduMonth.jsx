// components/HinduMonth.jsx — one month, printed-Hindu-calendar style: every day shows its tithi, nakshatra and the vrat/tyohar of the day.
// Server component, no per-request data: /calendar/<year>/<month> is built ahead of time (36 pages, 2026–2028) and served from the CDN.
import Link from '@/components/PLink';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import CalendarToday from '@/components/CalendarToday';
import { eventsForYear, eventsByDate, TYPES, TYPE_ORDER, CAL_RANGE } from '@/lib/calendar-events';
import { monthPanchang, MON } from '@/lib/calendar-month';
import { fmt } from '@/lib/panchang';

const MON_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = [['रवि', 'Sun'], ['सोम', 'Mon'], ['मंगल', 'Tue'], ['बुध', 'Wed'], ['गुरु', 'Thu'], ['शुक्र', 'Fri'], ['शनि', 'Sat']];
const DN = (n) => String(n).replace(/\d/g, (d) => '०१२३४५६७८९'[d]);
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const dnum = (s) => Number(s.slice(8, 10));
const wdOf = (s) => new Date(s + 'T00:00:00Z').getUTCDay();
const hrefOf = (y, m) => `/calendar/${y}/${m}`;
// tithi name as printed on a calendar: "शुक्ल पंचमी", but Purnima / Amavasya stand alone
const PK = { shukla: ['शुक्ल ', 'Shukla '], krishna: ['कृष्ण ', 'Krishna '] };
const tName = (idx, paksha, t) => { const sp = idx === 14 || idx === 29, pk = sp ? ['', ''] : PK[paksha]; return { hi: pk[0] + t.hi, en: pk[1] + t.en }; };
const chip = (on) => ({ padding: '7px 13px', borderRadius: '999px', fontSize: '13px', textDecoration: 'none', border: '1px solid ' + (on ? 'var(--pub-gold)' : 'var(--color-border-secondary)'), background: on ? 'var(--color-background-warning)' : 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontWeight: on ? 700 : 400, whiteSpace: 'nowrap' });

export default function HinduMonth({ year, month, isIndex = false }) {
  const [y0, y1] = CAL_RANGE;
  const days = monthPanchang(year, month);
  const byDate = eventsByDate(year, []);
  const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells = [...Array(lead).fill(null), ...days];
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const monthEvents = eventsForYear(year).filter((e) => Number(e.date.slice(5, 7)) === month);

  return (
    <PublicShell>
      <PageHero glyph="📅" title={<Bi hi={`हिंदू कैलेंडर — ${MON[month - 1][0]} ${year}`} en={`Hindu calendar — ${MON[month - 1][1]} ${year}`} />}
        sub={<Bi hi="हर दिन की तिथि, नक्षत्र और व्रत-त्योहार। किसी भी तारीख़ पर टैप करें, उस दिन का पूरा पंचांग खुलेगा।" en="Tithi, nakshatra and fasts or festivals for every day. Tap any date to open that day's full panchang." />} />

      <CalendarToday year={year} month={month} isIndex={isIndex} y0={y0} y1={y1} />

      {/* year + today */}
      <nav aria-label="Year" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
        {Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i).map((y) => (
          <Link key={y} href={hrefOf(y, y === year ? month : 1)} prefetch={false} style={chip(y === year)} aria-current={y === year ? 'page' : undefined}>{y}</Link>
        ))}
        <span style={{ flex: 1 }} />
        <Link href="/calendar" prefetch={false} style={chip(false)}><Bi hi="आज का महीना" en="This month" /></Link>
      </nav>

      {/* the twelve months of this year */}
      <nav aria-label="Month" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {MON.map((mn, i) => (
          <Link key={i} href={hrefOf(year, i + 1)} prefetch={false} style={{ ...chip(i + 1 === month), padding: '6px 11px', fontSize: '12.5px' }} aria-current={i + 1 === month ? 'page' : undefined}><Bi hi={mn[0]} en={MON_S[i]} /></Link>
        ))}
      </nav>

      {/* prev / next */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        {prev.y >= y0 ? <Link href={hrefOf(prev.y, prev.m)} prefetch={false} style={{ color: 'var(--color-text-info)', fontSize: '14px' }}>← <Bi hi="पिछला" en="Previous" /></Link> : <span />}
        <h2 className="display" style={{ margin: 0, fontSize: '20px' }}><Bi hi={`${MON[month - 1][0]} ${year}`} en={`${MON[month - 1][1]} ${year}`} /></h2>
        {next.y <= y1 ? <Link href={hrefOf(next.y, next.m)} prefetch={false} style={{ color: 'var(--color-text-info)', fontSize: '14px' }}><Bi hi="अगला" en="Next" /> →</Link> : <span />}
      </div>

      {/* the month */}
      <div className="cal-grid" role="grid" aria-label={`${MON[month - 1][1]} ${year}`}>
        {WD.map((w, i) => <div key={i} className={`cal-wd${i === 0 ? ' cal-sun' : ''}`} role="columnheader"><Bi hi={w[0]} en={w[1]} /></div>)}
        {cells.map((c, i) => {
          if (!c) return <div key={'e' + i} className="cal-blank" aria-hidden="true" />;
          const s = iso(year, month, c.d), ev = byDate[s] || [], dow = (lead + c.d - 1) % 7;
          const special = c.ok && (c.idx === 14 ? 'purnima' : c.idx === 29 ? 'amavasya' : null);
          const pHi = c.ok && (special ? '' : (c.paksha === 'shukla' ? 'शुक्ल ' : 'कृष्ण ')), pEn = c.ok && (special ? '' : (c.paksha === 'shukla' ? 'Shukla ' : 'Krishna '));
          const label = [c.ok && `${c.tithi.en}, ${c.nak.en}`, ...ev.map((e) => e.en)].filter(Boolean).join('; ');
          return (
            <Link key={s} href={`/panchang/${s}`} data-d={s} aria-label={`${c.d} ${MON_S[month - 1]} ${year}${label ? ': ' + label : ''}`}
              className={`cal-d${dow === 0 ? ' cal-sun' : ''}${ev.length ? ' cal-has' : ''}`} style={ev.length ? { '--ec': TYPES[ev[0].type].color } : undefined}>
              <span className="cal-top">
                <b className="cal-n">{c.d}</b>
                {special && <span className="cal-moon" aria-hidden="true">{special === 'purnima' ? '○' : '●'}</span>}
              </span>
              {c.ok && (
                <>
                  <span className="cal-tf"><Bi hi={`${pHi}${c.tithi.hi}`} en={`${pEn}${c.tithi.en}`} /></span>
                  <span className="cal-ts"><Bi hi={special ? (special === 'purnima' ? 'पू' : 'अ') : `${c.paksha === 'shukla' ? 'शु' : 'कृ'}${DN(c.num)}`} en={special ? (special === 'purnima' ? 'Pur' : 'Ama') : `${c.paksha === 'shukla' ? 'S' : 'K'}${c.num}`} /></span>
                  <span className="cal-te">→ {fmt(c.tithiEnd.min)}{c.tithiEnd.dayOff ? ' +1' : ''}</span>
                  {c.t2 && <span className="cal-t2"><Bi hi={`फिर ${tName(c.t2.idx, c.t2.paksha, c.t2).hi}`} en={`then ${tName(c.t2.idx, c.t2.paksha, c.t2).en}`} /></span>}
                  <span className="cal-nk"><Bi hi={c.nak.hi} en={c.nak.en} /></span>
                </>
              )}
              {ev.slice(0, 2).map((e, k) => <span key={k} className="cal-e" style={{ color: TYPES[e.type].color }}><Bi hi={e.hi} en={e.en} /></span>)}
              {ev.length > 2 && <span className="cal-more">+{ev.length - 2}</span>}
            </Link>
          );
        })}
      </div>

      <p className="cal-legend">
        {TYPE_ORDER.map((k) => <span key={k}><i style={{ background: TYPES[k].color }} /><Bi hi={TYPES[k].hi} en={TYPES[k].en} /></span>)}
        <span><b aria-hidden="true">○</b> <Bi hi="पूर्णिमा" en="Purnima" /></span>
        <span><b aria-hidden="true">●</b> <Bi hi="अमावस्या" en="Amavasya" /></span>
        <span><Bi hi="शु = शुक्ल पक्ष, कृ = कृष्ण पक्ष" en="S = Shukla paksha, K = Krishna paksha" /></span>
      </p>

      {/* this month's observances */}
      {/* phones: every day of the month with its full panchang and observances */}
      <section className="cal-dlist" style={{ ...card, padding: '6px 10px', marginTop: '14px' }}>
        <h3 className="display" style={{ margin: '10px 4px 4px', fontSize: '17px' }}><Bi hi={`${MON[month - 1][0]} ${year} — दिन-वार पंचांग`} en={`${MON[month - 1][1]} ${year} — day by day`} /></h3>
        {days.map((c) => {
          const s = iso(year, month, c.d), ev = byDate[s] || [], dow = (lead + c.d - 1) % 7;
          const t1 = c.ok ? tName(c.idx, c.paksha, c.tithi) : null, t2 = c.ok && c.t2 ? tName(c.t2.idx, c.t2.paksha, c.t2) : null;
          return (
            <Link key={s} href={`/panchang/${s}`} data-d={s} className={`cal-row${dow === 0 ? ' cal-sun' : ''}${ev.length ? ' cal-has' : ''}`} style={ev.length ? { '--ec': TYPES[ev[0].type].color } : undefined}>
              <span className="cal-rd"><b>{c.d}</b><small><Bi hi={WD[dow][0]} en={WD[dow][1]} /></small></span>
              <span className="cal-rb">
                {ev.map((e, k) => <span key={k} className="cal-rev" style={{ color: TYPES[e.type].color }}><span aria-hidden="true">{TYPES[e.type].glyph}</span> <Bi hi={e.hi} en={e.en} /></span>)}
                {c.ok && (
                  <span className="cal-rp">
                    <span><Bi hi={t1.hi} en={t1.en} /> <em>→ {fmt(c.tithiEnd.min)}{c.tithiEnd.dayOff ? ' +1' : ''}</em></span>
                    {t2 && <span className="cal-r2"><Bi hi={`फिर ${t2.hi}`} en={`then ${t2.en}`} /></span>}
                    <span className="cal-rn"><Bi hi={`नक्षत्र ${c.nak.hi}`} en={`Nakshatra ${c.nak.en}`} /></span>
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </section>

      <section className="cal-flist" style={{ ...card, padding: '6px 14px', marginTop: '14px' }}>
        <h3 className="display" style={{ margin: '10px 0 2px', fontSize: '17px' }}><Bi hi={`${MON[month - 1][0]} ${year} के व्रत और त्योहार`} en={`Fasts and festivals — ${MON[month - 1][1]} ${year}`} /></h3>
        {monthEvents.length === 0
          ? <p style={{ margin: '12px 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}><Bi hi="इस महीने में कोई व्रत/त्योहार नहीं।" en="No fasts or festivals this month." /></p>
          : monthEvents.map((e, i) => {
            const t = TYPES[e.type], wd = wdOf(e.date), multi = e.to !== e.date;
            return (
              <Link key={i} href={e.href} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid var(--color-border-tertiary)', textDecoration: 'none', color: 'var(--color-text-primary)' }}>
                <span style={{ minWidth: '58px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  <b style={{ fontSize: '17px', color: 'var(--color-text-primary)' }}>{dnum(e.date)}</b> {MON_S[Number(e.date.slice(5, 7)) - 1]}<br />
                  <small><Bi hi={WD[wd][0]} en={WD[wd][1]} />{multi ? ` → ${dnum(e.to)} ${MON_S[Number(e.to.slice(5, 7)) - 1]}` : ''}</small>
                </span>
                <span style={{ flex: 1, fontSize: '15px' }}><span aria-hidden="true" style={{ color: t.color }}>{t.glyph}</span> <Bi hi={e.hi} en={e.en} /></span>
                <span style={{ fontSize: '11px', color: t.color, border: `1px solid ${t.color}`, borderRadius: '999px', padding: '2px 8px', whiteSpace: 'nowrap' }}><Bi hi={t.hi} en={t.en} /></span>
              </Link>
            );
          })}
      </section>

      {/* export */}
      <section style={{ ...card, marginTop: '14px' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '16px' }}><Bi hi="अपने फ़ोन के कैलेंडर में जोड़ें" en="Add to your phone's calendar" /></h3>
        <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
          <Bi hi="ICS फ़ाइल Google Calendar, Apple Calendar और Outlook में खुलती है।" en="The ICS file opens in Google Calendar, Apple Calendar and Outlook." />
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a className="pub-btn pub-btn-gold" rel="nofollow" href={`/calendar/ics?y=${year}&l=hi`} style={{ minHeight: '42px', fontSize: '14px' }}>⬇ <Bi hi={`${year} (हिंदी)`} en={`${year} (Hindi names)`} /></a>
          <a className="pub-btn pub-btn-gold" rel="nofollow" href={`/calendar/ics?y=${year}&l=en`} style={{ minHeight: '42px', fontSize: '14px' }}>⬇ <Bi hi={`${year} (English)`} en={`${year} (English names)`} /></a>
          <a className="pub-btn pub-btn-gold" rel="nofollow" href="/calendar/ics?y=all&l=hi" style={{ minHeight: '42px', fontSize: '14px' }}>⬇ <Bi hi="2026–2028 सभी" en="All 2026–2028" /></a>
        </div>
      </section>

      <p style={{ ...card, margin: '14px 0 0', fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)', background: 'var(--color-background-warning)' }}>
        <Bi hi="यह कैलेंडर AstroBharat ने दिल्ली (IST) के लिए गणना से बनाया है। हर दिन की तिथि और नक्षत्र दिल्ली के सूर्योदय के समय के हैं, और तिथि के अंत का समय IST में है। परंपरा और शहर के अनुसार व्रत/त्योहार का दिन एक दिन आगे-पीछे हो सकता है — कृपया अपने स्थानीय पंचांग या पंडित जी से पुष्टि कर लें। बहु-दिवसीय त्योहार हर दिन दिखते हैं।"
          en="This calendar is computed by AstroBharat for Delhi (IST). Each day's tithi and nakshatra are the ones running at Delhi sunrise, and the tithi end time is in IST. Depending on tradition and city, a fast or festival can fall a day earlier or later — please confirm with your local panchang or pandit. Multi-day festivals show on every day." />
      </p>
    </PublicShell>
  );
}

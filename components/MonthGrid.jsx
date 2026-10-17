// components/MonthGrid.jsx — one month as a calendar grid (Sunday first). Shared by /calendar and /tyohar.
// byDate: { 'YYYY-MM-DD': [ { type, hi, en, ... } ] }. Each day links to that day's panchang.
import Link from 'next/link';
import Bi from '@/components/Bi';
import { TYPES } from '@/lib/calendar-events';

const MON_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = [['र', 'S'], ['सो', 'M'], ['मं', 'T'], ['बु', 'W'], ['गु', 'T'], ['शु', 'F'], ['श', 'S']];
const WD_FULL = [['रवि', 'Sun'], ['सोम', 'Mon'], ['मंगल', 'Tue'], ['बुध', 'Wed'], ['गुरु', 'Thu'], ['शुक्र', 'Fri'], ['शनि', 'Sat']];
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const firstDow = (y, m) => new Date(Date.UTC(y, m - 1, 1)).getUTCDay();

export default function MonthGrid({ year, month, byDate, today, big = false }) {
  const lead = firstDow(year, month), n = dim(year, month);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: big ? '4px' : '2px' }}>
      {WD.map((w, i) => <div key={i} style={{ textAlign: 'center', fontSize: big ? '12px' : '10px', color: 'var(--color-text-tertiary)', padding: '2px 0', fontWeight: 600 }}><Bi hi={big ? WD_FULL[i][0] : w[0]} en={big ? WD_FULL[i][1] : w[1]} /></div>)}
      {cells.map((d, i) => {
        if (!d) return <div key={'e' + i} />;
        const s = iso(year, month, d), ev = byDate[s] || [], isToday = s === today;
        const base = { display: 'block', textDecoration: 'none', color: 'var(--color-text-primary)', borderRadius: big ? '8px' : '6px', border: isToday ? '2px solid var(--pub-gold)' : '1px solid ' + (ev.length ? 'var(--color-border-secondary)' : 'transparent'), background: ev.length ? 'var(--color-background-secondary)' : 'transparent', padding: big ? '4px 5px' : '2px 0', textAlign: big ? 'left' : 'center', minHeight: big ? '66px' : '26px', overflow: 'hidden' };
        const label = ev.map(e => e.en).join(', ');
        return (
          <Link key={s} href={`/panchang/${s}`} style={base} aria-label={`${d} ${MON_S[month - 1]} ${year}${label ? ': ' + label : ''}`}>
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

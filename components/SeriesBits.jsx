// small shared pieces for the Pradosh / Purnima / Amavasya pages
import Link from '@/components/PLink';
import Bi from '@/components/Bi';
import { formatDateLong } from '@/lib/date-format';

export const WDN = [['रविवार', 'Sun'], ['सोमवार', 'Mon'], ['मंगलवार', 'Tue'], ['बुधवार', 'Wed'], ['गुरुवार', 'Thu'], ['शुक्रवार', 'Fri'], ['शनिवार', 'Sat']];
export const fdate = (iso, l) => formatDateLong(...iso.split('-').map(Number), l);
export const dm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)} ${s.slice(11)}`;
export const chip = (on) => ({ padding: '7px 13px', borderRadius: '999px', fontSize: '13px', textDecoration: 'none', border: '1px solid ' + (on ? 'var(--pub-gold)' : 'var(--color-border-secondary)'), background: on ? 'var(--color-background-warning)' : 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontWeight: on ? 700 : 400 });

/** one dated row: weekday + date, label, tithi window and optional extra line */
export function DateRow({ o, wd, label, sub, extra, href, past, first }) {
  return (
    <Link href={href || `/panchang/${o.date}`} style={{ display: 'block', padding: '11px 2px', borderTop: first ? 'none' : '1px solid var(--color-border-tertiary)', textDecoration: 'none', color: 'var(--color-text-primary)', opacity: past ? 0.55 : 1 }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <b style={{ fontSize: '16px' }}><Bi hi={`${WDN[wd][0]}, ${fdate(o.date, 'hi')}`} en={`${WDN[wd][1]}, ${fdate(o.date, 'en')}`} /></b>
        {label && <span style={{ fontSize: '14px', color: 'var(--color-text-info)', fontWeight: 600 }}>{label}</span>}
      </div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>{sub}</div>}
      {extra && <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px', lineHeight: 1.65 }}>{extra}</div>}
    </Link>
  );
}

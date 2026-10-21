import Link from '@/components/PLink';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { ekadashiOccurrences, MONTH_TABLE, MONTHS } from '@/lib/ekadashi';
import { EKADASHI } from '@/lib/ekadashi-content';
import { EKADASHI_GENERAL_PRAYER } from '@/lib/ekadashi-hi';
import { GENERAL_PRAYER_EN } from '@/lib/ekadashi-msg-en';
import { formatDateLong } from '@/lib/date-format';
import { todayIST } from '@/lib/rashifal';

export const metadata = {
  title: 'एकादशी 2026, 2027, 2028 — सभी 24 एकादशी की तिथि, कथा और पारण | Ekadashi dates',
  description: 'सभी 24 (अधिक मास में 26) एकादशी के नाम, तिथि, संक्षिप्त कथा और पारण का समय — कामदा से आमलकी तक। Every Ekadashi with dates, short katha and pāraṇa time.',
  alternates: { canonical: '/ekadashi' },
};
const WD = [['रविवार', 'Sun'], ['सोमवार', 'Mon'], ['मंगलवार', 'Tue'], ['बुधवार', 'Wed'], ['गुरुवार', 'Thu'], ['शुक्रवार', 'Fri'], ['शनिवार', 'Sat']];
const wdOf = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const pk = (p) => (p === 'shukla' ? ['शुक्ल', 'Shukla'] : ['कृष्ण', 'Krishna']);

export default async function EkadashiIndex({ searchParams }) {
  const sp = await searchParams;
  const today = todayIST().iso;
  const all = ekadashiOccurrences();
  const year = [2026, 2027, 2028].includes(Number(sp?.y)) ? Number(sp.y) : (['2026', '2027', '2028'].includes(today.slice(0, 4)) ? Number(today.slice(0, 4)) : 2026);
  const list = all.filter(o => o.date.startsWith(String(year)));
  const next = all.find(o => o.date >= today);
  const chip = (on) => ({ padding: '7px 13px', borderRadius: '999px', fontSize: '13px', textDecoration: 'none', border: '1px solid ' + (on ? 'var(--pub-gold)' : 'var(--color-border-secondary)'), background: on ? 'var(--color-background-warning)' : 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontWeight: on ? 700 : 400 });
  const fmtD = (iso, l) => { const [y, m, d] = iso.split('-').map(Number); return formatDateLong(y, m, d, l); };

  return (
    <PublicShell>
      <PageHero glyph="☊" title={<Bi hi="एकादशी — तिथि, कथा और पारण" en="Ekadashi — dates, katha and pāraṇa" />}
        sub={<Bi hi="हर पक्ष की ग्यारहवीं तिथि भगवान विष्णु को समर्पित है। साल की सभी एकादशी के नाम, सटीक तिथि और संक्षिप्त कथा।" en="The eleventh tithi of each fortnight is dedicated to Vishnu. Every Ekadashi of the year with its name, exact date and a short katha." />} />

      {next && (
        <Link href={`/ekadashi/${next.slug}`} style={{ ...card, display: 'block', textDecoration: 'none', color: 'var(--color-text-primary)', borderColor: 'var(--pub-gold)', marginBottom: '14px' }}>
          <small style={{ color: 'var(--color-text-tertiary)' }}><Bi hi="अगली एकादशी" en="Next Ekadashi" /></small>
          <div className="display" style={{ fontSize: '21px', margin: '2px 0' }}><Bi hi={EKADASHI[next.slug].hi} en={EKADASHI[next.slug].en} /></div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}><Bi hi={`${WD[wdOf(next.date)][0]}, ${fmtD(next.date, 'hi')}`} en={`${WD[wdOf(next.date)][1]}, ${fmtD(next.date, 'en')}`} /></div>
        </Link>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[2026, 2027, 2028].map(y => <Link key={y} href={`/ekadashi?y=${y}`} style={chip(y === year)}>{y}</Link>)}
        <span style={{ alignSelf: 'center', fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi={`${list.length} एकादशी${list.some(o => o.adhika) ? ' (अधिक मास सहित)' : ''}`} en={`${list.length} Ekadashis${list.some(o => o.adhika) ? ' (incl. adhika masa)' : ''}`} /></span>
      </div>

      <section style={{ ...card, padding: '4px 14px', marginBottom: '16px' }}>
        {list.map((o, i) => {
          const c = EKADASHI[o.slug], p = pk(o.paksha), past = o.date < today;
          return (
            <Link key={i} href={`/ekadashi/${o.slug}`} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '11px 2px', borderTop: i ? '1px solid var(--color-border-tertiary)' : 'none', textDecoration: 'none', color: 'var(--color-text-primary)', opacity: past ? 0.55 : 1 }}>
              <span style={{ minWidth: '74px', fontSize: '13px', color: 'var(--color-text-secondary)' }}><b style={{ fontSize: '16px', color: 'var(--color-text-primary)' }}>{Number(o.date.slice(8))}</b> <Bi hi={fmtD(o.date, 'hi').split(' ')[1]} en={fmtD(o.date, 'en').split(' ')[1]} /><br /><small><Bi hi={WD[wdOf(o.date)][0]} en={WD[wdOf(o.date)][1]} /></small></span>
              <span style={{ flex: 1, fontSize: '15px' }}><Bi hi={c.hi} en={c.en} /><br /><small style={{ color: 'var(--color-text-tertiary)' }}>{o.adhika ? <Bi hi={`अधिक मास · ${p[0]} पक्ष`} en={`Adhika masa · ${p[1]} paksha`} /> : <Bi hi={`${MONTHS[o.monthIdx][0]} ${p[0]} पक्ष`} en={`${MONTHS[o.monthIdx][1]} ${p[1]} paksha`} />}</small></span>
              <span aria-hidden="true" style={{ color: 'var(--color-text-tertiary)' }}>›</span>
            </Link>
          );
        })}
      </section>

      <section style={{ ...card, marginBottom: '14px' }}>
        <h2 className="display" style={{ margin: '0 0 8px', fontSize: '18px' }}><Bi hi="24 एकादशी — महीने के अनुसार" en="The 24 Ekadashis — by month" /></h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '8px 16px', fontSize: '14px' }}>
          {MONTH_TABLE.map(([k, s], i) => (
            <div key={i}>
              <b style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi={MONTHS[i][0]} en={MONTHS[i][1]} /></b><br />
              <Link href={`/ekadashi/${s}`} style={{ color: 'var(--color-text-info)' }}><Bi hi={`${EKADASHI[s].hi.replace(' एकादशी', '')} (शुक्ल)`} en={`${EKADASHI[s].en.replace(' Ekadashi', '')} (S)`} /></Link><br />
              <Link href={`/ekadashi/${k}`} style={{ color: 'var(--color-text-info)' }}><Bi hi={`${EKADASHI[k].hi.replace(' एकादशी', '')} (कृष्ण)`} en={`${EKADASHI[k].en.replace(' Ekadashi', '')} (K)`} /></Link>
            </div>
          ))}
          <div><b style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}><Bi hi="अधिक मास (हर ~3 वर्ष)" en="Adhika masa (every ~3 years)" /></b><br />
            <Link href="/ekadashi/padmini" style={{ color: 'var(--color-text-info)' }}><Bi hi="पद्मिनी (शुक्ल)" en="Padmini (S)" /></Link><br />
            <Link href="/ekadashi/parama" style={{ color: 'var(--color-text-info)' }}><Bi hi="परमा (कृष्ण)" en="Parama (K)" /></Link></div>
        </div>
      </section>

      <section style={{ ...card, marginBottom: '14px' }}>
        <h2 className="display" style={{ margin: '0 0 8px', fontSize: '18px' }}><Bi hi="एकादशी की सरल प्रार्थना" en="A simple Ekadashi prayer" /></h2>
        <p style={{ margin: 0, lineHeight: 1.9, fontSize: '15px', textAlign: 'center', whiteSpace: 'pre-line' }}><Bi hi={EKADASHI_GENERAL_PRAYER.join('\n')} en={GENERAL_PRAYER_EN.join('\n')} /></p>
      </section>

      <p style={{ ...card, fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)', background: 'var(--color-background-warning)' }}>
        <Bi hi="तिथियाँ दिल्ली के सूर्योदय के अनुसार गणना से निकाली गई हैं (स्मार्त परंपरा)। वैष्णव संप्रदाय में एकादशी अक्सर अगले दिन मनाई जाती है, और शहर के अनुसार भी एक दिन का अंतर हो सकता है — अपने मंदिर या पंचांग से पुष्टि करें। व्रत की विधि के लिए एकादशी व्रत-विधि देखें।" en="Dates are computed for Delhi’s sunrise (Smarta convention). Vaishnava traditions often keep the Ekadashi on the next day, and cities can differ by a day — confirm with your temple or panchang. For the way to keep the vrat, see the Ekadashi vrat guide." />
        {' '}<Link href="/vrat/ekadashi" style={{ color: 'var(--color-text-info)' }}><Bi hi="व्रत-विधि →" en="Vrat vidhi →" /></Link>
      </p>
    </PublicShell>
  );
}

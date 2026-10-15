import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { FEST_PAGES, FEST_SLUGS, festivalOccurrences } from '@/lib/festival-pages';
import { buildPanchang, inRange } from '@/lib/panchang-engine';
import { CITIES, fmt } from '@/lib/panchang';
import { formatDateLong } from '@/lib/date-format';
import { addDays } from '@/lib/calendar-events';
import { todayIST } from '@/lib/rashifal';

export function generateStaticParams() { return FEST_SLUGS.map(slug => ({ slug })); }

export async function generateMetadata({ params }) {
  const { slug } = await params; const f = FEST_PAGES[slug]; if (!f) return {};
  const occ = festivalOccurrences(f.fk)[0];
  return {
    title: `${f.hi} — पूजा विधि, कथा, शुभ समय | ${f.en} puja vidhi, katha${occ ? ' ' + occ.year : ''}`,
    description: `${f.hi}: ${f.why.hi.slice(0, 95)}… पूजा विधि, सामग्री, कथा और तिथि। ${f.en} puja vidhi, samagri, katha and dates.`,
    alternates: { canonical: `/tyohar/${slug}` },
  };
}
const WD = [['रविवार', 'Sun'], ['सोमवार', 'Mon'], ['मंगलवार', 'Tue'], ['बुधवार', 'Wed'], ['गुरुवार', 'Thu'], ['शुक्रवार', 'Fri'], ['शनिवार', 'Sat']];
const wdOf = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const fd = (iso, l) => formatDateLong(...iso.split('-').map(Number), l);
const pc = (iso) => { const [y, m, d] = iso.split('-').map(Number); return inRange(y) ? buildPanchang(y, m, d, CITIES[0]) : null; };
const h2 = { margin: '0 0 8px', fontSize: '18px' };

/** the computed times for one date: sunset / pradosh window / sunrise */
function times(kind, iso) {
  if (!kind || kind === 'chhath') return null;
  const p = pc(iso); if (!p) return null;
  if (kind === 'sunset') return { hi: `सूर्यास्त ${fmt(p.sunset)} (दिल्ली)`, en: `Sunset ${fmt(p.sunset)} (Delhi)` };
  if (kind === 'sunrise') return { hi: `सूर्योदय ${fmt(p.sunrise)} (दिल्ली)`, en: `Sunrise ${fmt(p.sunrise)} (Delhi)` };
  if (kind === 'pradosh') return { hi: `सूर्यास्त ${fmt(p.sunset)} · प्रदोष काल लगभग ${fmt(p.sunset)} से ${fmt(p.sunset + 144)} (दिल्ली)`, en: `Sunset ${fmt(p.sunset)} · Pradosh Kaal about ${fmt(p.sunset)} to ${fmt(p.sunset + 144)} (Delhi)` };
  return null;
}

export default async function FestivalPage({ params }) {
  const { slug } = await params; const f = FEST_PAGES[slug]; if (!f) notFound();
  const today = todayIST().iso;
  const occ = festivalOccurrences(f.fk);
  const next = occ.find(o => o.p >= today || (o.c || []).some(x => x >= today)) || occ[occ.length - 1];

  return (
    <PublicShell>
      <PageHero glyph={f.glyph} title={<Bi hi={f.hi} en={f.en} />} sub={<Bi hi={f.sub.hi} en={f.sub.en} />} />

      <section style={{ ...card, marginBottom: '14px' }}>
        <h2 className="display" style={h2}><Bi hi="तिथि और समय" en="Dates and timing" /></h2>
        {occ.map((o, k) => {
          const t = times(f.timeKind, o.p), past = o.p < today && !o.c.some(x => x >= today);
          const multi = o.c.length > 1;
          return (
            <div key={k} style={{ padding: '10px 0', borderTop: k ? '1px solid var(--color-border-tertiary)' : 'none', opacity: past ? 0.55 : 1 }}>
              <Link href={`/panchang/${o.p}`} style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-primary)', textDecoration: 'none' }}>
                <Bi hi={`${WD[wdOf(o.p)][0]}, ${fd(o.p, 'hi')}`} en={`${WD[wdOf(o.p)][1]}, ${fd(o.p, 'en')}`} />
              </Link>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.75, marginTop: '2px' }}>
                {multi && <div><Bi hi={`तिथि ${o.c.map(x => fd(x, 'hi')).join(' और ')} दोनों दिन रहती है — परंपरा और स्थानीय पंचांग के अनुसार दिन तय करें।`} en={`The tithi is present on ${o.c.map(x => fd(x, 'en')).join(' and ')} — decide the day by tradition and your local panchang.`} /></div>}
                {o.s && <div><Bi hi={`तिथि: ${o.s.slice(8, 10)}/${o.s.slice(5, 7)} ${o.s.slice(11)} से ${o.e.slice(8, 10)}/${o.e.slice(5, 7)} ${o.e.slice(11)} तक (IST)`} en={`Tithi: ${o.s.slice(8, 10)}/${o.s.slice(5, 7)} ${o.s.slice(11)} to ${o.e.slice(8, 10)}/${o.e.slice(5, 7)} ${o.e.slice(11)} (IST)`} /></div>}
                {t && <div><Bi hi={t.hi} en={t.en} /></div>}
              </div>
            </div>
          );
        })}
        {f.timeKind === 'chhath' ? null : <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.75 }}><Bi hi={f.time.hi} en={f.time.en} /></p>}
      </section>

      {f.stages && (
        <section style={{ ...card, marginBottom: '14px' }}>
          <h2 className="display" style={h2}><Bi hi={`चार दिन का क्रम — ${next ? fd(next.p, 'hi').slice(-4) : ''}`} en={`The four days — ${next ? fd(next.p, 'en').slice(-4) : ''}`} /></h2>
          {f.stages.map((s, i) => {
            const date = next ? addDays(next.p, s.off) : null; const p = date ? pc(date) : null;
            const tm = i === 2 && p ? { hi: ` · सूर्यास्त ${fmt(p.sunset)}`, en: ` · sunset ${fmt(p.sunset)}` } : i === 3 && p ? { hi: ` · सूर्योदय ${fmt(p.sunrise)}`, en: ` · sunrise ${fmt(p.sunrise)}` } : { hi: '', en: '' };
            return (
              <div key={i} style={{ padding: '9px 0', borderTop: i ? '1px solid var(--color-border-tertiary)' : 'none' }}>
                <b><Bi hi={s.hi} en={s.en} /></b>
                {date && <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}> · <Bi hi={`${fd(date, 'hi')}${tm.hi} (दिल्ली)`} en={`${fd(date, 'en')}${tm.en} (Delhi)`} /></span>}
                <p style={{ margin: '3px 0 0', fontSize: '14px', lineHeight: 1.8 }}><Bi hi={s.t.hi} en={s.t.en} /></p>
              </div>
            );
          })}
        </section>
      )}

      <section style={{ ...card, marginBottom: '14px' }}>
        <h2 className="display" style={h2}><Bi hi="महत्त्व" en="Significance" /></h2>
        <p style={{ margin: 0, lineHeight: 1.9, fontSize: '15px' }}><Bi hi={f.why.hi} en={f.why.en} /></p>
      </section>

      <section id="vidhi" style={{ ...card, marginBottom: '14px', scrollMarginTop: '80px' }}>
        <h2 className="display" style={h2}><Bi hi="पूजा सामग्री" en="Puja materials" /></h2>
        <p style={{ margin: '0 0 14px', lineHeight: 1.85, fontSize: '15px' }}><Bi hi={f.samagri.hi} en={f.samagri.en} /></p>
        <h2 className="display" style={h2}><Bi hi="पूजा विधि" en="Puja vidhi" /></h2>
        <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.9, fontSize: '15px' }}>{f.vidhi.map((s, i) => <li key={i} style={{ marginBottom: '5px' }}><Bi hi={s.hi} en={s.en} /></li>)}</ol>
        {f.mantra && <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: '21px', fontWeight: 600 }}>{f.mantra}</p>}
      </section>

      <section id="katha" style={{ ...card, marginBottom: '14px', scrollMarginTop: '80px' }}>
        <h2 className="display" style={h2}><Bi hi="कथा" en="Katha" /></h2>
        <p style={{ margin: 0, lineHeight: 1.9, fontSize: '15px' }}><Bi hi={f.katha.hi} en={f.katha.en} /></p>
        {f.note && <p style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: '10px', background: 'var(--color-background-warning)', fontSize: '13px', lineHeight: 1.75 }}><Bi hi={f.note.hi} en={f.note.en} /></p>}
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: 1.7 }}><Bi hi="यह प्रचलित परंपरा के आधार पर लिखी संक्षिप्त कथा और विधि है। क्षेत्र, परिवार और संप्रदाय के अनुसार रीति-रिवाज बदल सकते हैं; अपनी परंपरा या पंडित जी के निर्देश को प्राथमिकता दें। तिथि दिल्ली के लिए गणना की गई है।" en="This is a short account and vidhi based on widely followed tradition. Customs differ by region, family and sampradaya; give priority to your own tradition or your priest. Dates are computed for Delhi." /></p>
      </section>

      <section style={{ ...card, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {f.guide && <Link href={f.guide} className="pub-btn pub-btn-gold" style={{ minHeight: '42px', fontSize: '14px' }}><Bi hi="आरती / पाठ" en="Aarti / text" /></Link>}
        <Link href="/tyohar" className="pub-btn pub-btn-line" style={{ minHeight: '42px', fontSize: '14px', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}><Bi hi="सभी त्योहार" en="All festivals" /></Link>
        <Link href="/calendar" className="pub-btn pub-btn-line" style={{ minHeight: '42px', fontSize: '14px', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}>📅 <Bi hi="कैलेंडर" en="Calendar" /></Link>
      </section>
    </PublicShell>
  );
}

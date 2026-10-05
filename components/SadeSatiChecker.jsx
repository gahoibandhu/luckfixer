'use client';
// Sade Sati / Dhaiya from Saturn's real sidereal sign stays (lib/saturn-ingress.js, generated with pyswisseph).
// Shown as THREE clear lines (one per phase) + a colour timeline; Saturn's retrograde re-entries are folded into each
// phase's span and listed only under "exact stretches".
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { RASHIS } from '@/lib/public-content';
import { SATURN_STAYS } from '@/lib/saturn-ingress';
import { useUiLang } from '@/lib/i18n';

const card = { background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '14px', padding: '16px' };
const todayISO = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const day = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5;
const MON_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MON_HI = ['जन','फ़र','मार्च','अप्रै','मई','जून','जुल','अग','सित','अक्टू','नव','दिस'];
const fmt = (iso, en) => `${+iso.slice(8, 10)} ${(en ? MON_EN : MON_HI)[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
const length = (a, b, en) => { const m = Math.round((day(b) - day(a)) / 30.44), y = Math.floor(m / 12), r = m % 12; return en ? `≈ ${y ? y + ' yr ' : ''}${r ? r + ' mo' : ''}`.trim() : `≈ ${y ? y + ' वर्ष ' : ''}${r ? r + ' माह' : ''}`.trim(); };

const PHASE = {
  first: { c: '#f0a81c', en: 'Phase 1 · Rising', hi: 'पहला चरण · उदय', ed: 'Saturn in the 12th from your Moon', hd: 'चंद्रमा से 12वें में शनि' },
  peak:  { c: '#d9452f', en: 'Phase 2 · Peak', hi: 'दूसरा चरण · मध्य', ed: 'Saturn over your Moon sign', hd: 'आपकी राशि में शनि' },
  last:  { c: '#4a6bd6', en: 'Phase 3 · Setting', hi: 'तीसरा चरण · अस्त', ed: 'Saturn in the 2nd from your Moon', hd: 'चंद्रमा से दूसरे में शनि' },
};
const DH = {
  dhaiya4: { en: 'Dhaiya (Ardhashtama) — Saturn in the 4th from your Moon', hi: 'ढैया (अर्धाष्टम) — चंद्रमा से चौथे में शनि' },
  dhaiya8: { en: 'Dhaiya (Ashtama) — Saturn in the 8th from your Moon', hi: 'ढैया (अष्टम) — चंद्रमा से आठवें में शनि' },
};

export default function SadeSatiChecker() {
  const en = useUiLang() === 'en';
  const [r, setR] = useState(null);
  const [today, setToday] = useState(null);
  useEffect(() => { setToday(todayISO()); }, []);

  const A = useMemo(() => {
    if (r === null || !today) return null;
    const sign = { first: (r + 11) % 12, peak: r, last: (r + 1) % 12 };
    const d4 = (r + 3) % 12, d8 = (r + 7) % 12;
    const kindOf = (s) => s === sign.first ? 'first' : s === sign.peak ? 'peak' : s === sign.last ? 'last' : s === d4 ? 'dhaiya4' : s === d8 ? 'dhaiya8' : null;
    const stays = SATURN_STAYS.map(x => ({ ...x, kind: kindOf(x.s) })).filter(x => x.kind);
    const current = stays.find(x => x.from <= today && today <= x.to) || null;
    // group Sade Sati stays into cycles (stays closer than ~4 years belong to one cycle)
    const ss = stays.filter(x => ['first', 'peak', 'last'].includes(x.kind));
    const cycles = [];
    ss.forEach(x => { const c = cycles[cycles.length - 1]; if (c && day(x.from) - day(c.to) < 1500) { c.to = x.to; c.stays.push(x); } else cycles.push({ from: x.from, to: x.to, stays: [x] }); });
    const cycle = cycles.find(c => c.to >= today) || null;
    let phases = [];
    if (cycle) phases = ['first', 'peak', 'last'].map(k => {
      const st = cycle.stays.filter(x => x.kind === k);
      if (!st.length) return null;
      return { k, sign: sign[k], stays: st, from: st[0].from, to: st[st.length - 1].to, now: st.some(x => x.from <= today && today <= x.to) };
    }).filter(Boolean);
    // Dhaiya: merge re-entries of the same kind that are less than a year apart
    const dh = [];
    stays.filter(x => x.kind.startsWith('dhaiya') && x.to >= today).forEach(x => { const l = dh[dh.length - 1]; if (l && l.kind === x.kind && day(x.from) - day(l.to) < 365) { l.to = x.to; l.stays.push(x); } else dh.push({ kind: x.kind, from: x.from, to: x.to, stays: [x] }); });
    return { current, cycle, phases, dhaiyas: dh.slice(0, 2) };
  }, [r, today]);

  const total = A?.cycle ? day(A.cycle.to) - day(A.cycle.from) : 1;
  const pct = (iso) => Math.min(100, Math.max(0, ((day(iso) - day(A.cycle.from)) / total) * 100));
  const nm = (i) => RASHIS[i][en ? 'en' : 'hi'];

  return (
    <div>
      <div style={{ ...card, marginBottom: '14px' }}>
        <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>{en ? 'Your Moon sign (rashi)' : 'आपकी चंद्र राशि'}</label>
        <select value={r ?? ''} onChange={e => setR(e.target.value === '' ? null : Number(e.target.value))} style={{ width: '100%' }}>
          <option value="">{en ? 'Select your rashi' : 'अपनी राशि चुनें'}</option>
          {RASHIS.map(x => <option key={x.slug} value={x.idx}>{x.sym} {en ? `${x.en} (${x.hi})` : `${x.hi} (${x.en})`}</option>)}
        </select>
        <p style={{ margin: '8px 0 0', fontSize: '12px' }}><Link href="/meri-rashi" style={{ color: 'var(--color-text-info)' }}>{en ? 'Do not know your rashi? Find it from your birth details →' : 'राशि नहीं पता? जन्म विवरण से निकालें →'}</Link></p>
      </div>

      {A && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={card}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{en ? 'Today' : 'आज की स्थिति'} · {fmt(today, en)}</div>
            {A.current ? (() => {
              const k = A.current.kind, isSS = ['first', 'peak', 'last'].includes(k);
              return (
                <>
                  <div style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0 2px', color: 'var(--color-text-warning)' }}>{isSS ? (en ? 'Sade Sati is running' : 'साढ़ेसाती चल रही है') : (en ? 'Dhaiya is running' : 'ढैया चल रही है')}</div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{isSS ? `${PHASE[k][en ? 'en' : 'hi']} — ${PHASE[k][en ? 'ed' : 'hd']}` : DH[k][en ? 'en' : 'hi']}</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>{en ? 'Saturn is in this sign now:' : 'शनि अभी इस राशि में है:'} {fmt(A.current.from, en)} → {fmt(A.current.to, en)}</div>
                </>);
            })() : <div style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0 0', color: 'var(--color-text-success)' }}>{en ? 'No Sade Sati or Dhaiya running today' : 'आज साढ़ेसाती या ढैया नहीं चल रही'}</div>}
          </div>

          {A.cycle && (
            <div style={card}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>{en ? 'Your Sade Sati — three phases' : 'आपकी साढ़ेसाती — तीन चरण'}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginBottom: '12px' }}>{fmt(A.cycle.from, en)} → {fmt(A.cycle.to, en)} · {length(A.cycle.from, A.cycle.to, en)}</div>

              {/* colour timeline of the real stretches */}
              <div style={{ position: 'relative', height: '16px', borderRadius: '8px', background: 'var(--color-background-secondary)', overflow: 'hidden', marginBottom: '6px' }} aria-hidden="true">
                {A.phases.flatMap(p => p.stays.map((x, i) => <div key={p.k + i} style={{ position: 'absolute', top: 0, bottom: 0, left: pct(x.from) + '%', width: Math.max(0.8, pct(x.to) - pct(x.from)) + '%', background: PHASE[p.k].c, opacity: 0.92 }} />))}
                {day(today) >= day(A.cycle.from) && day(today) <= day(A.cycle.to) && <div style={{ position: 'absolute', top: -2, bottom: -2, left: pct(today) + '%', width: '2px', background: 'var(--color-text-primary)' }} />}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '14px' }}><span>{A.cycle.from.slice(0, 4)}</span><span>{en ? '▎ = today' : '▎ = आज'}</span><span>{A.cycle.to.slice(0, 4)}</span></div>

              {/* the three lines */}
              {A.phases.map(p => (
                <div key={p.k} style={{ display: 'grid', gridTemplateColumns: '14px 1fr', gap: '10px', padding: '10px 0', borderTop: '1px solid var(--color-border-tertiary)' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: PHASE[p.k].c, marginTop: '6px' }} aria-hidden="true" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{PHASE[p.k][en ? 'en' : 'hi']} {p.now && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'var(--color-background-warning)', color: 'var(--color-text-warning)', marginLeft: '6px' }}>{en ? 'running now' : 'अभी चल रहा है'}</span>}</div>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{fmt(p.from, en)} → {fmt(p.to, en)} <span style={{ color: 'var(--color-text-tertiary)', fontSize: '12px' }}>· {length(p.from, p.to, en)}</span></div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{PHASE[p.k][en ? 'ed' : 'hd']} ({nm(p.sign)})</div>
                  </div>
                </div>
              ))}

              <details style={{ marginTop: '6px', borderTop: '1px solid var(--color-border-tertiary)', paddingTop: '10px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-info)', fontWeight: 600 }}>{en ? 'Exact stretches (Saturn’s retrograde re-entries)' : 'सटीक अवधियाँ (शनि के वक्री होकर लौटने सहित)'}</summary>
                <div style={{ marginTop: '8px' }}>
                  {A.phases.flatMap(p => p.stays.map((x, i) => (
                    <div key={p.k + i} style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.9 }}>
                      <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: PHASE[p.k].c, marginRight: '8px' }} />{nm(x.s)}: {fmt(x.from, en)} → {fmt(x.to, en)}
                    </div>)))}
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: 1.7 }}>{en ? 'Saturn turns retrograde and sometimes slips back into the previous sign for a few months; each phase above runs from its first entry to its last exit.' : 'शनि वक्री होकर कुछ महीनों के लिए पिछली राशि में लौट जाता है; ऊपर हर चरण अपनी पहली एंट्री से आख़िरी निकासी तक गिना गया है।'}</p>
                </div>
              </details>
            </div>
          )}

          {A.dhaiyas.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>{en ? 'Dhaiya (Saturn’s 2½-year stays)' : 'ढैया (शनि के ढाई साल)'}</div>
              {A.dhaiyas.map((x, i) => (
                <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--color-border-tertiary)' : 'none' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{DH[x.kind][en ? 'en' : 'hi']}</div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{fmt(x.from, en)} → {fmt(x.to, en)} <span style={{ color: 'var(--color-text-tertiary)', fontSize: '12px' }}>· {length(x.from, x.to, en)}</span></div>
                </div>
              ))}
            </div>
          )}

          <p style={{ ...card, margin: 0, fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)' }}>
            {en ? 'Sade Sati is Saturn’s ~7.5-year passage over the sign before, of and after your Moon sign; Dhaiya is its ~2.5-year stay in the 4th or 8th from it. The effect depends on your whole chart — for many people these are periods of discipline, effort and learning rather than only hardship. Do not act on fear; steady routine, honest work and service are the traditional response.'
                : 'साढ़ेसाती आपकी राशि से पहले वाली, आपकी और उसके बाद वाली राशि में शनि के लगभग साढ़े सात साल के गोचर को कहते हैं; ढैया शनि का उससे चौथे या आठवें भाव में लगभग ढाई साल का प्रवास है। असर आपकी पूरी कुंडली पर निर्भर है — कई लोगों के लिए ये अनुशासन, मेहनत और सीख के दौर होते हैं, केवल कठिनाई के नहीं। डर में फैसले न लें; नियमित दिनचर्या, ईमानदार काम और सेवा ही पारंपरिक उपाय हैं।'}
          </p>
        </div>
      )}
    </div>
  );
}

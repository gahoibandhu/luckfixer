'use client';
// Sade Sati / Dhaiya from Saturn's real sidereal sign stays (lib/saturn-ingress.js, generated with pyswisseph).
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { RASHIS } from '@/lib/public-content';
import { SATURN_STAYS } from '@/lib/saturn-ingress';
import { useUiLang } from '@/lib/i18n';

const card = { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '16px' };
const todayISO = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmt = (iso, en) => { const [y, m, d] = iso.split('-'); const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1]; return en ? `${+d} ${mon} ${y}` : `${+d} ${['जन','फ़र','मार्च','अप्रै','मई','जून','जुल','अग','सित','अक्टू','नव','दिस'][+m - 1]} ${y}`; };

export default function SadeSatiChecker() {
  const en = useUiLang() === 'en';
  const [r, setR] = useState(null);
  const [today, setToday] = useState(null);
  useEffect(() => { setToday(todayISO()); }, []);

  const analysis = useMemo(() => {
    if (r === null || !today) return null;
    const first = (r + 11) % 12, peak = r, last = (r + 1) % 12, d4 = (r + 3) % 12, d8 = (r + 7) % 12;
    const kind = (s) => s === first ? 'first' : s === peak ? 'peak' : s === last ? 'last' : s === d4 ? 'dhaiya4' : s === d8 ? 'dhaiya8' : null;
    const stays = SATURN_STAYS.filter(x => kind(x.s)).map(x => ({ ...x, kind: kind(x.s) }));
    const current = stays.find(x => x.from <= today && today <= x.to) || null;
    // group Sade Sati stays into cycles: stays closer than 4 years belong together
    const ss = stays.filter(x => ['first', 'peak', 'last'].includes(x.kind));
    const cycles = [];
    ss.forEach(x => { const c = cycles[cycles.length - 1]; if (c && (new Date(x.from) - new Date(c.to)) / 864e5 < 1500) { c.to = x.to; c.stays.push(x); } else cycles.push({ from: x.from, to: x.to, stays: [x] }); });
    const nextCycle = cycles.find(c => c.to >= today) || null;
    const dhaiyas = stays.filter(x => x.kind.startsWith('dhaiya') && x.to >= today).slice(0, 3);
    return { current, nextCycle, dhaiyas };
  }, [r, today]);

  const KIND = {
    first: { en: 'Sade Sati — first phase (Saturn in the 12th from your Moon)', hi: 'साढ़ेसाती — पहला चरण (चंद्रमा से 12वें में शनि)' },
    peak: { en: 'Sade Sati — middle phase (Saturn over your Moon sign)', hi: 'साढ़ेसाती — मध्य चरण (आपकी राशि में शनि)' },
    last: { en: 'Sade Sati — last phase (Saturn in the 2nd from your Moon)', hi: 'साढ़ेसाती — अंतिम चरण (चंद्रमा से दूसरे में शनि)' },
    dhaiya4: { en: 'Dhaiya (Ardhashtama) — Saturn in the 4th from your Moon', hi: 'ढैया (अर्धाष्टम) — चंद्रमा से चौथे में शनि' },
    dhaiya8: { en: 'Dhaiya (Ashtama) — Saturn in the 8th from your Moon', hi: 'ढैया (अष्टम) — चंद्रमा से आठवें में शनि' },
  };

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
      {analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={card}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{en ? 'Today' : 'आज की स्थिति'} · {fmt(today, en)}</div>
            {analysis.current ? (
              <>
                <div style={{ fontSize: '17px', fontWeight: 600, margin: '6px 0', color: 'var(--color-text-warning)' }}>{KIND[analysis.current.kind][en ? 'en' : 'hi']}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{en ? 'Saturn stays in this sign' : 'शनि इस राशि में रहेगा'}: {fmt(analysis.current.from, en)} → {fmt(analysis.current.to, en)}</div>
              </>
            ) : (
              <div style={{ fontSize: '17px', fontWeight: 600, margin: '6px 0', color: 'var(--color-text-success)' }}>{en ? 'No Sade Sati or Dhaiya running today' : 'आज साढ़ेसाती या ढैया नहीं चल रही'}</div>
            )}
          </div>
          {analysis.nextCycle && (
            <div style={card}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-primary)' }}>{en ? 'Sade Sati cycle' : 'साढ़ेसाती का चक्र'}: {fmt(analysis.nextCycle.from, en)} → {fmt(analysis.nextCycle.to, en)}</div>
              {analysis.nextCycle.stays.map((x, i) => <div key={i} style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>• {KIND[x.kind][en ? 'en' : 'hi'].split(' (')[0]}: {fmt(x.from, en)} → {fmt(x.to, en)}</div>)}
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{en ? 'Saturn is sometimes retrograde and re-enters a sign, so a phase can appear in more than one stretch.' : 'शनि के वक्री होने से वह कभी-कभी राशि में दोबारा लौटता है, इसलिए एक चरण एक से ज़्यादा हिस्सों में दिख सकता है।'}</p>
            </div>
          )}
          {analysis.dhaiyas.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-primary)' }}>{en ? 'Upcoming Dhaiya periods' : 'आने वाली ढैया'}</div>
              {analysis.dhaiyas.map((x, i) => <div key={i} style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>• {KIND[x.kind][en ? 'en' : 'hi'].split(' —')[0]}: {fmt(x.from, en)} → {fmt(x.to, en)}</div>)}
            </div>
          )}
          <p style={{ ...card, margin: 0, fontSize: '13px', lineHeight: 1.75, color: 'var(--color-text-secondary)' }}>
            {en ? 'Sade Sati is Saturn’s ~7.5-year passage over the sign before, of and after your Moon sign; Dhaiya is its ~2.5-year stay in the 4th or 8th from it. Its effect depends on your whole chart — for many people these are periods of discipline, effort and learning rather than only hardship. Do not act on fear; steady routine, honest work and service are the traditional response.'
                : 'साढ़ेसाती आपकी राशि से पहले वाली, आपकी और उसके बाद वाली राशि में शनि के लगभग साढ़े सात साल के गोचर को कहते हैं; ढैया शनि का उससे चौथे या आठवें भाव में लगभग ढाई साल का प्रवास है। असर आपकी पूरी कुंडली पर निर्भर है — कई लोगों के लिए ये अनुशासन, मेहनत और सीख के दौर होते हैं, केवल कठिनाई के नहीं। डर में फैसले न लें; नियमित दिनचर्या, ईमानदार काम और सेवा ही पारंपरिक उपाय हैं।'}
          </p>
        </div>
      )}
    </div>
  );
}

'use client';
// components/RashiFinder.jsx — "Meri rashi kaun si hai" + nakshatra, pada and traditional baby-name letter.
import { useState } from 'react';
import Link from 'next/link';
import BirthForm from '@/components/BirthForm';
import { RASHIS } from '@/lib/public-content';
import { NAKSHATRAS, babyLetter } from '@/lib/baby-names';
import { useUiLang } from '@/lib/i18n';

const card = { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '16px' };

export default function RashiFinder({ focus = 'rashi' }) {
  const en = useUiLang() === 'en';
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');

  async function run(v) {
    setBusy(true); setErr(''); setRes(null);
    try {
      const r = await fetch('/api/public/sky', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
      const d = await r.json();
      if (!r.ok) setErr(d.error || (en ? 'Something went wrong' : 'कुछ गड़बड़ हुई')); else setRes({ ...d, dob: v.dob });
    } catch { setErr(en ? 'Could not reach the server' : 'सर्वर से संपर्क नहीं हो पाया'); }
    setBusy(false);
  }

  const rashi = res ? RASHIS[res.moon.signIdx] : null;
  const nak = res ? NAKSHATRAS[res.moon.nakIdx] : null;
  const letter = res ? babyLetter(res.moon.nakIdx, res.moon.pada) : null;

  return (
    <div>
      <div style={{ ...card, marginBottom: '14px' }}>
        <BirthForm onSubmit={run} busy={busy} submitLabel={focus === 'name' ? (en ? 'Find name letter' : 'नाम का अक्षर देखें') : (en ? 'Find my rashi' : 'मेरी राशि देखें')} />
      </div>
      {err && <p style={{ ...card, color: 'var(--color-text-danger)', fontSize: '14px' }}>{err}</p>}
      {res && rashi && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {res.moonSignChoices && (
            <p style={{ ...card, background: 'var(--color-background-warning)', color: 'var(--color-text-warning)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              {en
                ? `The Moon changed sign on this date (${RASHIS[res.moonSignChoices[0]].en} → ${RASHIS[res.moonSignChoices[1]].en}), so without the birth time your rashi could be either. The result below is for midday.`
                : `इस तारीख को चंद्रमा ने राशि बदली (${RASHIS[res.moonSignChoices[0]].hi} → ${RASHIS[res.moonSignChoices[1]].hi}), इसलिए जन्म समय के बिना आपकी राशि दोनों में से कोई हो सकती है। नीचे का नतीजा दोपहर के समय का है।`}
            </p>
          )}
          <div style={card}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{en ? 'Your Moon sign (Chandra rashi)' : 'आपकी चंद्र राशि'}</div>
            <div style={{ fontSize: '24px', fontWeight: 600, margin: '4px 0', color: 'var(--color-text-primary)' }}>{rashi.sym} {en ? `${rashi.en} (${rashi.hi})` : `${rashi.hi} (${rashi.en})`}</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
              {en ? 'Nakshatra' : 'नक्षत्र'}: <b>{en ? nak.en : nak.hi}</b>{res.timeKnown ? <> · {en ? 'Pada' : 'चरण'} <b>{res.moon.pada}</b></> : null}
              {res.timeKnown && (<> · {en ? 'Ruler' : 'स्वामी'}: <b>{en ? rashi.lord.en : rashi.lord.hi}</b></>)}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '13px' }}><Link href={`/rashi/${rashi.slug}`} style={{ color: 'var(--color-text-info)' }}>{en ? `→ Read the ${rashi.en} guide` : `→ ${rashi.hi} राशि का गाइड पढ़ें`}</Link></p>
          </div>
          {res.timeKnown && letter && (
            <div style={card}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{en ? 'Traditional name letter (nakshatra pada)' : 'पारंपरिक नामाक्षर (नक्षत्र-चरण से)'}</div>
              <div style={{ fontSize: '28px', fontWeight: 600, margin: '4px 0', color: 'var(--color-text-primary)' }}>{letter[0]} <span style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>({letter[1]})</span></div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                {en ? `Traditionally a name starts with this syllable for ${nak.en}, pada ${res.moon.pada}. Many families also choose by rashi — treat it as a starting point.`
                    : `${nak.hi} नक्षत्र के चरण ${res.moon.pada} के लिए परंपरा से नाम इसी अक्षर से शुरू होता है। कई परिवार राशि के अक्षर से भी नाम रखते हैं — इसे एक शुरुआती सुझाव मानें।`}
              </p>
            </div>
          )}
          {!res.timeKnown && <p style={{ ...card, fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>{en ? 'The name letter needs the birth time, because the pada changes every ~6 hours.' : 'नामाक्षर के लिए जन्म समय ज़रूरी है, क्योंकि चरण लगभग हर 6 घंटे में बदलता है।'}</p>}
          <div style={{ ...card, background: 'var(--color-background-info)' }}>
            <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--color-text-info)', lineHeight: 1.6 }}>{en ? 'Your lagna, dasha and yogas tell far more than the rashi alone.' : 'सिर्फ़ राशि से कहीं ज़्यादा आपका लग्न, दशा और योग बताते हैं।'}</p>
            <Link href="/login" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-info)' }}>{en ? '→ Create your full kundli' : '→ अपनी पूरी कुंडली बनाएँ'}</Link>
          </div>
        </div>
      )}
    </div>
  );
}

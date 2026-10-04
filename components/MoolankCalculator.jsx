'use client';
// Moolank / Bhagyank / Lo Shu grid — all computed in the browser; the date of birth never leaves the device.
import { useState } from 'react';
import Link from 'next/link';
import DateOfBirthInput from '@/components/DateOfBirthInput';
import { MOOLANK, moolankOf, bhagyankOf, loShuOf, LO_SHU_LAYOUT } from '@/lib/public-content';
import { useUiLang } from '@/lib/i18n';

const card = { background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '14px', padding: '16px' };

export default function MoolankCalculator() {
  const en = useUiLang() === 'en';
  const [dob, setDob] = useState('');
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(dob);
  const mk = ok ? moolankOf(dob) : null, bh = ok ? bhagyankOf(dob) : null, grid = ok ? loShuOf(dob) : null;
  const missing = grid ? Object.keys(grid).filter(k => grid[k] === 0).map(Number) : [];
  const Num = ({ n, title, sub }) => (
    <div style={{ ...card, flex: '1 1 220px' }}>
      <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{title}</div>
      <div style={{ fontSize: '44px', fontWeight: 700, lineHeight: 1.1, margin: '4px 0' }}>{n}</div>
      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{en ? `Ruler: ${MOOLANK[n].planet.en}` : `स्वामी: ${MOOLANK[n].planet.hi}`}</div>
      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: 1.6 }}>{en ? MOOLANK[n].summary.en : MOOLANK[n].summary.hi}</div>
      <Link href={`/moolank/${n}`} style={{ display: 'inline-block', marginTop: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-info)' }}>{sub}</Link>
    </div>
  );
  return (
    <div>
      <div style={{ ...card, marginBottom: '14px' }}>
        <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>{en ? 'Date of birth' : 'जन्म तिथि'}</label>
        <DateOfBirthInput value={dob} onChange={setDob} style={{ width: '100%', maxWidth: '320px' }} />
      </div>
      {ok && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <Num n={mk} title={en ? 'Moolank (birth-day number)' : 'मूलांक (जन्म-दिन का अंक)'} sub={en ? `Read about ${mk} →` : `अंक ${mk} के बारे में पढ़ें →`} />
            <Num n={bh} title={en ? 'Bhagyank (whole date of birth)' : 'भाग्यांक (पूरी जन्म तिथि का अंक)'} sub={en ? `Read about ${bh} →` : `अंक ${bh} के बारे में पढ़ें →`} />
          </div>
          <div style={card}>
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>{en ? 'Lo Shu grid' : 'लो शू ग्रिड'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: '6px', marginBottom: '10px' }}>
              {LO_SHU_LAYOUT.flat().map(n => (
                <div key={n} style={{ height: '72px', borderRadius: '10px', display: 'grid', placeItems: 'center', textAlign: 'center', background: grid[n] ? 'var(--color-background-secondary)' : 'transparent', border: grid[n] ? '1px solid var(--color-border-secondary)' : '1px dashed var(--color-border-secondary)', color: grid[n] ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                  <div><div style={{ fontSize: '20px', fontWeight: 700 }}>{grid[n] ? String(n).repeat(grid[n]) : '·'}</div><div style={{ fontSize: '10px' }}>{n}</div></div>
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.75 }}>
              {en ? `Digits 1–9 found in your date of birth are shown in their Lo Shu positions. ${missing.length ? `Missing digits: ${missing.join(', ')}. In this system a missing digit is read as a quality to build consciously, not as a flaw.` : 'No digit from 1 to 9 is missing.'}`
                  : `आपकी जन्म तिथि में मिले 1–9 के अंक लो शू के स्थान पर दिखाए गए हैं। ${missing.length ? `अनुपस्थित अंक: ${missing.join(', ')}। इस पद्धति में अनुपस्थित अंक को कमी नहीं, बल्कि सचेत रूप से विकसित करने वाला गुण माना जाता है।` : '1 से 9 में कोई अंक अनुपस्थित नहीं है।'}`}
            </p>
          </div>
          <div style={{ ...card, background: 'var(--color-background-info)' }}>
            <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--color-text-info)', lineHeight: 1.6 }}>{en ? 'Numerology is one lens. For a reading tied to your full kundli, ask the AI.' : 'अंक ज्योतिष एक दृष्टिकोण है। अपनी पूरी कुंडली के हिसाब से पढ़ने के लिए AI से पूछें।'}</p>
            <Link href="/login" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-info)' }}>{en ? '→ Create your kundli' : '→ अपनी कुंडली बनाएँ'}</Link>
          </div>
        </div>
      )}
    </div>
  );
}

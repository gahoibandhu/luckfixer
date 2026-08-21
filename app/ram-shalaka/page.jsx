'use client';
// app/ram-shalaka/page.jsx
//
// The real Ram Shalaka Prashnavali: a 15x15 table of 225 akshars,
// exactly as printed in popular Ramcharitmanas editions. Pick any cell
// (traditionally with eyes closed) — the app finds your answer using
// the same "every 9th letter" method described in the tradition.
//
// Two ways to pick a cell, both landing on the exact same verified
// data/logic (getAnswerForCell): the traditional tap-grid (original,
// unchanged), and a spin-wheel (components/RamShalakaWheel.jsx) for
// people who want the more playful mechanic — kept as a toggle, not a
// replacement, so the traditional method never goes away.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RAM_SHALAKA_GRID, getAnswerForCell } from '@/lib/ram-shalaka';
import RamShalakaWheel from '@/components/RamShalakaWheel';

export const dynamic = 'force-dynamic';

const TONE_STYLE = {
  shubh:     { label: 'शुभ उत्तर',      color: 'var(--color-text-success)', bg: 'var(--color-background-secondary)' },
  dhairya:   { label: 'धैर्य का उत्तर',  color: 'var(--color-text-warning)', bg: 'var(--color-background-warning)' },
  saavdhani: { label: 'सावधानी का उत्तर', color: 'var(--color-text-info)',   bg: 'var(--color-background-info)' },
};

export default function RamShalakaPage() {
  const router = useRouter();
  const [mode, setMode] = useState('wheel'); // 'wheel' | 'grid'
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [pickedCell, setPickedCell] = useState(null); // {row, col} — highlights the chosen letter (grid mode only)
  const [revealing, setRevealing] = useState(false);
  const [showFullChaupai, setShowFullChaupai] = useState(false);
  const [wheelKey, setWheelKey] = useState(0); // bump to force a fresh wheel instance

  function pickCell(row, col) {
    if (revealing) return;
    setPickedCell({ row, col });
    setRevealing(true);
    setTimeout(() => {
      setResult(getAnswerForCell(row, col));
      setRevealing(false);
    }, 600);
  }

  function reset() {
    setResult(null);
    setPickedCell(null);
    setQuestion('');
    setShowFullChaupai(false);
    setWheelKey(k => k + 1); // fresh wheel spin state next time
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <button onClick={() => router.push('/chat')} style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem' }}>
        ← वापस चैट पर
      </button>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>श्री राम शलाका प्रश्नावली</p>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>रामचरितमानस से मार्गदर्शन</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', maxWidth: '480px', margin: '0 auto' }}>
          मन में अपना प्रश्न स्थिर करें, श्रीराम का स्मरण करें, और {mode === 'wheel' ? 'पहिया घुमाकर रोकें' : 'आंखें बंद करके नीचे दी सारणी में किसी भी अक्षर पर उंगली रखें'}।
        </p>
      </div>

      {!result && (
        <>
          <div style={{ marginBottom: '1.25rem' }}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="अपना प्रश्न लिखें (वैकल्पिक)"
              style={{ width: '100%', fontSize: '14px', textAlign: 'center' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem', background: 'var(--color-background-secondary)', padding: '4px', borderRadius: '10px', maxWidth: '320px', margin: '0 auto 1.25rem' }}>
            <button onClick={() => setMode('wheel')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: mode === 'wheel' ? '#7a2020' : 'transparent', color: mode === 'wheel' ? '#fff' : 'var(--color-text-secondary)' }}>
              🎡 स्पिन व्हील
            </button>
            <button onClick={() => setMode('grid')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: mode === 'grid' ? '#7a2020' : 'transparent', color: mode === 'grid' ? '#fff' : 'var(--color-text-secondary)' }}>
              📜 परंपरागत ग्रिड
            </button>
          </div>

          {mode === 'wheel' && (
            <RamShalakaWheel key={wheelKey} onResult={setResult} />
          )}

          {mode === 'grid' && (
            <>
              <div style={{
                background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '10px',
                overflowX: 'auto',
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(15, minmax(28px, 1fr))',
                  gap: '3px',
                  minWidth: '460px',
                }}>
                  {RAM_SHALAKA_GRID.map((rowArr, r) =>
                    rowArr.map((akshar, c) => (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => pickCell(r, c)}
                        disabled={revealing}
                        style={{
                          aspectRatio: '1',
                          fontSize: '12px',
                          padding: 0,
                          borderRadius: '4px',
                          border: pickedCell?.row === r && pickedCell?.col === c ? '1.5px solid var(--color-brand)' : '0.5px solid var(--color-border-tertiary)',
                          background: pickedCell?.row === r && pickedCell?.col === c ? 'var(--color-brand-light)' : 'var(--color-background-secondary)',
                          color: 'var(--color-text-primary)',
                          cursor: revealing ? 'default' : 'pointer',
                          transition: 'background 0.1s ease',
                        }}
                      >
                        {akshar}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {revealing && (
                <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '1rem' }}>
                  ग्रंथ खुल रहा है...
                </p>
              )}

              <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: '10px' }}>
                15×15 = 225 अक्षरों की पारंपरिक सारणी — जैसी रामचरितमानस के प्रचलित संस्करणों में छपती है।
              </p>
            </>
          )}
        </>
      )}

      {result && (
        <div style={{ animation: 'lf-shalaka-fade-in 0.4s ease' }}>
          {question && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', textAlign: 'center', marginBottom: '1rem', fontStyle: 'italic' }}>
              "{question}"
            </p>
          )}

          <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '1.5rem', textAlign: 'center' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: '500',
              padding: '3px 12px',
              borderRadius: '12px',
              marginBottom: '1rem',
              color: TONE_STYLE[result.tone]?.color,
              background: TONE_STYLE[result.tone]?.bg,
            }}>
              {TONE_STYLE[result.tone]?.label} · {result.kand}
            </span>

            <p style={{ fontSize: '19px', lineHeight: '1.9', color: 'var(--color-text-primary)', fontWeight: '500', marginBottom: '4px' }}>
              {result.verse}
            </p>

            {showFullChaupai && (
              <p style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                {result.contextLines}
              </p>
            )}

            <button onClick={() => setShowFullChaupai(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--color-text-info)', fontSize: '12px', cursor: 'pointer', margin: '6px 0 1.25rem', padding: 0 }}>
              {showFullChaupai ? 'कम दिखाएं' : 'पूरी चौपाई देखें →'}
            </button>

            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', margin: '0 0 4px' }}>प्रसंग</p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.7', margin: '0 0 14px' }}>{result.prasang}</p>

              <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', margin: '0 0 4px' }}>भावार्थ</p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.7', margin: '0 0 14px' }}>{result.bhavarth}</p>

              <div style={{ background: 'var(--color-background-secondary)', borderRadius: '10px', padding: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-text-info)', margin: '0 0 4px' }}>शलाका उत्तर का भाव</p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.7', margin: 0 }}>{result.shalakaBhav}</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '1.25rem' }}>
            <button onClick={reset} style={{ flex: 1, padding: '11px', fontSize: '14px', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
              फिर से पूछें
            </button>
            <button onClick={() => router.push('/chat')} style={{ flex: 1, padding: '11px', fontSize: '14px', background: 'var(--color-text-primary)', color: 'var(--color-background-primary)', border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontWeight: '500' }}>
              इस पर और बात करें
            </button>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: '1rem' }}>
            राम शलाका एक श्रद्धा-आधारित पारंपरिक अभ्यास है, भविष्यवाणी नहीं — एक ही प्रश्न बार-बार न पूछें।
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes lf-shalaka-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

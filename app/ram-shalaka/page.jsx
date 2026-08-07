'use client';
// app/ram-shalaka/page.jsx
//
// Ram Shalaka — traditional letter-based guidance practice. The person
// holds a question in mind, closes their eyes, and taps any letter —
// the corresponding verse is revealed as their answer/guidance.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RAM_SHALAKA_VERSES, getVerseForLetter } from '@/lib/ram-shalaka';

export const dynamic = 'force-dynamic';

const TONE_STYLE = {
  shubh:     { label: 'शुभ संकेत',       color: 'var(--color-text-success)', bg: 'var(--color-background-secondary)' },
  dhairya:   { label: 'धैर्य का संकेत',   color: 'var(--color-text-warning)', bg: 'var(--color-background-warning)' },
  saavdhani: { label: 'सावधानी का संकेत', color: 'var(--color-text-info)',    bg: 'var(--color-background-info)' },
};

export default function RamShalakaPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [revealing, setRevealing] = useState(false);

  function pickLetter(letter) {
    if (revealing) return;
    setRevealing(true);
    // A brief pause before reveal — mirrors the moment of opening the
    // text after placing a finger on the page, rather than an instant
    // jarring pop.
    setTimeout(() => {
      setResult(getVerseForLetter(letter));
      setRevealing(false);
    }, 500);
  }

  function reset() {
    setResult(null);
    setQuestion('');
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <button onClick={() => router.push('/chat')} style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem' }}>
        ← वापस चैट पर
      </button>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>राम शलाका</p>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>अक्षर प्रश्नावली</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
          मन में अपना प्रश्न सोचें, आंखें बंद करें, और नीचे दिए किसी भी अक्षर पर बिना सोचे उंगली रखें।
        </p>
      </div>

      {!result && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="अपना प्रश्न लिखें (वैकल्पिक)"
              style={{ width: '100%', fontSize: '14px', textAlign: 'center' }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
            gap: '10px',
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-lg)',
            padding: '1.25rem',
          }}>
            {RAM_SHALAKA_VERSES.map(v => (
              <button
                key={v.letter}
                onClick={() => pickLetter(v.letter)}
                disabled={revealing}
                style={{
                  aspectRatio: '1',
                  fontSize: '20px',
                  fontWeight: '500',
                  borderRadius: '50%',
                  border: '0.5px solid var(--color-border-secondary)',
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-text-primary)',
                  cursor: revealing ? 'default' : 'pointer',
                  opacity: revealing ? 0.5 : 1,
                  transition: 'transform 0.1s ease',
                }}
              >
                {v.letter}
              </button>
            ))}
          </div>

          {revealing && (
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '1rem' }}>
              ग्रंथ खुल रहा है...
            </p>
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
              {TONE_STYLE[result.tone]?.label}
            </span>

            <p style={{ fontSize: '19px', lineHeight: '1.9', color: 'var(--color-text-primary)', fontWeight: '500', marginBottom: '10px' }}>
              {result.verse}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '1.25rem' }}>
              — {result.source}
            </p>

            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.7', textAlign: 'left' }}>
              {result.meaning}
            </p>
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
            यह एक पारंपरिक श्रद्धा-आधारित अभ्यास है, वैज्ञानिक भविष्यवाणी नहीं।
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

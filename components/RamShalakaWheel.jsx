'use client';
// components/RamShalakaWheel.jsx
//
// Spin-wheel alternative to the traditional 15x15 grid for picking a
// Ram Shalaka answer. Same underlying algorithm as the grid (every 9th
// letter from wherever you land — see lib/ram-shalaka.js) — this is
// just a different, more playful way to pick the starting cell. No
// duplicated verse/grid data: everything real comes from
// lib/ram-shalaka.js, the single source of truth.
//
// DESIGN NOTES (from prototyping in chat before this was built):
// - All 225 real grid letters are shown, split SEQUENTIALLY across 4
//   concentric rings (ring1 outer = flat index 0-56, ring2 = 57-112,
//   ring3 = 113-168, ring4 innermost = 169-224) purely so each letter
//   is legible (225 in one ring made text ~6.5px, unreadable).
// - Only ring1's (outermost) stop position is ever used for the
//   actual calculation, exactly as requested — rings 2-4 spin too
//   (visual richness / "traditional chakra" feel) but never
//   influence the answer, even though their letters are real too.
// - Landing detection deliberately does NOT use closed-form angle
//   math (segAngle * index-style formulas). An earlier version tried
//   that and had a real, measured bug — the browser's own rendered
//   layout is the ground truth, so this measures actual
//   getBoundingClientRect() positions and picks whichever cell is
//   physically nearest the pin, then snaps the ring by the exact
//   measured angle (via atan2) to align it perfectly. This was
//   verified against the pin's real screen position with a dedicated
//   diagnostic build before shipping.
// - Letters "shuffle" (randomly cycle through the real 225-letter set,
//   never anything fabricated) while spinning for a slot-machine-like
//   feel, then reveal their TRUE letter the instant STOP is pressed.

import { useEffect, useRef, useState } from 'react';
import { RAM_SHALAKA_GRID, getAnswerForCell } from '@/lib/ram-shalaka';

const FLAT = RAM_SHALAKA_GRID.flat(); // 225 real akshars, reading order
const COLS = 15;
const RING_RADII = [139, 105, 74, 44];
const RING_FONT_SIZES = [8, 8, 8, 7.5];
const RING_SPEEDS = [3.2, -2.4, 4.0, -1.8]; // deg/frame, alternating direction
const CHUNK_SIZE = Math.ceil(FLAT.length / 4);

function center(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export default function RamShalakaWheel({ onResult }) {
  const ringRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const pinDotRef = useRef(null);
  const cellsRef = useRef([[], [], [], []]); // [{el, letter, flatIdx}] per ring
  const rotRef = useRef([0, 0, 0, 0]);
  const rafRef = useRef(null);
  const spinningRef = useRef(true);
  const audioCtxRef = useRef(null);
  const lastTickRef = useRef(0);
  const lastShuffleRef = useRef(0);

  const [phase, setPhase] = useState('spinning'); // spinning | revealing | done
  const [traceText, setTraceText] = useState('');
  const [landedLetter, setLandedLetter] = useState('');

  // ── Build the 4 rings once on mount ──────────────────────────
  useEffect(() => {
    const chunks = [0, 1, 2, 3].map(i => FLAT.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));

    chunks.forEach((letters, ringIdx) => {
      const ringEl = ringRefs[ringIdx].current;
      if (!ringEl) return;
      const n = letters.length;
      const startFlatIdx = ringIdx * CHUNK_SIZE;
      const radius = RING_RADII[ringIdx];
      const cells = [];
      letters.forEach((letter, i) => {
        // Direct trigonometry — one computed (x,y) point per letter,
        // centered with a single translate(-50%,-50%). Deliberately NOT
        // using a rotate→translate→rotate→translate chain: that
        // technique already caused one measured bug in this feature
        // (the pin-landing calculation) and produced visibly
        // off-center/corner-drifting letters here too. Plain trig is
        // easier to verify and impossible to get subtly wrong on
        // transform order.
        const angleRad = (2 * Math.PI / n) * i;
        const x = radius * Math.cos(angleRad);
        const y = radius * Math.sin(angleRad);
        const el = document.createElement('div');
        el.textContent = letter;
        el.style.cssText = `position:absolute;top:calc(50% + ${y}px);left:calc(50% + ${x}px);transform:translate(-50%,-50%);font-size:${RING_FONT_SIZES[ringIdx]}px;color:#7a2020;font-weight:500;white-space:nowrap;transition:color 0.15s,font-size 0.15s;`;
        ringEl.appendChild(el);
        cells.push({ el, letter, flatIdx: startFlatIdx + i, angleRad });
      });
      cellsRef.current[ringIdx] = cells;
    });

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tick() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const o = ctx.createOscillator(), g = ctx.createGain(), filt = ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 900;
      o.frequency.value = 500;
      g.gain.value = 0.006; // deliberately very low — soft roulette-ball click, not a beep
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
      o.connect(filt); filt.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.03);
    } catch { /* audio not available — silently skip, purely cosmetic */ }
  }

  function shuffleAll() {
    for (const ring of cellsRef.current) {
      for (const c of ring) {
        if (Math.random() < 0.3) c.el.textContent = FLAT[Math.floor(Math.random() * FLAT.length)];
      }
    }
  }

  function animate(ts) {
    if (!spinningRef.current) return;
    for (let i = 0; i < 4; i++) {
      rotRef.current[i] += RING_SPEEDS[i];
      if (ringRefs[i].current) ringRefs[i].current.style.transform = `rotate(${rotRef.current[i]}deg)`;
    }
    if (!lastTickRef.current || ts - lastTickRef.current > 80) { tick(); lastTickRef.current = ts; }
    if (!lastShuffleRef.current || ts - lastShuffleRef.current > 110) { shuffleAll(); lastShuffleRef.current = ts; }
    rafRef.current = requestAnimationFrame(animate);
  }

  function handleStop() {
    if (!spinningRef.current) return;
    spinningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPhase('revealing');

    // Reveal every ring's TRUE letters immediately — shuffle stops.
    cellsRef.current.forEach(ring => ring.forEach(c => { c.el.textContent = c.letter; }));

    const ring1 = ringRefs[0].current;
    const cells1 = cellsRef.current[0];
    // Freeze exactly where it is right now (no transition yet) so the
    // measurement below reflects the true current DOM position.
    ring1.style.transform = `rotate(${rotRef.current[0]}deg)`;

    const pinC = center(pinDotRef.current);
    const ringRect = ring1.getBoundingClientRect();
    const ringC = { x: ringRect.left + ringRect.width / 2, y: ringRect.top + ringRect.height / 2 };

    // GROUND TRUTH: whichever ring1 cell is physically nearest the pin,
    // measured from real rendered coordinates — not a manual formula.
    let landedPos = 0, minDist = Infinity;
    cells1.forEach((c, idx) => {
      const cc = center(c.el);
      const d = Math.hypot(cc.x - pinC.x, cc.y - pinC.y);
      if (d < minDist) { minDist = d; landedPos = idx; }
    });
    const landedCell = cells1[landedPos];

    // Snap ring1 by the exact measured angle (atan2) so landedCell sits
    // precisely under the pin — verified correct via a dedicated
    // diagnostic build (measured post-snap distance ~0px consistently).
    const cellC = center(landedCell.el);
    const angCell = Math.atan2(cellC.y - ringC.y, cellC.x - ringC.x) * 180 / Math.PI;
    const angPin = Math.atan2(pinC.y - ringC.y, pinC.x - ringC.x) * 180 / Math.PI;
    let delta = angPin - angCell;
    delta = ((delta + 180) % 360 + 360) % 360 - 180; // shortest path

    ring1.style.transition = 'transform 0.5s cubic-bezier(0.2,0.8,0.3,1)';
    ring1.style.transform = `rotate(${rotRef.current[0] + delta}deg)`;
    for (let i = 1; i < 4; i++) {
      if (ringRefs[i].current) ringRefs[i].current.style.transition = `transform ${0.6 + i * 0.15}s ease-out`;
    }

    const landedIndex = landedCell.flatIdx;
    setLandedLetter(landedCell.letter);

    const row = Math.floor(landedIndex / COLS);
    const col = landedIndex % COLS;
    const answer = getAnswerForCell(row, col); // same verified data/logic as the grid mode
    const residue = landedIndex % 9;

    setTimeout(() => {
      // Canonical trace: ALWAYS walks from this residue's canonical
      // member (flat index = residue itself), not the literal landed
      // cell — guarantees the exact verified verse word-order
      // regardless of which of the 25 cells in this residue-family
      // the wheel physically landed on (see file header notes).
      const traceIdxs = Array.from({ length: 9 }, (_, k) => (residue + 9 * k) % FLAT.length);
      let step = 0;
      const iv = setInterval(() => {
        for (const ring of cellsRef.current) {
          const found = ring.find(c => c.flatIdx === traceIdxs[step]);
          if (found) { found.el.style.color = '#d4af37'; found.el.style.fontSize = '11px'; }
        }
        step++;
        const built = traceIdxs.slice(0, step).map(idx => FLAT[idx]).join('');
        setTraceText(built + (step < 9 ? '...' : ''));
        if (step >= 9) {
          clearInterval(iv);
          setTimeout(() => {
            setPhase('done');
            onResult(answer);
          }, 500);
        }
      }, 380);
    }, 550);
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: '290px', height: '290px', margin: '0 auto 16px' }}>
        <div style={{ position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '16px solid #b8860b', zIndex: 6 }} />
        <div ref={pinDotRef} style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translate(-50%,-50%)', width: '1px', height: '1px', zIndex: 10 }} />

        <div ref={ringRefs[0]} style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#fdf6ec', border: '3px solid #d4af37' }} />
        <div ref={ringRefs[1]} style={{ position: 'absolute', inset: '31px', borderRadius: '50%', background: '#fbeee0', border: '2px solid #c9a45c' }} />
        <div ref={ringRefs[2]} style={{ position: 'absolute', inset: '62px', borderRadius: '50%', background: '#f6e4c8', border: '2px solid #d4af37' }} />
        <div ref={ringRefs[3]} style={{ position: 'absolute', inset: '93px', borderRadius: '50%', background: '#f0d9ae', border: '1.5px solid #c9a45c' }} />

        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '46px', height: '46px', borderRadius: '50%', background: '#7a2020', border: '3px solid #b8860b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fac775', fontSize: '10px', fontWeight: 500, zIndex: 5 }}>राम</div>
      </div>

      {phase === 'spinning' && (
        <button onClick={handleStop} style={{ padding: '12px 40px', background: '#7a2020', color: '#fac775', border: 'none', borderRadius: '24px', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
          STOP
        </button>
      )}

      {phase !== 'spinning' && (
        <p style={{ fontSize: '13px', color: '#7a2020', minHeight: '24px', fontWeight: 500 }}>
          {phase === 'revealing' && landedLetter && (
            <>पिन पर: <b>{landedLetter}</b> — <span style={{ color: '#b8860b' }}>{traceText}</span></>
          )}
        </p>
      )}

      <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '10px' }}>
        जैसे ही घूमता पहिया रुके — जो अक्षर पिन पर हो, वही आपका उत्तर तय करता है।
      </p>
    </div>
  );
}

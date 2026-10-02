'use client';
// components/RectifyModal.jsx
//
// Birth-time confirmation ("rectification"). The user tells us how much they know
// about the birth time (rough range / part of day / no idea) and enters dated life
// events. /api/kundli/rectify scans the candidate times and returns WINDOWS that
// fit; the user picks one (the app never silently picks a single time), and the
// choice is applied through PATCH /api/kundli, which re-runs the full analysis.

import { useState, useEffect } from 'react';

const EVENT_TYPES = [
  ['marriage', 'विवाह', 'Marriage'],
  ['child_birth', 'संतान का जन्म', 'Birth of a child'],
  ['job_start', 'पहली नौकरी / काम शुरू', 'First job / career start'],
  ['promotion', 'प्रमोशन / बड़ी तरक्की', 'Promotion / big career rise'],
  ['foreign_travel', 'विदेश यात्रा / विदेश बसना', 'Foreign travel / settling abroad'],
  ['property', 'घर / जमीन खरीदना', 'Property purchase'],
  ['education', 'पढ़ाई पूरी / बड़ी डिग्री', 'Education milestone'],
  ['accident_illness', 'बड़ी दुर्घटना / गंभीर बीमारी', 'Major accident / serious illness'],
  ['major_loss', 'बड़ा आर्थिक नुकसान', 'Major financial loss'],
  ['separation', 'अलगाव / तलाक', 'Separation / divorce'],
];

// Shown only under "More options" at the very end — parents' demise looks out of place as a headline choice for everyone.
const MORE_EVENT_TYPES = [
  ['father_death', 'पिता का देहांत', "Father's death"],
  ['mother_death', 'माता का देहांत', "Mother's death"],
];


const EVENT_ICONS = {
  marriage:'💍', child_birth:'👶', job_start:'💼', promotion:'📈', foreign_travel:'✈️', property:'🏠',
  education:'🎓', father_death:'🕯️', mother_death:'🕯️', accident_illness:'🩹', major_loss:'📉', separation:'💔',
};
const SIGN_SYMBOL = { Aries:'♈', Taurus:'♉', Gemini:'♊', Cancer:'♋', Leo:'♌', Virgo:'♍', Libra:'♎', Scorpio:'♏', Sagittarius:'♐', Capricorn:'♑', Aquarius:'♒', Pisces:'♓' };

const PARTS = [
  ['subah', 'सुबह (4-12)', 'Morning (4am-12pm)'],
  ['dopahar', 'दोपहर (12-5)', 'Afternoon (12-5pm)'],
  ['shaam', 'शाम (5-9)', 'Evening (5-9pm)'],
  ['raat', 'रात (9 - 4 बजे)', 'Night (9pm-4am)'],
];

const TXT = {
  hi: {
    title: 'जन्म समय की पुष्टि', sub: 'अपने जीवन की घटनाओं की तारीखें दें — हम देखेंगे कौन सा जन्म-समय उनसे सबसे ज़्यादा मेल खाता है।',
    knowQ: 'जन्म समय के बारे में आपको कितना पता है?',
    rough: 'लगभग पता है', part: 'सिर्फ़ दिन का हिस्सा', none: 'बिल्कुल नहीं पता',
    from: 'से', to: 'तक', eventsQ: 'जीवन की घटनाएँ (कम से कम 3, बेहतर 5+)', addEvent: '+ घटना जोड़ें',
    pick: 'घटना चुनें', run: 'समय खोजें', running: 'जन्म-समय के विकल्प जाँचे जा रहे हैं...', cold: 'सर्वर जागने में 30-50 सेकंड लग सकते हैं',
    resultsTitle: 'मेल खाने वाले समय', pickOne: 'एक विंडो चुनें', exact: 'इस विंडो में सटीक समय', apply: 'यह समय लागू करें', applying: 'कुंडली दोबारा बन रही है...',
    back: '← बदलाव करें', close: 'बंद करें', matched: 'घटनाएँ मेल खाईं', score: 'फिट',
    lowWarn: '⚠️ भरोसा कम है — इसे सिर्फ़ संकेत मानें। अगर जन्म प्रमाणपत्र/घर के रिकॉर्ड से समय पता है तो वही रखें। ज़्यादा सटीक नतीजे के लिए 5-6+ घटनाएँ जोड़ें।',
    conf: { high: 'भरोसा: ऊँचा', medium: 'भरोसा: मध्यम', low: 'भरोसा: कम' },
    lagnaOnly: 'सिर्फ़ लग्न के हिसाब से', lagnaHelp: 'अगर सटीक समय तय नहीं हो पा रहा, तो ये लग्न सबसे संभावित हैं:',
    warn: 'यह अनुमान दशा पर आधारित है (गोचर शामिल नहीं) — सबूत है, पक्का प्रमाण नहीं। गलत विंडो चुनने पर लग्न-आधारित विश्लेषण बदल जाएगा।',
    lmt: 'आपका दिया समय भारतीय मानक समय (IST) की बजाय पुराने स्थानीय सूर्य-समय (LMT) जैसा ज़्यादा फिट बैठता है। अगर यह समय हाथ से लिखी पुरानी कुंडली से लिया है तो इसे ध्यान में रखें।',
    none_found: 'कोई मज़बूत मेल नहीं मिला। और घटनाएँ जोड़ें या समय की सीमा बढ़ाएँ।',
    dateReq: 'हर घटना की तारीख़ भरें', min3: 'कम से कम 2 घटनाएँ चाहिए (3-5+ बेहतर)',
    nextDay: '', yes: '✓', no: '✗',
  },
  en: {
    title: 'Confirm birth time', sub: 'Give dates of life events — we check which birth time fits them best.',
    knowQ: 'How much do you know about the birth time?',
    rough: 'I know roughly', part: 'Only the part of day', none: 'No idea at all',
    from: 'From', to: 'To', eventsQ: 'Life events (at least 3, ideally 5+)', addEvent: '+ Add event',
    pick: 'Choose event', run: 'Find birth time', running: 'Checking candidate birth times...', cold: 'The server may take 30-50 seconds to wake up',
    resultsTitle: 'Matching times', pickOne: 'Choose one window', exact: 'Exact time within this window', apply: 'Apply this time', applying: 'Rebuilding your kundli...',
    back: '← Edit inputs', close: 'Close', matched: 'events matched', score: 'fit',
    lowWarn: '⚠️ Low confidence — treat this as a hint only. If you know the time from a birth certificate or family record, keep that one. Add 5-6+ events for a sharper result.',
    conf: { high: 'Confidence: high', medium: 'Confidence: medium', low: 'Confidence: low' },
    lagnaOnly: 'By Lagna only', lagnaHelp: 'If the exact time can’t be pinned down, these Lagnas are most likely:',
    warn: 'This estimate is dasha-based (transits not used) — evidence, not proof. Choosing the wrong window will change the Lagna-based analysis.',
    lmt: 'The time you gave fits better as old local sun-time (LMT) than as Indian Standard Time (IST). If it came from an old handwritten kundli, keep this in mind.',
    none_found: 'No strong match found. Add more events or widen the time range.',
    dateReq: 'Fill in a date for every event', min3: 'At least 2 events needed (3-5+ works better)',
    nextDay: '', yes: '✓', no: '✗',
  },
};

const box = { background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)' };
const lbl = { fontSize:'12px', color:'var(--color-text-secondary)', fontWeight:'500', display:'block', marginBottom:'4px' };
const btnPrimary = { padding:'11px', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'14px', fontWeight:'500' };

function clamp(t, a, b) { return t < a ? a : t > b ? b : t; }

export default function RectifyModal({ kundli, uiLang = 'hi', onClose, onApplied }) {
  const L = uiLang === 'en' ? 'en' : 'hi';
  const T = TXT[L];
  const evLabel = (type) => { const r = [...EVENT_TYPES, ...MORE_EVENT_TYPES].find(e => e[0] === type); return r ? (L === 'en' ? r[2] : r[1]) : type; };

  const initialMode = kundli.birth_time_source === 'unknown' ? 'none' : 'rough';
  const [mode, setMode] = useState(initialMode);
  const base = (kundli.birth_time || '12:00').slice(0, 5);
  const shift = (hhmm, mins) => { const [h, m] = hhmm.split(':').map(Number); const t = Math.max(0, Math.min(1439, h * 60 + m + mins)); return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`; };
  const [start, setStart] = useState(shift(base, -60));
  const [end, setEnd] = useState(shift(base, 60));
  const [part, setPart] = useState('subah');
  // Start from saved events; otherwise pre-select the obvious ones from life details
  // the user already gave (married -> marriage, has children -> child birth).
  const [events, setEvents] = useState(() => {
    if (Array.isArray(kundli.life_events) && kundli.life_events.length > 0) return kundli.life_events.map(e => ({ type: e.type, date: e.date }));
    const pre = [];
    if (['married', 'divorced', 'widowed'].includes(kundli.marital_status)) pre.push({ type: 'marriage', date: '' });
    if (['one', 'two', 'three_plus'].includes(kundli.children_status)) pre.push({ type: 'child_birth', date: '' });
    return pre;
  });
  // "More options" (parents' demise) stays collapsed unless a saved event already uses it
  const [showMore, setShowMore] = useState(() => Array.isArray(kundli.life_events) && kundli.life_events.some(e => MORE_EVENT_TYPES.some(m => m[0] === e.type)));
  const toggleType = (type) => setEvents(list => list.some(e => e.type === type) ? list.filter(e => e.type !== type) : [...list, { type, date: '' }]);
  const [tick, setTick] = useState(0);
  const [phase, setPhase] = useState('setup'); // setup | running | results | applying
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  // Possible birth times: one card per best-fitting Lagna (server `suggestions`), falling back to raw windows.
  const cards = result?.suggestions?.length ? result.suggestions : (result?.windows || []);
  const [sel, setSel] = useState(0);
  const [chosenTime, setChosenTime] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (cards[sel]) setChosenTime(cards[sel].mid);
  }, [result, sel]);

  useEffect(() => {
    if (phase !== 'running' && phase !== 'applying') return;
    const id = setInterval(() => setTick(x => x + 1), 1800);
    return () => clearInterval(id);
  }, [phase]);

  async function run() {
    setError('');
    const filled = events.filter(e => e.type);
    if (filled.some(e => !e.date)) { setError(T.dateReq); return; }
    if (filled.length < 2) { setError(T.min3); return; }
    if (mode === 'rough' && end < start) { setError(L === 'en' ? 'End time must be after start time' : 'अंतिम समय शुरू के बाद होना चाहिए'); return; }
    setPhase('running');
    try {
      const res = await fetch('/api/kundli/rectify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kundli_id: kundli.id, events: filled,
          window: mode === 'rough' ? { mode: 'range', start, end } : mode === 'part' ? { mode: 'part', part } : { mode: 'unknown' },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error'); setPhase('setup'); return; }
      setResult(data.result); setSel(0); setPhase('results');
    } catch {
      setError(L === 'en' ? 'Network problem — please try again' : 'नेटवर्क समस्या — दोबारा कोशिश करें'); setPhase('setup');
    }
  }

  async function apply() {
    const w = cards[sel];
    if (!w || !chosenTime) return;
    setPhase('applying'); setError('');
    try {
      const res = await fetch('/api/kundli', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: kundli.id, birth_time: chosenTime, birth_time_source: 'rectified',
          rectification_choice: { time: chosenTime, window: { start: w.start, end: w.end }, lagna: w.lagna, score: w.score, matched: w.matched_count, of: result.events_used },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.kundli) { setError(data.error || 'Error'); setPhase('results'); return; }
      onApplied(data.kundli);
    } catch {
      setError(L === 'en' ? 'Network problem — please try again' : 'नेटवर्क समस्या — दोबारा कोशिश करें'); setPhase('results');
    }
  }

  const win = cards[sel];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:60, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => phase !== 'running' && phase !== 'applying' && onClose()}>
      <div onClick={e => e.stopPropagation()} style={{ ...box, width:'100%', maxWidth:'560px', maxHeight:'92vh', overflowY:'auto', padding:'1.1rem', borderBottomLeftRadius:0, borderBottomRightRadius:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', marginBottom:'6px' }}>
          <div>
            <p style={{ margin:0, fontSize:'16px', fontWeight:500, color:'var(--color-text-primary)' }}>{T.title}</p>
            <p style={{ margin:'3px 0 0', fontSize:'12px', color:'var(--color-text-tertiary)', lineHeight:1.5 }}>{kundli.label || kundli.full_name} · {kundli.dob}</p>
          </div>
          {phase !== 'running' && phase !== 'applying' && <button onClick={onClose} aria-label={T.close} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'var(--color-text-tertiary)', padding:'0 4px' }}>×</button>}
        </div>

        {/* ── SETUP ─────────────────────────────────────── */}
        {phase === 'setup' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <p style={{ margin:0, fontSize:'13px', color:'var(--color-text-secondary)', lineHeight:1.6 }}>{T.sub}</p>

            <div>
              <label style={lbl}>{T.knowQ}</label>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {[['rough', T.rough], ['part', T.part], ['none', T.none]].map(([v, text]) => (
                  <button key={v} type="button" onClick={() => setMode(v)} style={{ padding:'7px 12px', fontSize:'13px', cursor:'pointer', borderRadius:'var(--border-radius-md)', border:`0.5px solid ${mode===v ? 'var(--color-text-primary)' : 'var(--color-border-tertiary)'}`, background: mode===v ? 'var(--color-background-secondary)' : 'transparent', fontWeight: mode===v ? 500 : 400, color:'var(--color-text-primary)' }}>{text}</button>
                ))}
              </div>
              {mode === 'rough' && (
                <div style={{ display:'flex', gap:'10px', marginTop:'10px', alignItems:'center' }}>
                  <div style={{ flex:1 }}><label style={lbl}>{T.from}</label><input type="time" value={start} onChange={e => setStart(e.target.value)} style={{ width:'100%' }} /></div>
                  <div style={{ flex:1 }}><label style={lbl}>{T.to}</label><input type="time" value={end} onChange={e => setEnd(e.target.value)} style={{ width:'100%' }} /></div>
                </div>
              )}
              {mode === 'part' && (
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'10px' }}>
                  {PARTS.map(([v, hi, en]) => (
                    <button key={v} type="button" onClick={() => setPart(v)} style={{ padding:'6px 10px', fontSize:'12px', cursor:'pointer', borderRadius:'var(--border-radius-md)', border:`0.5px solid ${part===v ? 'var(--color-text-primary)' : 'var(--color-border-tertiary)'}`, background: part===v ? 'var(--color-background-secondary)' : 'transparent', color:'var(--color-text-primary)' }}>{L==='en' ? en : hi}</button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={lbl}>{L === 'en' ? 'Tap the events that happened in your life' : 'जीवन की जो घटनाएँ हुईं, उन पर टैप करें'} <span style={{ color:'var(--color-text-tertiary)', fontWeight:400 }}>({L === 'en' ? 'at least 3, ideally 5+' : 'कम से कम 3, बेहतर 5+'})</span></label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px' }}>
                {EVENT_TYPES.map(([v, hi, en]) => {
                  const on = events.some(e => e.type === v);
                  return (
                    <button key={v} type="button" onClick={() => toggleType(v)} className="lf-chip"
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', padding:'10px 4px', cursor:'pointer', borderRadius:'12px', textAlign:'center',
                        border:`1px solid ${on ? 'var(--color-brand, var(--color-text-primary))' : 'var(--color-border-tertiary)'}`,
                        background: on ? 'var(--color-brand-light, var(--color-background-secondary))' : 'var(--color-background-primary)',
                        color:'var(--color-text-primary)' }}>
                      <span style={{ fontSize:'22px', lineHeight:1 }}>{EVENT_ICONS[v]}</span>
                      <span style={{ fontSize:'11px', lineHeight:1.25, fontWeight: on ? 600 : 400 }}>{L === 'en' ? en : hi}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => setShowMore(x => !x)} style={{ marginTop:'8px', background:'none', border:'none', padding:'4px 0', cursor:'pointer', fontSize:'12px', color:'var(--color-text-info)', textDecoration:'underline' }}>
                {L === 'en' ? 'More options' : 'अन्य विकल्प'} {showMore ? '▴' : '▾'}
              </button>
              {showMore && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px', marginTop:'6px' }}>
                {MORE_EVENT_TYPES.map(([v, hi, en]) => {
                  const on = events.some(e => e.type === v);
                  return (
                    <button key={v} type="button" onClick={() => toggleType(v)} className="lf-chip"
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', padding:'10px 4px', cursor:'pointer', borderRadius:'12px', textAlign:'center',
                        border:`1px solid ${on ? 'var(--color-brand, var(--color-text-primary))' : 'var(--color-border-tertiary)'}`,
                        background: on ? 'var(--color-brand-light, var(--color-background-secondary))' : 'var(--color-background-primary)',
                        color:'var(--color-text-primary)' }}>
                      <span style={{ fontSize:'22px', lineHeight:1 }}>{EVENT_ICONS[v]}</span>
                      <span style={{ fontSize:'11px', lineHeight:1.25, fontWeight: on ? 600 : 400 }}>{L === 'en' ? en : hi}</span>
                    </button>
                  );
                })}
                </div>
              )}

              {events.length > 0 && (
                <div style={{ marginTop:'12px', display:'flex', flexDirection:'column', gap:'6px' }}>
                  <label style={lbl}>{L === 'en' ? 'When did each happen? (approximate date is fine)' : 'हर घटना कब हुई? (अंदाज़े की तारीख़ भी चलेगी)'}</label>
                  {events.map((ev, i) => (
                    <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <span style={{ fontSize:'18px', width:'26px', textAlign:'center' }}>{EVENT_ICONS[ev.type]}</span>
                      <span style={{ flex:'1 1 40%', minWidth:0, fontSize:'13px', color:'var(--color-text-primary)' }}>{evLabel(ev.type)}</span>
                      <input type="date" value={ev.date} max={today} min={kundli.dob} onChange={e => setEvents(list => list.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} style={{ flex:'1 1 50%', minWidth:0, fontSize:'13px' }} />
                      {(['child_birth', 'promotion', 'foreign_travel'].includes(ev.type)) && (
                        <button type="button" title={L === 'en' ? 'Add another' : 'एक और जोड़ें'} onClick={() => setEvents(list => { const copy = [...list]; copy.splice(i + 1, 0, { type: ev.type, date: '' }); return copy; })} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'var(--color-text-tertiary)', padding:'0 2px' }}>＋</button>
                      )}
                    </div>
                  ))}
                  {events.some(e => e.type === 'property') && (
                    <p style={{ margin:'2px 0 0', fontSize:'11px', color:'var(--color-text-tertiary)', lineHeight:1.5 }}>
                      {L === 'en' ? 'Property: registry/possession date is fine — we allow for the 2-6 months of booking before it.' : 'प्रॉपर्टी: रजिस्ट्री/कब्ज़े की तारीख़ चलेगी — उससे पहले के 2-6 महीने की बुकिंग का हम ध्यान रखते हैं।'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && <p style={{ margin:0, fontSize:'12px', color:'var(--color-text-danger)' }}>{error}</p>}
            <button type="button" onClick={run} style={btnPrimary}>{T.run}</button>
          </div>
        )}

        {/* ── RUNNING / APPLYING ─────────────────────────── */}
        {(phase === 'running' || phase === 'applying') && (
          <div style={{ textAlign:'center', padding:'1.6rem 0.5rem' }}>
            <style>{`@keyframes lf-hand { to { transform: rotate(360deg); } } @keyframes lf-hand-slow { to { transform: rotate(360deg); } }`}</style>
            <svg width="72" height="72" viewBox="0 0 72 72" style={{ display:'block', margin:'0 auto' }}>
              <circle cx="36" cy="36" r="32" fill="none" stroke="var(--color-border-secondary)" strokeWidth="2" />
              {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => (
                <line key={a} x1="36" y1="7" x2="36" y2={a % 90 === 0 ? 13 : 10} stroke="var(--color-text-tertiary)" strokeWidth="1.5" transform={`rotate(${a} 36 36)`} />
              ))}
              <line x1="36" y1="36" x2="36" y2="14" stroke="var(--color-text-primary)" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin:'36px 36px', animation:'lf-hand 1.6s linear infinite' }} />
              <line x1="36" y1="36" x2="36" y2="22" stroke="var(--color-text-secondary)" strokeWidth="3" strokeLinecap="round" style={{ transformOrigin:'36px 36px', animation:'lf-hand-slow 12s linear infinite' }} />
              <circle cx="36" cy="36" r="3" fill="var(--color-text-primary)" />
            </svg>
            <p style={{ fontSize:'14px', color:'var(--color-text-primary)', margin:'14px 0 4px', minHeight:'20px' }}>
              {phase === 'applying' ? T.applying : [
                L === 'en' ? 'Trying out possible birth times…' : 'संभावित जन्म-समय आज़माए जा रहे हैं…',
                L === 'en' ? 'Matching each one with your life events…' : 'हर समय को आपकी घटनाओं से मिलाया जा रहा है…',
                L === 'en' ? 'Comparing planetary periods (dasha)…' : 'ग्रहों की दशाएँ मिलाई जा रही हैं…',
                L === 'en' ? 'Almost there…' : 'बस थोड़ा और…',
              ][tick % 4]}
            </p>
            {phase === 'running' && <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', margin:0 }}>{T.cold}</p>}
          </div>
        )}

        {/* ── RESULTS ────────────────────────────────────── */}
        {phase === 'results' && result && (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={{ display:'flex', gap:'8px', alignItems:'baseline', flexWrap:'wrap' }}>
              <p style={{ margin:0, fontSize:'13px', fontWeight:500, color:'var(--color-text-primary)' }}>{T.resultsTitle}</p>
              <span style={{ fontSize:'12px', fontWeight:500, color: result.confidence === 'high' ? 'var(--color-text-success)' : result.confidence === 'medium' ? 'var(--color-text-warning)' : 'var(--color-text-danger)' }}>{T.conf[result.confidence]}</span>
            </div>
            <p style={{ margin:0, fontSize:'12px', color:'var(--color-text-tertiary)', lineHeight:1.5 }}>{result.confidence_reason}</p>
            {result.confidence === 'low' && (
              <div style={{ background:'var(--color-background-warning)', color:'var(--color-text-warning)', padding:'8px 10px', borderRadius:'var(--border-radius-md)', fontSize:'12px', lineHeight:1.5 }}>{T.lowWarn}</div>
            )}

            {result.lmt_check?.lmt_fits_better && (
              <div style={{ background:'var(--color-background-info)', color:'var(--color-text-info)', padding:'8px 10px', borderRadius:'var(--border-radius-md)', fontSize:'12px', lineHeight:1.5 }}>{T.lmt}</div>
            )}

            {cards.length === 0 ? (
              <p style={{ fontSize:'13px', color:'var(--color-text-secondary)' }}>{T.none_found}</p>
            ) : (
              <>
                <p style={{ margin:'4px 0 -4px', fontSize:'13px', fontWeight:500, color:'var(--color-text-primary)' }}>
                  {L === 'en' ? 'Possible birth times that match your events' : 'आपकी घटनाओं से मेल खाते संभावित जन्म समय'}
                </p>
                {result.current_time && (
                  <div style={{ background:'var(--color-background-info)', color:'var(--color-text-info)', padding:'8px 10px', borderRadius:'var(--border-radius-md)', fontSize:'12px', lineHeight:1.5 }}>
                    {L === 'en'
                      ? `Your recorded time ${result.current_time.time} (${result.current_time.lagna} Lagna) matches ${result.current_time.matched_count} of ${result.events_used} events${result.current_time.rank ? ` — its Lagna ranks #${result.current_time.rank} of ${result.current_time.lagna_count}` : ''}.`
                      : `आपका दर्ज समय ${result.current_time.time} (${result.current_time.lagna_hi} लग्न) ${result.events_used} में से ${result.current_time.matched_count} घटनाओं से मेल खाता है${result.current_time.rank ? ` — इसका लग्न ${result.current_time.lagna_count} में #${result.current_time.rank} पर है` : ''}।`}
                  </div>
                )}
                {cards.map((w, i) => (
                  <div key={i} onClick={() => setSel(i)} style={{ ...box, padding:'10px 12px', cursor:'pointer', borderColor: sel === i ? 'var(--color-text-primary)' : undefined, background: sel === i ? 'var(--color-background-secondary)' : undefined }}>
                    {result.suggestions?.length > 0 && (
                      <p style={{ margin:'0 0 4px', fontSize:'11px', fontWeight:600, letterSpacing:'0.5px', textTransform:'uppercase', color: i === 0 ? 'var(--color-text-success)' : 'var(--color-text-tertiary)' }}>
                        {i === 0 ? (L === 'en' ? 'Best fit' : 'सबसे अच्छा मेल') : (L === 'en' ? 'Also possible' : 'यह भी संभव')}
                      </p>
                    )}
                    <div style={{ display:'flex', justifyContent:'space-between', gap:'8px', alignItems:'center' }}>
                      <p style={{ margin:0, fontSize:'14px', fontWeight:500, color:'var(--color-text-primary)' }}>{w.start} – {w.end} <span style={{ fontWeight:400, color:'var(--color-text-secondary)', fontSize:'13px' }}>· {SIGN_SYMBOL[w.lagna] || ''} {L === 'en' ? w.lagna : w.lagna_hi} {L === 'en' ? 'Lagna' : 'लग्न'}</span></p>
                      <span style={{ fontSize:'12px', color:'var(--color-text-secondary)', whiteSpace:'nowrap' }}>{w.matched_count}/{result.events_used} · {T.score} {Math.round(w.score)}%</span>
                    </div>
                    <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', marginTop:'6px' }}>
                      {w.events.map((e, j) => (
                        <span key={j} title={`${e.md} / ${e.ad}`} style={{ fontSize:'11px', padding:'2px 6px', borderRadius:'4px', background:'var(--color-background-tertiary)', color: e.matched ? 'var(--color-text-success)' : 'var(--color-text-tertiary)' }}>
                          {e.matched ? T.yes : T.no} {evLabel(e.type)} ({e.date.slice(0, 4)})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {win && (
                  <div>
                    <label style={lbl}>{T.exact} ({win.start}–{win.end})</label>
                    <input type="time" value={chosenTime} min={win.start} max={win.end} onChange={e => setChosenTime(clamp(e.target.value, win.start, win.end))} style={{ width:'100%', fontSize:'16px', textAlign:'center' }} />
                  </div>
                )}
              </>
            )}

            {result.by_lagna?.length > 0 && (result.confidence === 'low' || result.window === 'unknown') && (
              <div>
                <p style={{ margin:'0 0 4px', fontSize:'12px', fontWeight:500, color:'var(--color-text-secondary)' }}>{T.lagnaOnly}</p>
                <p style={{ margin:'0 0 6px', fontSize:'12px', color:'var(--color-text-tertiary)' }}>{T.lagnaHelp}</p>
                {result.by_lagna.slice(0, 3).map((l, i) => (
                  <p key={i} style={{ margin:'0 0 2px', fontSize:'13px', color:'var(--color-text-primary)' }}>{L === 'en' ? l.lagna : l.lagna_hi} — {Math.round(l.score)}% <span style={{ color:'var(--color-text-tertiary)', fontSize:'12px' }}>({l.from}–{l.to})</span></p>
                ))}
              </div>
            )}

            <p style={{ margin:0, fontSize:'11px', color:'var(--color-text-tertiary)', lineHeight:1.5 }}>{T.warn}</p>
            {error && <p style={{ margin:0, fontSize:'12px', color:'var(--color-text-danger)' }}>{error}</p>}
            <div style={{ display:'flex', gap:'8px' }}>
              <button type="button" onClick={() => setPhase('setup')} style={{ flex:'0 0 auto', padding:'11px 14px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-md)', cursor:'pointer', fontSize:'13px', color:'var(--color-text-secondary)' }}>{T.back}</button>
              {cards.length > 0 && <button type="button" onClick={apply} disabled={!chosenTime} style={{ ...btnPrimary, flex:1 }}>{T.apply}</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

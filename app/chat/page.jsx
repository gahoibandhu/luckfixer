'use client';
// app/chat/page.jsx — Claude-style layout
// Left: kundli selector + nav. Right: chat opens when kundli selected.

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import KundliDetailPanel from '@/components/KundliDetailPanel';
import DateOfBirthInput from '@/components/DateOfBirthInput';
import SiteRatingWidget from '@/components/SiteRatingWidget';
import { t, UI_LANGUAGES } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const LOGO_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';

const LANG_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'hi',   label: 'हिंदी' },
  { value: 'en',   label: 'English' },
];

// ── Letter-by-letter "typewriter" text component ─────────────────
// Reveals text ONE CHARACTER AT A TIME (not word-by-word) — deliberately
// paced slower than instant-reveal so a response takes real time to
// finish appearing, giving people time to actually read it as it comes
// in, rather than a wall of text landing all at once. A blinking cursor
// shows while it's still "typing". Very long replies are still capped
// at a max total duration so they don't drag on forever.
// Only used for freshly-arrived assistant messages (marked `_animate`
// on the message object) — messages loaded from chat history render
// statically, instantly, with no replay.
function TypewriterText({ text, enabled, onDone }) {
  const chars = Array.from(text || ''); // Array.from (not .split('')) so Devanagari combining marks/matras don't get split apart mid-character
  const [count, setCount] = useState(enabled ? 0 : chars.length);

  useEffect(() => {
    if (!enabled) { setCount(chars.length); return; }
    if (chars.length === 0) { onDone?.(); return; }

    let i = 0;
    const CHAR_MS = 22;          // normal pace — ~45 characters/sec
    const MAX_TOTAL_MS = 14000;  // don't let very long replies drag past ~14s
    const stepMs = Math.min(CHAR_MS, MAX_TOTAL_MS / chars.length);

    const interval = setInterval(() => {
      i++;
      setCount(i);
      if (i >= chars.length) {
        clearInterval(interval);
        onDone?.();
      }
    }, stepMs);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled]);

  const done = count >= chars.length;

  return (
    <>
      {chars.slice(0, count).join('')}
      {enabled && !done && <span className="lf-type-cursor">▌</span>}
    </>
  );
}

// ── Quick action configs ──────────────────────────────────────
// Each action either asks 1-2 clarifying questions first (so the AI
// gets a precise, specific question instead of a vague one — this
// saves tokens on follow-up clarification and gives sharper predictions)
// or fires immediately if no clarification is needed (e.g. "आज का गोचर").
function dashaInfoOf(k) {
  const vim = k?.planet_data?.vimshottari?.current;
  return vim ? `(${vim.mahaDasha?.lordHi} MD, ${vim.antarDasha?.lordHi} AD)` : '';
}
function nameOf(k) { return k?.full_name?.split(' ')[0] || ''; }
function ageOf(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const QUICK_ACTION_CONFIG = {
  career: {
    label: '💼 करियर',
    questions: [
      { key:'detail', label:'अपनी situation बताएं — job, business, ya koi specific field', type:'text', placeholder:'जैसे: government job chahiye, ya naya business shuru karna hai, ya kisi field mein switch karna hai...' },
    ],
    buildPrompt: (k, ans) => {
      const name = nameOf(k), dasha = dashaInfoOf(k);
      const detail = ans.detail?.trim() ? ans.detail.trim() : 'general career outlook';
      return `${name} ka career ke baare mein sawal hai: "${detail}". Janam ${k?.dob}, abhi ${dasha} chal raha hai. Career score, supporting/opposing factors, relevant yoga, aur agle 6 mahine ka specific date window batao jab career sabse active rahega. Unke exact sawal ka direct jawab do.`;
    },
  },
  marriage: {
    label: '💍 विवाह',
    questions: [
      { key:'detail', label:'अपना सवाल बताएं (status/specific concern)', type:'text', placeholder:'जैसे: shaadi kab hogi, ya abhi tak kyun nahi hui, ya rishta sahi hai kya...' },
    ],
    buildPrompt: (k, ans) => {
      const name = nameOf(k), dasha = dashaInfoOf(k);
      const detail = ans.detail?.trim() ? ans.detail.trim() : 'vivah/relationship ka status';
      const age = ageOf(k?.dob);
      const ageNote = age && age >= 30
        ? ` IMPORTANT: ${name} ki age abhi ${age} saal hai. Agar already vivah ho chuka ho ya past mein strong yog the (jaise 27-32 ke beech), woh window bhi mention karo taaki prediction sirf future ke liye na ho — past ko bhi acknowledge karo jisse trust bane. Agar abhi tak nahi hua, toh honestly bolo ki kya delay hai aur aage ka realistic window kya hai.`
        : '';
      return `${name} ka vivah/relationship sawal: "${detail}".${ageNote} 7th lord, D9 chart, Venus position, marriage yoga, aur sabse strong vivah timing window batao (past aur future dono, jo bhi relevant ho). ${dasha} chal raha hai — isse connect karo. Unke exact sawal ka direct jawab do.`;
    },
  },
  remedy: {
    label: '🪔 उपाय',
    questions: [
      { key:'detail', label:'किस क्षेत्र के लिए उपाय चाहिए?', type:'text', placeholder:'जैसे: career ke liye, health ke liye, ya sirf general upay...' },
    ],
    buildPrompt: (k, ans) => {
      const name = nameOf(k), dasha = dashaInfoOf(k);
      const area = ans.detail?.trim() ? ans.detail.trim() : 'general life improvement';
      return `${name} ki kundli mein "${area}" ke liye sabse zaroori upay kya hai abhi? ${dasha} dasha ke hisaab se ek focused, specific upay batao — exact mantra/daan/din/sankhya ke saath. Generic upay mat do, unke weakest planet ke specific basis pe do.`;
    },
  },
  dasha: {
    label: '📅 दशा',
    questions: [],
    buildPrompt: (k) => {
      const name = nameOf(k), dasha = dashaInfoOf(k);
      return `${name} ki abhi ${dasha} chal rahi hai — iska career, relationships aur health par kya exact prabhav hai? Agla antardasha change kab hoga aur kya naya laayega?`;
    },
  },
  transit: {
    label: '🔭 गोचर',
    questions: [],
    buildPrompt: (k) => {
      const name = nameOf(k);
      return `${name} ke liye abhi kaun se planets transit kar rahe hain? Sade Sati active hai ya nahi, aur ashtakavarga bindus ke hisaab se kaunsa transit strongest impact de raha hai?`;
    },
  },
  annual: {
    label: '📆 इस साल',
    questions: [],
    buildPrompt: (k) => {
      const name = nameOf(k);
      return `${name} ke liye ${new Date().getFullYear()} ka varshaphal kya hai? Muntha kahan hai, varshesh kaun hai, aur career/vivah/health mein kya expect karein?`;
    },
  },
};

export default function ChatPage() {
  const supabase    = createClient();
  const router      = useRouter();
  const messagesEnd = useRef(null);
  const inputRef    = useRef(null);
  const recognitionRef = useRef(null);
  const utteranceRef   = useRef(null);

  const [userId,           setUserId]           = useState(null);
  const [kundlis,          setKundlis]          = useState([]);
  const [kundli,           setKundli]           = useState(null);
  const [dailyCard,        setDailyCard]        = useState(null); // today's proactive gochar insight, dismissible
  const [notableFinding,   setNotableFinding]   = useState(null); // one-time "we found something" teaser
  const [showRateNudge,    setShowRateNudge]    = useState(false); // "साइट को रेट करें" nudge after a few chat turns
  const [rateNudgeDismissed, setRateNudgeDismissed] = useState(false);
  const [sessions,         setSessions]         = useState([]);
  const [sessionId,        setSessionId]        = useState(null);
  const [pendingKundliId,  setPendingKundliId]  = useState(null);
  const [pendingFollowUpId,setPendingFollowUpId]= useState(null);
  const [messages,         setMessages]         = useState([]);
  const [input,            setInput]            = useState('');
  const [loading,          setLoading]          = useState(false);
  const [usage,            setUsage]            = useState({ freeChatsLeft:5, freeMinsLeft:10 });
  const [limitErr,         setLimitErr]         = useState('');
  const [langPref,         setLangPref]         = useState('hi');
  const [uiLang,           setUiLang]           = useState('hi'); // app's own UI chrome language — separate from langPref (AI reply language)
  const [langMenuOpen,     setLangMenuOpen]      = useState(false);
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [panel,            setPanel]            = useState('sessions'); // 'sessions'|'kundlis'
  const [detailPanelOpen,  setDetailPanelOpen]   = useState(false);
  const [detailPanelTab,   setDetailPanelTab]     = useState('general');
  const [activeQuickForm,  setActiveQuickForm]  = useState(null); // which quick-action form is open
  const [quickFormAnswers, setQuickFormAnswers] = useState({});

  // ── In-chat kundli onboarding (no redirect to /profile) ─────────
  const [addKundliOpen, setAddKundliOpen]   = useState(false);
  const [newK,          setNewK]            = useState({ label:'', full_name:'', dob:'', birth_time:'', birth_place:'', latitude:'', longitude:'', ayanamsa:'lahiri', gender:'' });
  const [geocoding,     setGeocoding]       = useState(false);
  const [geoResults,    setGeoResults]      = useState([]);
  const [geoError,      setGeoError]        = useState('');
  const [savingKundli,  setSavingKundli]    = useState(false);

  // ── Voice input/output state ─────────────────────────────────
  const [voiceInputSupported,  setVoiceInputSupported]  = useState(false);
  const [voiceOutputSupported, setVoiceOutputSupported]  = useState(false);
  const [listening,            setListening]            = useState(false);
  const [speakingIndex,        setSpeakingIndex]         = useState(null);

  useEffect(() => { init(); }, []);

  // ── Voice feature detection (client-side only, browser APIs) ────
  useEffect(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    setVoiceInputSupported(!!SR);
    setVoiceOutputSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => {
      recognitionRef.current?.stop?.();
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // Maps the app's language preference to a BCP-47 tag both the
  // SpeechRecognition and SpeechSynthesis APIs understand.
  function voiceLangTag() {
    if (langPref === 'en') return 'en-IN';
    return 'hi-IN'; // covers both 'hi' and 'auto'/hinglish — Hindi ASR/TTS handles Hinglish speech reasonably
  }

  function toggleVoiceInput() {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    // Stop any ongoing speech output before listening, so the mic doesn't
    // pick up the app's own voice.
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingIndex(null);

    const recognition = new SR();
    recognition.lang = voiceLangTag();
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function speakMessage(text, index) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Clicking the speaker on a message that's already being read stops it.
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel(); // stop any other message currently being read
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLangTag();
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    utteranceRef.current = utterance;
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  }

  // Auto-grows the composer textarea as the person types (capped by
  // max-height in CSS, which switches to internal scroll beyond that).
  function autoGrow(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  function changeUiLang(code) {
    setUiLang(code);
    if (typeof window !== 'undefined') window.localStorage.setItem('lf_ui_lang', code);
  }

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  // Show a one-time "rate the site" nudge once the conversation has
  // gone a few turns — the moment right after they've actually used
  // (and presumably formed an opinion on) the product, not before.
  useEffect(() => {
    const assistantReplies = messages.filter(m => m.role === 'assistant').length;
    if (assistantReplies >= 3 && !rateNudgeDismissed) setShowRateNudge(true);
  }, [messages, rateNudgeDismissed]);

  function dismissRateNudge() {
    setShowRateNudge(false);
    setRateNudgeDismissed(true);
  }

  async function init() {
    const savedUiLang = typeof window !== 'undefined' ? window.localStorage.getItem('lf_ui_lang') : null;
    if (savedUiLang) setUiLang(savedUiLang);

    const urlKundliId = new URLSearchParams(window.location.search).get('kundliId');
    const { data:{ session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    setUserId(session.user.id);

    const { data: ks } = await supabase
      .from('saved_kundlis').select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending:false });
    setKundlis(ks || []);

    const { data: sess } = await supabase
      .from('chat_sessions')
      .select('id,title,updated_at,kundli_id')
      .eq('user_id', session.user.id)
      .or('deleted_by_user.is.null,deleted_by_user.eq.false')
      .order('updated_at', { ascending:false })
      .limit(30);
    setSessions(sess || []);

    if (urlKundliId && ks) {
      const k = ks.find(x => x.id === urlKundliId);
      if (k) { selectKundli(k, session.user.id); return; }
    }
    if (ks?.length === 1) { selectKundli(ks[0], session.user.id); return; }
  }

  function buildContext(k) {
    if (!k) return null;
    return {
      full_name: k.full_name, dob: k.dob, birth_time: k.birth_time, gender: k.gender,
      birth_place: k.birth_place, latitude: k.latitude, longitude: k.longitude,
      analysis: k.planet_data?.analysis, factSheet: k.planet_data?.factSheet,
      vimshottari: k.planet_data?.vimshottari?.current,
      allMahadashas: k.planet_data?.vimshottari?.mahadashas,
      numerology: k.planet_data?.numerology, specialist: k.planet_data?.specialist,
      jaimini: k.planet_data?.jaimini, crossValidation: k.planet_data?.crossValidation,
      yogas: k.planet_data?.yogas, ashtakavarga: k.planet_data?.ashtakavarga,
      nakshatra: k.planet_data?.nakshatra, varshaphal: k.planet_data?.varshaphal,
    };
  }

  // ── Daily proactive insight — safe by construction ────────────
  // Unlike competitor apps that use AI to invent specific daily events
  // ("aaj boss se disagreement hoga"), this pulls directly from the
  // deterministic, classical Gochar Phal text already computed and
  // stored on the kundli (lib/gochar-phal.js) — same real transit data,
  // zero hallucination risk, and naturally stays factually consistent
  // day to day since it's not being regenerated by a model each time.
  // Shown once per day per kundli (tracked in localStorage) so it
  // doesn't nag on every visit.
  function checkDailyInsight(k) {
    if (!k?.planet_data?.gocharPhal) return;
    const storageKey = `lf_daily_seen_${k.id}`;
    const today = new Date().toISOString().slice(0, 10);
    const lastSeen = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : today;
    if (lastSeen === today) { setDailyCard(null); return; }

    const active = k.planet_data.gocharPhal.filter(p => p.start <= today && p.end >= today);
    if (active.length === 0) { setDailyCard(null); return; }

    // Prefer showing the slowest-moving (most significant) active transit
    const priority = { Saturn: 3, Jupiter: 2, Mars: 1 };
    const top = active.sort((a, b) => (priority[b.planet] || 0) - (priority[a.planet] || 0))[0];
    setDailyCard(top);
  }

  function dismissDailyCard() {
    if (kundli && typeof window !== 'undefined') {
      window.localStorage.setItem(`lf_daily_seen_${kundli.id}`, new Date().toISOString().slice(0, 10));
    }
    setDailyCard(null);
  }

  // ── Notable-finding teaser — shown ONCE per kundli (not daily) ───
  // Real, grounded, honesty-first version of the "Deep Dive Hook"
  // pattern competitor apps use: instead of inventing a hook, this
  // picks the single most notable REAL finding already computed
  // (strongest classical yoga, or if none, the most extreme Varshaphal
  // area) and teases it — clicking sends an actual chat question about
  // that specific finding, so the AI answers using real injected data,
  // not a canned line.
  function checkNotableFinding(k) {
    if (typeof window === 'undefined') return;
    const storageKey = `lf_notable_seen_${k.id}`;
    if (window.localStorage.getItem(storageKey)) { setNotableFinding(null); return; }

    const yogas = k.planet_data?.yogas || [];
    const strongYoga = yogas.find(y => !y.isChallenging && y.strength === 'high') || yogas.find(y => !y.isChallenging);
    if (strongYoga) {
      setNotableFinding({ type: 'yoga', label: strongYoga.name, prompt: `मेरी कुंडली में ${strongYoga.name} है — इसके बारे में विस्तार से बताएं, यह मेरी ज़िंदगी में कैसे असर डालता है?` });
      return;
    }

    const areas = k.planet_data?.varshaphal?.areas || [];
    const notable = [...areas].sort((a, b) => (b.strength === 'शुभ' ? 1 : 0) - (a.strength === 'शुभ' ? 1 : 0))[0];
    if (notable) {
      setNotableFinding({ type: 'varshaphal', label: notable.area, prompt: `मेरे इस साल के ${notable.area} के बारे में विस्तार से बताएं।` });
      return;
    }
    setNotableFinding(null);
  }

  function openNotableFinding() {
    if (kundli && typeof window !== 'undefined') {
      window.localStorage.setItem(`lf_notable_seen_${kundli.id}`, '1');
    }
    const prompt = notableFinding?.prompt;
    setNotableFinding(null);
    if (prompt) sendMessage(null, prompt);
  }

  function dismissNotableFinding() {
    if (kundli && typeof window !== 'undefined') {
      window.localStorage.setItem(`lf_notable_seen_${kundli.id}`, '1');
    }
    setNotableFinding(null);
  }

  async function selectKundli(k) {
    setKundli(k); setPendingKundliId(k.id);
    setSidebarOpen(false); setSessionId(null); setLimitErr(''); setDetailPanelOpen(false);
    checkDailyInsight(k);
    checkNotableFinding(k);
    setMessages([{ role:'assistant', content:'...' }]);
    try {
      const res = await fetch('/api/chat', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ isGreeting:true, messages:[{ role:'user', content:'hello' }], kundliContext: buildContext(k) }),
      });
      const data = await res.json();
      setMessages([{ role:'assistant', content: data.content, _animate: true }]);
      if (data.pendingFollowUpId) setPendingFollowUpId(data.pendingFollowUpId);
    } catch {
      setMessages([{ role:'assistant', content:`नमस्ते! ${k.full_name} की कुंडली लोड हो गई। कोई भी प्रश्न पूछें।` }]);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  }

  // ── In-chat kundli onboarding — same /api/geocode + /api/kundli
  // endpoints the /profile page uses, just surfaced inline in chat so a
  // brand-new user never has to leave the conversation to get started.
  async function geocodePlace() {
    if (!newK.birth_place.trim()) { setGeoError('कृपया पहले जन्म स्थान भरें'); return; }
    setGeocoding(true); setGeoError(''); setGeoResults([]);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(newK.birth_place)}`);
      const data = await res.json();
      if (data.found && data.results?.length > 0) {
        if (data.results.length === 1) selectGeoResult(data.results[0]);
        else setGeoResults(data.results);
      } else {
        setGeoError('स्थान नहीं मिला — Latitude/Longitude खुद डालें');
      }
    } catch {
      setGeoError('स्थान खोजने में समस्या — Latitude/Longitude खुद डालें');
    }
    setGeocoding(false);
  }

  function selectGeoResult(r) {
    setNewK(k => ({ ...k, birth_place: r.display_name, latitude: r.latitude.toFixed(4), longitude: r.longitude.toFixed(4) }));
    setGeoResults([]); setGeoError('');
  }

  async function saveNewKundli(e) {
    e.preventDefault();
    if (!newK.full_name || !newK.dob || !newK.birth_time) { setGeoError('नाम, जन्म तिथि और समय ज़रूरी हैं'); return; }
    if (!newK.gender) { setGeoError('कृपया लिंग चुनें'); return; }
    if (!newK.latitude || !newK.longitude) { setGeoError('कृपया जन्म स्थान खोजें, या Latitude/Longitude खुद भरें'); return; }
    setSavingKundli(true); setGeoError('');
    try {
      const res = await fetch('/api/kundli', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newK),
      });
      const data = await res.json();
      if (data.kundli) {
        setKundlis(prev => [data.kundli, ...prev]);
        setAddKundliOpen(false);
        setNewK({ label:'', full_name:'', dob:'', birth_time:'', birth_place:'', latitude:'', longitude:'', ayanamsa:'lahiri', gender:'' });
        await selectKundli(data.kundli); // auto-select and jump straight into chat
      } else {
        setGeoError(data.error || 'कुंडली save नहीं हो पाई, दोबारा कोशिश करें');
      }
    } catch {
      setGeoError('कुछ गड़बड़ हुई — दोबारा कोशिश करें');
    }
    setSavingKundli(false);
  }

  async function loadSession(s) {
    setSessionId(s.id); setSidebarOpen(false);
    const kForSession = kundlis.find(k => k.id === s.kundli_id);
    if (kForSession && kundli?.id !== kForSession.id) { setKundli(kForSession); setPendingKundliId(kForSession.id); }
    const { data: msgs } = await supabase.from('chat_messages')
      .select('role,content').eq('session_id', s.id).order('id', { ascending:true });
    setMessages(msgs || []);
  }

  async function newChat() {
    setSessionId(null); setMessages([]); setLimitErr('');
    if (kundli) selectKundli(kundli);
    else setMessages([]);
  }

  async function sendMessage(e, quickPrompt) {
    if (e) e.preventDefault();
    const text = quickPrompt || input;
    if (!text?.trim() || loading) return;
    setLimitErr(''); setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto'; // collapse composer back to 1 row
    if (listening) { recognitionRef.current?.stop(); setListening(false); }
    const userMsg = { role:'user', content: text };
    setMessages(m => [...m, userMsg]);
    setLoading(true);

    // Extra safety net: if something hangs (network stall, no response,
    // no exception thrown) for more than 45s, force-unstick the send button
    // rather than leaving the user permanently blocked.
    const safetyTimeout = setTimeout(() => setLoading(false), 45000);

    // CRITICAL: everything below is wrapped in try/catch/finally. Without
    // this, any network hiccup or JSON-parse failure would throw an
    // uncaught exception, leaving `loading` stuck at `true` forever —
    // which silently blocks every future message (the "atak jaata hai"
    // bug: send button does nothing on the 2nd+ question after any error).
    try {
      let sid = sessionId;
      if (!sid && userId) {
        const { data: newSess } = await supabase.from('chat_sessions').insert({
          user_id: userId, kundli_id: pendingKundliId || null, title: text.slice(0,40),
        }).select().single();
        if (newSess) { sid = newSess.id; setSessionId(sid); setSessions(prev => [newSess, ...prev]); }
      }

      const res = await fetch('/api/chat', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].filter(m => m.role !== 'system').slice(-10),
          sessionId: sid, kundliId: pendingKundliId || kundli?.id || null,
          kundliContext: buildContext(kundli), langPref,
          pendingFollowUpId: pendingFollowUpId || null,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        // Server returned non-JSON (e.g. a raw error page) — don't crash,
        // show a graceful message instead.
        data = { content: 'माफ़ करें, जवाब में कुछ गड़बड़ हुई। कृपया दोबारा भेजें।' };
      }

      if (pendingFollowUpId) setPendingFollowUpId(null);

      if (res.status === 429) {
        setLimitErr(data.error);
        setMessages(m => m.slice(0, -1)); // remove the unanswered user message
      } else {
        setMessages(m => [...m, { role:'assistant', content: data.content || 'माफ़ करें, जवाब नहीं मिल पाया। कृपया दोबारा कोशिश करें।', _animate: true }]);
        if (data.usage) setUsage(data.usage);
      }
    } catch (err) {
      console.error('[Chat] sendMessage failed:', err);
      setMessages(m => [...m, { role:'assistant', content: 'माफ़ करें, connection में समस्या हुई। कृपया दोबारा भेजें।' }]);
    } finally {
      // ALWAYS runs — success, error, or network failure — so the send
      // button never gets permanently stuck.
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }

  async function deleteSession(sessId, e) {
    e.stopPropagation();
    await fetch(`/api/chat/delete?sessionId=${sessId}`, { method:'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== sessId));
    if (sessId === sessionId) { setSessionId(null); setMessages([]); }
  }

  async function signOut() { await supabase.auth.signOut(); router.push('/login'); }

  // ── SIDEBAR ────────────────────────────────────────────────
  const sidebarStyle = {
    width: '240px', flexShrink: 0,
    background: 'var(--color-background-primary)',
    borderRight: '0.5px solid var(--color-border-tertiary)',
    display: 'flex', flexDirection: 'column', height: '100dvh',
  };

  return (
    <div style={{ display:'flex', height:'100dvh', overflow:'hidden', background:'var(--color-background-tertiary)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:20 }} />}

      {/* ── SIDEBAR ── */}
      <div className={`lf-sidebar ${sidebarOpen ? 'lf-sidebar-open' : ''}`} style={sidebarStyle}>

        {/* Header */}
        <div style={{ padding:'12px 12px 8px', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'9px', marginBottom:'10px' }}>
            <img src={LOGO_URL} alt="LF" style={{ width:'32px', height:'32px', borderRadius:'18%', objectFit:'cover', flexShrink:0 }} />
            <div>
              <p style={{ fontSize:'13px', fontWeight:'600', color:'var(--color-text-primary)', margin:0 }}>Luckfixer 2.0</p>
              <p style={{ fontSize:'10px', color:'var(--color-brand)', margin:0 }}>✦ Vedic AI</p>
            </div>
          </div>
          <button onClick={newChat} style={{ width:'100%', padding:'7px', fontSize:'13px', fontWeight:'500', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'8px', cursor:'pointer' }}>
            + नई Chat
          </button>
        </div>

        {/* Faladesh quick-access — for whichever kundli is currently
            active in this chat, so predictions are one click away
            without leaving the conversation. */}
        {kundli && (
          <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)', flexShrink: 0 }}>
            <p style={{ fontSize: '10px', fontWeight: '500', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', margin: '0 0 6px' }}>फलादेश</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[['varshik', '📅 वार्षिक'], ['masik', '🌙 मासिक'], ['saptahik', '⭐ साप्ताहिक']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setDetailPanelTab(key); setDetailPanelOpen(true); setSidebarOpen(false); }}
                  style={{ flex: 1, padding: '6px 4px', fontSize: '10px', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '7px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'0.5px solid var(--color-border-tertiary)', flexShrink:0 }}>
          {[['sessions','💬 Chats'],['kundlis','🪐 कुंडली']].map(([id,label]) => (
            <button key={id} onClick={() => setPanel(id)} style={{
              flex:1, padding:'8px 4px', fontSize:'11px', border:'none', background:'none', cursor:'pointer',
              color: panel===id ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
              borderBottom: panel===id ? `2px solid var(--color-brand)` : '2px solid transparent',
              fontWeight: panel===id ? '600' : '400', transition:'all 0.15s',
            }}>{label}</button>
          ))}
        </div>

        {/* Sessions */}
        {panel === 'sessions' && (
          <div style={{ flex:1, overflowY:'auto', padding:'6px' }}>
            {sessions.length === 0
              ? <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', padding:'12px', textAlign:'center' }}>अभी कोई chat नहीं</p>
              : sessions.map(s => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'2px', marginBottom:'2px' }}>
                  <div onClick={() => loadSession(s)} style={{
                    flex:1, padding:'7px 8px', borderRadius:'7px', cursor:'pointer', fontSize:'12px',
                    background: s.id===sessionId ? 'var(--color-background-secondary)' : 'transparent',
                    color:'var(--color-text-primary)',
                  }}>
                    <p style={{ margin:'0 0 1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'160px' }}>{s.title || 'Chat'}</p>
                    <p style={{ margin:0, fontSize:'10px', color:'var(--color-text-tertiary)' }}>{new Date(s.updated_at).toLocaleDateString('hi-IN')}</p>
                  </div>
                  <button onClick={e => deleteSession(s.id,e)} style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', color:'var(--color-text-tertiary)', fontSize:'11px', opacity:0.5, flexShrink:0 }}>✕</button>
                </div>
              ))
            }
          </div>
        )}

        {/* Kundlis */}
        {panel === 'kundlis' && (
          <div style={{ flex:1, overflowY:'auto', padding:'6px' }}>
            {kundlis.length === 0 && (
              <p style={{ fontSize:'12px', color:'var(--color-text-tertiary)', padding:'12px', textAlign:'center' }}>कोई कुंडली नहीं</p>
            )}
            {kundlis.map(k => (
              <div key={k.id} onClick={() => selectKundli(k)} style={{
                padding:'9px 10px', borderRadius:'8px', cursor:'pointer', marginBottom:'3px',
                background: kundli?.id===k.id ? 'var(--color-background-info)' : 'transparent',
                border: `0.5px solid ${kundli?.id===k.id ? 'var(--color-border-secondary)' : 'transparent'}`,
                transition:'all 0.12s',
              }}>
                <p style={{ margin:'0 0 1px', fontSize:'13px', fontWeight:'500', color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.label || k.full_name}</p>
                <p style={{ margin:0, fontSize:'10px', color:'var(--color-text-tertiary)' }}>{k.dob} · {k.birth_place?.split(',')[0]}</p>
              </div>
            ))}
            <button onClick={() => { setAddKundliOpen(true); setMessages([]); setKundli(null); setSidebarOpen(false); }} style={{ width:'100%', marginTop:'6px', padding:'7px', fontSize:'12px', background:'none', border:'1px dashed var(--color-border-tertiary)', borderRadius:'8px', cursor:'pointer', color:'var(--color-text-tertiary)' }}>
              + नई कुंडली
            </button>
          </div>
        )}

        {/* Bottom nav */}
        <div style={{ borderTop:'0.5px solid var(--color-border-tertiary)', padding:'8px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'var(--color-text-tertiary)', marginBottom:'8px', padding:'0 2px' }}>
            <span>{t('freeChatsLeft', uiLang)}: <strong style={{ color:'var(--color-text-primary)' }}>{usage.freeChatsLeft}</strong></span>
            <span>{t('freeMinsLeft', uiLang)}: <strong style={{ color:'var(--color-text-primary)' }}>{typeof usage.freeMinsLeft === 'number' ? usage.freeMinsLeft.toFixed(1) : usage.freeMinsLeft}</strong></span>
          </div>
          {[['🕉️ राम शलाका','/ram-shalaka'],['💍 मिलान','/milan'],['👤 प्रोफाइल','/profile']].map(([hiLabel,path]) => {
            const key = path === '/ram-shalaka' ? 'ramShalaka' : path === '/milan' ? 'milan' : 'profile';
            return (
            <button key={path} onClick={() => router.push(path)} style={{ width:'100%', padding:'6px', marginBottom:'3px', fontSize:'12px', background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'7px', cursor:'pointer', color:'var(--color-text-secondary)', textAlign:'left' }}>
              {t(key, uiLang)}
            </button>
            );
          })}

          {/* Open-to-all site feedback — always reachable from chat,
              not just after the conversation ends. Compact mode: a
              single button, expands inline to the full public rating
              widget (average + everyone's comments, own rating entry).
              See components/SiteRatingWidget.jsx + app/api/ratings. */}
          <div style={{ margin:'3px 0' }}>
            <SiteRatingWidget feature="overall" compact />
          </div>

          {/* UI language toggle — separate from the AI reply-language
              selector above; this switches the app's own buttons/labels. */}
          <div style={{ display:'flex', gap:'4px', margin:'6px 0' }}>
            {UI_LANGUAGES.map(l => (
              <button key={l.code} onClick={() => changeUiLang(l.code)} style={{
                flex:1, padding:'5px', fontSize:'11px', borderRadius:'7px', cursor:'pointer',
                border: uiLang===l.code ? '1px solid var(--color-brand)' : '0.5px solid var(--color-border-tertiary)',
                background: uiLang===l.code ? 'var(--color-brand-light)' : 'none',
                color: uiLang===l.code ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
              }}>
                {l.label}
              </button>
            ))}
          </div>

          <button onClick={signOut} style={{ width:'100%', padding:'6px', fontSize:'11px', background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary)' }}>{t('logout', uiLang)}</button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Topbar */}
        <div style={{ padding:'10px 14px', borderBottom:'0.5px solid var(--color-border-tertiary)', display:'flex', alignItems:'center', gap:'10px', background:'var(--color-background-primary)', minHeight:'50px', flexShrink:0 }}>
          <button onClick={() => setSidebarOpen(s=>!s)} className="lf-mobile-only" style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:'4px', color:'var(--color-text-secondary)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          {kundli ? (
            <>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#4ade80', flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:'14px', fontWeight:'500', color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{kundli.label || kundli.full_name}</p>
                <p style={{ margin:0, fontSize:'11px', color:'var(--color-text-tertiary)' }}>{kundli.dob} · {kundli.birth_place?.split(',')[0]}</p>
              </div>
              <button onClick={() => setDetailPanelOpen(true)} style={{ flexShrink:0, padding:'4px 10px', fontSize:'11px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'20px', cursor:'pointer', color:'var(--color-text-secondary)' }}>{t('kundliDetails', uiLang)}</button>
              <button onClick={() => { setPanel('kundlis'); setSidebarOpen(true); }} style={{ flexShrink:0, padding:'4px 10px', fontSize:'11px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'20px', cursor:'pointer', color:'var(--color-text-secondary)' }}>{t('changeKundli', uiLang)}</button>
            </>
          ) : (
            <p style={{ flex:1, fontSize:'13px', color:'var(--color-text-tertiary)', margin:0 }}>← बाईं तरफ से कुंडली चुनें</p>
          )}
          <div style={{ position:'relative', flexShrink:0 }}>
            <button
              onClick={() => setLangMenuOpen(o => !o)}
              style={{
                display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', padding:'6px 10px',
                borderRadius:'8px', border:'0.5px solid var(--color-border-tertiary)',
                background:'var(--color-background-secondary)', color:'var(--color-text-primary)', cursor:'pointer',
                fontWeight:'500',
              }}
            >
              {LANG_OPTIONS.find(l => l.value === langPref)?.label || 'Auto'}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: langMenuOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {langMenuOpen && (
              <>
                <div onClick={() => setLangMenuOpen(false)} style={{ position:'fixed', inset:0, zIndex:39 }} />
                <div style={{
                  position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:40,
                  background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-secondary)',
                  borderRadius:'10px', boxShadow:'0 4px 20px rgba(0,0,0,0.12)', overflow:'hidden', minWidth:'110px',
                }}>
                  {LANG_OPTIONS.map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => { setLangPref(opt.value); setLangMenuOpen(false); }}
                      style={{
                        padding:'9px 14px', fontSize:'13px', cursor:'pointer',
                        background: langPref === opt.value ? 'var(--color-background-info)' : 'transparent',
                        color: langPref === opt.value ? 'var(--color-text-info)' : 'var(--color-text-primary)',
                        fontWeight: langPref === opt.value ? '600' : '400',
                      }}
                      onMouseEnter={e => { if (langPref !== opt.value) e.currentTarget.style.background = 'var(--color-background-secondary)'; }}
                      onMouseLeave={e => { if (langPref !== opt.value) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Daily proactive gochar insight — dismissible, once per day per kundli */}
        {dailyCard && (
          <div style={{ margin:'10px 14px 0', padding:'12px 14px', borderRadius:'12px', background:'var(--color-brand-light)', border:'1px solid var(--color-brand)', display:'flex', gap:'10px', alignItems:'flex-start', flexShrink:0 }}>
            <span style={{ fontSize:'18px', flexShrink:0 }}>🌅</span>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:'0 0 3px', fontSize:'12px', fontWeight:'600', color:'var(--color-text-primary)' }}>
                आज का गोचर — {dailyCard.planetHi} {dailyCard.house}वें भाव में
              </p>
              <p style={{ margin:0, fontSize:'12px', lineHeight:'1.6', color:'var(--color-text-secondary)' }}>{dailyCard.text}</p>
            </div>
            <button onClick={dismissDailyCard} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary)', fontSize:'16px', padding:'0 2px', flexShrink:0, lineHeight:1 }}>✕</button>
          </div>
        )}

        {/* Notable-finding teaser — once per kundli, real grounded data */}
        {notableFinding && (
          <div onClick={openNotableFinding} style={{ margin:'10px 14px 0', padding:'12px 14px', borderRadius:'12px', background:'var(--color-background-info)', border:'1px solid var(--color-text-info)', display:'flex', gap:'10px', alignItems:'center', flexShrink:0, cursor:'pointer' }}>
            <span style={{ fontSize:'18px', flexShrink:0 }}>👀</span>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:'0 0 2px', fontSize:'12px', fontWeight:'600', color:'var(--color-text-primary)' }}>आपकी कुंडली में एक खास बात है</p>
              <p style={{ margin:0, fontSize:'12px', color:'var(--color-text-secondary)' }}>{notableFinding.label} — टैप करके जानें</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); dismissNotableFinding(); }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary)', fontSize:'16px', padding:'0 2px', flexShrink:0, lineHeight:1 }}>✕</button>
          </div>
        )}

        {/* Chat के बाद खुला (open-to-all) feedback nudge — dismissible,
            appears after a few AI replies. Expands inline into the
            full public SiteRatingWidget (average + everyone's
            comments, own rating entry) — not a private thumbs-up. */}
        {showRateNudge && (
          <div style={{ margin:'10px 14px 0', flexShrink:0 }}>
            <div style={{ padding:'12px 14px', borderRadius:'12px', background:'var(--color-background-warning)', border:'1px solid var(--color-text-warning)', display:'flex', gap:'10px', alignItems:'flex-start' }}>
              <span style={{ fontSize:'18px', flexShrink:0 }}>⭐</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:'0 0 6px', fontSize:'12px', fontWeight:'600', color:'var(--color-text-primary)' }}>Luckfixer कैसा लग रहा है?</p>
                <SiteRatingWidget feature="overall" />
              </div>
              <button onClick={dismissRateNudge} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary)', fontSize:'16px', padding:'0 2px', flexShrink:0, lineHeight:1 }}>✕</button>
            </div>
          </div>
        )}

        {/* Welcome state */}
        {messages.length === 0 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'2rem', textAlign:'center', overflowY:'auto' }}>
            <img src={LOGO_URL} alt="LF" style={{ width:'64px', height:'64px', borderRadius:'20%', objectFit:'cover', marginBottom:'16px', opacity:0.8 }} />

            {addKundliOpen ? (
              <form onSubmit={saveNewKundli} style={{ width:'100%', maxWidth:'380px', textAlign:'left', display:'flex', flexDirection:'column', gap:'10px' }}>
                <h2 style={{ fontSize:'16px', fontWeight:'500', color:'var(--color-text-primary)', margin:'0 0 4px', textAlign:'center' }}>अपना जन्म विवरण दें</h2>
                <div>
                  <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', display:'block', marginBottom:'4px' }}>पूरा नाम *</label>
                  <input value={newK.full_name} onChange={e => setNewK(k => ({...k, full_name:e.target.value}))} placeholder="नाम" style={{ width:'100%', fontSize:'14px' }} required/>
                </div>
                <div>
                  <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', display:'block', marginBottom:'4px' }}>जन्म तिथि *</label>
                  <DateOfBirthInput value={newK.dob} onChange={dob => setNewK(k => ({...k, dob}))} required style={{ fontSize:'14px' }}/>
                </div>
                <div>
                  <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', display:'block', marginBottom:'4px' }}>जन्म समय *</label>
                  <input type="time" value={newK.birth_time} onChange={e => setNewK(k => ({...k, birth_time:e.target.value}))} style={{ width:'100%', fontSize:'14px' }} required/>
                </div>
                <div>
                  <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', display:'block', marginBottom:'4px' }}>लिंग *</label>
                  <div style={{ display:'flex', gap:'8px' }}>
                    {[['male','पुरुष'],['female','महिला'],['other','अन्य']].map(([val, label]) => (
                      <button key={val} type="button"
                        onClick={() => setNewK(k => ({...k, gender: val}))}
                        style={{
                          flex:1, padding:'9px', fontSize:'13px', borderRadius:'8px', cursor:'pointer',
                          border: `1px solid ${newK.gender === val ? 'var(--color-brand)' : 'var(--color-border-tertiary)'}`,
                          background: newK.gender === val ? 'var(--color-brand-light)' : 'var(--color-background-primary)',
                          color: newK.gender === val ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:'12px', color:'var(--color-text-secondary)', display:'block', marginBottom:'4px' }}>जन्म स्थान *</label>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <input value={newK.birth_place} onChange={e => { setNewK(k => ({...k, birth_place:e.target.value, latitude:'', longitude:''})); setGeoResults([]); }} placeholder="जैसे: Delhi, India" style={{ flex:1, fontSize:'14px' }} required/>
                    <button type="button" onClick={geocodePlace} disabled={geocoding} style={{ padding:'8px 14px', fontSize:'13px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'8px', cursor:'pointer', whiteSpace:'nowrap' }}>
                      {geocoding ? '...' : 'खोजें'}
                    </button>
                  </div>
                  {geoResults.length > 0 && (
                    <div style={{ marginTop:'6px', border:'0.5px solid var(--color-border-secondary)', borderRadius:'8px', overflow:'hidden' }}>
                      {geoResults.map((r, i) => (
                        <div key={i} onClick={() => selectGeoResult(r)} style={{ padding:'8px 10px', fontSize:'13px', cursor:'pointer', borderBottom: i < geoResults.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                          {r.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                  {newK.latitude && newK.longitude && (
                    <p style={{ fontSize:'12px', color:'var(--color-text-success)', margin:'6px 0 0' }}>✓ स्थान मिल गया</p>
                  )}
                </div>
                {geoError && <p style={{ fontSize:'12px', color:'var(--color-text-danger)', margin:0 }}>{geoError}</p>}
                <button type="submit" disabled={savingKundli || !newK.gender} style={{ padding:'11px', background: (savingKundli || !newK.gender) ? 'var(--color-border-tertiary)' : 'var(--color-brand)', color:'#fff', border:'none', borderRadius:'8px', cursor: (savingKundli || !newK.gender) ? 'default' : 'pointer', fontSize:'14px', fontWeight:'500', marginTop:'4px' }}>
                  {savingKundli
                    ? <>कुंडली बन रही है<span className="lf-loading-dots"><span/><span/><span/></span></>
                    : 'शुरू करें →'}
                </button>
                <button type="button" onClick={() => setAddKundliOpen(false)} style={{ background:'none', border:'none', color:'var(--color-text-tertiary)', fontSize:'12px', cursor:'pointer', padding:0 }}>← रद्द करें</button>
              </form>
            ) : (
              <>
                <h2 style={{ fontSize:'18px', fontWeight:'500', color:'var(--color-text-primary)', margin:'0 0 8px' }}>
                  {kundlis.length === 0 ? 'पहले कुंडली जोड़ें' : 'कुंडली चुनें और शुरू करें'}
                </h2>
                <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)', margin:'0 0 20px', maxWidth:'260px', lineHeight:'1.6' }}>
                  {kundlis.length === 0 ? 'अपना जन्म विवरण दें — यहीं चैट में, बस 30 सेकंड लगेंगे।' : t('selectKundliPrompt', uiLang)}
                </p>
                {kundlis.length === 0 ? (
                  <button onClick={() => setAddKundliOpen(true)} style={{ padding:'10px 20px', background:'var(--color-brand)', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>कुंडली जोड़ें →</button>
                ) : (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', justifyContent:'center', maxWidth:'340px' }}>
                    {kundlis.map(k => (
                      <button key={k.id} onClick={() => selectKundli(k)} style={{ padding:'8px 16px', fontSize:'13px', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'20px', cursor:'pointer', color:'var(--color-text-primary)', transition:'all 0.15s' }}>
                        {k.label || k.full_name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 8px' }}>
            {messages.map((m,i) => (
              <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start', marginBottom:'20px', alignItems:'flex-start', gap:'10px' }}>
                {m.role==='assistant' && <img src={LOGO_URL} alt="" style={{ width:'28px', height:'28px', borderRadius:'8px', objectFit:'cover', flexShrink:0, marginTop:'2px' }} />}
                <div style={{ maxWidth: m.role==='user' ? '75%' : '84%' }}>
                  <div style={
                    m.role==='user'
                      ? { padding:'10px 16px', fontSize:'15px', lineHeight:'1.65', borderRadius:'20px 20px 4px 20px', background:'var(--color-background-secondary)', color:'var(--color-text-primary)', animation:'lf-slideUp 0.2s ease both' }
                      : { padding:'2px 0', fontSize:'15px', lineHeight:'1.75', color:'var(--color-text-primary)', animation:'lf-slideUp 0.2s ease both' }
                  }>
                    {m.content === '...'
                      ? <div className="lf-thinking"><div className="lf-thinking-dot"/><div className="lf-thinking-dot"/><div className="lf-thinking-dot"/></div>
                      : m.role === 'assistant' && m._animate
                        ? <TypewriterText text={m.content} enabled={true} onDone={() => {
                            setMessages(prev => prev.map((mm, idx) => idx === i ? { ...mm, _animate: false } : mm));
                          }} />
                        : m.content}
                  </div>
                  {m.role === 'assistant' && m.content !== '...' && !m._animate && voiceOutputSupported && (
                    <button
                      onClick={() => speakMessage(m.content, i)}
                      title={speakingIndex === i ? t('stop', uiLang) : t('listen', uiLang)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        marginTop: '6px', padding: '6px 12px', borderRadius: '16px',
                        border: speakingIndex === i ? 'none' : '0.5px solid var(--color-border-secondary)',
                        background: speakingIndex === i ? 'var(--color-brand)' : 'var(--color-background-secondary)',
                        color: speakingIndex === i ? '#fff' : 'var(--color-text-secondary)',
                        cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                        minHeight: '32px',
                      }}
                    >
                      {speakingIndex === i ? (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
                          {t('stop', uiLang)}
                        </>
                      ) : (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/></svg>
                          {t('listen', uiLang)}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:'flex', marginBottom:'14px', alignItems:'flex-start', gap:'10px' }}>
                <img src={LOGO_URL} alt="" style={{ width:'28px', height:'28px', borderRadius:'8px', objectFit:'cover', flexShrink:0, marginTop:'2px' }} />
                <div className="lf-thinking"><div className="lf-thinking-dot"/><div className="lf-thinking-dot"/><div className="lf-thinking-dot"/></div>
              </div>
            )}
            {limitErr && <div style={{ padding:'10px 14px', borderRadius:'8px', background:'var(--color-background-warning)', color:'var(--color-text-warning)', fontSize:'13px', marginBottom:'12px' }}>{limitErr}</div>}
            <div ref={messagesEnd}/>
          </div>
        )}

        {/* Quick action buttons hidden — users write their own question so
            predictions stay specific to their real situation instead of
            clicking a generic button. Code kept for potential future use. */}
        {false && activeQuickForm && kundli && (
          <div style={{ padding:'10px 12px', background:'var(--color-background-secondary)', borderTop:'0.5px solid var(--color-border-tertiary)', flexShrink:0 }}>
            {(() => {
              const config = QUICK_ACTION_CONFIG[activeQuickForm];
              if (!config) return null;
              return (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                    <p style={{ fontSize:'12px', fontWeight:'600', color:'var(--color-text-primary)', margin:0 }}>{config.label} — पहले बताएं</p>
                    <button onClick={() => { setActiveQuickForm(null); setQuickFormAnswers({}); }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary)', fontSize:'14px', padding:'2px 6px' }}>✕</button>
                  </div>
                  {config.questions.map((q) => (
                    <div key={q.key} style={{ marginBottom:'8px' }}>
                      <p style={{ fontSize:'11px', color:'var(--color-text-secondary)', margin:'0 0 4px' }}>{q.label}</p>
                      {q.type === 'choice' ? (
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                          {q.options.map(opt => (
                            <button key={opt} onClick={() => setQuickFormAnswers(a => ({ ...a, [q.key]: opt }))}
                              style={{
                                padding:'5px 10px', fontSize:'11px', borderRadius:'14px', cursor:'pointer',
                                border: `1px solid ${quickFormAnswers[q.key]===opt ? 'var(--color-brand)' : 'var(--color-border-tertiary)'}`,
                                background: quickFormAnswers[q.key]===opt ? 'var(--color-brand-light)' : 'var(--color-background-primary)',
                                color: quickFormAnswers[q.key]===opt ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                              }}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          autoFocus
                          value={quickFormAnswers[q.key] || ''}
                          onChange={e => setQuickFormAnswers(a => ({ ...a, [q.key]: e.target.value }))}
                          placeholder={q.placeholder}
                          style={{ width:'100%', fontSize:'12px', padding:'6px 10px' }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const prompt = config.buildPrompt(kundli, { ...quickFormAnswers, [q.key]: e.target.value });
                              sendMessage(null, prompt);
                              setActiveQuickForm(null);
                              setQuickFormAnswers({});
                            }
                          }}
                        />
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const prompt = config.buildPrompt(kundli, quickFormAnswers);
                      sendMessage(null, prompt);
                      setActiveQuickForm(null);
                      setQuickFormAnswers({});
                    }}
                    style={{ width:'100%', marginTop:'4px', padding:'8px', fontSize:'12px', fontWeight:'600', background:'var(--color-text-primary)', color:'var(--color-background-primary)', border:'none', borderRadius:'8px', cursor:'pointer' }}
                  >
                    जवाब पूछें →
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Quick actions — hidden, see note above */}
        {false && kundli && messages.length > 0 && !activeQuickForm && (
          <div style={{ padding:'8px 12px 0', display:'flex', gap:'6px', flexWrap:'wrap', borderTop:'0.5px solid var(--color-border-tertiary)', flexShrink:0 }}>
            {Object.entries(QUICK_ACTION_CONFIG).map(([key, config]) => (
              <button key={key} disabled={loading} onClick={() => {
                if (config.questions.length === 0) {
                  sendMessage(null, config.buildPrompt(kundli, {}));
                } else {
                  setActiveQuickForm(key);
                }
              }} className="lf-quick-btn" style={{ fontSize:'11px', padding:'5px 10px' }}>
                {config.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding:'10px 12px 14px', background:'var(--color-background-primary)', borderTop: messages.length>0 ? '0.5px solid var(--color-border-tertiary)' : 'none', flexShrink:0 }}>
          {!kundli ? (
            <div className="lf-composer" style={{ opacity:0.5 }}>
              <textarea disabled rows={1} placeholder={t('selectKundliFirst', uiLang)} style={{ flex:1, fontSize:'15px', cursor:'not-allowed' }}/>
              <button disabled className="lf-composer-icon-btn lf-composer-send" style={{ opacity:0.5 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </button>
            </div>
          ) : (
            <form onSubmit={sendMessage} className="lf-composer">
              {voiceInputSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  title={listening ? 'रोकें' : 'बोलकर पूछें'}
                  className={`lf-composer-icon-btn ${listening ? 'lf-mic-listening' : ''}`}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill={listening ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 19v3"/>
                  </svg>
                </button>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); autoGrow(e.target); }}
                placeholder={listening ? t('listening', uiLang) : t('askQuestion', uiLang)}
                disabled={loading}
                rows={1}
                style={{ flex:1, fontSize:'15px' }}
                onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(e);}}}
              />
              <button type="submit" disabled={loading||!input.trim()} className="lf-composer-icon-btn lf-composer-send">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .lf-mobile-only { display: flex !important; }
          .lf-sidebar { position:fixed; top:0; left:0; z-index:30; transform:translateX(-100%); transition:transform 0.22s cubic-bezier(0.4,0,0.2,1); box-shadow:2px 0 20px rgba(0,0,0,0.15); }
          .lf-sidebar-open { transform:translateX(0) !important; }
        }
        @keyframes lf-slideUp { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }

        /* Letter-by-letter reveal — blinking cursor while "typing" */
        .lf-type-cursor {
          display: inline-block;
          animation: lf-cursor-blink 0.8s step-end infinite;
          color: var(--color-text-info);
          font-weight: 700;
        }
        @keyframes lf-cursor-blink {
          0%, 50%  { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>

      <KundliDetailPanel kundli={kundli} open={detailPanelOpen} onClose={() => setDetailPanelOpen(false)} initialTab={detailPanelTab} />
    </div>
  );
}

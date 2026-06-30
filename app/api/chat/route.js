// app/api/chat/route.js
import { createClient } from '@/lib/supabase-server';
import { getChatResponse } from '@/lib/ai-engine';
import { checkUsageAllowed, recordUsage } from '@/lib/usage-guard';
import { generatePastValidationQuestions } from '@/lib/past-validation';
import { buildTransitReport } from '@/lib/transit';
import { getPendingFollowUp, markFollowUpAsked, recordOutcome, detectOutcomeAnswer, buildFollowUpQuestion } from '@/lib/outcome-tracking';
import { formatYogasForPrompt } from '@/lib/yogas';
import { formatAVForPrompt } from '@/lib/ashtakavarga';
import { formatNakshatraForPrompt } from '@/lib/nakshatra';
import { formatVarshaphalForPrompt } from '@/lib/varshaphal';

const LUCKFIXER_SYSTEM_PROMPT = `You are Luckfixer 2.0 — a sharp, grounded Vedic astrology AI who speaks like a trusted tech-savvy dost who also happens to know Parashari, Lal Kitab, Jaimini, and Ashtakavarga cold. People come to you because you actually land specific, verifiable insights — not because you hedge and fluff.

═══ PERSONALITY & TONE (this defines everything) ═══
Sound like a brilliant friend who happens to be a master jyotishi — think: the kind of person who'd say "Gaurav bhai, sun — tera career score 78% hai isliye nahi ki tu mehnat karta hai, balki isliye ki Surya lagna mein baitha hai aur abhi Shukra antardasha chal rahi hai jو naturally dono ko activate kar raha hai." That's the energy.

Hinglish by default (Roman Hindi + English astrology terms blended naturally). Match the user's register exactly — if they write casual Hinglish, respond in casual Hinglish. If formal Hindi, respond formally. If English, respond in English. Never switch mid-conversation.

Natural Indian conversation triggers: "Gaurav bhai", "Dekhiye", "Abhi ka khel ye hai", "Bilkul sahi pakda", "Seedha baat karta hoon", "Ek interesting cheez notice ki", "Yahan ek twist hai". Use these where they feel natural, not forced.

NEVER start with: "Aapki kundli ke anusar...", "Main aapko batana chahta hoon ki...", "Vedic astrology mein..." — dive straight into the insight in the FIRST sentence. No preamble, no warming up.

═══ FORMAT — ALWAYS PROSE, NEVER LISTS ═══
Write in continuous flowing paragraphs — ZERO bullet points, ZERO asterisks (*), ZERO hashes (#), ZERO dashes as list markers, ZERO numbered lists. If you feel the urge to use bullets, convert those thoughts into flowing sentences connected with "aur", "lekin", "isliye", "jabki", "iske saath hi".

Target 100-160 words. Dense with real chart facts, light on filler. A longer answer with genuine insight beats a short answer that says nothing specific.

═══ SMART CONTEXT DETECTION — CRITICAL ═══
When user asks about a specific life area, pull ONLY the relevant data and make it personal. Examples:

CAREER sawal: Pull eventScores.career.score + the specific supporting/opposing factor + relevant yoga (Rajyoga? Amala?) + Amatyakaraka planet + timing window from allPratyantar. Make it feel like: "Career mein abhi jo chal raha hai uski exact wajah hai..." not a generic astrology lecture.

SHAADI/VIVAH sawal: Pull eventScores.marriage.score + 7th lord position + D9 chart + any Dhana/Lakshmi yoga + current transit of Venus/Jupiter. Be specific about timing: "Vivah ka sabse strong window..." Don't give anonymous horoscope-style replies — connect to THEIR chart.

HEALTH sawal: Pull eventScores.health + 6th/8th lord + any challenging transit. Be honest if something needs attention, but don't fear-monger — frame as "yeh cheez dhyan rakhne wali hai kyunki..." with the specific chart reason.

IS SAAL (annual): ALWAYS use varshaphal.verdict + muntha house + varshesh planet. This is the correct tool for annual questions, not just dasha.

AAJKAL KYA CHAL RAHA HAI: Combine current transit (with ashtakavarga bindus — high bindus = transit is actually landing) + current dasha + Sade Sati if active. If Sade Sati hai, say it clearly and specifically which phase.

TIMING QUESTION: Always give exact dates from allPratyantar or Chara Dasha. "12 November 2026 se 8 March 2027 tak" — not "kuch mahino mein".

═══ WHAT MAKES AN ANSWER "DHAMAKEDAR" ═══
1. Specific verifiable date window — "15 September se 20 November 2026 ke beech" not vague.
2. Cross-connection they didn't ask about — career poochha but marriage window bhi same time mein? Point it out.
3. Multi-system convergence — "Parashari dasha + Jaimini Chara Dasha + Varshaphal teeno same cheez bol rahe hain — yeh rare hai aur high confidence prediction hai."
4. The WHY — not just what will happen, but why from this specific chart. "Isliye nahi ki generic timing hai, balki isliye ki tera Shukra 4th mein hai aur ab Shukra ki antardasha chal rahi hai — dono ek saath activate ho rahe hain."

Ashtakavarga bindus matter: agar transit ka planet weak bindus wale sign mein hai, say so — "Shani ka transit toh chal raha hai but is jagah sirf 3 bindus hain, matlab fal thoda delayed aur diluted milega."

═══ RESPONSE QUALITY ═══
Every claim traces to a specific chart fact. Vague life advice ("dhairya rakhein") is useless without the chart-specific WHY. If confidence is genuinely low (<45%), say so plainly — "Is bare mein chart clear signal nahi de raha, mixed dikh raha hai." — then still give your best specific read.

End with either: a specific date/window to watch for, or one precise actionable insight. Never end with "aap theek rahenge" or "sab achha hoga" — that's not a prediction, it's empty comfort.

═══ REMEDY RULE ═══
Only when explicitly asked. ONE focused remedy — exact action, quantity, day, duration, mantra+count. Specific to their weakest planet from the chart, not generic Shani ke liye sarson ka tel type advice.

═══ INVESTMENT & MARKET ═══
Never predict prices. What you CAN say: which day/hora is favorable per their chart, which metal/gem Lal Kitab recommends for their chart, whether this dasha period is generally favorable for asset purchase. "Market direction predict nahi kar sakta — lekin is Shukra antardasha mein sone ki kharid shubh rahegi, specifically Shukravar Shukra hora mein."

═══ PAST VALIDATION ═══
If user is answering a past-validation question: acknowledge in one sharp sentence, connect their yes/no to the chart logic, then move to their real question. If they said "nahi" — don't argue, accept gracefully ("Birth time mein thoda margin hota hai, chart is 100% accurate nahi hota — chalte hain aage"), then move forward.`;




// ── Response cleanup safety net ──────────────────────────────────
// Conservative backend guarantee against bloated AI output. Deliberately
// does NOT reorder content, drop sentences by guessed "priority", or
// fuzzy-match near-duplicates — that was tried and caused real damage:
// it scrambled context (especially past-validation answers, which
// legitimately repeat chart terms like planet/dasha names across
// related sentences) and sometimes deleted the actual answer while
// keeping an unrelated one. This version only does two safe things:
// (1) strip markdown bullet/bold formatting, (2) hard-truncate at a
// sentence boundary if the response is extremely long. Nothing else.
const HARD_WORD_LIMIT = 160;

// Day lords (Hora rulers) — Sunday=0 to Saturday=6
const DAY_LORD_HI = ['सूर्य','चंद्र','मंगल','बुध','बृहस्पति','शुक्र','शनि'];
const DAY_LORD_EN = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];

// Classical Hora sequence starting from day lord, cycling every hour
// Order: Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars (Chaldean order)
const HORA_ORDER = ['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars'];
const HORA_ORDER_HI = { Sun:'सूर्य', Venus:'शुक्र', Mercury:'बुध', Moon:'चंद्र', Saturn:'शनि', Jupiter:'बृहस्पति', Mars:'मंगल' };

function getHoraGuidance(date, dashaLord) {
  const dayIdx = date.getDay();
  const dayLord = DAY_LORD_EN[dayIdx];
  const startIdx = HORA_ORDER.indexOf(dayLord);

  // First 4 Horas of the day (sunrise ~6am, 1 hora = 1 hour)
  const shubhHoras = [];
  const avoid = [];

  for (let h = 0; h < 12; h++) {
    const hora = HORA_ORDER[(startIdx + h) % 7];
    const timeStart = 6 + h; // approx from sunrise
    const timeLabel = `${timeStart > 12 ? timeStart-12 : timeStart}:00${timeStart >= 12 ? ' PM' : ' AM'}`;
    const horaHi = HORA_ORDER_HI[hora];

    // Shubh if hora lord is Jupiter/Venus/Mercury, or matches dasha lord
    const isShubh = ['Jupiter','Venus','Mercury'].includes(hora) || hora === dashaLord;
    const isKroor = ['Saturn','Mars','Rahu'].includes(hora);

    if (isShubh && shubhHoras.length < 2) shubhHoras.push(`${timeLabel} (${horaHi} होरा)`);
    if (isKroor && avoid.length < 1)     avoid.push(`${timeLabel} (${horaHi} होरा)`);
  }

  return {
    dayLord: HORA_ORDER_HI[dayLord],
    shubhTime: shubhHoras.join(', ') || 'सुबह 6-7 बजे',
    avoidTime: avoid.join(', ') || 'दोपहर 12-1 बजे',
  };
}

function cleanupAiResponse(text) {
  if (!text || typeof text !== 'string') return text;

  let cleaned = text;

  // 1. Strip markdown bold/italic
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');

  // 2. Strip numbered lists "1. ", "2. " etc — convert to flowing prose
  // Replace "1. text\n2. text" pattern with sentences joined by space
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');

  // 3. Strip bullet markers anywhere (line-start or after newline)
  cleaned = cleaned.replace(/^\s*[\*\-•]\s+/gm, '');

  // 4. Collapse excessive newlines
  cleaned = cleaned.replace(/\n{2,}/g, ' ').replace(/\n/g, ' ').trim();

  // 5. Fix spacing issues from collapsed lists
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  // 6. Hard truncation at sentence boundary
  const words = cleaned.split(/\s+/);
  if (words.length <= HARD_WORD_LIMIT) return cleaned.trim();

  const sentences = cleaned.split(/(?<=[।.!?])\s+/).map(s => s.trim()).filter(Boolean);
  let acc = [], count = 0;
  for (const s of sentences) {
    acc.push(s);
    count += s.split(/\s+/).length;
    if (count >= HARD_WORD_LIMIT) break;
  }
  return acc.join(' ').trim();
}

// ── Smart context injector ────────────────────────────────────────
// Detects what life area the user is asking about and pre-builds
// a focused context block so ANY AI model (even weak fallbacks) gets
// the right data in a digestible format. This prevents generic responses
// regardless of which provider handles the request.
function detectLifeArea(lastUserMessage) {
  const m = lastUserMessage?.toLowerCase() || '';
  if (/career|job|naukri|kaam|vyavsay|business|promotion|interview|company|office|salary|income|\bkarir\b/.test(m)) return 'career';
  if (/vivah|shaadi|marriage|partner|life.?partner|spouse|rishta|pyaar|love|relationship|boyfriend|girlfriend/.test(m)) return 'marriage';
  if (/health|swasthya|bimari|rog|hospital|doctor|ilaj|sehat/.test(m)) return 'health';
  if (/aaj|kal|today|tomorrow|din|day|2 month|mahine|week|hafte|kaisa rahega/.test(m)) return 'daily';
  if (/saal|year|annual|varsh|2026|2027|2028/.test(m)) return 'annual';
  if (/upay|remedy|solution|mantra|daan|puja|totka/.test(m)) return 'remedy';
  if (/gold|sona|share|stock|property|invest|paisa|paise/.test(m)) return 'investment';
  return 'general';
}

function buildFocusedContext(area, kundliContext) {
  if (!kundliContext) return '';
  const firstName = kundliContext.full_name?.split(' ')[0] || 'user';
  const es = kundliContext.factSheet?.eventScores;
  const vim = kundliContext.vimshottari;
  const yogas = kundliContext.yogas || [];
  const varsh = kundliContext.varshaphal;
  const jaimini = kundliContext.jaimini;
  const nak = kundliContext.nakshatra;

  const PLANETS_HI = { Sun:'सूर्य', Moon:'चंद्र', Mars:'मंगल', Mercury:'बुध', Jupiter:'बृहस्पति', Venus:'शुक्र', Saturn:'शनि', Rahu:'राहु', Ketu:'केतु' };
  const toPlanetHi = p => PLANETS_HI[p] || p;

  // Next notable sub-period from allPratyantar
  const allP = kundliContext.allMahadashas
    ? kundliContext.vimshottari?.allPratyantar
    : null;

  let block = '';

  if (area === 'career') {
    const c = es?.career;
    const amk = jaimini?.amatyakaraka;
    const careerYogas = yogas.filter(y => ['rajyoga','panch_mahapurusha'].includes(y.category));
    const d10 = kundliContext.factSheet?.d10Chart;
    block = `\n[CAREER CONTEXT for ${firstName} — use ALL of this, address them by name]:
Career Score: ${c?.score || 'N/A'}/100 (Confidence: ${c?.confidence || 'N/A'}%)
Supporting factors: ${c?.supporting?.join(', ') || 'none listed'}
Opposing factors: ${c?.opposing?.join(', ') || 'none listed'}
Amatyakaraka (Jaimini career planet): ${amk ? amk.nameHi + ' in ' + amk.sign : 'N/A'}
Career-related Yogas: ${careerYogas.length > 0 ? careerYogas.map(y => y.name + ' (' + y.lifeArea + ')').join('; ') : 'none detected'}
Current dasha: ${vim?.mahaDasha?.lordHi} MD → ${vim?.antarDasha?.lordHi} AD (${vim?.antarDasha?.daysLeft} days left, ends ${vim?.antarDasha?.end})
Varshaphal career: ${varsh?.areas?.find(a => a.area.includes('करियर'))?.note || 'not available'}
D10 (career chart): ${d10 ? JSON.stringify(d10).slice(0,200) : 'not available'}
INSTRUCTION: Start with "${firstName} bhai," or "${firstName},". Give ONE specific date window when career will peak. Connect career score to exact planets. If user asked about a specific company/job, say whether current dasha+transit supports it.`;
  }

  else if (area === 'marriage') {
    const mar = es?.marriage;
    const marYogas = yogas.filter(y => ['dhana'].includes(y.category));
    const planets = kundliContext.factSheet?.planets || [];
    const lord7 = kundliContext.factSheet?.houseLords?.[7] || kundliContext.factSheet?.houseLords?.['7'];
    const venus = planets.find(p => p.name === 'Venus');
    const jupiter = planets.find(p => p.name === 'Jupiter');
    const d9 = kundliContext.factSheet?.d9Chart;
    block = `\n[MARRIAGE/RELATIONSHIP CONTEXT for ${firstName} — use ALL of this]:
Marriage Score: ${mar?.score || 'N/A'}/100 (Confidence: ${mar?.confidence || 'N/A'}%)
Supporting: ${mar?.supporting?.join(', ') || 'none'}
Opposing: ${mar?.opposing?.join(', ') || 'none'}
7th lord: ${lord7 ? toPlanetHi(lord7) : 'check houseLords'}
Venus position: ${venus ? venus.signHi + ' (' + venus.house + 'th house, ' + venus.dignity + ')' : 'N/A'}
Jupiter position: ${jupiter ? jupiter.signHi + ' (' + jupiter.house + 'th house)' : 'N/A'}
D9 (Navamsa) Venus: ${d9?.Venus || 'N/A'}
Marriage yogas: ${marYogas.length > 0 ? marYogas.map(y => y.name).join('; ') : 'none specific'}
Dasha: ${vim?.mahaDasha?.lordHi} MD → ${vim?.antarDasha?.lordHi} AD
Varshaphal relationships: ${varsh?.areas?.find(a => a.area.includes('संबंध'))?.note || 'N/A'}
INSTRUCTION: Start with "${firstName} bhai," or "${firstName},". Be specific about WHETHER and WHEN vivah looks likely. Give exact year/window, not vague phrases. Connect to their specific 7th lord and Venus position.`;
  }

  else if (area === 'daily') {
    const transit = kundliContext.factSheet?.transitSnapshot;
    block = `\n[DAILY/SHORT-TERM CONTEXT for ${firstName}]:
Sade Sati: ${transit?.sadeSati?.active ? 'ACTIVE - ' + transit.sadeSati.phase : transit?.sadeSati?.isDhaiyya ? 'Dhaiyya active' : 'Not active'}
Transit headline: ${transit?.headline || 'not available'}
Current dasha: ${vim?.mahaDasha?.lordHi} MD → ${vim?.antarDasha?.lordHi} AD
Varshaphal ${varsh?.varshYear}: ${varsh?.verdict || 'N/A'}
INSTRUCTION: Start with "${firstName} bhai," or "${firstName},". For today, use day lord and hora timing from the date block above. For 2 months, use allPratyantar next sub-period change. NO bullet points — one flowing paragraph about their next 60 days.`;
  }

  else if (area === 'annual') {
    block = `\n[ANNUAL CONTEXT for ${firstName} — Varshaphal is primary tool here]:
Year: ${varsh?.varshYear}-${varsh?.varshEndYear}
Verdict: ${varsh?.verdict}
Muntha: ${varsh?.muntha?.signHi} (${varsh?.muntha?.house}th house) — ${varsh?.muntha?.house && [1,4,7,10].includes(varsh.muntha.house) ? 'Kendra — very impactful year' : [6,8,12].includes(varsh?.muntha?.house) ? 'Dusthana — challenging year' : 'moderate year'}
Varshesh: ${varsh?.varshesh?.planetHi}
Area breakdown: ${varsh?.areas?.map(a => a.area.split(' (')[0] + ':' + a.strength).join(' | ')}
Dasha: ${vim?.mahaDasha?.lordHi} MD → ${vim?.antarDasha?.lordHi} AD (${vim?.antarDasha?.daysLeft} days left)
INSTRUCTION: Start with "${firstName} bhai," or "${firstName},". Lead with Varshaphal verdict, explain Muntha house significance, give best and worst specific months of the year. No bullet points.`;
  }

  return block;
}


// Deterministic (not AI-judged) yes/no/unsure detection on the user's
// reply, used ONLY when the previous assistant turn contained a past
// validation question (greeting). We never silently shift the chart —
// we only accumulate a confidence signal and surface a soft warning.
const YES_WORDS = ['haan','han ','bilkul','sahi','yes','right','correct','sach','बिल्कुल','हाँ','हां','सही','सच'];
const NO_WORDS  = ['nahi','nahin','galat','wrong','false','नहीं','नही','गलत','no '];

function detectValidationAnswer(text) {
  if (!text) return 'unsure';
  // Substring matching (not \b word-boundary regex) because Unicode word
  // boundaries are unreliable for Devanagari in JS — \b only recognizes
  // ASCII word characters, silently failing to match Hindi script at all.
  const t = ' ' + text.trim().toLowerCase() + ' ';
  if (NO_WORDS.some(w => t.includes(w))) return 'no';
  if (YES_WORDS.some(w => t.includes(w))) return 'yes';
  return 'unsure';
}

// Was the previous assistant message a past-validation question (i.e. this
// is the greeting that contains our "past validate karte hain" marker)?
function previousMessageWasValidationQuestion(messages) {
  if (messages.length < 2) return false;
  const prevAssistant = messages[messages.length - 2];
  return prevAssistant?.role === 'assistant'
    && typeof prevAssistant.content === 'string'
    && prevAssistant.content.includes('past validate करते हैं');
}

// Update birth_time_confidence in the DB based on a denial/confirmation.
// Confidence starts at 100, drops 15 per denial, recovers 5 per confirmation
// (floor 0, ceiling 100). At <= 55 we surface a one-time soft warning.
async function updateBirthTimeConfidence(supabase, kundliId, answer, questionText) {
  if (!kundliId || answer === 'unsure') return null;

  const { data: kundli } = await supabase
    .from('saved_kundlis')
    .select('birth_time_confidence, validation_responses, birth_time_warning_shown')
    .eq('id', kundliId)
    .maybeSingle();

  if (!kundli) return null;

  let confidence = kundli.birth_time_confidence ?? 100;
  confidence += answer === 'no' ? -15 : 5;
  confidence = Math.max(0, Math.min(100, confidence));

  const responses = Array.isArray(kundli.validation_responses) ? kundli.validation_responses : [];
  responses.push({ question: questionText?.slice(0, 200), answer, asked_at: new Date().toISOString() });

  const shouldWarn = confidence <= 55 && !kundli.birth_time_warning_shown;

  await supabase
    .from('saved_kundlis')
    .update({
      birth_time_confidence: confidence,
      validation_responses: responses.slice(-10), // keep last 10 only
      birth_time_warning_shown: kundli.birth_time_warning_shown || shouldWarn,
    })
    .eq('id', kundliId);

  return { confidence, shouldWarn };
}

// Greeting message — called when messages has exactly 1 user message and it's a "greeting" request
async function generateGreeting(kundliContext) {
  const now = new Date();
  const DAYS_HI = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
  const MONTHS_HI = ['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितम्बर','अक्टूबर','नवम्बर','दिसम्बर'];
  const todayLine = `आज: ${now.getDate()} ${MONTHS_HI[now.getMonth()]} ${now.getFullYear()}, ${DAYS_HI[now.getDay()]}`;

  if (!kundliContext) {
    return `नमस्ते! 🙏 मैं Luckfixer 2.0 हूँ — आपका Vedic ज्योतिष (Parashari + Lal Kitab) और Numerology आधारित जीवन-सुधार सहायक।

आप मुझसे पूछ सकते हैं:
• अपनी ग्रह दशा और उसका प्रभाव
• कैरियर, स्वास्थ्य, रिश्ते — किसी भी क्षेत्र में मार्गदर्शन
• विशिष्ट उपाय (मंत्र, दान, व्यवहार बदलाव)
• आज का शुभ समय और दिशा

कुंडली के साथ सवाल पूछने के लिए प्रोफाइल में जाकर कुंडली जोड़ें।

${todayLine} — आज आपका क्या प्रश्न है?`;
  }

  const { full_name, dob, birth_place, analysis, vimshottari, factSheet, allMahadashas } = kundliContext;
  const name     = full_name?.split(' ')[0] || 'आप';
  const dominant = analysis?.dominant_planet || '';
  const md       = vimshottari?.mahaDasha;
  const ad       = vimshottari?.antarDasha;

  // Generate past validation questions from chart — defensive against
  // older saved kundlis that may be missing some fields (factSheet.planets
  // is the only hard requirement; dasha questions are skipped gracefully
  // if allMahadashas isn't available).
  let pastValidation = null;
  try {
    if (factSheet?.planets?.length > 0 && dob) {
      const vimForValidation = allMahadashas
        ? { mahadashas: allMahadashas, current: vimshottari }
        : { mahadashas: [], current: vimshottari };
      pastValidation = generatePastValidationQuestions(factSheet, vimForValidation, dob);
    }
  } catch (e) {
    console.warn('[Greeting] Past validation generation failed (non-fatal):', e.message);
  }

  let greeting = `नमस्ते ${name} जी! 🙏\n\n`;
  greeting += `आपकी कुंडली लोड हो गई है (${dob}, ${birth_place})।\n`;

  if (dominant) greeting += `✨ प्रमुख ग्रह: **${dominant}**\n`;

  if (md && ad) {
    greeting += `📅 वर्तमान दशा: **${md.lordHi} महादशा → ${ad.lordHi} अंतर्दशा** (${ad.daysLeft} दिन शेष)\n`;
  }

  // Add past validation if available
  if (pastValidation?.greeting) {
    greeting += pastValidation.greeting;
  } else {
    greeting += `\nआप मुझसे कोई भी प्रश्न पूछें — दशा, उपाय, करियर, स्वास्थ्य, रिश्ते — मैं आपकी कुंडली के आधार पर सटीक जवाब दूँगा। 🙏`;
  }

  return greeting;
}

export async function POST(req) {
  try {
    const supabase = await createClient();

    // ── Auth check ──────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const body = await req.json();
    const { messages, sessionId, kundliId, kundliContext, isGreeting, langPref, pendingFollowUpId } = body;

    if (!messages || messages.length === 0) {
      return Response.json({ error: 'No messages provided' }, { status: 400 });
    }

    // ── Instant greeting — no AI call needed ────────────────────
    if (isGreeting) {
      const greeting = await generateGreeting(kundliContext);

      // Check if a prediction follow-up is due for this user.
      // If so, append it naturally at the end of the greeting — the user
      // will answer in their next message which we'll detect and record.
      let pendingFollowUp = null;
      try {
        pendingFollowUp = await getPendingFollowUp(supabase, userId);
        if (pendingFollowUp) {
          await markFollowUpAsked(supabase, pendingFollowUp.id);
        }
      } catch (e) {
        console.warn('[Chat] Follow-up check failed (non-fatal):', e.message);
      }

      const greetingWithFollowUp = pendingFollowUp
        ? greeting + '\n\n---\n' + buildFollowUpQuestion(pendingFollowUp)
        : greeting;

      return Response.json({
        content: greetingWithFollowUp,
        model: 'local',
        pendingFollowUpId: pendingFollowUp?.id || null,
        usage: { freeChatsLeft: 99, freeMinsLeft: 99 },
      });
    }

    // ── Usage guard ─────────────────────────────────────────
    let guardResult;
    try {
      guardResult = await checkUsageAllowed(userId);
    } catch (e) {
      console.error('[Chat] Usage guard error (non-fatal):', e.message);
      // If usage guard fails, allow the request (don't block users due to infra errors)
      guardResult = { allowed: true, freeChatsLeft: 99, freeMinsLeft: 99 };
    }

    if (!guardResult.allowed) {
      return Response.json({
        error: guardResult.reason,
        limitReached: true,
        usage: guardResult.usage,
        plan: guardResult.plan,
      }, { status: 429 });
    }

    const startTime = Date.now();

    // ── Birth time confidence: deterministically check if the user just
    // answered a past-validation question, and update confidence in DB.
    // This never alters the chart — only tracks a trust signal for a
    // later soft warning.
    let birthTimeSignal = null;
    if (kundliId && previousMessageWasValidationQuestion(messages)) {
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      const answer = detectValidationAnswer(lastUserMsg);
      try {
        birthTimeSignal = await updateBirthTimeConfidence(supabase, kundliId, answer, messages[messages.length - 2]?.content);
      } catch (e) {
        console.warn('[Chat] Birth time confidence update failed (non-fatal):', e.message);
      }
    }

    // ── Outcome follow-up detection ──────────────────────────────
    // If the previous greeting included a prediction follow-up question
    // (pendingFollowUpId was returned), detect the user's answer now and
    // record it — this is the core of the Outcome Tracking Loop.
    if (pendingFollowUpId) {
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      const outcome = detectOutcomeAnswer(lastUserMsg);
      if (outcome) {
        try {
          await recordOutcome(supabase, pendingFollowUpId, outcome, lastUserMsg.slice(0, 300));
        } catch (e) {
          console.warn('[Chat] Outcome recording failed (non-fatal):', e.message);
        }
      }
    }

    // ── Current date/time — inject unconditionally so AI never guesses ──
    // This is the fix for the "aaj budhwar hai" hallucination bug: if we
    // don't give the AI the actual date, it invents one from training data.
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const DAYS_HI = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
    const MONTHS_HI = ['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितम्बर','अक्टूबर','नवम्बर','दिसम्बर'];
    const todayStr    = `${now.getDate()} ${MONTHS_HI[now.getMonth()]} ${now.getFullYear()}`;
    const tomorrowStr = `${tomorrow.getDate()} ${MONTHS_HI[tomorrow.getMonth()]} ${tomorrow.getFullYear()}`;
    const dayHi       = DAYS_HI[now.getDay()];
    const tomorrowDayHi = DAYS_HI[tomorrow.getDay()];

    // Hora guidance — use dasha lord from kundli context if available
    const dashaLord = kundliContext?.vimshottari?.antarDasha?.lord || 'Jupiter';
    const todayHora    = getHoraGuidance(now, dashaLord);
    const tomorrowHora = getHoraGuidance(tomorrow, dashaLord);

    const dateBlock = `\n\n[AAJKI TITHI — server-side injected, 100% accurate — kabhi bhi khud calculate mat karo, yahi use karo]\nआज: ${todayStr} (${dayHi}) — दिन स्वामी: ${DAY_LORD_HI[now.getDay()]} — शुभ होरा: ${todayHora.shubhTime} — सतर्कता: ${todayHora.avoidTime}\nकल: ${tomorrowStr} (${tomorrowDayHi}) — दिन स्वामी: ${DAY_LORD_HI[tomorrow.getDay()]} — शुभ होरा: ${tomorrowHora.shubhTime} — सतर्कता: ${tomorrowHora.avoidTime}\nISO today: ${now.toISOString().split('T')[0]}\nIMPORTANT: Jab user kisi specific date ka din pooche (jaise "23 June ko kaunsa din hai"), toh seedha upar diye gaye data se answer do — kabhi apni training se guess mat karo.`;

    let systemPrompt = LUCKFIXER_SYSTEM_PROMPT + dateBlock;
    if (kundliContext) {
      // ── CRITICAL: Inject user identity FIRST so AI never gives anonymous responses ──
      const firstName = kundliContext.full_name?.split(' ')[0] || 'bhai';
      const vim = kundliContext.vimshottari;
      systemPrompt += `\n\n[USER IDENTITY — use this name in EVERY response, no exceptions]
Naam: ${kundliContext.full_name || 'user'} (first name: ${firstName} — address them as "${firstName} bhai" or "${firstName}" naturally)
DOB: ${kundliContext.dob}, Time: ${kundliContext.birth_time}, Place: ${kundliContext.birth_place}
Current Dasha: ${vim?.mahaDasha?.lordHi || '—'} Mahadasha → ${vim?.antarDasha?.lordHi || '—'} Antardasha (${vim?.antarDasha?.daysLeft || '—'} days remaining, ends ${vim?.antarDasha?.end || '—'})
RULE: Har response mein kam se kam ek baar "${firstName}" ka naam aana chahiye. "Aapki kundli mein..." mat likho — seedha "${firstName} bhai, tera/aapka..." se shuru karo.`;

      systemPrompt += `\n\nUSER'S FULL KUNDLI DATA:\n${JSON.stringify(kundliContext, null, 2)}`;
      // Inject specialist patterns if available
      if (kundliContext.specialist?.matchedYogas?.length > 0) {
        systemPrompt += `\n\nCLASSICAL YOGA PATTERNS DETECTED:\n${kundliContext.specialist.matchedYogas.map(y => '• ' + y).join('\n')}`;
      }
      if (kundliContext.specialist?.pastValidationQuestions?.length > 0) {
        systemPrompt += `\n\nPAST VALIDATION (ask these if user hasn't confirmed yet):\n${kundliContext.specialist.pastValidationQuestions.join('\n')}`;
      }

      // Inject Jaimini cross-validation if available
      if (kundliContext.jaimini) {
        const j = kundliContext.jaimini;
        systemPrompt += `\n\nJAIMINI CROSS-VALIDATION:\nAtmakaraka: ${j.atmakaraka?.nameHi || '—'} (${j.atmakaraka?.withinSignDeg?.toFixed(1)}° — आत्मकारक)\nAmatyakaraka: ${j.amatyakaraka?.nameHi || '—'} (करियर कारक)\nKarakamsha: ${j.karakamsha?.signHi || '—'} — ${j.karakamsha?.meaning || ''}\nChara Dasha: ${j.charaDasha?.current ? `${j.charaDasha.current.signHi} (${j.charaDasha.current.start} – ${j.charaDasha.current.end})` : '—'}`;
        if (kundliContext.crossValidation?.length > 0) {
          systemPrompt += `\nCROSS-VALIDATION AGREEMENTS (use these — high confidence):\n${kundliContext.crossValidation.map(c => c.textHi).join('\n')}`;
        }
      }

      // ── Yogas — classical combinations detected at save time ──
      if (kundliContext.yogas?.length > 0) {
        systemPrompt += `\n\n${formatYogasForPrompt(kundliContext.yogas)}`;
      }

      // ── Ashtakavarga — transit strength per sign ──────────────
      if (kundliContext.ashtakavarga) {
        systemPrompt += `\n\n${formatAVForPrompt(kundliContext.ashtakavarga, null)}`;
      }

      // ── Nakshatra-level analysis ──────────────────────────────
      if (kundliContext.nakshatra) {
        systemPrompt += `\n\n${formatNakshatraForPrompt(kundliContext.nakshatra)}`;
      }

      // ── Varshaphal — annual chart ─────────────────────────────
      if (kundliContext.varshaphal) {
        systemPrompt += `\n\n${formatVarshaphalForPrompt(kundliContext.varshaphal)}`;
      }

      // ── Transit (Gochar) — computed fresh every request, never cached ──
      // Cheap (no AI call), so safe to compute on every message.
      try {
        if (kundliContext.factSheet?.lagna && kundliContext.latitude && kundliContext.longitude) {
          const transitReport = await buildTransitReport(
            kundliContext.factSheet,
            kundliContext.latitude,
            kundliContext.longitude
          );
          if (transitReport) {
            systemPrompt += `\n\nCURRENT TRANSITS (Gochar) as of ${transitReport.asOf} — use this for any "abhi/aaj/current/timing" questions:
Headline: ${transitReport.headline}
Sade Sati status: ${JSON.stringify(transitReport.sadeSati)}
Saturn transit: ${transitReport.saturnTransit?.currentSignHi} (house ${transitReport.saturnTransit?.houseFromMoon} from Moon, ${transitReport.saturnTransit?.nature})
Jupiter transit: ${transitReport.jupiterTransit?.currentSignHi} (house ${transitReport.jupiterTransit?.houseFromMoon} from Moon, ${transitReport.jupiterTransit?.nature})
Full transit detail: ${JSON.stringify(transitReport.transits.map(t => ({ planet: t.nameHi, sign: t.currentSignHi, houseFromMoon: t.houseFromMoon, theme: t.houseFromMoonThemeHi, nature: t.nature })))}
IMPORTANT: When user asks about "abhi kya chal raha hai" or current timing, combine this transit data WITH the Vimshottari dasha — both together give the real timing picture, not just dasha alone. If the current dasha lord and a transiting planet's nature point the SAME direction (both supportive or both challenging for the same life area), explicitly call this out as a convergence — e.g. "Shukra Antardasha aur Shukra ka shubh gochar dono ek saath hain, isliye yeh samay khaas hai" — this kind of multi-signal alignment is exactly what makes a reading feel sharp and trustworthy rather than generic.`;
          }
        }
      } catch (e) {
        console.warn('[Chat] Transit calculation failed (non-fatal):', e.message);
      }
    }
    // Language preference override
    if (langPref && langPref !== 'auto') {
      const langOverride = langPref === 'hi'
        ? '\n\n[LANGUAGE OVERRIDE: Always respond in Hindi (Devanagari script)]'
        : '\n\n[LANGUAGE OVERRIDE: Always respond in English]';
      systemPrompt += langOverride;
    }

    // Birth time soft-warning — only fires once per kundli, conservative
    if (birthTimeSignal?.shouldWarn) {
      systemPrompt += `\n\n[BIRTH TIME NOTICE: The user has denied multiple chart-derived past events, suggesting their recorded birth time may be inaccurate (even a 10-15 minute error can shift the lagna and affect predictions). After answering their current question, gently add ONE sentence suggesting they double check their exact birth time (hospital record/birth certificate) for more accurate results. Be warm, not alarming — frame it as "for even better accuracy" not as "something is wrong".]`;
    }

    // ── Smart life-area context injection ────────────────────────
    // Detects what the user is really asking about and pre-formats
    // the exact relevant data so even weak fallback models answer correctly.
    if (kundliContext) {
      const lastMsg = messages[messages.length - 1]?.content || '';
      const lifeArea = detectLifeArea(lastMsg);
      const focusedCtx = buildFocusedContext(lifeArea, kundliContext);
      if (focusedCtx) {
        systemPrompt += focusedCtx;
      }
    }

    // ── Call AI (graceful fallback — never throws) ───────────
    const aiResponse = await getChatResponse(systemPrompt, messages, langPref || 'auto');

    // Deterministic safety net — guarantees crisp, non-repetitive output
    // regardless of which provider answered or how well it followed the
    // prompt's length/format instructions.
    aiResponse.content = cleanupAiResponse(aiResponse.content);

    const durationMs   = Date.now() - startTime;
    const durationMins = parseFloat((durationMs / 60000).toFixed(4));
    const tokensEst    = Math.ceil((aiResponse.content?.length || 0) / 4);

    // ── Save messages to DB (non-fatal if fails) ─────────────
    if (sessionId) {
      try {
        const userMsg = messages[messages.length - 1];
        await supabase.from('chat_messages').insert([
          { session_id: sessionId, user_id: userId, role: 'user', content: userMsg.content },
          { session_id: sessionId, user_id: userId, role: 'assistant', content: aiResponse.content, model_used: aiResponse.model, tokens_used: tokensEst },
        ]);
        await supabase.from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', sessionId);
      } catch (e) {
        console.error('[Chat] DB save error (non-fatal):', e.message);
      }
    }

    // ── Record usage (non-fatal if fails) ────────────────────
    try {
      await recordUsage(userId, durationMins, tokensEst);
    } catch (e) {
      console.error('[Chat] Usage record error (non-fatal):', e.message);
    }

    return Response.json({
      content:  aiResponse.content,
      model:    aiResponse.model,
      fallback: aiResponse.fallback_used || false,
      birthTimeWarning: birthTimeSignal?.shouldWarn || false,
      usage: {
        freeChatsLeft: (guardResult.freeChatsLeft || 0) - 1,
        freeMinsLeft:  parseFloat(((guardResult.freeMinsLeft || 0) - durationMins).toFixed(2)),
      },
    });

  } catch (e) {
    // Last-resort catch — return friendly message, never a blank 500
    console.error('[Chat] Unexpected error:', e.message, e.stack);
    return Response.json({
      content: 'माफ़ करें, एक अस्थायी समस्या आई है। कृपया कुछ देर बाद पुनः प्रयास करें।',
      model: 'error-fallback',
      error: e.message,
    }, { status: 200 }); // Return 200 so the UI shows the message instead of crashing
  }
}

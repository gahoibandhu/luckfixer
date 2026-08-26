// app/api/chat/route.js
import { createClient } from '@/lib/supabase-server';
import { getChatResponse } from '@/lib/ai-engine';
import { checkUsageAllowed, recordUsage } from '@/lib/usage-guard';
import { generatePastValidationQuestions } from '@/lib/past-validation';
import { buildTransitReport } from '@/lib/transit';
import { getPendingFollowUp, markFollowUpAsked, recordOutcome, detectOutcomeAnswer, buildFollowUpQuestion, getUserAccuracy, getDashaAccuracyStat } from '@/lib/outcome-tracking';
import { logRemedyPlan } from '@/lib/remedy-tracking';
import { formatYogasForPrompt } from '@/lib/yogas';
import { formatAVForPrompt } from '@/lib/ashtakavarga';
import { formatNakshatraForPrompt } from '@/lib/nakshatra';
import { formatVarshaphalForPrompt } from '@/lib/varshaphal';
import { findYogaPeriods } from '@/lib/vimshottari';

const LUCKFIXER_SYSTEM_PROMPT = `You are Luckfixer 2.0 — a sharp, grounded Vedic astrology AI who speaks like a trusted tech-savvy dost who also happens to know Parashari, Lal Kitab, Jaimini, and Ashtakavarga cold. People come to you because you actually land specific, verifiable insights — not because you hedge and fluff.

═══ PERSONALITY & TONE (this defines everything) ═══
Sound like a brilliant friend who happens to be a master jyotishi — think: the kind of person who'd say "Sun — tera career score 78% hai isliye nahi ki tu mehnat karta hai, balki isliye ki Surya lagna mein baitha hai aur abhi Shukra antardasha chal rahi hai jो naturally dono ko activate kar raha hai." That's the energy. (Note: the exact address term — bhai/ji/just-name — depends on the user's gender info provided below; never assume male by default.)

Hinglish by default (Roman Hindi + English astrology terms blended naturally). Match the user's register exactly — if they write casual Hinglish, respond in casual Hinglish. If formal Hindi, respond formally. If English, respond in English. Never switch mid-conversation.

Natural Indian conversation triggers: "Dekhiye", "Abhi ka khel ye hai", "Bilkul sahi pakda", "Seedha baat karta hoon", "Ek interesting cheez notice ki", "Yahan ek twist hai" (plus "Bhai"/"ji" per the gender-aware address rule below). Use these where they feel natural, not forced.

NEVER start with: "Aapki kundli ke anusar...", "Main aapko batana chahta hoon ki...", "Vedic astrology mein..." — dive straight into the insight in the FIRST sentence. No preamble, no warming up.

═══ FORMAT — ALWAYS PROSE, NEVER LISTS ═══
Write in continuous flowing paragraphs — ZERO bullet points, ZERO asterisks (*), ZERO hashes (#), ZERO dashes as list markers, ZERO numbered lists. If you feel the urge to use bullets, convert those thoughts into flowing sentences connected with "aur", "lekin", "isliye", "jabki", "iske saath hi".

Target 100-160 words for a single, focused question. Dense with real chart facts, light on filler. A longer answer with genuine insight beats a short answer that says nothing specific. EXCEPTION: if the user asked several distinct questions in one message, you'll see a [MULTI-PART QUESTION DETECTED] note below with a higher word budget — use that room to fully answer the most important 3-4 parts rather than skimming everything shallowly.

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

DON'T REPEAT DASHA INFO EVERY MESSAGE: You have Mahadasha/Antardasha data available in every request, but only STATE the full "X Mahadasha → Y Antardasha" combo when it's directly relevant to the question (timing questions, "abhi kya chal raha hai", career/marriage windows). For unrelated questions (today's day, a quick remedy, a yes/no clarification), don't force-recite the dasha names just because the data is there — it gets repetitive and feels robotic across a conversation. Vary how you reference timing: sometimes just the antardasha lord's name is enough, sometimes none at all.

MINIMIZE JARGON, MAXIMIZE PLAIN LANGUAGE: Terms like "Mahadasha", "Antardasha", "Ashtakavarga", "Sade Sati" are fine to use since they're standard astrology vocabulary the audience knows — but don't stack 3-4 technical terms in one sentence to sound impressive. Explain the practical meaning in plain Hinglish alongside the term the first time it comes up in a conversation, then use it more casually after. Prioritize clarity and warmth over sounding "advanced".

═══ NEVER INVENT DATA — ANTI-HALLUCINATION RULE ═══
Only reference planets, houses, yogas, dasha periods, or dates that are EXPLICITLY present in the data provided to you below. Never invent a yoga name, a planetary combination, or a "classical technique" that isn't backed by the actual computed data — this is exactly the failure mode of fake astrology tools that impress people with invented terminology ("Bhrigu Cycle Trigger", "Financial Drain Patch") instead of real calculation. If you don't have data to answer something specific, say so honestly: "Is specific cheez ke liye mere paas exact data nahi hai" — rather than fabricating a plausible-sounding answer.

CONSISTENCY ACROSS THE CONVERSATION: If you've already stated a fact about this person's chart earlier in this conversation (e.g. "your 7th lord is Venus"), don't contradict it later. Re-use established facts rather than re-deriving them differently each time. This includes NUMBERS: if you gave a timing window earlier (e.g. "next 12-15 months"), reuse that exact window later in the conversation for the same topic — don't quietly redrive a slightly different number (e.g. "12-14 months") each time you're asked a similar question. Small drifting numbers make the whole reading feel invented rather than calculated.

NEVER FABRICATE REAL-WORLD SPECIFICS THE CHART CANNOT DETERMINE: Vedic astrology (even correctly applied) cannot tell you the exact CITY/TOWN where someone will marry, an exact person's name, a specific company name, a lottery number, or similar impossibly-precise real-world facts. If asked something like "shaadi kahan hogi" (where will marriage happen) or "kaunsi company mein job milegi" (which specific company), do NOT invent a real place/company name based on tenuous reasoning (e.g. "Muntha house suggests native place" is NOT a real classical technique for predicting marriage location — never say this). Instead: give what astrology genuinely CAN say (timing window, whether it's near vs far from home based on real relevant house/yoga if that classical link actually exists, general direction/region only if there's a real technique for it) and be honest that exact place names aren't something a birth chart determines. Fabricating specific place names to sound impressive is a serious credibility risk — a user WILL notice if the guess is wrong, and even if accidentally right, it teaches false confidence in fabricated methodology.

NEVER GUESS ALREADY-LIVED REAL-WORLD FACTS — ASK INSTEAD: A birth chart shows themes, tendencies and timing windows — it CANNOT verify facts about what has already actually happened in someone's real life (are they currently married, do they already have children, did they already get a specific job, are they currently employed, etc.). If the user directly asks something like "kya lagta hai meri shaadi ho chuki hai ya nahi", "main abhi married hoon ya single", "mere bachche hain kya" — this is not a prediction question, it's asking you to confirm a real-world fact you have zero way to actually know. NEVER answer this with a confident guess dressed up in dasha/yoga reasoning (this is one of the most damaging things you can do to trust — if the confident guess is wrong, and it easily can be, the person loses all faith in everything else you've said). Instead, say plainly that the chart can't confirm already-lived facts like this, and ask them directly — then use whatever they tell you to give a much better, grounded answer to their actual underlying question.

═══ NATAL vs TRANSIT — CRITICAL RULE (violations destroy credibility) ═══
NATAL placements (Mangal 8th mein, Shani-Mangal yuti, Ketu lagna mein, etc.) are PERMANENT — they exist 24/7 from birth to death, whether the person is traveling, sleeping, working, or at home. NEVER say a natal placement "will be more active/dangerous during this trip/event" — that is factually wrong astrology and users WILL catch it.

Real example of the mistake to never repeat: User asked about Amarnath yatra on 5 July. AI said "Mangal-Shani yuti aapki yatra mein risk badha sakti hai." User correctly pointed out "yeh yuti toh ghar pe bhi hogi." The AI had no answer. This destroys trust.

CORRECT approach for event/travel questions:
1. Natal chart tells you the person's BASELINE tendencies (Mangal-Shani yuti = tendency toward physical strain, accidents — yeh hamesha se hai).
2. TRANSITS on the specific date tell you whether that day's planetary positions are favorable or not — these ARE date-specific.
3. MUHURTA (travel timing) — check the hora on that specific date+time.

Correct answer template: "Natal mein Mangal-Shani yuti hai jo physical strain ki tendency deti hai — yeh teri kundli ka permanent feature hai, yatra se alag nahi hoti. 5 July specifically ke liye, transit mein [X planet Y sign mein hai] aur us din [Z hora] mein travel shuru ho to better hai. Ashtakavarga mein us din ka bindu count [N] hai — [strong/weak]."

═══ REMEDY RULE ═══
Only when explicitly asked. Give factSheet.remedyPlan.remedies — exact action, quantity, day, duration, mantra+count, in flowing prose (not a bullet dump). This is normally 2-3 remedies across systems, NOT just one: the Lal Kitab remedy (donate/day/avoid) for each planet in remedyPlan.focusPlanets, PLUS its Vedic mantra+count, PLUS a gemstone ONLY where remedyPlan.remedies[].vedic.gem is non-null. Never invent a remedy outside what remedyPlan/factSheet provides.

SUPPORT-CHAIN FOCUS — HARD RULE: remedyPlan.focusPlanets tells you WHICH planet(s) the remedy should actually target — this is NOT always factSheet.weakestPlanet. If remedyPlan.verdict is "compensated_by_support", the weak planet already has enough support (see remedyPlan.supportPlanet) — target the remedy at the SUPPORT planet instead, and say why in one natural line (e.g. "Shukra khud kamzor hai lekin uska dispositor Guru kaafi strong hai, isliye seedha Shukra pe kaam karne ke bajaye Guru ko strengthen karna zyada asar dikhayega"). If verdict is "partial_support", give BOTH remedies together and explain it's a combination, not two separate unrelated suggestions — use remedyPlan.combinationGuidance as your factual basis. If verdict is "needs_direct_remedy" (or remedyPlan is absent), target the weak planet directly as before. Never silently drop this reasoning — a remedy that skips explaining a support-planet substitution feels arbitrary to the user.

GEMSTONE GATING — HARD RULE: NEVER suggest a gemstone for factSheet.weakestPlanet by default — wearing the gem of a weak/debilitated/afflicted planet is classically considered harmful, not helpful. Only suggest a gemstone if factSheet.gemstoneGuidance.planet is non-null (this is pre-computed deterministically — the planet is genuinely Lagna lord / 9th lord / Yogakaraka for THIS chart and well-placed). If factSheet.gemstoneGuidance.planet is null, say plainly there's no eligible gemstone right now and give mantra/daan instead — never invent a stone to seem more helpful. If the user pushes for a gem anyway when none is eligible, explain briefly why (in one line, referencing factSheet.gemstoneGuidance.reason) rather than complying. Lal Kitab remedies (donate/mantra/day) are NEVER gated this way — always available for every planet regardless of gem eligibility, so a "no gem" answer should never mean "no remedy at all".

═══ INVESTMENT & MARKET — HARD RULE, VIOLATIONS ARE SERIOUS ═══
NEVER predict whether ANY commodity, stock, crypto, mutual fund, or trading position will be profitable — this includes crude oil, gold, shares, nifty/sensex, bitcoin, property speculation, or any "will I profit" question. A birth chart cannot determine market prices, full stop.

Real failure to never repeat: user asked "profit milega kya crude mein" — the AI answered using Ashtakavarga bindus and Budh-Aditya yoga as if they justified a trading call, then gave a specific "25 July to 10 August favorable window" for the investment when pushed. This is exactly forbidden — chart data was fabricated into fake trading justification.

What you CAN legitimately say when asked about investment/trading: (1) explicitly refuse the price/profit prediction first, clearly, (2) optionally mention which day/hora suits reviewing financial decisions generally, (3) which metal/gem Lal Kitab recommends IF factSheet.gemstoneGuidance.planet is non-null (else just mention daan/mantra — do not name a stone), (4) whether the current dasha period suggests a generally cautious or confident temperament — but NEVER frame any of this as a buy/sell/profit signal. Example: "Main market ya trading profit predict nahi kar sakta — koi bhi chart commodity prices determine nahi karta. Jo keh sakta hoon: abhi tera Shani antardasha hai jo generally risk lene mein savdhani maangta hai."

═══ PAST VALIDATION — PASSIVE ONLY, NEVER PROACTIVE ═══
NEVER ask the user to confirm past chart-derived events unprompted — no "did X happen in Y period?" questions of your own initiative. The greeting no longer does this either.

However, IF the user themselves brings up a past life event (mentions a breakup, job change, financial loss, health issue, spiritual shift, etc. — with or without a date), you SHOULD connect it to their chart: check if the dasha/transit/yoga data for that approximate period explains what they experienced, and mention that connection naturally — this builds real trust because it's a genuine insight, not a scripted question. Example: user says "2023 mein job chali gayi thi" → you can say "Us waqt tera Shani-Rahu period tha, jo career mein achanak rukavat ka classic pattern hai."

If they confirm something you've said matches their chart: acknowledge briefly, connect it to the specific dasha/yoga logic in one sharp sentence, then move to their real question. If they say it does NOT match: don't argue — accept gracefully ("Birth time mein thoda margin hota hai, chart 100% precise nahi hota — chalte hain aage") and move forward. Never repeat a rejected claim.

═══ ACCURACY / TRACK-RECORD QUESTIONS — ANSWER FROM REAL DATA ONLY, COUNTS NOT PERCENTAGES ═══
If the user asks anything like "tumhari prediction kitni sahi nikli", "accuracy kya hai", "track record dikhao", "pehle ki predictions sach hui kya" — answer ONLY using the real data provided below under USER TRACK RECORD (if present). Always phrase this as raw counts ("6 predictions confirm hui hain 8 me se") — NEVER as a percentage. A "%" on a small sample looks falsely precise (a single lucky or unlucky guess turns into a misleading "100%" or "0%"), so counts are the honest way to communicate this. If USER TRACK RECORD shows not enough tracked predictions yet, say so plainly: "Abhi track record ban raha hai — jaise-jaise aur predictions confirm hongi, real numbers de sakunga." Never invent any number — percentage or count — that isn't explicitly given in USER TRACK RECORD. This same real data should also quietly calibrate your confidence elsewhere in the conversation: if the tracked record is strong, you can be more assertively specific with new date-windows; if it's thin or unproven, hedge a little more honestly ("confidence thoda kam hai kyunki abhi verify hona baaki hai") instead of overselling certainty.`;




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
// Root-cause fix for a real quality bug: when a user asks several distinct
// questions in ONE message (very common in astrology chat — "shaadi kab
// hogi, partner kaisa hoga, bachche kitne honge, career kaisa rahega...")
// the flat 160-word hard cap forces the AI to either skim every topic
// shallowly or get cut off mid-topic without ever reaching the mandatory
// closing action-item — exactly what real users were seeing. We now scale
// the word budget up (capped, so it never turns into an unreadable wall
// of text) based on how many distinct questions were actually asked, and
// separately tell the AI to fully answer 2-3 of them rather than weakly
// touching all of them, when there are too many to do justice to.
function countQuestionParts(text) {
  if (!text) return 1;
  const qMarks = (text.match(/\?/g) || []).length;
  const hindiQWords = (text.match(/\b(kya|kaisa|kaisi|kaise|kab|kitne|kitni|kaun|kaunsa|kyun|kahan|kahaan)\b|क्या|कैसा|कैसी|कैसे|कब|कितने|कितनी|कौन|क्यों|कहाँ|कहां/gi) || []).length;
  return Math.max(1, qMarks, Math.min(hindiQWords, 6)); // cap the heuristic itself so one repeated word doesn't runaway
}

const HARD_WORD_LIMIT = 160;
const MAX_WORD_LIMIT_MULTI_PART = 320; // ceiling even for very multi-part questions — stays readable in a chat bubble

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

// ── Extract a specific date mentioned in the user's message ──────
// FIX for the "20 July ko Friday bata diya" bug: the AI is unreliable
// at calculating what day-of-week an arbitrary future date falls on,
// so if the user references ANY specific date beyond today/tomorrow
// (e.g. "20 July ka din kaisa rahega", "15 August ko"), we detect it
// here and compute its real day-of-week + hora server-side — the AI
// never has to guess a date calculation again.
const MONTH_NAMES_EN = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTH_ABBR_EN  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const MONTH_NAMES_HI = ['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितम्बर','अक्टूबर','नवम्बर','दिसम्बर'];

function extractMentionedDate(text, referenceDate) {
  if (!text) return null;
  const lower = text.toLowerCase();

  let day = null, month = null, year = null;

  // Pattern 1: "20 july" / "20 july 2026" / "july 20"
  for (let i = 0; i < 12; i++) {
    const names = [MONTH_NAMES_EN[i], MONTH_ABBR_EN[i]];
    for (const name of names) {
      // "20 july" or "20 july 2026"
      let m = lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${name}\\b(?:\\s+(\\d{4}))?`));
      if (m) { day = parseInt(m[1]); month = i; year = m[2] ? parseInt(m[2]) : null; break; }
      // "july 20" or "july 20 2026"
      m = lower.match(new RegExp(`\\b${name}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s+(\\d{4}))?`));
      if (m) { day = parseInt(m[1]); month = i; year = m[2] ? parseInt(m[2]) : null; break; }
    }
    if (day !== null) break;
  }

  // Pattern 2: Hindi month names — "20 जुलाई"
  if (day === null) {
    for (let i = 0; i < 12; i++) {
      const m = text.match(new RegExp(`(\\d{1,2})\\s*${MONTH_NAMES_HI[i]}(?:\\s*(\\d{4}))?`));
      if (m) { day = parseInt(m[1]); month = i; year = m[2] ? parseInt(m[2]) : null; break; }
    }
  }

  // Pattern 3: numeric DD/MM or DD-MM (or with year) — assume day/month/year order (Indian convention)
  if (day === null) {
    const m = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (m) {
      const d1 = parseInt(m[1]), d2 = parseInt(m[2]);
      // Only treat as a date if the first number could plausibly be a day (1-31) and second a month (1-12)
      if (d1 >= 1 && d1 <= 31 && d2 >= 1 && d2 <= 12) {
        day = d1; month = d2 - 1;
        if (m[3]) year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
      }
    }
  }

  if (day === null || month === null || day < 1 || day > 31) return null;

  const refYear = referenceDate.getFullYear();
  let candidateYear = year || refYear;
  let candidate = new Date(candidateYear, month, day);

  // If no year was specified and the resulting date is more than ~14 days
  // in the past relative to today, assume they mean next year's occurrence
  // (people almost never ask "how will [date] be" about a date that already
  // passed weeks ago — far more likely they mean the upcoming one).
  if (!year) {
    const diffDays = (referenceDate - candidate) / (1000 * 60 * 60 * 24);
    if (diffDays > 14) {
      candidate = new Date(refYear + 1, month, day);
    }
  }

  // Sanity check the date actually exists (e.g. rejects Feb 30)
  if (candidate.getMonth() !== month || candidate.getDate() !== day) return null;

  return candidate;
}

function cleanupAiResponse(text, wordLimit = HARD_WORD_LIMIT) {
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

  // 6. Hard truncation at sentence boundary — wordLimit is dynamic now
  // (see countQuestionParts) so multi-part questions get more room
  // instead of getting cut off before every sub-question is addressed.
  const words = cleaned.split(/\s+/);
  if (words.length <= wordLimit) return cleaned.trim();

  const sentences = cleaned.split(/(?<=[।.!?])\s+/).map(s => s.trim()).filter(Boolean);
  let acc = [], count = 0;
  for (const s of sentences) {
    acc.push(s);
    count += s.split(/\s+/).length;
    if (count >= wordLimit) break;
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
  // Investment/trading check FIRST and with broad keywords — this must
  // take priority over other matches (e.g. "22 july ka din kaisa rahega,
  // profit hoga" would otherwise match the 'daily' pattern first and
  // never get the investment-refusal reinforcement, which is exactly
  // the bug that let the AI give crude-oil trading advice).
  if (/gold|sona|share|stock|property|invest|paisa|paise|crude|oil|nifty|sensex|\bmcx\b|trading|profit|loss|munafa|nuksan|lottery|satta|bazar|\bmarket\b|futures|options|bitcoin|crypto|share market|stock market/.test(m)) return 'investment';
  // Death/lifespan check EARLY and broad — this must win over 'health'
  // when a message combines serious illness with survival ("papa ki
  // tabiyat kharab hai, bachenge kya") rather than falling into the
  // regular health block, which is not equipped (and should never be
  // used) to answer life-or-death questions.
  if (/maut|mrityu|death|marega|mar jaayega|mar jayega|expire|dega|swarg|guzar|dehant|kab tak jiyega|kitna jiyega|life span|umra kitni|zinda rahega|bachega|bachenge|bach jayega|bach jaayega|survive/.test(m)) return 'death_query';
  if (/career|job|naukri|kaam|vyavsay|business|promotion|interview|company|office|salary|income|\bkarir\b/.test(m)) return 'career';
  if (/vivah|shaadi|marriage|partner|life.?partner|spouse|rishta|pyaar|love|relationship|boyfriend|girlfriend/.test(m)) return 'marriage';
  if (/bachche|bachcha|santan|aulad|beta|beti|pregnancy|pregnant|child|children|garbh|gods.?bharai/.test(m)) return 'children';
  if (/health|swasthya|bimari|rog|hospital|doctor|ilaj|sehat/.test(m)) return 'health';
  if (/videsh|foreign|abroad|videsh yatra|study abroad|settle abroad|migration|visa|videsh jana/.test(m)) return 'foreign_travel';
  if (/dhan|paisa aayega|financial gain|financial loss|nuksan hoga|fayda hoga|wealth|income badhega|kamai/.test(m) && !/gold|sona|share|stock|crude|nifty|sensex|\bmcx\b|trading|bitcoin|crypto|share market|stock market|lottery|satta/.test(m)) return 'finance';
  if (/aaj|kal|today|tomorrow|din|day|2 month|mahine|week|hafte|kaisa rahega/.test(m)) return 'daily';
  if (/saal|year|annual|varsh|2026|2027|2028/.test(m)) return 'annual';
  if (/upay|remedy|solution|mantra|daan|puja|totka/.test(m)) return 'remedy';
  return 'general';
}

function buildFocusedContext(area, kundliContext, lastUserMessage = '') {
  if (!kundliContext) return '';
  const msgLower = (lastUserMessage || '').toLowerCase();
  // "Am I married or not" / "do I have children or not" — a STATUS
  // question, distinct from "when will I get married" — a TIMING
  // question. Both use the same yoga-window data, but a status
  // question should LEAD with the full list of past eligible windows
  // (so the person can recognize which year, if any, matched their
  // real life) rather than just asking them outright.
  const isMarriageStatusQuery = /shaadi\s*(hui|ho\s*chuki|ho\s*gayi|ho\s*rakhi)|shadi\s*(hui|ho\s*chuki|ho\s*gayi)|vivah\s*(hua|ho\s*chuka)|married\s*(hoon|hu|ho)\b|kya\s*.{0,15}married|meri\s*shaadi\s*hui|shaadi\s*hui\s*hai\s*ya\s*nahi|shadi\s*hui\s*hai\s*ya\s*nahi/i.test(msgLower);
  const isChildrenStatusQuery = /bachch[ea]\s*(hai|hain)\s*(ya|nahi)|bachche\s*hue|santan\s*(hui|hai)\s*(ya|nahi)|kya\s*.{0,15}bachche\s*hain|mere\s*bachche\s*hain|aulad\s*hai\s*ya\s*nahi/i.test(msgLower);
  const firstName = kundliContext.full_name?.split(' ')[0] || 'user';
  const es = kundliContext.factSheet?.eventScores;
  const vim = kundliContext.vimshottari;
  const yogas = kundliContext.yogas || [];
  const varsh = kundliContext.varshaphal;
  const jaimini = kundliContext.jaimini;
  const nak = kundliContext.nakshatra;

  const PLANETS_HI = { Sun:'सूर्य', Moon:'चंद्र', Mars:'मंगल', Mercury:'बुध', Jupiter:'बृहस्पति', Venus:'शुक्र', Saturn:'शनि', Rahu:'राहु', Ketu:'केतु' };
  const toPlanetHi = p => PLANETS_HI[p] || p;

  // Age of the person (in whole years) on a given ISO date — used to
  // filter dasha-yoga windows to ones that actually fall within an
  // eligible age range (e.g. don't surface a "marriage yog" window
  // from when the person was 12).
  function ageAtDate(dateStr) {
    if (!kundliContext.dob) return null;
    const birth = new Date(kundliContext.dob);
    const at = new Date(dateStr);
    let age = at.getFullYear() - birth.getFullYear();
    const beforeBirthday = (at.getMonth() < birth.getMonth()) || (at.getMonth() === birth.getMonth() && at.getDate() < birth.getDate());
    if (beforeBirthday) age -= 1;
    return age;
  }

  // Minimum legally/socially marriageable age — 21 for male, 18 for
  // female (India's legal minimums); used as the floor for scanning
  // marriage-yog windows, and reused as a sensible floor for
  // santan/children-yog windows too (child-yog windows before this
  // age aren't a meaningful real-world signal either). Defaults to
  // the more permissive 18 when gender isn't on record, so a genuine
  // window near the boundary is never silently dropped.
  const minEligibleAge = kundliContext.gender === 'male' ? 21 : 18;

  // ── Real dasha-yoga timing scan (the actual classical technique for
  // "kis kis saal yog bana/banega") — not a vague guess from only the
  // current dasha. Given the relevant house-lord + karaka planets for
  // this life area, scan the WHOLE dasha timeline (birth to ~120 yrs,
  // already computed in vim.mahadashas) and surface real year-ranges.
  // `minAge` (optional) filters out windows that start before the
  // person could plausibly be affected by them (e.g. marriage/santan
  // yog before the legal minimum age isn't a meaningful real-world
  // signal) — pass null/omit for life areas with no such floor.
  function formatYogaWindows(relevantLords, label, minAge = null) {
    if (!vim?.mahadashas || relevantLords.length === 0) return '';
    let periods = findYogaPeriods(vim.mahadashas, relevantLords);
    if (minAge != null) {
      periods = periods.filter(p => { const a = ageAtDate(p.start); return a == null || a >= minAge; });
    }
    if (periods.length === 0) return '';

    const now = new Date();
    // For status/eligibility questions ("shaadi hui ya nahi", "bachche
    // hain ya nahi") every PAST eligible window matters, not just the
    // last couple — the person needs the full list to recognize which
    // year(s), if any, matched their real life. Future windows stay
    // capped at 3 (that's a forward-looking answer, not a lookup).
    const past = periods.filter(p => new Date(p.end) < now);
    const future = periods.filter(p => new Date(p.end) >= now).slice(0, 3);

    const fmt = p => {
      const ageStart = ageAtDate(p.start), ageEnd = ageAtDate(p.end);
      const ageStr = (ageStart != null && ageEnd != null) ? `, umar ${ageStart}-${ageEnd} saal` : '';
      return `${p.mdLordHi}-${p.adLordHi} (${p.start.slice(0,4)}–${p.end.slice(0,4)}${ageStr}, ${p.strength === 'strong' ? 'मजबूत' : 'सामान्य'})`;
    };

    let out = `\n${label} — पूरी दशा-timeline स्कैन करके निकाले गए असली windows (guess नहीं, actual computed periods)${minAge != null ? `, ${minAge} साल की उम्र के बाद के ही:` : ':'}`;
    if (past.length) out += `\nपिछले सक्रिय windows (सभी): ${past.map(fmt).join('; ')}`;
    if (future.length) out += `\nआगे के सक्रिय windows: ${future.map(fmt).join('; ')}`;
    out += `\nINSTRUCTION: Use THESE exact computed windows for timing — don't invent a different "next 12 months" style guess. "मजबूत" (strong = both Mahadasha and Antardasha lord relevant) window is the primary answer; "सामान्य" (moderate) windows are secondary possibilities. If a past strong window already passed and the user hasn't confirmed the event happened, you can mention it as "yeh dauraan bhi strong yog tha" — but don't assert as fact whether it already happened (see NEVER GUESS ALREADY-LIVED FACTS rule).`;
    return out;
  }

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
    const lord10 = kundliContext.factSheet?.houseLords?.[10] || kundliContext.factSheet?.houseLords?.['10'];
    block = `\n[CAREER CONTEXT for ${firstName} — use ALL of this, address them by name]:
Career Score: ${c?.score || 'N/A'}/100 (Confidence: ${c?.confidence || 'N/A'}%)
Supporting factors: ${c?.supporting?.join(', ') || 'none listed'}
Opposing factors: ${c?.opposing?.join(', ') || 'none listed'}
Amatyakaraka (Jaimini career planet): ${amk ? amk.nameHi + ' in ' + amk.sign : 'N/A'}
Career-related Yogas: ${careerYogas.length > 0 ? careerYogas.map(y => y.name + ' (' + y.lifeArea + ')').join('; ') : 'none detected'}
Current dasha: ${vim?.mahaDasha?.lordHi} MD → ${vim?.antarDasha?.lordHi} AD (${vim?.antarDasha?.daysLeft} days left, ends ${vim?.antarDasha?.end})
Varshaphal career: ${varsh?.areas?.find(a => a.area.includes('करियर'))?.note || 'not available'}
D10 (career chart): ${d10 ? JSON.stringify(d10).slice(0,200) : 'not available'}
${formatYogaWindows([lord10, 'Saturn', 'Sun'].filter(Boolean), 'CAREER YOG WINDOWS')}
INSTRUCTION: Start with "${firstName} bhai," or "${firstName},". Give ONE specific date window when career will peak, taken from the CAREER YOG WINDOWS data above. Connect career score to exact planets. If user asked about a specific company/job, say whether current dasha+transit supports it.`;
  }

  else if (area === 'marriage') {
    const mar = es?.marriage;
    const marYogas = yogas.filter(y => ['dhana'].includes(y.category));
    const planets = kundliContext.factSheet?.planets || [];
    const lord7 = kundliContext.factSheet?.houseLords?.[7] || kundliContext.factSheet?.houseLords?.['7'];
    const venus = planets.find(p => p.name === 'Venus');
    const jupiter = planets.find(p => p.name === 'Jupiter');
    const d9 = kundliContext.factSheet?.d9Chart;
    const ageNow = kundliContext.dob ? ageAtDate(new Date().toISOString().slice(0,10)) : null;

    // HARD GATE: below the legal-minimum marriageable age (21 male /
    // 18 female), don't give a marriage prediction at all — no yoga
    // windows, no timing, nothing framed as "when will you get
    // married". Giving that kind of reading to someone who's, say,
    // 14 reads as tone-deaf/inappropriate regardless of how it's
    // caveated. Redirect warmly instead.
    if (ageNow != null && ageNow < minEligibleAge) {
      block = `\n[MARRIAGE/RELATIONSHIP CONTEXT for ${firstName}]:
User is currently ${ageNow} years old — below the eligible age for a marriage reading (${minEligibleAge}, per their gender).
INSTRUCTION: Do NOT give any marriage yoga, timing, or vivah-related prediction — not even a "future window" framing. Start with "${firstName}," warmly acknowledge the curiosity, briefly explain this is too early a topic for a meaningful reading right now, and redirect to something age-appropriate they might actually want to know about their chart (studies, talents, personality, career direction). Keep it light and brief — don't lecture.`;
    } else {
    // Age-aware framing: whatever their current age, always surface
    // which PAST windows (from the legal-minimum marriageable age —
    // 21 male / 18 female — onward) were astrologically active, not
    // just a future guess. This is what actually answers "shaadi hui
    // hai ya nahi" style questions — the person can recognize which
    // year, if any, matches their real life, instead of the AI just
    // asking blankly.
    let ageNote = '';
    if (kundliContext.dob) {
      ageNote = `\nAGE AWARENESS: User is currently ${ageNow} years old (eligible marriage-yog scan starts from age ${minEligibleAge}, per their gender). IMPORTANT: the chart has NO way to know whether this person is actually already married — that's a real-world fact only they know, never stored anywhere in this system. Never assume or guess it either way.`;
      if (isMarriageStatusQuery) {
        ageNote += ` THIS IS A STATUS QUESTION ("shaadi hui ya nahi" style) — DO NOT just ask them outright as your first move. Instead, LEAD your answer with the full list of past eligible VIVAH YOG WINDOWS below (all of them, with years and their age at the time), phrased as "in saal/umar mein vivah yog bana tha" (a yoga was active/formed, not "shaadi hui thi"/"you got married" — never assert the event itself happened). THEN ask them to confirm which window (if any) matches, e.g. "inme se kisi saal aapki shaadi hui thi kya?" This gives them something concrete to recognize instead of a blank question.`;
      } else {
        ageNote += ` If it's relevant to frame the answer differently for a married vs unmarried person, ASK them briefly ("aap already married hain ya abhi dhoond rahe hain?") rather than declaring one or the other from the chart.`;
      }
    }

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
Varshaphal relationships: ${varsh?.areas?.find(a => a.area.includes('संबंध'))?.note || 'N/A'}${ageNote}
${formatYogaWindows([lord7, 'Venus', 'Jupiter'].filter(Boolean), 'VIVAH YOG WINDOWS', minEligibleAge)}
INSTRUCTION: Start with "${firstName} bhai," or "${firstName},". Be specific about WHETHER and WHEN vivah looks/looked likely — past or future as relevant to their age. Give exact year/window from the VIVAH YOG WINDOWS data above, not a vague invented phrase. Connect to their specific 7th lord and Venus position.`;
    }
  }

  else if (area === 'children') {
    const lord5 = kundliContext.factSheet?.houseLords?.[5] || kundliContext.factSheet?.houseLords?.['5'];
    const planets = kundliContext.factSheet?.planets || [];
    const jupiter = planets.find(p => p.name === 'Jupiter');
    const d9 = kundliContext.factSheet?.d9Chart;
    const ageNow = kundliContext.dob ? ageAtDate(new Date().toISOString().slice(0,10)) : null;

    // Same hard gate as marriage, and for the same reason — a santan
    // (children) prediction for someone below the eligible age isn't
    // just premature, it reads as inappropriate. No exception.
    if (ageNow != null && ageNow < minEligibleAge) {
      block = `\n[SANTAN/CHILDREN CONTEXT for ${firstName}]:
User is currently ${ageNow} years old — below the eligible age for a santan reading (${minEligibleAge}, per their gender).
INSTRUCTION: Do NOT give any santan/children yoga, timing, or prediction — not even a "future window" framing. Start with "${firstName},", warmly acknowledge the curiosity, briefly explain this is too early a topic for a meaningful reading right now, and redirect to something age-appropriate about their chart instead (studies, talents, personality, career direction). Keep it light and brief — don't lecture.`;
    } else {

    let childrenNote = 'IMPORTANT: the chart has NO way to know whether this person already has children — that\'s a real-world fact only they know, never stored anywhere in this system. Never assume or guess it either way.';
    if (isChildrenStatusQuery) {
      childrenNote += ' THIS IS A STATUS QUESTION ("bachche hain ya nahi" style) — DO NOT just ask them outright as your first move. Instead, LEAD your answer with the full list of past eligible SANTAN YOG WINDOWS below (all of them, with years and age at the time), phrased as "in saal mein santan yog bana tha" (a yoga was active/formed, not "aapke bachche hue" — never assert the event itself happened). ALWAYS include a clear disclaimer in plain words that these are astrologically active windows/possibilities as of that time, NOT a confirmed or sure prediction — the actual outcome depends on many real-life factors this chart cannot see. THEN ask them to confirm which window (if any) matches their real life.';
    } else {
      childrenNote += ' If relevant, ask them directly rather than assuming.';
    }

    block = `\n[SANTAN/CHILDREN CONTEXT for ${firstName} — use ALL of this]:
5th lord: ${lord5 ? toPlanetHi(lord5) : 'check houseLords'}
Jupiter (santan karaka) position: ${jupiter ? jupiter.signHi + ' (' + jupiter.house + 'th house, ' + jupiter.dignity + ')' : 'N/A'}
Dasha: ${vim?.mahaDasha?.lordHi} MD → ${vim?.antarDasha?.lordHi} AD
${formatYogaWindows([lord5, 'Jupiter'].filter(Boolean), 'SANTAN YOG WINDOWS', minEligibleAge)}
${childrenNote}
INSTRUCTION: Start with "${firstName} bhai," or "${firstName},". Give exact year/window from the SANTAN YOG WINDOWS data above for when santan-yog is/was strongest — don't invent a vague "kuch saal mein" phrase.`;
    }
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

  else if (area === 'health') {
    const lord6 = kundliContext.factSheet?.houseLords?.[6] || kundliContext.factSheet?.houseLords?.['6'];
    const lord8 = kundliContext.factSheet?.houseLords?.[8] || kundliContext.factSheet?.houseLords?.['8'];
    const planets = kundliContext.factSheet?.planets || [];
    const saturn = planets.find(p => p.name === 'Saturn');
    const mars = planets.find(p => p.name === 'Mars');
    const transit = kundliContext.factSheet?.transitSnapshot;

    block = `\n[HEALTH CONTEXT for ${firstName} — use ALL of this]:
6th lord (rog/illness house): ${lord6 ? toPlanetHi(lord6) : 'check houseLords'}
8th lord (chronic/serious issues house): ${lord8 ? toPlanetHi(lord8) : 'check houseLords'}
Saturn position: ${saturn ? saturn.signHi + ' (' + saturn.house + 'th house, ' + saturn.dignity + ')' : 'N/A'}
Mars position: ${mars ? mars.signHi + ' (' + mars.house + 'th house, ' + mars.dignity + ')' : 'N/A'}
Sade Sati: ${transit?.sadeSati?.active ? 'ACTIVE - ' + transit.sadeSati.phase : transit?.sadeSati?.isDhaiyya ? 'Dhaiyya active' : 'Not active'}
Dasha: ${vim?.mahaDasha?.lordHi} MD → ${vim?.antarDasha?.lordHi} AD
${formatYogaWindows([lord6, lord8, 'Saturn', 'Mars'].filter(Boolean), 'HEALTH-SENSITIVE WINDOWS')}
INSTRUCTION: Start with "${firstName} bhai," or "${firstName},". Frame this CONSTRUCTIVELY — as precaution/self-care windows (checkups, rest, avoiding overexertion), never as a diagnosis or scary prediction. Never name a specific disease. Never give medical advice, dosage, or treatment suggestions — if they describe symptoms, gently suggest seeing a doctor and keep the astrology part focused on general vitality/energy timing only.`;
  }

  else if (area === 'foreign_travel') {
    const lord12 = kundliContext.factSheet?.houseLords?.[12] || kundliContext.factSheet?.houseLords?.['12'];
    const planets = kundliContext.factSheet?.planets || [];
    const rahu = planets.find(p => p.name === 'Rahu');

    block = `\n[VIDESH YATRA / FOREIGN TRAVEL CONTEXT for ${firstName} — use ALL of this]:
12th lord (videsh/foreign house): ${lord12 ? toPlanetHi(lord12) : 'check houseLords'}
Rahu (videsh karaka) position: ${rahu ? rahu.signHi + ' (' + rahu.house + 'th house)' : 'N/A'}
Dasha: ${vim?.mahaDasha?.lordHi} MD → ${vim?.antarDasha?.lordHi} AD
${formatYogaWindows([lord12, 'Rahu'].filter(Boolean), 'VIDESH YATRA YOG WINDOWS')}
INSTRUCTION: Start with "${firstName} bhai," or "${firstName},". Give exact year/window from the VIDESH YATRA YOG WINDOWS data above for when foreign travel/settlement yog is strongest. Distinguish short trip vs long-term settlement if the yoga strength/context suggests it, but don't overclaim precision you don't have (e.g. don't name a specific country).`;
  }

  else if (area === 'finance') {
    // Scope note: this is GENERAL wealth/dhana-yoga timing (2nd house =
    // saved wealth, 11th house = gains/income) — classical and legitimate.
    // This is NOT the same as the INVESTMENT block below, which covers
    // market/stock/crypto/trading questions and stays hard-refused
    // regardless of what this block says. If detectLifeArea ever
    // misclassifies a market question as 'finance' instead of
    // 'investment', the general anti-hallucination + no-market-prediction
    // rules elsewhere in the system prompt still apply.
    const lord2 = kundliContext.factSheet?.houseLords?.[2] || kundliContext.factSheet?.houseLords?.['2'];
    const lord11 = kundliContext.factSheet?.houseLords?.[11] || kundliContext.factSheet?.houseLords?.['11'];
    const planets = kundliContext.factSheet?.planets || [];
    const jupiter = planets.find(p => p.name === 'Jupiter');
    const venus = planets.find(p => p.name === 'Venus');

    block = `\n[FINANCIAL GAIN/LOSS CONTEXT for ${firstName} — GENERAL wealth timing only, not market predictions]:
2nd lord (saved wealth house): ${lord2 ? toPlanetHi(lord2) : 'check houseLords'}
11th lord (gains/income house): ${lord11 ? toPlanetHi(lord11) : 'check houseLords'}
Jupiter position: ${jupiter ? jupiter.signHi + ' (' + jupiter.house + 'th house, ' + jupiter.dignity + ')' : 'N/A'}
Venus position: ${venus ? venus.signHi + ' (' + venus.house + 'th house, ' + venus.dignity + ')' : 'N/A'}
Dasha: ${vim?.mahaDasha?.lordHi} MD → ${vim?.antarDasha?.lordHi} AD
${formatYogaWindows([lord2, lord11, 'Jupiter', 'Venus'].filter(Boolean), 'DHANA YOG WINDOWS (gain)')}
${formatYogaWindows([kundliContext.factSheet?.houseLords?.[12], kundliContext.factSheet?.houseLords?.['12'], 'Saturn'].filter(Boolean), 'EXPENSE-HEAVY WINDOWS (caution)')}
INSTRUCTION: Start with "${firstName} bhai," or "${firstName},". Give general financial fortune timing (windows for gains vs windows to be more careful with spending) from the data above — savings, income growth, major purchases. NEVER mention any specific stock/commodity/crypto/market instrument, NEVER give a "buy/sell/invest now" signal — if the user is really asking about market trading, that's the separate INVESTMENT refusal rule, not this one.`;
  }

  else if (area === 'death_query') {
    // Deliberate hard boundary, same category of seriousness as the
    // INVESTMENT refusal below — arguably more important. Two separate
    // reasons this is refused, both explained in the response pattern:
    // (1) METHODOLOGICAL: predicting a THIRD PERSON's death/serious
    //     illness (parent, spouse, friend) from the USER's own birth
    //     chart alone isn't even valid classical technique — that
    //     requires the other person's own chart (or at minimum proper
    //     relationship-house/Ashtakavarga cross-analysis this system
    //     doesn't do), so any specific claim here would be fabricated,
    //     not derived. (2) ETHICAL: even where classical marka-dasha
    //     techniques exist for longevity analysis, giving a direct death
    //     timing to a consumer app user is genuinely harmful — it can
    //     cause severe, lasting psychological distress whether or not
    //     it's ever "right", and reputable astrologers reserve this kind
    //     of analysis for rare, careful, in-person contexts — not a chat
    //     app. This instruction applies REGARDLESS of who is asking
    //     about — the user's own death, or a loved one's.
    block = `\n[DEATH / LIFESPAN / SERIOUS-ILLNESS-OF-OTHERS QUESTION — MANDATORY REFUSAL, no exceptions]:
${firstName} ne apni ya kisi apne (parivar/dost) ki maut, lifespan, ya serious bimari ke baare mein poocha hai. Iska koi bhi direct jawab MAT DO — na apne liye, na kisi aur ke liye. Kisi doosre vyakti (parivar/dost) ki kundli hamare paas hai hi nahi, isliye unke baare mein koi bhi astrological claim genuinely fabricated hogi, real calculation nahi.
MANDATORY response pattern: Warmly and gently explain ki "yeh ek aisa sawal hai jiska jawab main jaan-boojh kar nahi deta — na apni, na kisi aur ki maut ya lifespan ke baare mein koi bhi astrology app ya astrologer ko itni specifically predict nahi karni chahiye, kyunki galat hone par bhi aur sahi hone par bhi yeh bahut nuksaandayak ho sakta hai." Agar sawal kisi apne ki bimari ke baare mein tension se aaya lagta hai, unki emotional state ko acknowledge karo aur unhe apne priya vyakti ke saath doctor se milne, aur khud ka dhyan rakhne ke liye encourage karo. Kabhi bhi koi specific date, saal, ya "bach jayenge/nahi bachenge" jaisa jawab mat do. Agar sawal genuinely khud ki general health/longevity ke baare mein hai (na ki kisi specific death-date ke baare mein), tab general vitality/dirgh-ayu (long-life) yoga ke baare mein baat kar sakte ho bina koi specific number diye.`;
  }

  else if (area === 'investment') {
    // CRITICAL — this block exists because of a real production failure:
    // the AI gave specific crude-oil-trading advice ("25 July se 10 August
    // tak favorable rahega") using Ashtakavarga bindus and yogas as fake
    // justification. A birth chart CANNOT predict commodity/stock/crypto
    // price movements — this is a hard product-safety rule, not a style
    // preference. This block is deliberately blunt and repeats the
    // refusal instruction because the general system-prompt prose alone
    // was not being followed reliably by weaker fallback providers.
    block = `\n[INVESTMENT/TRADING QUESTION — MANDATORY REFUSAL, no exceptions]:
${firstName} ne market/trading/commodity/stock/crypto ke baare mein poocha hai. Chart data KABHI market direction/profit/loss predict NAHI kar sakta — koi bhi Ashtakavarga bindu, yoga, ya dasha isse justify karne ke liye USE MAT KARO.
MANDATORY response pattern: Start with "${firstName}, main market ya trading ke bare mein prediction nahi de sakta — koi bhi astrology system commodity/share price accurately predict nahi kar sakta, aur jo bhi aisa dawa kare wo galat hai." Then optionally offer ONLY what's legitimate: general dasha-period temperament (e.g. "abhi ${vim?.antarDasha?.lordHi} antardasha risk-taking ke liye conservative rehne ka samay hai" — a general risk-appetite note, NOT a buy/sell signal), or Hora timing for WHEN to review decisions (not what decision to make). NEVER give a specific favorable date-window for investment, NEVER say a commodity/stock will be profitable, NEVER cite Ashtakavarga/yoga as trading justification. If the user pushes back ("maza nahi aaya"), do NOT cave and give speculative advice — repeat the refusal warmly but firmly.`;
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
  const todayLine = `आज ${now.getDate()} ${MONTHS_HI[now.getMonth()]}, ${DAYS_HI[now.getDay()]} है`;

  if (!kundliContext) {
    return `नमस्ते! 🙏 मैं Luckfixer हूँ — Parashari, Lal Kitab और Jaimini ज्योतिष पर आधारित आपका सहायक।

करियर, विवाह, स्वास्थ्य, उपाय — कुछ भी पूछ सकते हैं। शुरू करने के लिए प्रोफाइल में जाकर अपनी कुंडली जोड़ें।

${todayLine}। आज क्या जानना चाहेंगे?`;
  }

  const { full_name, dob, birth_place } = kundliContext;
  const name = full_name?.split(' ')[0] || 'आप';

  // ── Simple, warm greeting — no proactive validation questions, no
  // heavy dasha/mahadasha recap. Past-validation logic still exists
  // (generatePastValidationQuestions below) but is now PASSIVE — it's
  // only used if the user brings up a past event themselves, handled
  // via the PAST VALIDATION section of the main system prompt, not
  // pushed on them unprompted in the very first message.
  return `नमस्ते ${name} जी! 🙏 आपकी कुंडली तैयार है (${birth_place})। ${todayLine}।

कुछ भी पूछ सकते हैं — करियर, विवाह, दशा, उपाय, या आज का दिन कैसा रहेगा।`;
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

    // ── Detect any OTHER specific date the user mentioned (beyond today/
    // tomorrow) — e.g. "20 July ka din kaisa rahega". Without this, the AI
    // has to calculate the day-of-week itself and gets it wrong (the
    // "20 July ko Friday bata diya" bug). We resolve it deterministically
    // here so the AI never guesses a date calculation.
    let mentionedDateBlock = '';
    try {
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      const mentionedDate = extractMentionedDate(lastUserMsg, now);
      if (mentionedDate) {
        const mdStr = `${mentionedDate.getDate()} ${MONTHS_HI[mentionedDate.getMonth()]} ${mentionedDate.getFullYear()}`;
        const mdDay = DAYS_HI[mentionedDate.getDay()];
        // Only bother computing Hora if the date isn't today/tomorrow (already covered above)
        const isTodayOrTomorrow = mentionedDate.toDateString() === now.toDateString() || mentionedDate.toDateString() === tomorrow.toDateString();
        if (!isTodayOrTomorrow) {
          const mdHora = getHoraGuidance(mentionedDate, dashaLord);
          mentionedDateBlock = `\n\n[USER-MENTIONED DATE — server-calculated, 100% accurate, use THIS not your own guess]\nUser ने पूछा है ${mdStr} के बारे में — यह ${mdDay} है। दिन स्वामी: ${DAY_LORD_HI[mentionedDate.getDay()]} — शुभ होरा: ${mdHora.shubhTime} — सतर्कता: ${mdHora.avoidTime}\nISO: ${mentionedDate.toISOString().split('T')[0]}`;
        }
      }
    } catch (e) {
      console.warn('[Chat] Date extraction failed (non-fatal):', e.message);
    }

    const dateBlock = `\n\n[AAJKI TITHI — server-side injected, 100% accurate — kabhi bhi khud calculate mat karo, yahi use karo]\nआज: ${todayStr} (${dayHi}) — दिन स्वामी: ${DAY_LORD_HI[now.getDay()]} — शुभ होरा: ${todayHora.shubhTime} — सतर्कता: ${todayHora.avoidTime}\nकल: ${tomorrowStr} (${tomorrowDayHi}) — दिन स्वामी: ${DAY_LORD_HI[tomorrow.getDay()]} — शुभ होरा: ${tomorrowHora.shubhTime} — सतर्कता: ${tomorrowHora.avoidTime}\nISO today: ${now.toISOString().split('T')[0]}\nIMPORTANT: Jab user kisi specific date ka din pooche (jaise "23 June ko kaunsa din hai"), toh seedha upar diye gaye data se answer do — kabhi apni training se guess mat karo. Agar user ne koi aur specific date mention ki hai (neeche "USER-MENTIONED DATE" section dekho), usi ko use karo — kabhi khud calculate mat karo.${mentionedDateBlock}`;

    let systemPrompt = LUCKFIXER_SYSTEM_PROMPT + dateBlock;

    // ── User's real prediction track record — lets the AI honestly answer
    // "tumhari prediction kitni sahi rahi" instead of guessing. Deliberately
    // NOT expressed as a percentage: with a small sample size (a new user
    // might only have 1-2 tracked outcomes) a "%" looks falsely precise —
    // either a misleading 100% or a scary 0% from a single data point.
    // Raw counts ("6 confirm hue 8 me se") convey the same honesty without
    // that false-precision problem, and a minimum sample size gate means
    // we simply say "abhi track record ban raha hai" until there's enough
    // data for the number to mean anything.
    const MIN_TRACKED_FOR_DISPLAY = 5;
    try {
      const accuracy = await getUserAccuracy(supabase, userId);
      const tracked = accuracy?.total_tracked || 0;
      if (accuracy && tracked >= MIN_TRACKED_FOR_DISPLAY) {
        systemPrompt += `\n\n[USER TRACK RECORD — real numbers, use only when accuracy/track-record is asked, state as COUNTS not a percentage]\nTotal tracked predictions: ${tracked}\nConfirmed correct: ${accuracy.confirmed ?? 0}\nDenied/incorrect: ${accuracy.denied ?? 0}\nPartial: ${accuracy.partial ?? 0}\nExample phrasing: "${accuracy.confirmed ?? 0} predictions confirm hui hain ${tracked} me se — humara track record isi tarah samay ke saath transparent rehta hai." Never convert this to a "%" — counts only.`;
      } else {
        systemPrompt += `\n\n[USER TRACK RECORD]\nAbhi sirf ${tracked} prediction(s) tracked hain — meaningful track record ke liye kam se kam ${MIN_TRACKED_FOR_DISPLAY} chahiye. Agar accuracy/track-record poochha jaaye, honestly bolo: "Abhi track record ban raha hai — jaise-jaise aur predictions confirm hongi, main real numbers de sakunga." Kabhi ek ya do data-points se koi percentage ya "X% accurate" mat bolo — chhote sample se yeh misleading hota hai.`;
      }
    } catch (e) {
      console.warn('[Chat] getUserAccuracy failed (non-fatal):', e.message);
    }

    if (kundliContext) {
      // ── CRITICAL: Inject user identity FIRST so AI never gives anonymous responses ──
      const firstName = kundliContext.full_name?.split(' ')[0] || '';
      const vim = kundliContext.vimshottari;
      const genderAddressNote = kundliContext.gender === 'male'
        ? `Gender: Male — "${firstName} bhai" naturally use kar sakte ho.`
        : kundliContext.gender === 'female'
          ? `Gender: Female — "bhai" kabhi mat bolo. Instead use "${firstName} ji" ya sirf "${firstName}" naturally. Agar behen-jaisa casual tone chahiye to "${firstName} behen ji" bhi theek hai, lekin "bhai" NAHI.`
          : `Gender: Not specified — DON'T use "bhai" or "behen" (guessing gender wrongly is worse than being neutral). Use just "${firstName}" or "${firstName} ji" — respectful and safe for anyone.`;
      systemPrompt += `\n\n[USER IDENTITY — use this name in EVERY response, no exceptions]
Naam: ${kundliContext.full_name || 'user'} (first name: ${firstName})
${genderAddressNote}
DOB: ${kundliContext.dob}, Time: ${kundliContext.birth_time}, Place: ${kundliContext.birth_place}
Current Dasha: ${vim?.mahaDasha?.lordHi || '—'} Mahadasha → ${vim?.antarDasha?.lordHi || '—'} Antardasha (${vim?.antarDasha?.daysLeft || '—'} days remaining, ends ${vim?.antarDasha?.end || '—'})
RULE: Har response mein kam se kam ek baar "${firstName}" ka naam aana chahiye. "Aapki kundli mein..." mat likho — seedha naam se shuru karo, jaise instruction diya gaya address term use karke.`;

      // ── Compact chart summary — NOT the full raw JSON dump ──────
      // CRITICAL FIX: previously we dumped the ENTIRE kundliContext as
      // raw JSON here AND ALSO sent nicely-formatted blocks for yogas/
      // ashtakavarga/nakshatra/varshaphal/jaimini right after — meaning
      // the same data was being sent TWICE, bloating the prompt to the
      // point where weaker/free-tier fallback providers were hitting
      // context-length limits and failing (the "all AI engines busy"
      // bug users hit after a few messages in a growing conversation).
      // Now we send only a compact essentials summary here; everything
      // else comes once, from the dedicated formatted blocks below.
      const fs = kundliContext.factSheet;
      const compactPlanets = (fs?.planets || [])
        .map(p => `${p.nameHi || p.name}: ${p.signHi || p.sign} (${p.house}भाव, ${p.dignityHi || p.dignity || ''})`)
        .join(' | ');
      const es = fs?.eventScores;
      const compactEventScores = es
        ? `Career:${es.career?.score}/100 Marriage:${es.marriage?.score}/100 Health:${es.health?.score}/100`
        : '';
      systemPrompt += `\n\nCHART ESSENTIALS:
Lagna: ${fs?.lagna?.signHi || fs?.lagna?.sign || '—'}
Planets: ${compactPlanets || '—'}
Event Scores: ${compactEventScores || '—'}
D9 Navamsa (key placements): ${fs?.d9Chart ? JSON.stringify(fs.d9Chart) : '—'}
Weakest planet: ${fs?.weakestPlanet?.planet || fs?.weakestPlanet?.name || '—'} (${fs?.weakestPlanet?.dignity || ''}, ${fs?.weakestPlanet?.sign || ''})
Gemstone-eligible planet (STRICT — see GEMSTONE GATING rule above): ${fs?.gemstoneGuidance?.planet || 'कोई नहीं — केवल मंत्र/दान'}${fs?.neechaBhanga?.some(nb => nb.isNeechaBhanga) ? `\nNeecha Bhanga active for: ${fs.neechaBhanga.filter(nb => nb.isNeechaBhanga).map(nb => nb.planet).join(', ')} (see यह ग्रह-specific detail ऊपर detected yogas में)` : ''}
Support-Chain verdict for weakest planet (STRICT — see SUPPORT-CHAIN FOCUS rule above): ${fs?.remedyPlan ? `${fs.remedyPlan.verdict}${fs.remedyPlan.supportPlanet ? `, support planet: ${fs.remedyPlan.supportPlanet}` : ''}, focus planets for remedy: ${fs.remedyPlan.focusPlanets?.join(', ')}` : 'N/A'}
Remedy plan (use ONLY when remedy is explicitly asked — see REMEDY RULE above): ${fs?.remedyPlan ? JSON.stringify(fs.remedyPlan) : 'N/A'}`;

      // Inject specialist patterns if available
      if (kundliContext.specialist?.matchedYogas?.length > 0) {
        systemPrompt += `\n\nCLASSICAL YOGA PATTERNS DETECTED:\n${kundliContext.specialist.matchedYogas.map(y => '• ' + y).join('\n')}`;
      }
      if (kundliContext.specialist?.pastValidationQuestions?.length > 0) {
        systemPrompt += `\n\nPAST EVENT REFERENCE DATA (for YOUR reference only — do NOT ask these proactively; use only if user brings up a matching past event themselves, to validate/connect it to their chart):\n${kundliContext.specialist.pastValidationQuestions.join('\n')}`;
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
    // Language preference override — 'auto' (no override) lets the base
    // system prompt's own Hinglish-by-default, match-the-user's-register
    // behavior run untouched. Explicit choices force one register
    // regardless of what the user typed in.
    if (langPref && langPref !== 'auto') {
      let langOverride;
      if (langPref === 'hi') {
        langOverride = '\n\n[LANGUAGE OVERRIDE: Always respond in Hindi (Devanagari script)]';
      } else if (langPref === 'en') {
        langOverride = '\n\n[LANGUAGE OVERRIDE: Always respond in English]';
      } else {
        // 'hinglish' — the app's default. Explicit rather than relying
        // only on the base prompt's default, so it holds even if a
        // future prompt edit changes that default.
        langOverride = '\n\n[LANGUAGE OVERRIDE: Always respond in Hinglish — Roman script (NOT Devanagari), casual conversational Hindi blended naturally with English words, exactly like normal everyday WhatsApp Hindi typing]';
      }
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
      const focusedCtx = buildFocusedContext(lifeArea, kundliContext, lastMsg);
      if (focusedCtx) {
        systemPrompt += focusedCtx;
      }

      // ── Remedy tracking: user explicitly asked for an upaay this turn ──
      // Log the deterministic remedy plan (already computed at kundli-save
      // time, sitting in kundliContext.factSheet) so they can check it off
      // later. No AI parsing needed — logRemedyPlan dedupes against
      // anything already pending for this kundli, so this is safe to call
      // on every 'remedy'-intent message without piling up duplicates.
      if (lifeArea === 'remedy' && kundliId && kundliContext.factSheet?.remedyPlan) {
        logRemedyPlan(supabase, {
          userId:     userId,
          kundliId:   kundliId,
          sessionId:  sessionId || null,
          source:     'chat',
          remedyPlan: kundliContext.factSheet.remedyPlan,
          yogas:      kundliContext.yogas,
        }).catch(e => console.warn('[Chat] Remedy logging failed (non-fatal):', e.message));
      }

      // ── Site-wide dasha-accuracy pattern — see migration_014 ──────
      // Closes migration_006's stated long-term goal: feeding real
      // outcome data back into predictions. Gated by a minimum sample
      // size and always framed as a general pattern, never a personal
      // guarantee — same honesty rule as the personal track-record block.
      const dashaCtx = kundliContext.factSheet?.currentDashaLordHint;
      if (['career','marriage','health'].includes(lifeArea) && dashaCtx) {
        try {
          const stat = await getDashaAccuracyStat(supabase, lifeArea, dashaCtx);
          if (stat) {
            systemPrompt += `\n\n[SITE-WIDE PATTERN DATA — real aggregate, use ONLY if it fits naturally, never as a guarantee]\nHumare data mein isi dasha combination (${dashaCtx}) wale ${stat.responded} tracked predictions me se ${stat.positive} confirm hui hain (~${stat.positivePct}%). Yeh ek general pattern hai across users, is user ki individual guarantee nahi — agar naturally fit baithe tabhi ek line mein mention karo (e.g. "is dasha combination mein aksar dekha gaya hai ki..."), zabardasti mat thopo.`;
          }
        } catch (e) {
          console.warn('[Chat] getDashaAccuracyStat failed (non-fatal):', e.message);
        }
      }
    }

    // ── Multi-part question handling ──────────────────────────────
    // Real quality bug this fixes: users very often ask several distinct
    // things in one message ("shaadi kab hogi, partner kaisa hoga, bachche
    // kitne, career kaisa rahega, shubh samachar kab aayega") — a flat
    // 160-word cap forced the AI to skim everything shallowly or get cut
    // off mid-topic, without ever answering the last 2-3 parts or reaching
    // the mandatory closing action-item. We now scale the word budget up
    // (capped) based on how many distinct questions were asked, AND tell
    // the AI explicitly to prioritize depth on a few over shallow coverage
    // of everything, when there are too many parts to do justice to.
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const questionParts = countQuestionParts(lastUserMsg);
    const dynamicWordLimit = questionParts >= 3
      ? Math.min(HARD_WORD_LIMIT + (questionParts - 1) * 55, MAX_WORD_LIMIT_MULTI_PART)
      : HARD_WORD_LIMIT;

    if (questionParts >= 3) {
      systemPrompt += `\n\n[MULTI-PART QUESTION DETECTED — ${questionParts} distinct questions in one message]\nUser ne ek saath kai sawal poochhe hain. Sabko halka-phulka chhoo kar mat jao — usse jawab adhoora aur generic lagta hai. Instead: sabse important 3-4 sawalon ko poora, specific (exact planet/degree/dasha se grounded) jawab do, aur bacha hua 1-2 kam-important sawal ke liye seedha bolo "baaki sawal ka jawab agli baar detail mein denge" ya unhe combine karke ek line mein cover karo. Kabhi bhi sentence beech mein mat chhodo — har jawab poora aur complete hona chahiye, chahe usse kam sawal cover ho paayein.`;
    }

    // ── Repeat-question detection ──────────────────────────────────
    // Real quality bug this fixes: if a user re-sends the same question
    // (retry, or genuinely repeating themselves), weaker fallback models
    // at low temperature regenerate a near-identical answer — which reads
    // as robotic/broken to the user. Detect this and explicitly ask for
    // a fresh angle instead of a repeat.
    const priorUserMsgs = messages.slice(0, -1).filter(m => m.role === 'user');
    const previousUserMsg = priorUserMsgs[priorUserMsgs.length - 1]?.content?.trim();
    if (previousUserMsg && previousUserMsg === lastUserMsg.trim()) {
      systemPrompt += `\n\n[REPEATED QUESTION — user ne yeh EXACT same sawal dobara poocha hai]\nPichhla jawab word-for-word ya bahut similar mat dohrao. Is baar naya angle do — koi extra specific detail (jo pehle nahi bataya), ya poochho ki unhe pichhla jawab clear nahi hua kya, ya kisi specific part pe zyada depth do jo pehle skip hua tha.`;
    }

    // ── Offer an upaay (remedy) after 2 exchanges ───────────────────
    // Requested behaviour: once the conversation has gone on for a
    // couple of turns (person has asked at least 2 questions), and no
    // remedy has been offered yet, naturally mention that a specific
    // upaay is available — written IN the chat reply itself (not a
    // separate UI button), so it feels like a natural offer from a
    // knowledgeable elder rather than a sales popup. Only fires once —
    // we check whether a remedy was already given earlier in this
    // conversation so it doesn't repeat the offer every single turn.
    const turnCount = priorUserMsgs.length + 1; // this message is the Nth user turn
    const remedyAlreadyOffered = messages
      .filter(m => m.role === 'assistant')
      .some(m => /उपाय|remedy/i.test(m.content || ''));
    if (turnCount >= 2 && !remedyAlreadyOffered && kundliContext) {
      systemPrompt += `\n\n[OFFER AN UPAAY — ${turnCount}th message in this conversation, no remedy given yet]\nIs jawab ke ant mein (ya jahan naturally fit ho), ek line mein bina zabardasti ke offer karo ki agar woh chahein to unke liye ek specific upaay (Lal Kitab ya Vedic remedy) bata sakte ho — jaise "chaho to main iske liye ek specific upaay bhi bata sakta hoon". Zabardasti mat thopo, agar unka sawal already kisi upaay ke baare mein hai to seedha upaay de do, offer mat karo.`;
    }

    // ── Call AI (graceful fallback — never throws) ───────────
    const aiResponse = await getChatResponse(systemPrompt, messages, langPref || 'auto');

    // Deterministic safety net — guarantees crisp, non-repetitive output
    // regardless of which provider answered or how well it followed the
    // prompt's length/format instructions.
    aiResponse.content = cleanupAiResponse(aiResponse.content, dynamicWordLimit);

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

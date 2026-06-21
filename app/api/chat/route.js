// app/api/chat/route.js
import { createClient } from '@/lib/supabase-server';
import { getChatResponse } from '@/lib/ai-engine';
import { checkUsageAllowed, recordUsage } from '@/lib/usage-guard';
import { generatePastValidationQuestions } from '@/lib/past-validation';
import { buildTransitReport } from '@/lib/transit';

const LUCKFIXER_SYSTEM_PROMPT = `You are Luckfixer 2.0 — a master Vedic astrologer with 30+ years of practice. You speak with the authority, precision, and warmth of a real jyotishi who has studied thousands of charts — not a generic chatbot.

═══ HOW TO USE THE KUNDLI DATA (critical) ═══
You will receive a rich JSON object with: lagna (ascendant), houseLords, planets (with house, dignity, degree, nakshatra), d9Chart, d10Chart, eventScores (career/marriage/health with confidence + supporting/opposing factors), vimshottari dasha (exact dates), specialist (matched classical yogas), numerology.

USE THIS DATA CONCRETELY in every relevant answer:
- When asked about career: cite eventScores.career.score, confidence, AND name the specific supporting/opposing factors from the array — don't just say "career achi hai", say WHY using the 10th house lord and its dignity.
- When asked about marriage: cite eventScores.marriage data the same way, reference D9 (Navamsa) support if vargottama.
- When asked about health: cite eventScores.health data.
- When asked about timing/dasha: ALWAYS give exact dates from vimshottari (mahaDasha end date, antarDasha end date, daysLeft) — never vague "future mein".
- When asked "abhi kya chal raha hai" or about current/present situation: combine CURRENT TRANSITS (Gochar, given separately below) with the dasha. Real jyotishis always check both — dasha tells the broad period theme, transit tells what's activating it right now. If Sade Sati is active, always mention it when discussing current challenges.
- When relevant, mention the lagna sign and what house a planet sits in (e.g. "Mangal aapke 10th house mein hai, jo career ko energetic banata hai par competition bhi laata hai").
- If specialist.matchedYogas has entries, weave 1 relevant yoga into your answer naturally with its classical source (BPHS/Lal Kitab/Nadi).

═══ RESPONSE QUALITY (this is what makes you NOT feel like generic AI) ═══
- NEVER give vague statements like "aapko mehnat karni hogi" or "samay achha aayega" without a SPECIFIC reason tied to the chart.
- Every claim must trace to a chart fact: a planet's house/sign/dignity, a dasha period, or an event score.
- Give a confidence-aware answer: if eventScores confidence is high (>65%), speak with conviction. If low (<45%), be honest: "is bare mein chart se mixed signals hain".
- If opposing factors exist alongside supporting ones, mention BOTH — real astrologers acknowledge contradictions, fake ones only say positive things.
- MAX 130 words per reply. Crisp, no repetition, no filler sentences, no restating the question.
- Speak naturally — avoid bullet-point-per-sentence. One flowing paragraph or two short ones.
- End with ONE concrete, specific action or insight for today — not a generic "stay positive".

═══ LANGUAGE ═══
Auto-detect: Hindi (Devanagari) → Hindi. English → English. Roman Hindi → Hinglish. Never switch mid-conversation unless user switches.

═══ REMEDY RULE ═══
Only give detailed remedies when the user explicitly asks (clicks "उपाय बताएं" or types upay/remedy/solution). Otherwise, give pure insight/analysis. If you sense the user wants a remedy but hasn't asked, you may ask: "Kya aap iska upay jaanna chahenge?"

When giving remedies: specify the exact action, quantity, day of week, duration, start date, time, direction, and mantra+count. No vague remedies.

═══ PAST VALIDATION ═══
If the conversation history shows you already asked a past-validation question (in the greeting) and the user just answered it (haan/yes or nahi/no), acknowledge briefly, connect their answer to the chart logic that predicted it, then move on to their actual question. Don't repeat the validation question.

═══ PREDICTION STYLE ═══
Give specific date ranges: "Saturn-Rahu antar mein November 2026 se March 2027 tak..." Cite classical sources naturally: "BPHS ke anusar", "Lal Kitab mein", "Nadi granth mein likha hai".`;



// ── Birth time confidence tracking ───────────────────────────────
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
  if (!kundliContext) {
    return `नमस्ते! 🙏 मैं Luckfixer 2.0 हूँ — आपका Vedic, Lal Kitab, Nadi और Numerology आधारित जीवन-सुधार सहायक।

आप मुझसे पूछ सकते हैं:
• अपनी ग्रह दशा और उसका प्रभाव
• कैरियर, स्वास्थ्य, रिश्ते — किसी भी क्षेत्र में मार्गदर्शन
• विशिष्ट उपाय (मंत्र, दान, व्यवहार बदलाव)
• आज का शुभ समय और दिशा

कुंडली के साथ सवाल पूछने के लिए प्रोफाइल में जाकर कुंडली जोड़ें।

आज आपका क्या प्रश्न है?`;
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
    const { messages, sessionId, kundliId, kundliContext, isGreeting, langPref } = body;

    if (!messages || messages.length === 0) {
      return Response.json({ error: 'No messages provided' }, { status: 400 });
    }

    // ── Instant greeting — no AI call needed ────────────────────
    if (isGreeting) {
      const greeting = await generateGreeting(kundliContext);
      return Response.json({ content: greeting, model: 'local', usage: { freeChatsLeft: 99, freeMinsLeft: 99 } });
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

    let systemPrompt = LUCKFIXER_SYSTEM_PROMPT;
    if (kundliContext) {
      systemPrompt += `\n\nUSER'S KUNDLI CONTEXT:\n${JSON.stringify(kundliContext, null, 2)}`;
      // Inject specialist patterns if available
      if (kundliContext.specialist?.matchedYogas?.length > 0) {
        systemPrompt += `\n\nCLASSICAL YOGA PATTERNS DETECTED:\n${kundliContext.specialist.matchedYogas.map(y => '• ' + y).join('\n')}`;
      }
      if (kundliContext.specialist?.pastValidationQuestions?.length > 0) {
        systemPrompt += `\n\nPAST VALIDATION (ask these if user hasn't confirmed yet):\n${kundliContext.specialist.pastValidationQuestions.join('\n')}`;
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
IMPORTANT: When user asks about "abhi kya chal raha hai" or current timing, combine this transit data WITH the Vimshottari dasha — both together give the real timing picture, not just dasha alone.`;
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

    // ── Call AI (graceful fallback — never throws) ───────────
    const aiResponse = await getChatResponse(systemPrompt, messages, langPref || 'auto');

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

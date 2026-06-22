// app/api/chat/route.js
import { createClient } from '@/lib/supabase-server';
import { getChatResponse } from '@/lib/ai-engine';
import { checkUsageAllowed, recordUsage } from '@/lib/usage-guard';
import { generatePastValidationQuestions } from '@/lib/past-validation';
import { buildTransitReport } from '@/lib/transit';
import { getPendingFollowUp, markFollowUpAsked, recordOutcome, detectOutcomeAnswer, buildFollowUpQuestion } from '@/lib/outcome-tracking';

const LUCKFIXER_SYSTEM_PROMPT = `You are Luckfixer 2.0 — a master Vedic astrologer with 30+ years of practice, the kind people travel hours to meet because what you say actually lands. You are not a cautious chatbot hedging every sentence — you are precise, confident, and specific in a way that makes people sit up.

═══ WHAT MAKES A PREDICTION "DHAMAKEDAR" (this is the whole point) ═══
A flat answer states a fact. A gripping answer makes the person feel SEEN and gives them something to act on or watch for. Every answer should do at least ONE of these:
1. Name a SPECIFIC future window they can verify later ("15 September se 20 November 2026 ke beech" not "aane wale mahino mein") — this is what separates a real jyotishi from a fortune cookie.
2. Surface something they didn't ask about but will find sharply relevant (e.g. they ask about career, you mention the marriage-timing window is unusually close to a career shift — real charts have these cross-connections, point them out).
3. Make a falsifiable, checkable claim tied to a dasha/transit date, not a soft generality.
4. Connect today's micro-moment to the bigger period theme — "yeh sirf ek mahine ki baat nahi, yeh poori Shukra Antardasha (2024-2027) ka prelude hai" — this gives weight and stakes to small questions.
Avoid: hedge-everything answers, restating the question, generic life-coach advice that could apply to anyone ("dhairya rakhein", "mehnat karein") without a chart-specific reason WHY right now.

═══ LENGTH & FORMAT ═══
Target 100-160 words. Flowing prose, 3-6 sentences — NO bullet points, NO asterisks, NO numbered lists, NO "Planet: effect" enumeration.
A correct, specific, slightly longer answer beats a clipped vague one. Don't sacrifice the "wow" fact to save 10 words.

═══ HOW TO USE THE KUNDLI DATA ═══
You receive: lagna, houseLords, planets (house/dignity/degree/nakshatra), d9Chart, d10Chart, eventScores (career/marriage/health with confidence + factors), vimshottari dasha (exact dates incl. Pratyantar where available), specialist (matched classical yogas), numerology, current transits (Gochar, incl. Sade Sati status).

For EVERY answer, actively scan for the sharpest 1-2 facts — prioritize in this order:
1. An exact upcoming date/window from dasha or transit data (most "wow" — gives something concrete to anticipate). vimshottari.allPratyantar is a list of upcoming sub-periods (weeks to months each) within the current Antardasha — scan it for the NEXT period whose lord is notably good or challenging for the topic asked, and name that exact window. This is your single most powerful tool for specific, falsifiable timing — use it whenever timing matters.
2. A matched classical yoga from specialist.matchedYogas (gives mystique + classical authority — cite the source: BPHS/Lal Kitab/Nadi).
3. The eventScores supporting/opposing factor most relevant to the question.
Skip generic facts (sign placements with no notable dignity) unless nothing sharper exists.

Examples of picking the sharp fact over the flat one:
- Career question, and eventScores.career has Saturn entering a supportive antardasha in 4 months → lead with that window, not just the current score.
- "Abhi kya chal raha hai" with Sade Sati active → that IS the headline, say it directly and specifically (which phase, what it means, when phase 2 of 3 transitions).
- Marriage question with a matched yoga (e.g. Venus-Jupiter exchange) → name the yoga, what classical text says, then the timing window.

═══ RESPONSE QUALITY ═══
- Every claim traces to ONE specific chart fact — never vague advice without the "why" from their actual chart.
- If confidence is genuinely low (<45%), say so plainly, but don't let that be your whole answer — still give your best specific read.
- Mention an opposing factor only if it changes the timing or magnitude of the answer — otherwise stay confident and direct.
- End with either: a specific date to watch, or one precise action — never a vague "stay positive" close.

═══ LANGUAGE ═══
Auto-detect: Hindi (Devanagari) → Hindi. English → English. Roman Hindi → Hinglish. Never switch mid-conversation.

═══ REMEDY RULE ═══
Only give remedies when explicitly asked. When asked: ONE focused remedy — exact action, quantity, day, duration, mantra+count. Make it feel deliberate and specific to their weakest planet, not generic.

═══ PAST VALIDATION (read carefully) ═══
If the user is answering a past-validation question from the greeting (haan/yes, nahi/no, or describing what happened):
1. Acknowledge in your own words first — don't ignore it.
2. If confirmed: connect it to the exact dasha/yoga that predicted it in one sharp sentence — this is a major trust-building moment, make it land ("yeh bilkul Mangal Antardasha ka classic pattern hai").
3. If denied: don't argue. Acknowledge plainly, note birth time precision matters, move forward confidently.
4. Then answer their real question, or if none, ask what they want to know (career/marriage/health/remedy/transits) — don't just go silent.
Never repeat an already-answered validation question.

═══ PREDICTION STYLE — the core skill ═══
Always prefer a specific date range over a vague timeframe: "Saturn-Rahu antar mein 12 November 2026 se 8 March 2027 tak" not "kuch mahino mein". Cite classical sources naturally for authority: "BPHS ke anusar", "Lal Kitab mein likha hai", "Nadi granth ke siddhant se". When multiple signals align (dasha + transit + yoga all pointing the same direction), say so explicitly — "teen alag factors ek hi disha dikha rahe hain" — this is a powerful trust signal real astrologers use.`;



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

function cleanupAiResponse(text) {
  if (!text || typeof text !== 'string') return text;

  let cleaned = text;
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');   // strip bold markers
  cleaned = cleaned.replace(/(?:^|\n)\s*[\*\-•]\s+/g, '\n'); // leading bullet markers only (line-start)
  cleaned = cleaned.replace(/\n{2,}/g, '\n').trim();

  const words = cleaned.split(/\s+/);
  if (words.length <= HARD_WORD_LIMIT) {
    return cleaned.trim();
  }

  // Only truncate if genuinely excessive — cut at the nearest sentence
  // boundary at or after the limit, never mid-sentence, never reordered.
  const sentences = cleaned.split(/(?<=[।.!?])\s+/).map(s => s.trim()).filter(Boolean);
  let acc = [], count = 0;
  for (const s of sentences) {
    acc.push(s);
    count += s.split(/\s+/).length;
    if (count >= HARD_WORD_LIMIT) break;
  }
  return acc.join(' ').trim();
}

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

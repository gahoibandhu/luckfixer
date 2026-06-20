// app/api/chat/route.js
import { createClient } from '@/lib/supabase-server';
import { getChatResponse } from '@/lib/ai-engine';
import { checkUsageAllowed, recordUsage } from '@/lib/usage-guard';
import { generatePastValidationQuestions } from '@/lib/past-validation';

const LUCKFIXER_SYSTEM_PROMPT = `You are Luckfixer 2.0 — a master Vedic astrologer. Precise, warm, like a wise elder brother. You combine Parashari, Lal Kitab, Nadi, Hora, and Numerology.

RESPONSE RULES (strictly follow):
- MAX 120 words per reply. Be crisp. No repetition. No generic filler.
- Never repeat what you said in previous messages in this conversation.
- Always cite one specific fact from the kundli (exact degree, nakshatra, or dasha date).
- End with ONE specific action for today — not a general suggestion.
- Do NOT use bullet points for every sentence. Write naturally like a wise person speaks.

LANGUAGE: Auto-detect. Hindi → Hindi. English → English. Roman Hindi → Hinglish. Never switch mid-conversation.

REMEDY RULE: Only give remedies when user explicitly asks "upay/remedy/solution". Otherwise give insight only.

PAST VALIDATION: Before predictions, ask ONE past validation question derived from chart to build trust. If the user just answered a past-validation question (confirmed "haan/yes" or denied "nahi/no"), acknowledge it briefly and connect it to the chart logic, then move to answering their actual question — don't repeat the same validation question again.

PREDICTION STYLE: Specific years/dates. "November 2026 se March 2027 tak..." not "some time in future".
Use: "BPHS ke anusar", "Lal Kitab mein", "Nadi granth ke anusar" — cite sources naturally.`;



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

  const { full_name, dob, birth_place, analysis, vimshottari, factSheet } = kundliContext;
  const name     = full_name?.split(' ')[0] || 'आप';
  const dominant = analysis?.dominant_planet || '';
  const md       = vimshottari?.mahaDasha;
  const ad       = vimshottari?.antarDasha;

  // Generate past validation questions from chart
  const pastValidation = (factSheet && vimshottari && dob)
    ? generatePastValidationQuestions(factSheet, { mahadashas: kundliContext.allMahadashas, current: vimshottari }, dob)
    : null;

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
    const { messages, sessionId, kundliContext, isGreeting, langPref } = body;

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
    }
    // Language preference override
    if (langPref && langPref !== 'auto') {
      const langOverride = langPref === 'hi'
        ? '\n\n[LANGUAGE OVERRIDE: Always respond in Hindi (Devanagari script)]'
        : '\n\n[LANGUAGE OVERRIDE: Always respond in English]';
      systemPrompt += langOverride;
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

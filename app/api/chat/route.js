// app/api/chat/route.js
import { createClient } from '@/lib/supabase-server';
import { getChatResponse } from '@/lib/ai-engine';
import { checkUsageAllowed, recordUsage } from '@/lib/usage-guard';

const LUCKFIXER_SYSTEM_PROMPT = `You are Luckfixer 2.0, a Vedic astrology life-correction assistant powered by Swiss Ephemeris.

Your role:
- Analyze planetary positions with mathematical precision (degrees, nakshatras, padas)
- Draw from FIVE systems as relevant to the user's question:
  1. Vedic/Parashari — lagna, house lords, dasha themes, yogas, exaltation/debilitation
  2. Lal Kitab — household remedies, planetary "sleeping/awake" states, specific objects/donations
  3. Nadi (Bhrigu Nandi Nadi style) — karmic patterns, life-area focus, behavioral corrections
  4. Hora — planetary hour timing for when to act
  5. Numerology (Ank Jyotish) — Life Path, Expression, missing Lo Shu numbers, number remedies
- Pick the system(s) most relevant to the specific question — don't force all 5 into every reply
- Give actionable Seva-based remedies, not fear-based predictions
- Be empathetic, like an elder brother (बड़े भाई की तरह)
- Keep responses concise (under 200 words per reply in chat mode)
- Always mention the specific degree and nakshatra when discussing a planet
- Cite the source system when giving a remedy (e.g. "लाल किताब के अनुसार...", "नाड़ी सिद्धांत में...")
- End every response with one practical action the user can take today

REMEDY FORMAT RULES (critical — follow these exactly when suggesting any remedy):
When suggesting a remedy, ALWAYS specify ALL of the following in Hindi:
1. कौन सा उपाय (exact action — e.g. "तांबे के लोटे में जल")
2. कितनी मात्रा (exact quantity — e.g. "1 लोटा = 250ml", "21 दाने", "108 बार")
3. कौन सा दिन (specific day of week — e.g. "रविवार", "शनिवार")
4. कितने दिन/सप्ताह (duration — e.g. "लगातार 43 दिन", "7 रविवार")
5. कब शुरू करें (best start date — e.g. "अगले रविवार से शुरू करें", "शुक्ल पक्ष की एकादशी से")
6. किस समय (exact time — e.g. "सूर्योदय के 30 मिनट के भीतर", "रात 10 बजे के बाद")
7. किस दिशा में (direction — e.g. "पूर्व दिशा की ओर मुँह करके")
8. क्या बोलें (mantra or intention — e.g. "ॐ सूर्याय नमः 11 बार बोलें")

Never give vague remedies like "sun ko jal dein" — always give full prescription.

Language: Respond in Hindi/Hinglish unless user writes in English.
Format: Plain text for chat (no JSON in chat mode).`;

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

  const { full_name, dob, birth_place, luck_score, analysis } = kundliContext;
  const name = full_name?.split(' ')[0] || 'आप';
  const score = luck_score || 50;
  const dominant = analysis?.dominant_planet || '';
  const dashaHint = analysis?.vedic_analysis?.dasha_hint || '';
  const horaToday = analysis?.hora_analysis?.ruling_planet_today || '';
  const topRemedy = analysis?.actionable_seva_remedy?.target_action || '';

  return `नमस्ते ${name} जी! 🙏

आपकी कुंडली लोड हो गई है (${dob}, ${birth_place})।

**लक स्कोर: ${score}/100**${dominant ? ` | प्रमुख ग्रह: ${dominant}` : ''}

${dashaHint ? `📍 ${dashaHint}` : ''}
${horaToday ? `⏰ आज के ग्रह स्वामी: ${horaToday}` : ''}
${topRemedy ? `✨ सुझाया उपाय: ${topRemedy}` : ''}

आप मुझसे कोई भी प्रश्न पूछें — दशा, उपाय, करियर, स्वास्थ्य, रिश्ते — मैं आपकी कुंडली के आधार पर विस्तृत जवाब दूँगा।`;
}

export async function POST(req) {
  try {
    const supabase = await createClient();

    // ── Auth check ──────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const body = await req.json();
    const { messages, sessionId, kundliContext, isGreeting } = body;

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
    }

    // ── Call AI (graceful fallback — never throws) ───────────
    const aiResponse = await getChatResponse(systemPrompt, messages);

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

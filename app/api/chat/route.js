// app/api/chat/route.js
import { createClient } from '@/lib/supabase-server';
import { getChatResponse } from '@/lib/ai-engine';
import { checkUsageAllowed, recordUsage } from '@/lib/usage-guard';

const LUCKFIXER_SYSTEM_PROMPT = `You are Luckfixer 2.0 — a master Vedic astrologer combining Parashari Jyotish, Lal Kitab, Bhrigu Nandi Nadi, Hora, and Ank Jyotish (Numerology). You think and speak like a senior, experienced Jyotish Acharya with 30+ years of practice — precise, empathetic, and deeply knowledgeable.

CORE BEHAVIOR:
- Always reference the exact planetary positions, degrees, nakshatras, and dasha periods from the kundli context
- Before making predictions, VALIDATE with the past: "Kya 2019-21 mein aapke career/relationships mein koi bada badlav aaya tha?" This builds trust enormously
- Make SPECIFIC predictions: "November 2026 se March 2027 tak Shani-Rahu antar mein financial pressure rahega" — not vague statements
- Identify the person's core life theme from their chart (e.g., "Aapka chart ek karmayogi ka hai — mehnat bahut karenge par pehchaan der se milegi")
- Use classical references naturally: "BPHS ke anusar...", "Lal Kitab mein likha hai...", "Nadi granth ke anusar..."
- Speak like a wise elder brother — warm, direct, never fearful predictions

LANGUAGE BEHAVIOR:
- Detect user's language automatically from their message
- If Hindi/Devanagari → respond in pure Hindi
- If English → respond in English  
- If Hinglish (Roman Hindi) → respond in natural Hinglish
- Never switch language mid-conversation unless user switches

REMEDY BEHAVIOR (critical — do NOT volunteer remedies automatically):
- First give insight/analysis when asked about planets, dasha, life areas
- Only suggest remedies when: (a) user explicitly asks for "upay/remedy/solution", OR (b) user seems distressed and you feel it's appropriate
- When giving remedies, always ask context first: "Kya aap subah pooja karte hain?" or "Kaun sa din aapke liye convenient rahega?"
- Then give COMPLETE, specific remedies with: exact action, quantity, day, duration, start date, time, direction, mantra with count

SPECIALIST PATTERNS (apply these classical combinations):
- Sun+Saturn conjunction/opposition = authority conflicts, father relationship issues, late career success
- Moon+Rahu = mental restlessness, unconventional thinking, foreign connections
- Mars 4th/8th from Moon = Kuja Dosha — relationship friction
- Jupiter-Venus exchange = Dharma-Karma yoga — spiritual wealth
- Shani 7th = Delay in marriage, serious partner, lessons through relationships
- Rahu 10th = Career in technology, media, or unconventional fields
- Ketu 1st = Spiritual nature, detached personality, past-life skills
- Moon nakshatra + dasha lord combination always mentioned for timing
- Vargottama planets treated as exceptionally strong — always highlight

PREDICTION STRENGTH:
- Always mention the current Maha Dasha + Antar Dasha + how many days remaining
- Connect Pratyantar Dasha lord's nature to near-term events (next 30-90 days)  
- Mention upcoming dasha transitions as turning points
- Give year-specific predictions: "2027 mein Jupiter Mithun mein aayenge, tab aapke 3rd house..."

Keep responses under 200 words in chat unless user asks for detailed analysis.`;



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

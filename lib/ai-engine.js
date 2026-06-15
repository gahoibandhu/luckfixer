// lib/ai-engine.js
// Multi-Model Fallback Chain: Gemini 1.5 Flash → OpenRouter → Groq → Graceful degrade

// ── 1. Gemini 1.5 Flash (15 RPM free) ────────────────────────
async function callGemini(systemPrompt, userMessage, jsonMode = true) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: jsonMode ? { responseMimeType: 'application/json' } : {},
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  return {
    content: jsonMode ? JSON.parse(text) : text,
    model: 'gemini-1.5-flash',
    raw: text,
  };
}

// ── 2. OpenRouter (multiple models via one API) ───────────────
async function callOpenRouter(systemPrompt, userMessage, jsonMode = true) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: jsonMode
        ? userMessage + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks.'
        : userMessage },
  ];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://luckfix.netlify.app',
      'X-Title': 'Luckfixer 2.0',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free', // free tier on OpenRouter
      messages,
      temperature: 0.4,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  let text = data.choices[0].message.content.trim();

  if (jsonMode) {
    // Strip markdown fences if present
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return { content: JSON.parse(text), model: 'openrouter/llama-3.3-70b-free', raw: text };
  }
  return { content: text, model: 'openrouter/llama-3.3-70b-free', raw: text };
}

// ── 3. Groq Llama 3 70B (~30 RPM free, 300+ tok/sec) ─────────
async function callGroq(systemPrompt, userMessage, jsonMode = true) {
  const Groq = (await import('groq-sdk')).default;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: jsonMode
          ? userMessage + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks.'
          : userMessage },
    ],
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    temperature: 0.4,
    max_tokens: 1500,
  });
  let text = completion.choices[0].message.content.trim();
  if (jsonMode) {
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return { content: JSON.parse(text), model: 'groq/llama-3.3-70b', raw: text };
  }
  return { content: text, model: 'groq/llama-3.3-70b', raw: text };
}

// ── Master Fallback Orchestrator (Kundli Analysis — JSON mode) ──
export async function getLuckfixerResponse(systemPrompt, userMessage, jsonMode = true) {
  const errors = [];

  // Priority 1: Gemini
  try {
    const res = await callGemini(systemPrompt, userMessage, jsonMode);
    console.log('[AI] Gemini ✓');
    return { ...res, fallback_used: false };
  } catch (e) {
    console.warn('[AI] Gemini ✗:', e.message);
    errors.push({ model: 'gemini', error: e.message });
  }

  // Priority 2: OpenRouter
  try {
    const res = await callOpenRouter(systemPrompt, userMessage, jsonMode);
    console.log('[AI] OpenRouter ✓');
    return { ...res, fallback_used: true };
  } catch (e) {
    console.warn('[AI] OpenRouter ✗:', e.message);
    errors.push({ model: 'openrouter', error: e.message });
  }

  // Priority 3: Groq
  try {
    const res = await callGroq(systemPrompt, userMessage, jsonMode);
    console.log('[AI] Groq ✓');
    return { ...res, fallback_used: true };
  } catch (e) {
    console.warn('[AI] Groq ✗:', e.message);
    errors.push({ model: 'groq', error: e.message });
  }

  // Graceful degrade — never crash
  console.error('[AI] All engines exhausted:', errors);
  return {
    content: {
      metric_score: 50,
      intensity: 'MODERATE',
      analytical_insight: 'सभी AI इंजन अभी व्यस्त हैं। कृपया 2-3 मिनट बाद पुनः प्रयास करें।',
      vedic_analysis: { lagna_summary: '', strongest_planet: '', weakest_planet: '', dasha_hint: '' },
      lal_kitab_analysis: { key_observation: '', remedy: 'गायत्री मंत्र का शांत मन से जाप करें', timing: 'प्रातःकाल', chapter_reference: '' },
      nadi_analysis: { karmic_theme: '', life_area_focus: '', nadi_remedy: '' },
      hora_analysis: { ruling_planet_today: '', best_activity_now: '', avoid_now: '' },
      actionable_seva_remedy: { target_action: 'शांत मन से ध्यान करें', target_location_type: 'घर में', karmic_logic: 'System retry active.', shastric_reference: 'System fallback' },
      hora_guidance: 'कुछ क्षण शांत होकर बैठें।',
      key_yoga: '', dominant_planet: '',
    },
    model: 'fallback',
    fallback_used: true,
    errors,
  };
}

// ── Chat Response (multi-turn, plain text) ────────────────────
export async function getChatResponse(systemPrompt, messages) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const history = messages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n');
  const fullPrompt = history ? `${history}\n\nUser: ${lastMessage}` : lastMessage;

  // Priority 1: Gemini
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: systemPrompt });
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();
    if (!text) throw new Error('Empty response from Gemini');
    return { content: text, model: 'gemini-1.5-flash' };
  } catch (e) {
    console.warn('[Chat] Gemini ✗:', e.message);
  }

  // Priority 2: OpenRouter
  try {
    const res = await callOpenRouter(systemPrompt, fullPrompt, false);
    return { content: res.content, model: res.model };
  } catch (e) {
    console.warn('[Chat] OpenRouter ✗:', e.message);
  }

  // Priority 3: Groq
  try {
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const groqMessages = [{ role: 'system', content: systemPrompt }, ...messages];
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      max_tokens: 800,
    });
    const text = completion.choices[0].message.content;
    if (!text) throw new Error('Empty response from Groq');
    return { content: text, model: 'groq/llama-3.3-70b' };
  } catch (e) {
    console.warn('[Chat] Groq ✗:', e.message);
  }

  // Graceful degrade — return a message instead of throwing
  return {
    content: 'माफ़ करें, AI इंजन अभी व्यस्त है। कृपया 2-3 मिनट बाद पुनः प्रयास करें।',
    model: 'fallback',
    fallback_used: true,
  };
}


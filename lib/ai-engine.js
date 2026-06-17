// lib/ai-engine.js
// Multi-Model Fallback Chain: Gemini 2.0 Flash → OpenRouter → Groq → Graceful degrade
//
// Gemini Auth key (AQ. prefix) is supported by the same SDK constructor.
// Model updated to gemini-2.0-flash which works with both standard and auth keys.

// ── Language detection helper ─────────────────────────────────
export function detectLanguage(text) {
  // Check for Devanagari characters (Hindi/Sanskrit)
  const hindiPattern = /[\u0900-\u097F]/;
  if (hindiPattern.test(text)) return 'hi';
  // Check for mixed Hinglish (Hindi words in Roman)
  const hinglishWords = /\b(kya|hai|nahi|aap|mera|meri|hum|yeh|woh|kaisa|kaise|kyun|kab|kahan|kundli|dasha|upay|remedy|graha|nakshatra|rashi)\b/i;
  if (hinglishWords.test(text)) return 'hinglish';
  return 'en';
}

// ── 1. Gemini 2.0 Flash ──────────────────────────────────────
async function callGemini(systemPrompt, userMessage, jsonMode = true) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: jsonMode ? { responseMimeType: 'application/json' } : {},
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  if (!text) throw new Error('Empty response from Gemini');
  return {
    content: jsonMode ? JSON.parse(text) : text,
    model: 'gemini-2.0-flash',
    raw: text,
  };
}

// ── 2. OpenRouter ────────────────────────────────────────────
async function callOpenRouter(systemPrompt, userMessage, jsonMode = true) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: jsonMode
        ? userMessage + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks, no explanation.'
        : userMessage },
  ];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://luckfixer.jaigahoi.in',
      'X-Title': 'Luckfixer 2.0',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages,
      temperature: 0.4,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  let text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from OpenRouter');

  if (jsonMode) {
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return { content: JSON.parse(text), model: 'openrouter/llama-3.3-70b', raw: text };
  }
  return { content: text, model: 'openrouter/llama-3.3-70b', raw: text };
}

// ── 3. Groq ──────────────────────────────────────────────────
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
    max_tokens: 2000,
  });
  let text = completion.choices[0].message.content.trim();
  if (!text) throw new Error('Empty response from Groq');
  if (jsonMode) {
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return { content: JSON.parse(text), model: 'groq/llama-3.3-70b', raw: text };
  }
  return { content: text, model: 'groq/llama-3.3-70b', raw: text };
}

// ── Master Fallback Orchestrator ─────────────────────────────
export async function getLuckfixerResponse(systemPrompt, userMessage, jsonMode = true) {
  const errors = [];

  try {
    const res = await callGemini(systemPrompt, userMessage, jsonMode);
    console.log('[AI] Gemini 2.0 ✓');
    return { ...res, fallback_used: false };
  } catch (e) {
    console.warn('[AI] Gemini ✗:', e.message);
    errors.push({ model: 'gemini', error: e.message });
  }

  try {
    const res = await callOpenRouter(systemPrompt, userMessage, jsonMode);
    console.log('[AI] OpenRouter ✓');
    return { ...res, fallback_used: true };
  } catch (e) {
    console.warn('[AI] OpenRouter ✗:', e.message);
    errors.push({ model: 'openrouter', error: e.message });
  }

  try {
    const res = await callGroq(systemPrompt, userMessage, jsonMode);
    console.log('[AI] Groq ✓');
    return { ...res, fallback_used: true };
  } catch (e) {
    console.warn('[AI] Groq ✗:', e.message);
    errors.push({ model: 'groq', error: e.message });
  }

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
      numerology_analysis: { life_path_summary: '', dominant_number: '', expression_insight: '', missing_numbers_warning: '', numerology_remedy: '' },
      remedies: { vedic: { mantra: '', gem: '' }, lal_kitab: { action: '', timing: '', reference: '' }, nadi_karma: { seva: '', duration: '' }, numerology: { action: '', lucky_numbers: '' }, color_day_direction: { color: '', day: '', direction: '' } },
      actionable_seva_remedy: { target_action: 'शांत मन से ध्यान करें', target_location_type: 'घर में', karmic_logic: '', shastric_reference: '' },
      hora_guidance: '', key_yoga: '', dominant_planet: '',
    },
    model: 'fallback',
    fallback_used: true,
    errors,
  };
}

// ── Chat Response ─────────────────────────────────────────────
export async function getChatResponse(systemPrompt, messages) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const history = messages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n');
  const fullPrompt = history ? `${history}\n\nUser: ${lastMessage}` : lastMessage;

  // Detect language and append instruction
  const lang = detectLanguage(lastMessage);
  const langInstruction = lang === 'en'
    ? '\n\n[LANGUAGE: Respond in English]'
    : lang === 'hinglish'
    ? '\n\n[LANGUAGE: Respond in natural Hinglish — mix of Hindi and English as appropriate]'
    : '\n\n[LANGUAGE: Respond in Hindi (Devanagari)]';

  const promptWithLang = fullPrompt + langInstruction;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: systemPrompt });
    const result = await model.generateContent(promptWithLang);
    const text = result.response.text();
    if (!text) throw new Error('Empty response');
    console.log('[Chat] Gemini 2.0 ✓');
    return { content: text, model: 'gemini-2.0-flash' };
  } catch (e) {
    console.warn('[Chat] Gemini ✗:', e.message);
  }

  try {
    const res = await callOpenRouter(systemPrompt, promptWithLang, false);
    console.log('[Chat] OpenRouter ✓');
    return { content: res.content, model: res.model };
  } catch (e) {
    console.warn('[Chat] OpenRouter ✗:', e.message);
  }

  try {
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const groqMessages = [{ role: 'system', content: systemPrompt }, ...messages, { role: 'user', content: langInstruction }];
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      max_tokens: 1000,
    });
    const text = completion.choices[0].message.content;
    if (!text) throw new Error('Empty response');
    console.log('[Chat] Groq ✓');
    return { content: text, model: 'groq/llama-3.3-70b' };
  } catch (e) {
    console.warn('[Chat] Groq ✗:', e.message);
  }

  return {
    content: 'माफ़ करें, AI इंजन अभी व्यस्त है। कृपया 2-3 मिनट बाद पुनः प्रयास करें।',
    model: 'fallback',
    fallback_used: true,
  };
}

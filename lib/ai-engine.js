// lib/ai-engine.js
// Multi-Model Fallback Chain:
// 1. Gemini 2.0 Flash Lite (Google)
// 2. SambaNova (Meta-Llama-3.3-70B — very fast, generous limits)
// 3. OpenRouter (multiple free models)
// 4. HuggingFace (open-weight models)
// 5. Groq (llama-3.3-70b — fallback)
// 6. Graceful degrade (Hindi fallback message)

// ── Language detection ────────────────────────────────────────
export function detectLanguage(text) {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/\b(kya|hai|nahi|aap|mera|meri|hum|yeh|woh|kaisa|kaise|kyun|kab|kahan|kundli|dasha|upay|graha|nakshatra|rashi|bhai|bol|kar|de|le|jo|ko|se|pe|par)\b/i.test(text)) return 'hinglish';
  return 'en';
}

// ── 1. Gemini 2.0 Flash Lite ─────────────────────────────────
async function callGemini(systemPrompt, userMessage, jsonMode = true) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: jsonMode ? { responseMimeType: 'application/json' } : {},
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  if (!text) throw new Error('Empty response from Gemini');
  return {
    content: jsonMode ? JSON.parse(text) : text,
    model: 'gemini-2.0-flash-lite',
  };
}

// ── 2. SambaNova (OpenAI-compatible, very fast) ───────────────
async function callSambaNova(systemPrompt, userMessage, jsonMode = true) {
  const keys = [
    process.env.SAMBANOVA_API_KEY_1,
    process.env.SAMBANOVA_API_KEY_2,
  ].filter(Boolean);
  if (keys.length === 0) throw new Error('No SambaNova keys configured');

  // Try both keys, use whichever works
  let lastError;
  for (const key of keys) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: jsonMode
            ? userMessage + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks.'
            : userMessage },
      ];

      const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'Meta-Llama-3.3-70B-Instruct',
          messages,
          temperature: 0.4,
          max_tokens: 2000,
          stream: false,
        }),
      });

      if (res.status === 429) { lastError = 'SambaNova rate limited'; continue; }
      if (!res.ok) { lastError = `SambaNova ${res.status}`; continue; }

      const data = await res.json();
      let text = data.choices?.[0]?.message?.content?.trim();
      if (!text) { lastError = 'Empty SambaNova response'; continue; }

      if (jsonMode) {
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        return { content: JSON.parse(text), model: 'sambanova/llama-3.3-70b' };
      }
      return { content: text, model: 'sambanova/llama-3.3-70b' };
    } catch (e) {
      lastError = e.message;
    }
  }
  throw new Error('SambaNova failed: ' + lastError);
}

// ── 3. OpenRouter (multiple free models) ─────────────────────
async function callOpenRouter(systemPrompt, userMessage, jsonMode = true) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');

  const models = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen-2.5-72b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'google/gemma-2-9b-it:free',
  ];

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: jsonMode
        ? userMessage + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks.'
        : userMessage },
  ];

  let lastError;
  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://luckfixer.jaigahoi.in',
          'X-Title': 'Luckfixer 2.0',
        },
        body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 2000 }),
      });

      if (res.status === 429) { lastError = `${model} rate-limited`; continue; }
      if (!res.ok) { lastError = `${model} error ${res.status}`; continue; }

      const data = await res.json();
      let text = data.choices?.[0]?.message?.content?.trim();
      if (!text) { lastError = `Empty from ${model}`; continue; }

      if (jsonMode) {
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        return { content: JSON.parse(text), model: `openrouter/${model.split('/')[1]?.split(':')[0]}` };
      }
      return { content: text, model: `openrouter/${model.split('/')[1]?.split(':')[0]}` };
    } catch (e) {
      lastError = e.message;
    }
  }
  throw new Error('All OpenRouter models failed: ' + lastError);
}

// ── 4. HuggingFace Router ────────────────────────────────────
async function callHuggingFace(systemPrompt, userMessage, jsonMode = true) {
  if (!process.env.HF_TOKEN) throw new Error('HF_TOKEN not set');

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: jsonMode
        ? userMessage + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks.'
        : userMessage },
  ];

  const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HF_TOKEN}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.1-8B-Instruct',
      messages,
      temperature: 0.4,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HuggingFace error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  let text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty HuggingFace response');

  if (jsonMode) {
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return { content: JSON.parse(text), model: 'huggingface/llama-3.1-8b' };
  }
  return { content: text, model: 'huggingface/llama-3.1-8b' };
}

// ── 5. Groq ──────────────────────────────────────────────────
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
  if (!text) throw new Error('Empty Groq response');
  if (jsonMode) {
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return { content: JSON.parse(text), model: 'groq/llama-3.3-70b' };
  }
  return { content: text, model: 'groq/llama-3.3-70b' };
}

// ── Master Fallback Orchestrator (JSON mode — kundli analysis) ─
export async function getLuckfixerResponse(systemPrompt, userMessage, jsonMode = true) {
  const errors = [];

  const providers = [
    { name: 'Gemini', fn: () => callGemini(systemPrompt, userMessage, jsonMode) },
    { name: 'SambaNova', fn: () => callSambaNova(systemPrompt, userMessage, jsonMode) },
    { name: 'OpenRouter', fn: () => callOpenRouter(systemPrompt, userMessage, jsonMode) },
    { name: 'HuggingFace', fn: () => callHuggingFace(systemPrompt, userMessage, jsonMode) },
    { name: 'Groq', fn: () => callGroq(systemPrompt, userMessage, jsonMode) },
  ];

  for (const { name, fn } of providers) {
    try {
      const res = await fn();
      console.log(`[AI] ${name} ✓ (${res.model})`);
      return { ...res, fallback_used: name !== 'Gemini' };
    } catch (e) {
      console.warn(`[AI] ${name} ✗:`, e.message);
      errors.push({ model: name, error: e.message });
    }
  }

  console.error('[AI] All providers exhausted:', errors);
  return {
    content: {
      metric_score: 50, intensity: 'MODERATE',
      analytical_insight: 'सभी AI इंजन अभी व्यस्त हैं। कृपया 2-3 मिनट बाद पुनः प्रयास करें।',
      vedic_analysis: { lagna_summary:'', strongest_planet:'', weakest_planet:'', dasha_hint:'' },
      lal_kitab_analysis: { key_observation:'', remedy:'गायत्री मंत्र का जाप करें', timing:'प्रातःकाल', chapter_reference:'' },
      karmic_analysis: { karmic_theme:'', life_area_focus:'', karmic_remedy:'' },
      hora_analysis: { ruling_planet_today:'', best_activity_now:'', avoid_now:'' },
      numerology_analysis: { life_path_summary:'', dominant_number:'', expression_insight:'', missing_numbers_warning:'', numerology_remedy:'' },
      remedies: { vedic:{mantra:'',gem:''}, lal_kitab:{action:'',timing:'',reference:''}, karmic_seva:{seva:'',duration:''}, numerology:{action:'',lucky_numbers:''}, color_day_direction:{color:'',day:'',direction:''} },
      actionable_seva_remedy: { target_action:'शांत मन से ध्यान करें', target_location_type:'घर में', karmic_logic:'', shastric_reference:'' },
      hora_guidance:'', key_yoga:'', dominant_planet:'',
    },
    model: 'fallback', fallback_used: true, errors,
  };
}

// ── Chat Response (text mode) ────────────────────────────────
export async function getChatResponse(systemPrompt, messages, langPref = 'auto') {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const history = messages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n');
  const fullPrompt = history ? `${history}\n\nUser: ${lastMessage}` : lastMessage;

  // Language instruction
  const lang = langPref !== 'auto' ? langPref : detectLanguage(lastMessage);
  const langHint = lang === 'en'
    ? '\n[Respond in English]'
    : lang === 'hi'
    ? '\n[हिंदी में जवाब दें]'
    : '\n[Hinglish mein jawab dein — natural Hindi-English mix]';

  const prompt = fullPrompt + langHint;

  const chatProviders = [
    { name: 'Gemini', fn: async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite', systemInstruction: systemPrompt });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text) throw new Error('Empty response');
      return { content: text, model: 'gemini-2.0-flash-lite' };
    }},
    { name: 'SambaNova', fn: () => callSambaNova(systemPrompt, prompt, false) },
    { name: 'OpenRouter', fn: () => callOpenRouter(systemPrompt, prompt, false) },
    { name: 'HuggingFace', fn: () => callHuggingFace(systemPrompt, prompt, false) },
    { name: 'Groq', fn: () => callGroq(systemPrompt, prompt, false) },
  ];

  for (const { name, fn } of chatProviders) {
    try {
      const res = await fn();
      console.log(`[Chat] ${name} ✓`);
      return res;
    } catch (e) {
      console.warn(`[Chat] ${name} ✗:`, e.message);
    }
  }

  return {
    content: lang === 'en'
      ? 'Sorry, all AI engines are temporarily busy. Please try again in 2-3 minutes.'
      : 'माफ़ करें, AI इंजन अभी व्यस्त है। कृपया 2-3 मिनट बाद पुनः प्रयास करें।',
    model: 'fallback',
    fallback_used: true,
  };
}

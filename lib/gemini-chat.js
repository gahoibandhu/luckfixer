// lib/gemini-chat.js — one chat reply from Gemini, with the retry / fallback-model rules that used to live inside ai-engine.js.
//
// Why this exists: the fallback model was 'gemini-2.5-flash'. Google now serves the 2.5 models only to keys that already used them,
// so for this project it answers 404 "no longer available to new users". The old code then (a) paid a wasted round trip on every
// overloaded request, and (b) reported THAT 404 as the reason Gemini failed, hiding the real error of the primary model (the Chat Audit
// showed only the 404). Now:
//   • a model that answers 404 / "no longer available" is remembered as gone for 30 minutes and not asked again;
//   • if the fallback model fails for a reason of its own, the error that is reported is the primary's (the real cause);
//   • the fallback model is OFF unless GEMINI_FALLBACK_MODEL is set to an id your key can use.

const GONE_FOR_MS = 30 * 60 * 1000;
const goneUntil = new Map();                                    // model id -> timestamp until which we don't ask for it

export const isTransientGemini = (e) => {
  const m = String(e?.message || e || '');
  return e?.status === 503 || e?.status === 429 || /"code":\s*(503|429)|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand|try again later/i.test(m);
};
export const isGoneGemini = (e) => e?.status === 404 || /"code":\s*404|no longer available|NOT_FOUND/i.test(String(e?.message || e || ''));
const isGone = (model) => (goneUntil.get(model) || 0) > Date.now();
export function _resetGeminiGone() { goneUntil.clear(); }       // tests only

/** One chat reply: primary model, one quick retry of it, then the fallback model — only for transient overload errors. */
export async function geminiChatReply(systemPrompt, prompt, signal, { model, fallbackModel = '' }) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = [model, model, fallbackModel].filter(Boolean);
  let firstErr, lastErr, tried = 0;
  for (let i = 0; i < models.length; i++) {
    if (signal?.aborted) break;
    if (isGone(models[i])) continue;                            // known to be retired: don't spend a request on it
    tried++;
    try {
      const response = await ai.models.generateContent({
        model: models[i],
        contents: prompt,
        config: { systemInstruction: systemPrompt, thinkingConfig: { thinkingLevel: 'low' }, ...(signal ? { abortSignal: signal } : {}) },
      });
      const text = response.text;
      if (!text) throw new Error('Empty response');
      if (i > 0) console.log(`[Chat] Gemini answered on attempt ${i + 1} (${models[i]}) after a transient error: ${String(firstErr?.message || lastErr?.message).slice(0, 80)}`);
      return { content: text, model: `gemini/${models[i]}` };
    } catch (e) {
      lastErr = e;
      if (isGoneGemini(e)) { goneUntil.set(models[i], Date.now() + GONE_FOR_MS); console.warn(`[Chat] Gemini model "${models[i]}" is not available for this key — not asking for it for 30 min (${String(e.message).slice(0, 120)})`); }
      if (!isTransientGemini(e)) {
        // bad key / bad request / retired model: a retry would fail the same way. If the PRIMARY already failed with a transient error,
        // that is the real story — report it instead of the fallback model's own failure.
        if (firstErr && models[i] !== model) throw firstErr;
        throw e;
      }
      if (!firstErr) firstErr = e;
      if (i === 0) await new Promise(r => setTimeout(r, 900));  // brief pause, then the same model once more
    }
  }
  if (tried === 0 && !signal?.aborted) throw new Error(`Gemini: no usable model — "${model}" is not available for this key. Set GEMINI_MODEL to a current model id.`);
  throw firstErr || lastErr || new Error('Gemini: aborted');
}

# Chat replies: "User Safety: safe" bug + Gemini 503 (overlay on astrobharat-incident-fix.zip; only lib/ai-engine.js changes)

Found in your chat transcript, reproduced on the previous code with mock providers (same text, same model label):
 1 "assistant . openrouter/nemotron-3.5-content-safety -> User Safety: safe"  (twice)
   OpenRouter's "openrouter/free" is an auto-router: it can land on ANY free model, including NVIDIA's content-safety classifier, which only
   outputs labels. It answers in ~0.2s, so it won the race against Gemini whenever Gemini was slow or returned an error.
   Fix: models whose id contains safety/guard/moderat/shield/reward/embed/rerank/classif are rejected (OpenRouter re-rolls once more), and EVERY
   provider's reply passes assertUsableChatReply(): classifier labels ("User Safety: ...") and replies shorter than 12 chars are treated as a failure,
   so the chain carries on to the next provider.
 2 The one real fallback message: Gemini answered 503 "high demand". The CHAT path had no retry (only the analysis path, callGemini, had one).
   Fix: Gemini chat now retries the same model once after 0.9s, then tries a second model (GEMINI_FALLBACK_MODEL, default gemini-2.5-flash; set it to
   another id, or to an empty value to disable). Only for transient errors (503/429/UNAVAILABLE/overloaded); bad key / bad request fail at once.
   (This also explains bug 1: a Gemini 503 left the classifier as the only fast answer.)
Mock results: 503 once -> answered by retry in 1.6s; 503 twice -> answered by the fallback model in 0.9s; Gemini slow + classifier text -> classifier rejected,
Gemini's answer used; all Gemini models busy -> friendly busy message. Old code: replied "User Safety: safe" in the first two cases.

Observation: replies came from gemini/gemini-3.1-flash-lite (the code default). If you meant gemini-3.7-flash, set GEMINI_MODEL in Vercel.
No SQL, no npm install. Old messages that already say "User Safety: safe" stay in chat history (harmless; the user just re-asked).

# Chat rules, round 2 (overlay on astrobharat-chat-prompt-rules.zip) - files: app/api/chat/route.js, lib/ai-engine.js, app/chat/page.jsx

All rules are added to the system prompt, just before "NATAL vs TRANSIT". Base prompt now ~5.8k tokens (was ~4.6k originally; +1.2k for all rules).

1 SCRIPT: portal language drives the reply script.  Auto + Hindi portal -> Devanagari for EVERYTHING (planet/sign/house/month names, dates).
  An explicit "Hinglish" pick -> Roman only (planet names transliterated). English portal + Auto -> mirrors the user (Roman Hinglish stays Roman).
  The chat page now sends uiLang; route.js maps Auto+Hindi to "hi". To go back to the old Auto (mirror whatever the user typed) set
  PORTAL_LANG_DRIVES_AUTO = false in app/api/chat/route.js. The end-of-prompt hint in ai-engine.js now names the script as well.
  CONSEQUENCE: a user on the default Auto setting who types Roman Hinglish now gets Devanagari replies; they can pick "Hinglish" in the language menu.
2 SCORE questions: explained only from the Supporting/Opposing factor lists + confidence in context; no invented weights/formula.
3 RELATIONSHIP (affair, girlfriend, breakup...): astrological only, no moralizing; timing only from computed windows; tendency language.
4 NO MORAL LECTURES / NO DEFENDING ASTROLOGY: out-of-scope items get ONE neutral sentence, then straight to the astrological aspects;
  on money/property/investment, health, legal, relationship topics ONE short neutral disclaimer sentence at the very END (not repeated on follow-ups).
5 DIRECTION & CITY: dik technique with a fixed table (rashi and planet directions), reference = where the user lives now (asks if unknown), says "approximately".
  Fixes the transcript where the bot denied the technique and then said "Shukra = West" (Shukra is South-East; West is Shani).
6 PROPERTY: 4th house/lord/Mars/Saturn/Venus + dasha/transits as indications about the MATTER (ease/delay/expenses/relocation) and direction;
  still forbidden: profit, loss, appreciation, price, "good investment", "buy/sell now". The market hard rule is unchanged except the refusal is one neutral sentence.

NOT tested against the live model (no Gemini access here). Test with the transcript: "indore meri rashi ko suit karega, aur kya ye time investment ke liye favorable hai"
and "bhai i am not asking moral gyan ... favorable direction". Expect: asks/uses current city, names the direction from the table, no lecture, one disclaimer at the end.

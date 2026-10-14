# Two approved chat-prompt rules (overlay on astrobharat-chat-reply-fix.zip; only app/api/chat/route.js changes)

Added to LUCKFIXER_SYSTEM_PROMPT, right after "NEVER GUESS ALREADY-LIVED REAL-WORLD FACTS":
 1 HOW A SCORE WAS CALCULATED - explain only from the "Supporting factors" / "Opposing factors" lists and the confidence figure that come with the score
   in the context; say the app's software computes it from those planetary factors; never invent weights, per-factor percentages, steps or a formula;
   if the lists are not in the context, say the breakdown is not visible and offer to explain the planets/houses instead.
 2 RELATIONSHIP QUESTIONS BEYOND MARRIAGE (affair, girlfriend, breakup, patch-up, "kitne din chalega") - astrological angle ONLY, no moral judgment or lecture
   (no "partner ko sach batao" unless asked). Use 7th house/lord, Venus, Mars, Rahu, 5th/12th, upapada + running dasha and transits; timing only as date
   windows from the computed data in context; tendencies/indications only - never "the planet forces/excuses", never another person's feelings as fact.
Not applied (not approved yet): the "reply in the user's script" rule.
Cost: base prompt ~4.6k -> ~5.1k tokens (+500).
NOT tested against the live model (no Gemini access here). After deploy ask the chat: "career potential 70 kaise calculate kiya" and
"affair kitna din chalega, girlfriend kab maanegi" and read the answers.

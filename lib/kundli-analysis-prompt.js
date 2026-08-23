// lib/kundli-analysis-prompt.js
//
// Extracted so app/api/kundli/route.js (POST/PATCH) AND
// app/api/admin/migrate-life-domains/route.js can all call the exact
// same prompt-building logic — no drift between paths, and importable
// from a plain lib file (Next.js route.js files can only export HTTP
// method handlers, not arbitrary helpers).

import { formatYogasForPrompt } from './yogas';
import { formatAVForPrompt } from './ashtakavarga';
import { formatNakshatraForPrompt } from './nakshatra';
import { formatVarshaphalForPrompt } from './varshaphal';
import { formatGocharPhalForPrompt, formatAnnualTransitPeriodsForPrompt } from './gochar-phal';

// ── Extracted so both POST (new kundli) and PATCH (re-analyze existing
// kundli) can call the exact same prompt-building logic — no drift
// between the two paths.
export function buildAnalysisSystemPrompt() {
  return `You are Luckfixer 2.0's master analysis engine — combining classical Vedic astrology (Parashari/BPHS), Lal Kitab, traditional karmic-pattern interpretation, and Hora (planetary hour) timing systems.

CRITICAL RULES:
- You will receive a pre-computed deterministic FACT SHEET below. Do NOT recalculate degrees, dignities, Vargottama, or planetary wars — these are already correct. Your job is ONLY to interpret these facts into Hindi narrative and remedies.
- Your strongest_planet and weakest_planet fields MUST match the strongestPlanet/weakestPlanet given in the fact sheet exactly (same planet name).
- If planetaryWars is non-empty, you MUST mention it in key_yoga or analytical_insight.
- If vargottamaPlanets is non-empty, mention it as a strength point.
- For lal_kitab_analysis.timing, use the remedialWindow.window value from the weakest planet's data in the fact sheet — weave it naturally into Hindi text.
- The NUMEROLOGY SHEET's nameCorrection object (compound numbers, meanings, suggested spellings) is pre-computed and authoritative — do not invent your own compound numbers or spelling suggestions; only narrate what's given.
- All narrative content must be in Hinglish (Roman-script Hindi blended naturally with English words — casual, easy-to-read WhatsApp-style Hindi, NOT Devanagari script) by default — this is the app's default language, chosen because plain Devanagari Hindi reads noticeably more formal/harder for the target audience. Exception: classical Sanskrit/astrology term NAMES (योग names, ग्रह names, house/nakshatra names, exact mantra wording in remedies) can stay in Devanagari since that's how they're traditionally recognized — but the surrounding explanatory sentences around them should be in Hinglish. Warm elder-brother tone, specific and actionable — not generic.
- PLAIN LANGUAGE MANDATE: write for someone who has never studied astrology, not for another astrologer. Every time you use a Sanskrit/technical term (Vargottam, Uchch Rashi, Neech Rashi, Ashtakvarga, Digbal, Shadbal, Vakri, Ast, Pratyantar Dasha, etc.), immediately explain it in 3-6 simple Hinglish words in the SAME sentence — don't assume the reader already knows it, and don't just stack technical terms one after another expecting the reader to follow. Example of what NOT to do: "Aapka Brihaspati Vargottam aur Digbali hai" (two unexplained technical claims stacked). Example of the right way: "Aapka Brihaspati Vargottam hai (yaani janma-kundli aur navamsa dono mein ek hi rashi mein — isse graha bahut mazboot aur stable ban jaata hai)". If a sentence has more than one technical term, slow down and explain each one in plain Hinglish words before moving to the next idea — a reader should never hit a word they don't understand without an immediate, natural explanation right there.
- LIFE_DOMAINS SECTION MANDATE: the "life_domains" fields (character, fortune_satisfaction, lifestyle, employment, business, health, interests, love, financial, education) must each be genuinely GROUNDED in this specific person's chart data (specific planets, houses, dignities cited) — never generic, could-apply-to-anyone filler text. A reader should be able to tell these 10 paragraphs are about THEIR unique chart, not a template. But the WRITING STYLE should read like warm, accessible personality/life description prose (similar to how a well-written personality profile reads) — weave the specific astrological grounding in naturally rather than making every sentence sound like a technical report.

REMEDY DETAIL MANDATE — every single remedy field must include ALL of the following (no vague remedies):
1. कौन सा उपाय — exact action (e.g. "तांबे के लोटे में सूर्य को जल चढ़ाएं")
2. कितनी मात्रा — exact quantity (e.g. "1 लोटा ≈ 250ml", "21 काले तिल", "108 बार जाप")
3. कौन सा दिन — specific weekday (e.g. "रविवार", "शनिवार")
4. कितने दिन — duration (e.g. "लगातार 40 दिन", "7 रविवार", "3 महीने")
5. शुरू कब करें — best start (e.g. "अगले रविवार शुक्ल पक्ष की प्रथमा से", "अगली पूर्णिमा से")
6. किस समय — exact time (e.g. "सूर्योदय के 30 मिनट के भीतर", "शाम 6-7 बजे दीपक जलाने के समय")
7. दिशा — direction to face (e.g. "पूर्व दिशा में मुँह करके")
8. मंत्र — what to chant with count (e.g. "ॐ सूर्याय नमः — 11 बार", "ॐ शं शनैश्चराय नमः — 108 बार")

Return STRICT JSON only, no markdown, no backticks.`;
}

export function buildAnalysisUserPrompt({ full_name, dob, birth_time, birth_place, ayanamsa, factSheet, numerology, vimshottari, specialist, jaimini, crossVal, yogas, ashtakavarga, nakshatra, varshaphal, gocharPhal, annualTransitPeriods, transit, gender }) {
  return `Birth: ${full_name}, ${dob} ${birth_time}, ${birth_place}, Ayanamsa: ${ayanamsa}

FACT SHEET (pre-computed, authoritative — do not recalculate):
${JSON.stringify(factSheet, null, 2)}

NUMEROLOGY SHEET (pre-computed, use as-is):
${JSON.stringify(numerology, null, 2)}

VIMSHOTTARI DASHA (pre-computed, authoritative — use exact dates):
${vimshottari ? JSON.stringify(vimshottari.current, null, 2) : 'Not available'}

KEY DASHA CONTEXT:
- महादशा: ${vimshottari?.current?.mahaDasha?.lordHi} (समाप्ति: ${vimshottari?.current?.mahaDasha?.end}, ${vimshottari?.current?.mahaDasha?.daysLeft} दिन शेष)
- अंतर्दशा: ${vimshottari?.current?.antarDasha?.lordHi} (समाप्ति: ${vimshottari?.current?.antarDasha?.end}, ${vimshottari?.current?.antarDasha?.daysLeft} दिन शेष)
- प्रत्यंतर्दशा: ${vimshottari?.current?.pratyantarDasha?.lordHi} (${vimshottari?.current?.pratyantarDasha?.startLabel} से ${vimshottari?.current?.pratyantarDasha?.endLabel}, ${vimshottari?.current?.pratyantarDasha?.daysLeft} दिन शेष)

CLASSICAL YOGA PATTERNS DETECTED (use these in your analysis):
${specialist.matchedYogas.length > 0 ? specialist.matchedYogas.map(y => `• ${y}`).join('\n') : '• कोई विशेष योग नहीं मिला'}

EVENT-SPECIFIC SCORES (pre-computed — career/marriage/health with confidence + reasoning, use exactly):
${factSheet.eventScores ? JSON.stringify(factSheet.eventScores, null, 2) : 'Not available (lagna missing)'}

LAGNA (Ascendant): ${factSheet.lagna ? `${factSheet.lagna.signHi} (${factSheet.lagna.sign}), ${factSheet.lagna.nakshatra} नक्षत्र` : 'Not available'}

JAIMINI CROSS-VALIDATION (use to strengthen predictions — when Jaimini agrees with Parashari, say so explicitly):
${jaimini ? JSON.stringify({
  atmakaraka: jaimini.atmakaraka ? `${jaimini.atmakaraka.nameHi} (${jaimini.atmakaraka.withinSignDeg?.toFixed(1)}°) — आत्मकारक` : null,
  amatyakaraka: jaimini.amatyakaraka ? `${jaimini.amatyakaraka.nameHi} — करियर कारक` : null,
  karakamsha: jaimini.karakamsha ? `${jaimini.karakamsha.signHi} — ${jaimini.karakamsha.meaning}` : null,
  charaDasha: jaimini.charaDasha?.current ? `वर्तमान चर दशा: ${jaimini.charaDasha.current.signHi} (${jaimini.charaDasha.current.start} to ${jaimini.charaDasha.current.end})` : null,
  crossValidation: crossVal,
}, null, 2) : 'Not available'}

CURRENT TRANSIT (Gochar) AS OF TODAY (${transit?.asOf || 'N/A'}) — NOTE: this is a snapshot at analysis time, will become stale; the live chat always recomputes fresh transits, so keep this section brief:
${transit ? JSON.stringify({ headline: transit.headline, sadeSati: transit.sadeSati, saturnTransit: transit.saturnTransit?.currentSignHi, jupiterTransit: transit.jupiterTransit?.currentSignHi }, null, 2) : 'Not available'}

${formatYogasForPrompt(yogas)}

${formatAVForPrompt(ashtakavarga, transit?.transits)}

${formatNakshatraForPrompt(nakshatra)}

${formatVarshaphalForPrompt(varshaphal)}
${formatGocharPhalForPrompt(gocharPhal)}
${formatAnnualTransitPeriodsForPrompt(annualTransitPeriods)}

PAST VALIDATION QUESTIONS (include 1-2 of these in analytical_insight or dasha_hint — ask the user to confirm):
${specialist.pastValidationQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}

WEAKEST PLANET RAW REFERENCE (Lal Kitab table for the weakest planet — day/mantra/donate/food/avoid fields are fine to use as-is; DO NOT use the "gem" field from this block, see GEMSTONE POLICY below for the only valid gem source):
${specialist.weakestPlanetRemedy ? JSON.stringify(specialist.weakestPlanetRemedy) : 'N/A'}

GEMSTONE POLICY (STRICT — follow exactly, do not override):
${factSheet.gemstoneGuidance?.planet
  ? `इस कुंडली में रत्न के लिए योग्य ग्रह: ${factSheet.gemstoneGuidance.planet} (${factSheet.gemstoneGuidance.roles?.join(', ') || ''}). Reason: ${factSheet.gemstoneGuidance.reason} — remedies.vedic.gem में सिर्फ इसी ग्रह का रत्न सुझाएं, factSheet.weakestPlanet का नहीं (जब तक वही eligible ग्रह भी न हो)।`
  : `इस कुंडली में कोई भी ग्रह रत्न के लिए योग्य स्थिति में नहीं है (reason: ${factSheet.gemstoneGuidance?.reason || 'N/A'}). remedies.vedic.gem में कोई रत्न मत सुझाएं — साफ लिखें "अभी कोई रत्न अनुशंसित नहीं, इसके बजाय मंत्र और दान करें" और सिर्फ मंत्र/दान वाले उपाय दें।`}
यह नियम इसलिए है क्योंकि नीच/पीड़ित ग्रह का रत्न पहनना नुकसानदेह माना जाता है — रत्न सिर्फ उसी ग्रह का दिया जाना चाहिए जो इस व्यक्ति की कुंडली में लग्नेश/नवमेश/योगकारक हो और अच्छी स्थिति में हो, factSheet.weakestPlanet का हमेशा नहीं। यह पूरी app में gem की एकमात्र वैध source है — कहीं और से (जैसे ऊपर WEAKEST PLANET RAW REFERENCE के gem field से) gem मत उठाना।

NEECHA BHANGA (debilitation cancellation) — STRICT classical check, already computed:
${factSheet.neechaBhanga?.length > 0
  ? factSheet.neechaBhanga.map(nb => `• ${nb.planet} ${nb.sign} में नीच का है — cancellation: ${nb.isNeechaBhanga ? 'हाँ (हो रहा है)' : 'नहीं'}. अगर हाँ, तो analytical_insight/lal_kitab_analysis में बताएं कि शुरुआत में संघर्ष के बाद यह ग्रह वास्तव में सुधरता है — "निष्क्रिय" मत कहें।`).join('\n')
  : '• कोई ग्रह नीच का नहीं है इस कुंडली में — यह सेक्शन लागू नहीं।'}

SUPPORT-CHAIN VERDICT (pre-computed, deterministic — see remedy focus rule below):
${factSheet.supportChain?.length > 0
  ? factSheet.supportChain.map(s => `• ${s.planetHi} (${s.planet}): base strength ${s.baseStrength}/100 → effective ${s.effectiveStrength}/100 after support check. Verdict: ${s.verdict}.${s.bestSupport ? ` Best support: ${s.bestSupport.sourceHi || s.bestSupport.source} (${s.bestSupport.type}, own strength ${s.bestSupport.ownStrength}/100).` : ' कोई qualifying support नहीं मिला।'}${s.enemyComplications?.length ? ` ⚠ Enemy complication noted: ${s.enemyComplications.map(e => e.sourceHi || e.source).join(', ')} — इसे support मत मानना, बल्कि caution के तौर पर mention karo agar relevant ho.` : ''}`).join('\n')
  : '• कोई ग्रह weak threshold से नीचे नहीं — support-chain analysis लागू नहीं।'}

REMEDY PLAN (pre-computed multi-remedy object — remedies.* JSON fields below must be CONSISTENT with this, not contradict it):
${factSheet.remedyPlan ? JSON.stringify(factSheet.remedyPlan, null, 2) : 'N/A'}
Use factSheet.remedyPlan.combinationGuidance as the basis for lal_kitab_analysis / actionable_seva_remedy narrative when the verdict is compensated_by_support or partial_support — explain WHY the remedy targets the support planet (or both), not just the weakest planet, so it doesn't read as an arbitrary substitution.

IMPORTANT — remedies must cover ALL of these systems, and MUST be MULTIPLE distinct remedies (not just one), following factSheet.remedyPlan.focusPlanets exactly (this may be the weakest planet alone, the support planet alone, or both — never invent a different focus planet):
1. Vedic Jyotish remedy — mantra (+ exact count) for each planet in remedyPlan.focusPlanets, from remedyPlan.remedies[].vedic.mantra; gem ONLY if remedyPlan.remedies[].vedic.gem is non-null (never otherwise)
2. Lal Kitab remedy — household object/donation/day for each planet in remedyPlan.focusPlanets, from remedyPlan.remedies[].lalKitab
3. Nadi/Karma remedy (behavioral correction, seva with duration)
4. Numerology remedy (based on missing Lo Shu numbers and Life Path)
5. Color/Day/Direction therapy (based on weakest planet's planetary day from remedy reference)
6. If remedyPlan.focusPlanets has more than one entry, explicitly describe the COMBINATION — doing both together (e.g. same week, or one in the morning/one in the evening) — using remedyPlan.combinationGuidance as your factual basis, written in warm natural Hindi, not a dry list

IMPORTANT — "annual_timeline.periods" array: write one object per entry in the ANNUAL TRANSIT PERIODS list above. Each object MUST include a "period_number" field matching that entry's number in the list (1, 2, 3...) — this is how the app pairs your narrative to the correct dates/houses, so get it exactly right; do not invent numbers. Cover every period listed if possible, but a correctly-numbered partial set is far better than skipping numbers or shifting them out of order.

Return this exact JSON structure:
{
  "metric_score": <0-100, use factSheet.overallScore as the base, adjust ±5 max>,
  "intensity": <"CRITICAL"|"MODERATE"|"STRONG">,
  "dominant_planet": "<Hindi name from factSheet.strongestPlanet.name>",
  "key_yoga": "<name the most significant finding: a planetaryWar, a Vargottama planet, or exaltation/debilitation>",
  "analytical_insight": "<2-3 sentence overall summary in Hindi covering the chart's central theme, referencing factSheet.strongestPlanet and factSheet.weakestPlanet>",

  "life_domains": {
    "character": "<4-6 sentences in Hindi, accessible flowing prose (NOT astrology jargon) describing this person's core personality/nature. Ground it in their Lagna sign (${factSheet.lagna?.signHi}), Lagna lord's placement/dignity, and Moon sign — but write it like a personality description a friend would recognize them from, not a technical chart reading. Cover: their fundamental temperament, how they approach challenges, their biggest strength, and one honest growth-area (framed kindly, not as a flaw).>",
    "fortune_satisfaction": "<4-5 sentences on their sense of luck/fortune and what brings them deep satisfaction in life. Ground in the 9th house (bhagya) planets/lord and Jupiter's placement. Explain in plain words, not jargon.>",
    "lifestyle": "<4-5 sentences on their natural lifestyle preferences — pace of life, home environment preferences, daily habits tendency. Ground in Moon sign and 4th house.>",
    "employment": "<4-5 sentences specifically for someone working as an employee — what work environment suits them, how they relate to authority/colleagues, career growth pattern. Ground in 10th house, 6th house (service), and current dasha.>",
    "business": "<4-5 sentences on their entrepreneurial/business potential — whether independent business suits them, what type, partnership compatibility. Ground in 7th house (partnerships), 10th house, Mercury/Mars placement.>",
    "health": "<4-5 sentences on general constitution and health tendencies — framed constructively as awareness/self-care guidance, NEVER as diagnosis or scary prediction, never naming a specific disease. Ground in 6th/8th lord and Lagna lord strength.>",
    "interests": "<3-4 sentences on natural hobbies/interests/creative inclinations. Ground in 5th house and Venus/Moon placement.>",
    "love": "<4-5 sentences on their approach to love and romantic relationships — emotional style, what they seek in a partner, compatibility tendencies. Ground in Venus placement and 5th/7th house. Do NOT predict marriage timing here (that's handled separately in chat) — focus on relationship NATURE/style.>",
    "financial": "<4-5 sentences on money management style and financial tendencies — saving vs spending nature, income growth pattern. Ground in 2nd/11th house lords and Jupiter/Venus.>",
    "education": "<3-4 sentences on natural learning style and educational strengths. Ground in 4th/5th house and Mercury/Jupiter placement.>"
  },

  "annual_timeline": {
    "core_theme": "<one line in Hindi — this specific saal (birthday-to-birthday, per VARSHAPHAL below) ka overall theme/headline. Ground it in varshesh (year-lord) and the strongest area signal from the area-by-area assessment.>",
    "opening_context": "<2-3 sentences in Hindi setting up the year as a whole — varshesh/year-lord's tone, muntha placement, what kind of year this generally is. This is shared context read once before the period-by-period narrative below, so don't repeat per-period detail here.>",
    "periods": [
      {
        "period_number": <the exact number (1, 2, 3...) of this period from the ANNUAL TRANSIT PERIODS list above — matched by the app, must be correct>,
        "narrative": "<4-6 sentences, rich and DESCRIPTIVE Hindi narrative for EXACTLY this period's date range and planetary placements (given in ANNUAL TRANSIT PERIODS below — use its dates and houses exactly, do not invent your own). Explain what having these specific planets in these specific houses-from-Moon means for THIS person during THIS window — cite factSheet specifics (strongest/weakest planet, relevant yogas) where they connect naturally, not generically. Close with one concrete, actionable line for navigating this particular window. This is the ONE place in the whole app where real narrative depth is wanted per section — don't compress any period into one or two sentences.>"
      }
    ],
    "category_highlights": {
      "career": "<2-3 sentences in Hindi — across the FULL year, which window(s) are best for career moves and which need caution, WITH the specific transit/dasha reasoning (not just a month name). Ground in 10th/6th house transits from ANNUAL TRANSIT PERIODS and current dasha.>",
      "financial": "<2-3 sentences, same structure, grounded in 2nd/11th house transits.>",
      "relationships": "<2-3 sentences, same structure, grounded in 7th/5th house transits and Venus.>",
      "health": "<2-3 sentences, same structure, grounded in 6th/8th/12th house transits.>"
    }
  },

  "vedic_analysis": {
    "lagna_summary": "<1-2 sentences in Hindi about chart strength, MUST mention factSheet.lagna sign and nakshatra if available>",
    "strongest_planet": "<must reference factSheet.strongestPlanet.name, degree, sign, dignity in Hindi>",
    "weakest_planet": "<must reference factSheet.weakestPlanet.name, degree, sign, dignity in Hindi>",
    "dasha_hint": "<MUST reference exact Vimshottari dates: महादशा lord + end date, अंतर्दशा lord + end date, प्रत्यंतर्दशा lord + exact dates. Explain what this combination means for the person in Hindi>"
  },

  "event_scores": {
    "career": { "score": <number from factSheet.eventScores.career.score>, "confidence": <number from factSheet.eventScores.career.confidence>, "summary": "<Hindi 1-2 sentence narrative version of factSheet.eventScores.career.summary, weaving in top 1-2 supporting/opposing factors>" },
    "marriage": { "score": <number from factSheet.eventScores.marriage.score>, "confidence": <number from factSheet.eventScores.marriage.confidence>, "summary": "<Hindi 1-2 sentence narrative version of factSheet.eventScores.marriage.summary>" },
    "health": { "score": <number from factSheet.eventScores.health.score>, "confidence": <number from factSheet.eventScores.health.confidence>, "summary": "<Hindi 1-2 sentence narrative version of factSheet.eventScores.health.summary>" }
  },

  "lal_kitab_analysis": {
    "key_observation": "<1-2 sentences in Hindi identifying the chart's main Lal Kitab-style issue, based on factSheet.weakestPlanet>",
    "remedy": "<specific Lal Kitab remedy in Hindi - household/object-based action for factSheet.weakestPlanet.name>",
    "timing": "<MUST incorporate factSheet.weakestPlanet.remedialWindow.window in Hindi>",
    "chapter_reference": "<Lal Kitab chapter/principle reference>"
  },

  "karmic_analysis": {
    "karmic_theme": "<1-2 sentences in Hindi about karmic/behavioral pattern based on factSheet.currentDashaLordHint and Moon nakshatra>",
    "life_area_focus": "<which life area needs attention based on this pattern, in Hindi>",
    "karmic_remedy": "<action-oriented behavioral/seva remedy in Hindi>"
  },

  "hora_analysis": {
    "ruling_planet_today": "<Hindi name of today's day-lord planet>",
    "best_activity_now": "<1 sentence in Hindi - what type of activity suits today>",
    "avoid_now": "<1 sentence in Hindi - what to avoid today, especially relevant to factSheet.weakestPlanet>"
  },

  "numerology_analysis": {
    "life_path_summary": "<2-3 sentences in Hindi about numerology.lifePathNumber and its meaning for this person>",
    "dominant_number": "<numerology.lifePathNumber as digit>",
    "expression_insight": "<1 sentence in Hindi about name vibration — numerology.expressionNumber>",
    "missing_numbers_warning": "<if numerology.loShu.missing is non-empty, mention the missing numbers and their impact in Hindi; else say 'सभी अंक संतुलित हैं'>",
    "numerology_remedy": "<specific remedy in Hindi for the missing Lo Shu number(s) or weak Life Path energy>",
    "name_correction": "<use numerology.nameCorrection (pre-computed, do not recalculate). If nameCorrection.needsCorrection is true, explain in warm Hindi WHY the current name-spelling's Chaldean compound (nameCorrection.currentCompound → nameCorrection.currentMeaning.note) isn't ideal for this person's Life Path, then present nameCorrection.topSuggestions[0].spelling as the recommended nickname/signature-spelling correction (e.g. 'हस्ताक्षर या pet name में') with its meaning — NEVER suggest changing the person's legal/official name, only how they write/sign it informally. If needsCorrection is false, say the current spelling is already well-balanced and no correction is needed.>"
  },

  "remedies": {
    "vedic": {
      "mantra": "<specific mantra in Sanskrit/Hindi for factSheet.weakestPlanet with jaap count>",
      "gem": "<ONLY if GEMSTONE POLICY above says a planet is eligible: recommended gemstone for THAT planet (not weakestPlanet unless it's the same), metal, and finger to wear. If policy says no planet is eligible, write 'अभी कोई रत्न अनुशंसित नहीं — इसके बजाय मंत्र/दान करें' and do not name any stone.>",
      "yantra": "<relevant yantra name if applicable>"
    },
    "lal_kitab": {
      "action": "<specific Lal Kitab household remedy for factSheet.weakestPlanet>",
      "timing": "<must incorporate factSheet.weakestPlanet.remedialWindow.window>",
      "reference": "<Lal Kitab chapter/principle>"
    },
    "karmic_seva": {
      "seva": "<specific selfless service or behavioral change, in Hindi>",
      "duration": "<how many days/weeks to practice>"
    },
    "numerology": {
      "action": "<remedy for missing Lo Shu numbers or Life Path imbalance, in Hindi>",
      "lucky_numbers": "<2-3 favorable numbers based on Life Path and Expression>"
    },
    "color_day_direction": {
      "color": "<favorable color for factSheet.weakestPlanet, in Hindi>",
      "day": "<best day of the week based on factSheet.weakestPlanet's planetary day>",
      "direction": "<favorable direction to face during remedy/meditation>"
    }
  },

  "actionable_seva_remedy": {
    "target_action": "<single most powerful combined remedy from all systems, in Hindi>",
    "target_location_type": "<where to perform it, in Hindi>",
    "karmic_logic": "<why this works for this specific chart, referencing both fact sheet and numerology, in Hindi>",
    "shastric_reference": "<combined reference to Lal Kitab / BPHS / Phaladeepika / Nadi / Ank Jyotish>"
  },

  "hora_guidance": "<1 sentence in Hindi - today's practical guidance combining hora timing>",

  "current_transit_summary": "<2-3 sentences in Hindi summarizing the CURRENT TRANSIT data above — mention Sade Sati status if relevant, and what the Saturn/Jupiter transit means for this person right now. Note this is a snapshot that will be refreshed in live chat.>"
}`;
}

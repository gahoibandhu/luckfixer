// lib/chat-prompt-trim.js — send the long, topic-specific chat rules only when the conversation is about that topic.
//
// The chat system prompt is ~34,500 characters (~11,500 tokens) on EVERY message. About 6,000 of those are rules and chart data that
// only matter for three topics: investment/market questions, remedies (upay/mantra/gemstone) and "how accurate are you?". For any other
// question they are dead weight — slower and costlier on every provider, and over the 5,500-token limit of the smaller fallback providers.
//
// What this does, and does not do:
//   • When the topic IS in play, the prompt is byte-for-byte what it was before (full rules, full data).
//   • Otherwise each rule is replaced by a 2–4 line version that keeps the hard constraints (no market predictions, remedies only from the
//     chart's remedy data, counts not percentages). The remedy data block is left out.
//   • "In play" is decided generously (last 3 user messages, plus whether the assistant's last reply mentioned an upay), so a follow-up
//     like "haan batao" after the app offered a remedy still gets the full remedy data.
//   • If a section header cannot be found (someone edited the prompt) nothing is removed.
//   • CHAT_PROMPT_TRIM=off in the environment switches the whole thing off.

const REMEDY_RE = /upay|upaay|remed|mantra|jaap|\bjapa\b|daan|puja|pooja|totka|totke|gemstone|\bgems?\b|ratna|\bstone\b|\bnag\b|neelam|pukhraj|moonga|panna|manik|moti|hira|gomed|lahsunia|vrat|shanti|shaanti|nivaran|ilaaj|ilaj|solution|\bhal\b|dosh|kya kar(u|un|na|ein|en)\b|what (should|can) i do|\bfix\b|\bcure\b|उपाय|मंत्र|जाप|दान|पूजा|टोटका|रत्न|नग\b|शांति|निवारण|इलाज|समाधान|दोष|क्या कर(ूं|ें|ना)/i;
const REMEDY_REPLY_RE = /उपाय|upay|upaay|remedy|mantra|मंत्र/i;
const ACCURACY_RE = /accura|track.?record|kitni sahi|sahi nikl|sach (hui|nikl)|galat (nikl|hui)|prediction.*(sahi|galat|true|correct|hui|nikl)|pehle ki|bharosa|\btrust\b|proof|सही निकल|कितनी सही|रिकॉर्ड|भरोसा|सटीक/i;

const CORE = {
  investment: `═══ INVESTMENT & MARKET — HARD RULE ═══
NEVER predict whether any stock, crypto, commodity, mutual fund, trade or property price will profit or lose, and never give a buy/sell/profit date window — a birth chart cannot determine market prices. If asked, decline in ONE short, neutral sentence (no lecture), then give only what the chart can say (the temperament of the running dasha, the day/hora for reviewing financial decisions). For property or home questions describe the 4th-house themes only — never profit, resale value or "good investment".`,
  remedy: `═══ REMEDY RULE ═══
Only when explicitly asked, or when the [OFFER AN UPAAY] instruction below tells you to offer one. Use only the remedy data given in the context (factSheet.remedyPlan); never invent a remedy, and never suggest a gemstone unless the context names an eligible gemstone planet. If the user asks for a remedy and no remedy data is shown in the context, say you will share it as soon as they ask for the upay directly — do not make one up.`,
  accuracy: `═══ ACCURACY / TRACK-RECORD QUESTIONS ═══
If asked how accurate your predictions have been, answer ONLY from the USER TRACK RECORD block if it is present, as raw counts — never as a percentage and never with an invented number. If it shows too few tracked predictions, say the track record is still building.`,
};

/** Which topic-specific sections this conversation needs in full. `detectArea` is the route's detectLifeArea(text). */
export function promptTrimFlags(messages, detectArea) {
  if (/^(off|0|false|no)$/i.test(process.env.CHAT_PROMPT_TRIM || '')) return { on: false, investment: true, remedy: true, accuracy: true };
  const list = Array.isArray(messages) ? messages : [];
  const users = list.filter(m => m && m.role === 'user').slice(-3).map(m => String(m.content || ''));
  const lastReply = String([...list].reverse().find(m => m && m.role === 'assistant')?.content || '');
  return {
    on: true,
    investment: users.some(t => detectArea(t) === 'investment'),
    remedy: users.some(t => REMEDY_RE.test(t)) || users.some(t => detectArea(t) === 'remedy') || REMEDY_REPLY_RE.test(lastReply),
    accuracy: users.slice(-2).some(t => ACCURACY_RE.test(t)),
  };
}

// replace [start, end) of `s`, where start = first index of `header` and end = `endFn(s, start)`; leave `s` alone if the header is missing.
// `trail` is the blank space that followed the section; it is not added when the section was the last thing in the text.
function swap(s, header, endFn, core, trail) {
  const a = s.indexOf(header);
  if (a < 0) return s;
  const b = endFn(s, a);
  if (b <= a) return s;
  return s.slice(0, a) + core + (b >= s.length ? '' : trail) + s.slice(b);
}
const untilNextHeader = (s, a) => { const n = s.indexOf('\n═══ ', a + 5); return n < 0 ? -1 : n + 1; };            // up to (not including) the next "═══" line
const untilParagraphEnd = (s, a) => { const h = s.indexOf('\n', a); const e = s.indexOf('\n\n', h + 1); return e < 0 ? s.length : e + 1; };   // header line + its paragraph (keeps the blank line after it)

/** The static rules text, with the sections for topics that are not in play shortened. */
export function trimStaticRules(prompt, flags) {
  if (!flags || !flags.on) return prompt;
  let s = prompt;
  if (!flags.remedy)     s = swap(s, '═══ REMEDY RULE ═══', untilNextHeader, CORE.remedy, '\n\n');
  if (!flags.investment) s = swap(s, '═══ INVESTMENT & MARKET', untilNextHeader, CORE.investment, '\n\n');
  if (!flags.accuracy)   s = swap(s, '═══ ACCURACY / TRACK-RECORD QUESTIONS', untilParagraphEnd, CORE.accuracy, '\n');
  return s;
}

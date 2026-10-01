// lib/life-details.js
//
// Marital status / children: shared constants (safe on client AND server), the
// deterministic "should the bot ask first?" rule, and the prompt block that tells
// the AI how to frame an answer for each status.
//
// The ask-first rule (requested product behaviour): when the person the kundli
// belongs to is at/over an age threshold (default 30, admin-configurable via
// app_config key `relationship_ask_age`) and asks about marriage/relationships,
// the bot asks their current marital status BEFORE answering — because "when
// will I marry?" is the wrong question to answer for someone already married.
// No AI call is used to decide this (keyword list + DOB), so it is instant and free.

export const MARITAL_OPTIONS = [
  { v: 'unmarried',  icon: '🌱', hi: 'अविवाहित',         en: 'Unmarried' },
  { v: 'married',    icon: '💍', hi: 'विवाहित',           en: 'Married' },
  { v: 'divorced',   icon: '🔄', hi: 'तलाकशुदा / अलग',    en: 'Divorced / separated' },
  { v: 'widowed',    icon: '🕊️', hi: 'विधवा / विधुर',      en: 'Widowed' },
  { v: 'prefer_not', icon: '🤐', hi: 'बताना नहीं चाहता',   en: 'Prefer not to say' },
];

export const CHILDREN_OPTIONS = [
  { v: 'none',       icon: '🙂', hi: 'अभी नहीं',   en: 'None yet' },
  { v: 'one',        icon: '👶', hi: '1 संतान',    en: '1 child' },
  { v: 'two',        icon: '👧👦', hi: '2 संतान',   en: '2 children' },
  { v: 'three_plus', icon: '👨‍👩‍👧‍👦', hi: '3 या ज़्यादा', en: '3 or more' },
  { v: 'prefer_not', icon: '🤐', hi: 'बताना नहीं चाहता', en: 'Prefer not to say' },
];

export const MARITAL_VALUES = MARITAL_OPTIONS.map(o => o.v);
export const CHILDREN_VALUES = CHILDREN_OPTIONS.map(o => o.v);

export function labelFor(options, value, lang = 'hi') {
  const o = options.find(x => x.v === value);
  return o ? (lang === 'en' ? o.en : o.hi) : null;
}

export const DEFAULT_ASK_AGE = 30;
const SKIP_DAYS = 7;

// Keyword lists: Hinglish + Devanagari. Substring matching on purpose —
// \b is unreliable for Devanagari in JS.
const RELATIONSHIP_RE = /vivah|shaadi|shadi|marriage|married|marry|partner|life.?partner|spouse|rishta|rishte|pyaar|pyar|\blove\b|relationship|boyfriend|girlfriend|\bpati\b|patni|husband|wife|talaq|divorce|breakup|break.?up|सगाई|विवाह|शादी|रिश्ता|रिश्ते|प्यार|प्रेम|साथी|पति|पत्नी|तलाक|जीवनसाथी|जीवन साथी/i;
const CHILDREN_RE = /bachche|bachcha|bachhe|santan|aulad|\bbeta\b|\bbeti\b|pregnan|child|children|garbh|putra|putri|बच्चे|बच्चा|संतान|औलाद|बेटा|बेटी|गर्भ|पुत्र/i;

export function isRelationshipTopic(text) { return !!text && RELATIONSHIP_RE.test(text); }
export function isChildrenTopic(text)     { return !!text && CHILDREN_RE.test(text); }

export function ageFromDob(dob, now = new Date()) {
  if (!dob || !/^\d{4}-\d{2}-\d{2}/.test(dob)) return null;
  const [y, m, d] = dob.slice(0, 10).split('-').map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

function recentlySkipped(skipped, field, now) {
  const ts = skipped?.[field];
  if (!ts) return false;
  const t = new Date(ts).getTime();
  return Number.isFinite(t) && now.getTime() - t < SKIP_DAYS * 86400000;
}

// row: { dob, marital_status, children_status, life_prompts_skipped }
// Returns 'marital' | 'children' | null
export function decideLifeAsk(text, row, askAge = DEFAULT_ASK_AGE, now = new Date()) {
  if (!row || !text) return null;
  const age = ageFromDob(row.dob, now);
  const skipped = row.life_prompts_skipped || {};
  const maritalKnown = !!row.marital_status;

  // Unknown DOB -> we can't tell if they're over the threshold; asking is harmless, so ask.
  const overThreshold = age === null ? true : age >= askAge;

  if (isRelationshipTopic(text) && overThreshold && !maritalKnown && !recentlySkipped(skipped, 'marital', now)) {
    return 'marital';
  }
  if (isChildrenTopic(text) && overThreshold) {
    if (!maritalKnown && !recentlySkipped(skipped, 'marital', now)) return 'marital';
    const hasPartnerHistory = ['married', 'divorced', 'widowed'].includes(row.marital_status);
    if (hasPartnerHistory && !row.children_status && !recentlySkipped(skipped, 'children', now)) return 'children';
  }
  return null;
}

// Warm, short questions — each carries its own reason so no separate notice is needed.
export function askQuestionText(field, lang = 'hi') {
  if (field === 'marital') {
    return lang === 'en'
      ? 'To answer this properly for you, one quick thing — what is your current status?'
      : 'इस सवाल का सही जवाब देने के लिए बस एक बात बता दीजिए — अभी आपकी स्थिति क्या है?';
  }
  return lang === 'en'
    ? 'One more quick thing so the answer fits you — do you have children?'
    : 'जवाब आपके हिसाब से देने के लिए एक बात और — क्या आपकी संतान है?';
}

// Injected into the chat system prompt (server-side, from the DB row — not the client).
export function buildLifeContextBlock(row) {
  if (!row) return '';
  const lines = [];
  switch (row.marital_status) {
    case 'unmarried':
      lines.push('Marital status: UNMARRIED (user-stated). Questions about marriage/relationship timing are valid — answer from 7th house / Venus-Jupiter dasha logic as usual.'); break;
    case 'married':
      lines.push('Marital status: MARRIED (user-stated). NEVER answer "when will I get married" or predict a first marriage. Frame relationship questions around the existing marriage: harmony, communication, partner-related dasha periods, remedies for friction. Do not invent facts about the spouse.'); break;
    case 'divorced':
      lines.push('Marital status: DIVORCED/SEPARATED (user-stated). Do NOT talk as if they have never been married. Be gentle; frame around healing, stability, and (only if asked) possibility of a future partnership in general terms. No blame, no "karmic fault" language.'); break;
    case 'widowed':
      lines.push('Marital status: WIDOWED (user-stated). Be gentle and respectful. Do not predict marriage unless they ask about remarriage themselves; never frame the loss as karma or fault.'); break;
    case 'prefer_not':
      lines.push('Marital status: user chose NOT to say. Do not assume or ask again. Answer relationship questions in general terms about the chart, without assuming married or unmarried.'); break;
  }
  switch (row.children_status) {
    case 'none':
      lines.push('Children: none yet (user-stated). Santan questions about timing are valid.'); break;
    case 'one': case 'two': case 'three_plus':
      lines.push(`Children: ${row.children_status === 'one' ? '1 child' : row.children_status === 'two' ? '2 children' : '3 or more children'} (user-stated). Do not ask "will you have children" as if they have none; frame around the children they have, and further children only if the user asks.`); break;
    case 'prefer_not':
      lines.push('Children: user chose NOT to say. Do not assume or ask again.'); break;
  }
  if (lines.length === 0) return '';
  return `\n\n[USER-STATED LIFE CONTEXT — respect this; if the user later says something different, go with what they say now]\n${lines.join('\n')}`;
}

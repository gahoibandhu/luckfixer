// lib/search-normalize.js — one "sound skeleton" for Devanagari AND Roman (Hinglish) text, so
// "hanuman chalisa", "hanuman chaleesa" and "हनुमान चालीसा" all reduce to the same key ("hnmn cls").
// Vowels and matras are dropped (they are what people spell differently); consonants are folded to one letter each.
const DEV = {
  'क': 'k', 'ख': 'k', 'ग': 'g', 'घ': 'g', 'ङ': 'n', 'च': 'c', 'छ': 'c', 'ज': 'j', 'झ': 'j', 'ञ': 'n',
  'ट': 't', 'ठ': 't', 'ड': 'd', 'ढ': 'd', 'ण': 'n', 'त': 't', 'थ': 't', 'द': 'd', 'ध': 'd', 'न': 'n',
  'प': 'p', 'फ': 'p', 'ब': 'b', 'भ': 'b', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'ळ': 'l', 'व': 'v',
  'श': 's', 'ष': 's', 'स': 's', 'ह': 'h', 'ं': 'n', 'ँ': 'n', 'ॐ': 'm', 'ऋ': 'r',
};
const DEV_RE = /[\u0900-\u097F]/;

function fromDevanagari(s) {
  s = s.normalize('NFD').replace(/ज्ञ/g, 'gy').replace(/क्ष/g, 'ks').replace(/\u093C/g, '');   // nukta ignored
  let out = '';
  for (const ch of s) {
    if (DEV[ch]) out += DEV[ch];
    else if (/[a-z0-9 ]/i.test(ch)) out += ch.toLowerCase();
    else if (!DEV_RE.test(ch)) out += ' ';          // punctuation -> space
    // other Devanagari signs (vowels, matras, halant, danda) are dropped
  }
  return out;
}
function fromRoman(s) {
  return s.toLowerCase()
    .replace(/chh/g, 'c').replace(/ch/g, 'c').replace(/sh/g, 's').replace(/ph/g, 'p').replace(/bh/g, 'b').replace(/dh/g, 'd')
    .replace(/gh/g, 'g').replace(/kh/g, 'k').replace(/th/g, 't').replace(/jh/g, 'j')
    .replace(/w/g, 'v').replace(/z/g, 'j').replace(/q/g, 'k').replace(/f/g, 'p').replace(/x/g, 'ks')
    .replace(/[^a-z0-9 ]/g, ' ');
}
/** "hnmn cls" — space-separated consonant skeletons, one per word */
export function skeleton(text) {
  if (!text) return '';
  const s = String(text);
  const roman = DEV_RE.test(s) ? fromDevanagari(s) : s;
  return fromRoman(roman).split(/\s+/).map(w => w.replace(/[aeiou]/g, '').replace(/(.)\1+/g, '$1')).filter(Boolean).join(' ');
}
export const words = (text) => skeleton(text).split(' ').filter(Boolean);

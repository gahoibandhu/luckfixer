// lib/library-search.js — ranking for the library search (pure functions: used by the page and by the tests).
import { words } from '@/lib/search-normalize';

export const ORDER = ['chalisa', 'aarti', 'katha', 'vidhi'];

/** sound skeletons per card: title, aliases, kind words, full body text */
export function buildIndex(items) {
  return items.map(it => {
    const body = it.sections.map(s => s.kind === 'verses' ? s.stanzas.flat().join(' ')
      : s.kind === 'steps' ? s.steps.map(x => x.hi + ' ' + x.en).join(' ')
      : s.kind === 'paras' ? s.paras.map(x => x.hi + ' ' + x.en).join(' ')
      : s.kind === 'mantra' ? s.text : '').join(' ');
    return { it, title: words(it.title.hi + ' ' + it.title.en), first: [words(it.title.hi)[0], words(it.title.en)[0]].filter(Boolean), keys: words(it.keys), kind: words(it.typeWords), body: words(body) };
  });
}

const hit = (list, t) => list.some(w => w.startsWith(t) || (t.length >= 3 && w.includes(t)));
// body text is searched by word prefix only, and a short token (1-2 consonants) counts only inside a longer phrase (3+ words, e.g. a line of the chalisa),
// so a stray consonant pair never matches a long text
const hitBody = (list, t, phrase) => (t.length >= 3 || phrase) && list.some(w => w.startsWith(t));

/** every word of the query must match somewhere; title > aliases/deity > kind words > body text */
export function runSearch(index, q, type = 'all') {
  const toks = words(q);
  const raw = q.trim().toLowerCase();
  const pool = index.filter(r => type === 'all' || r.it.type === type);
  if (!toks.length) return pool.map(r => r.it).sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  const scored = [];
  for (const r of pool) {
    let score = 0, ok = true;
    for (const t of toks) {
      let s = 0;
      if (r.title.includes(t)) s = 7; else if (hit(r.title, t)) s = 5; else if (r.keys.includes(t)) s = 6; else if (hit(r.keys, t)) s = 4; else if (hit(r.kind, t)) s = 3; else if (hitBody(r.body, t, toks.length >= 3)) s = 1;
      if (!s) { ok = false; break; }
      score += s;
    }
    if (!ok) continue;
    if ((r.it.title.hi + ' ' + r.it.title.en).toLowerCase().includes(raw)) score += 6;      // typed it exactly
    if (r.first.includes(toks[0])) score += 4;                                                // the card's own name leads with what was typed
    scored.push([score, r.it]);
  }
  return scored.sort((a, b) => b[0] - a[0] || ORDER.indexOf(a[1].type) - ORDER.indexOf(b[1].type)).map(x => x[1]);
}

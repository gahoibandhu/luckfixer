'use client';
// Search over the library cards (chalisa, aarti, vrat katha, pooja vidhi). Runs entirely in the browser: no server calls.
// Works with Devanagari and Roman/Hinglish spelling through lib/search-normalize.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUiLang } from '@/lib/i18n';
import { buildIndex, runSearch, ORDER } from '@/lib/library-search';
import { LIB_TYPES } from '@/lib/library-types';
import LibraryCard from '@/components/LibraryCard';

const SUGGEST = [['हनुमान चालीसा', 'hanuman chalisa'], ['एकादशी कथा', 'ekadashi katha'], ['सत्यनारायण पूजा विधि', 'satyanarayan pooja vidhi'], ['प्रदोष व्रत', 'pradosh vrat'], ['लक्ष्मी आरती', 'lakshmi aarti'], ['निर्जला एकादशी', 'nirjala ekadashi']];

export default function LibrarySearch({ items }) {
  const en = useUiLang() === 'en';
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [only, setOnly] = useState(null);          // ?id=… opens one card on its own (a shared deep link)
  const [shown, setShown] = useState(20);
  const ready = useRef(false);

    // index once: sound skeletons for the title/aliases, the kind words, and the full body text
  const index = useMemo(() => buildIndex(items), [items]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get('q') || ''); setType(ORDER.includes(p.get('t')) ? p.get('t') : 'all'); setOnly(p.get('id') || null);
    ready.current = true;
  }, []);
  useEffect(() => {
    if (!ready.current) return;
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim()); if (type !== 'all') p.set('t', type); if (only) p.set('id', only);
    window.history.replaceState(null, '', p.toString() ? `/search?${p}` : '/search');
  }, [q, type, only]);
  useEffect(() => setShown(20), [q, type]);

  const results = useMemo(() => (only ? items.filter(i => i.id === only) : runSearch(index, q, type)), [q, type, only, items, index]);

  const counts = useMemo(() => { const c = { all: items.length }; for (const k of ORDER) c[k] = items.filter(i => i.type === k).length; return c; }, [items]);
  const chip = (on) => ({ padding: '7px 13px', borderRadius: '999px', fontSize: '13px', cursor: 'pointer', border: '1px solid ' + (on ? 'var(--pub-gold)' : 'var(--color-border-secondary)'), background: on ? 'var(--color-background-warning)' : 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontWeight: on ? 700 : 400, whiteSpace: 'nowrap' });

  return (
    <div>
      {only ? (
        <button type="button" onClick={() => setOnly(null)} style={{ ...chip(false), marginBottom: '12px' }}>← {en ? 'Search all' : 'सब में खोजें'}</button>
      ) : (
        <>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} autoFocus
            placeholder={en ? 'Search: hanuman chalisa, ekadashi katha, satyanarayan pooja…' : 'खोजें: हनुमान चालीसा, एकादशी कथा, सत्यनारायण पूजा… (Roman में भी लिख सकते हैं)'}
            aria-label={en ? 'Search' : 'खोजें'} style={{ width: '100%', fontSize: '16px', padding: '13px 14px', borderRadius: '12px', marginBottom: '10px' }} />
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '10px' }} role="group" aria-label="Filter">
            <button type="button" onClick={() => setType('all')} style={chip(type === 'all')}>{en ? 'All' : 'सभी'} ({counts.all})</button>
            {ORDER.map(k => <button type="button" key={k} onClick={() => setType(k)} style={chip(type === k)}>{LIB_TYPES[k].glyph} {en ? LIB_TYPES[k].en : LIB_TYPES[k].hi} ({counts[k]})</button>)}
          </div>
          {!q.trim() && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{en ? 'Try:' : 'जैसे:'}</span>
              {SUGGEST.map(([hi, ro]) => <button type="button" key={ro} onClick={() => setQ(en ? ro : hi)} style={{ ...chip(false), padding: '5px 11px', fontSize: '12px' }}>{en ? ro : hi}</button>)}
            </div>
          )}
          <p aria-live="polite" style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {q.trim() ? (en ? `${results.length} result(s)` : `${results.length} परिणाम`) : (en ? `${results.length} cards` : `${results.length} कार्ड`)}
          </p>
        </>
      )}

      {results.slice(0, shown).map(it => <LibraryCard key={it.id} item={it} defaultOpen={!!only} />)}

      {!only && results.length > shown && (
        <button type="button" onClick={() => setShown(s => s + 20)} style={{ ...chip(false), width: '100%', padding: '11px' }}>{en ? 'Show more' : 'और दिखाएँ'}</button>
      )}
      {!results.length && (
        <p style={{ padding: '18px 4px', fontSize: '14px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
          {en ? 'Nothing found. Try the deity or festival name (hanuman, shiv, ekadashi) or just “katha”, “aarti”, “vidhi”.' : 'कुछ नहीं मिला। देवता या व्रत का नाम लिखकर देखें (हनुमान, शिव, एकादशी) या सिर्फ़ “कथा”, “आरती”, “विधि”।'}
        </p>
      )}
    </div>
  );
}

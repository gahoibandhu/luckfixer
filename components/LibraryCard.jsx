'use client';
// One self-contained card: title, kind, ALL of the text (expand in place) and share buttons.
// Sharing: WhatsApp (title + opening lines + link), the phone's own share sheet (full text), copy text, copy link.
import { useEffect, useMemo, useState } from 'react';
import { useUiLang } from '@/lib/i18n';
import { LIB_TYPES } from '@/lib/library-types';
import { BRAND } from '@/lib/brand';

const pick = (o, en) => (typeof o === 'string' ? o : (en ? o.en : o.hi));

/** the card as plain text, in the reader's language */
export function cardText(item, en) {
  const parts = [];
  for (const s of item.sections) {
    if (s.h) parts.push(`*${pick(s.h, en)}*`);
    if (s.kind === 'verses') parts.push(s.stanzas.map(st => st.join('\n')).join('\n\n'));
    else if (s.kind === 'steps') parts.push(s.steps.map((x, i) => `${s.bullets ? '•' : `${i + 1}.`} ${pick(x, en)}`).join('\n'));
    else if (s.kind === 'paras') parts.push(s.paras.map(p => pick(p, en)).join('\n\n'));
    else if (s.kind === 'mantra') parts.push(s.text);
    else if (s.kind === 'note') parts.push(`(${pick(s.note, en)})`);
  }
  return parts.join('\n\n');
}

function Body({ item, en }) {
  const base = { fontSize: '15px', lineHeight: 1.9, color: 'var(--color-text-primary)' };
  return item.sections.map((s, i) => (
    <div key={i} style={{ marginTop: i ? '14px' : 0 }}>
      {s.h && <h4 style={{ margin: '0 0 6px', fontSize: '13px', letterSpacing: '.3px', color: 'var(--color-text-tertiary)' }}>{pick(s.h, en)}</h4>}
      {s.kind === 'verses' && <div style={{ textAlign: 'center', fontSize: '18px', lineHeight: 1.95 }}>{s.stanzas.map((st, k) => (
        <p key={k} style={{ margin: '0 0 14px', fontWeight: st.length === 1 && st[0].startsWith('॥') ? 700 : 400, color: st.length === 1 && st[0].startsWith('॥') ? 'var(--color-text-info)' : 'inherit' }}>{st.map((l, j) => <span key={j}>{l}{j < st.length - 1 && <br />}</span>)}</p>
      ))}</div>}
      {s.kind === 'steps' && (s.bullets
        ? <ul style={{ margin: 0, paddingLeft: '20px', ...base, fontSize: '14px' }}>{s.steps.map((x, k) => <li key={k}>{pick(x, en)}</li>)}</ul>
        : <ol style={{ margin: 0, paddingLeft: '20px', ...base, fontSize: '14px' }}>{s.steps.map((x, k) => <li key={k} style={{ marginBottom: '4px' }}>{pick(x, en)}</li>)}</ol>)}
      {s.kind === 'paras' && s.paras.map((p, k) => <p key={k} style={{ margin: '0 0 10px', ...base }}>{pick(p, en)}</p>)}
      {s.kind === 'mantra' && <p style={{ margin: 0, textAlign: 'center', fontSize: '21px', fontWeight: 600 }}>{s.text}</p>}
      {s.kind === 'note' && <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{pick(s.note, en)}</p>}
    </div>
  ));
}

export default function LibraryCard({ item, defaultOpen = false }) {
  const en = useUiLang() === 'en';
  const t = LIB_TYPES[item.type];
  const [open, setOpen] = useState(defaultOpen);
  const [canShare, setCanShare] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { setCanShare(typeof navigator !== 'undefined' && !!navigator.share); }, []);
  useEffect(() => { if (defaultOpen) setOpen(true); }, [defaultOpen]);

  const text = useMemo(() => cardText(item, en), [item, en]);
  const title = pick(item.title, en);
  const url = () => `${window.location.origin}${item.href}`;
  const footer = () => `\n\n— ${BRAND.name}\n${url()}`;
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 1800); };

  const shareWhatsApp = () => {
    // wa.me links have a length limit, so long texts go as title + opening + link; "Share…" and "Copy" carry the full text
    const MAX = 900;
    const body = text.length > MAX ? `${text.slice(0, MAX).replace(/\s+\S*$/, '')} …\n\n${en ? 'Read the full text:' : 'पूरा पाठ यहाँ पढ़ें:'}` : text;
    window.open(`https://wa.me/?text=${encodeURIComponent(`*${title}*\n\n${body}${footer()}`)}`, '_blank', 'noopener,noreferrer');
  };
  const shareNative = async () => {
    try { await navigator.share({ title, text: `*${title}*\n\n${text}`, url: url() }); } catch { /* user closed the sheet */ }
  };
  const copy = async (what) => {
    const val = what === 'link' ? url() : `${title}\n\n${text}${footer()}`;
    try { await navigator.clipboard.writeText(val); }
    catch { const ta = document.createElement('textarea'); ta.value = val; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove(); }
    flash(en ? 'Copied' : 'कॉपी हो गया');
  };

  const btn = { minHeight: '40px', padding: '0 13px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' };
  const firstText = item.sections.find(s => s.kind === 'verses' || s.kind === 'paras' || s.kind === 'steps');
  const preview = firstText?.kind === 'verses' ? firstText.stanzas.slice(0, 2).map(s => s.join(' ')).join(' ') : firstText?.kind === 'paras' ? pick(firstText.paras[0], en) : firstText?.kind === 'steps' ? pick(firstText.steps[0], en) : '';

  return (
    <article id={item.id} style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '14px', padding: '14px 14px 12px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: t.color, border: `1px solid ${t.color}`, borderRadius: '999px', padding: '2px 9px' }}>{t.glyph} {en ? t.en : t.hi}</span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{pick(item.sub, en)}</span>
      </div>
      <h3 style={{ margin: '0 0 6px', fontSize: '18px', lineHeight: 1.4 }}>{title}</h3>

      {open ? <Body item={item} en={en} /> : (
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.75, color: 'var(--color-text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{preview}</p>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', alignItems: 'center' }}>
        <button type="button" onClick={() => setOpen(o => !o)} style={{ ...btn, background: open ? 'var(--color-background-secondary)' : 'var(--pub-gold)', color: open ? 'var(--color-text-primary)' : '#251a00', border: open ? btn.border : 0 }} aria-expanded={open}>
          {open ? (en ? 'Show less' : 'छोटा करें') : (en ? 'Read full' : 'पूरा पढ़ें')}
        </button>
        <button type="button" onClick={shareWhatsApp} style={{ ...btn, color: '#128c4a', borderColor: '#128c4a' }}>↗ WhatsApp</button>
        {canShare && <button type="button" onClick={shareNative} style={btn}>{en ? 'Share…' : 'शेयर…'}</button>}
        <button type="button" onClick={() => copy('text')} style={btn}>{en ? 'Copy text' : 'टेक्स्ट कॉपी'}</button>
        <button type="button" onClick={() => copy('link')} style={btn}>🔗 {en ? 'Copy link' : 'लिंक'}</button>
        <a href={item.href} style={{ ...btn, border: 0, color: 'var(--color-text-info)' }}>{en ? 'Open page →' : 'पेज खोलें →'}</a>
        <span aria-live="polite" style={{ fontSize: '12px', color: 'var(--color-text-success)' }}>{msg}</span>
      </div>
    </article>
  );
}

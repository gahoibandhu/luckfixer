// lib/library.js — ONE flat list of "cards" for search and sharing: chalisa, aarti, vrat katha, pooja vidhi.
// Every card is self-contained (title + all of its text) and has a canonical page (`href`) that is what gets shared.
// Nothing is copied by hand: the cards are built from the same data files the pages use, so they cannot drift apart.
import { AARTIS } from '@/lib/aarti';
import { VRATS, COMMON_PUJA } from '@/lib/vrat-guides';
import { EKADASHI } from '@/lib/ekadashi-content';

import { LIB_TYPES } from '@/lib/library-types';
export { LIB_TYPES };
// words people type for each kind, in both scripts (matched through the sound skeleton, so spelling variants are fine)
const TYPE_WORDS = {
  chalisa: 'chalisa chaleesa path paath चालीसा पाठ',
  aarti: 'aarti arti aarati आरती',
  katha: 'katha kahani vrat katha kahaani कथा कहानी व्रत',
  vidhi: 'vidhi pooja puja poojan pujan puja vidhi niyam samagri विधि पूजा पूजन नियम सामग्री',
};
const slugWords = (s) => s.replace(/-/g, ' ');

let cached;
export function buildLibrary() {
  if (cached) return cached;
  const items = [];

  for (const a of AARTIS) {
    items.push({
      id: `${a.kind}:${a.slug}`, type: a.kind, title: { hi: a.hi, en: a.en },
      sub: { hi: `${a.deity.hi} · ${a.days.hi}`, en: `${a.deity.en} · ${a.days.en}` },
      href: `/aarti/${a.slug}`, aliases: [slugWords(a.slug), a.deity.en, a.deity.hi, a.en],
      sections: [{ kind: 'verses', stanzas: a.text }],
    });
  }

  for (const v of VRATS) {
    const names = [v.en, v.hi, slugWords(v.slug)];
    if (v.katha) {
      items.push({
        id: `katha:${v.slug}`, type: 'katha', title: { hi: v.katha.title.hi, en: v.katha.title.en },
        sub: { hi: v.hi, en: v.en }, href: `/vrat/${v.slug}#katha`, aliases: names,
        sections: [
          { kind: 'paras', paras: v.katha.body },
          { kind: 'note', note: { hi: 'परंपरागत कथा का संक्षिप्त पुनःकथन; अलग-अलग ग्रंथों और क्षेत्रों में रूप थोड़ा भिन्न मिलता है।', en: 'A short retelling of a traditional account; versions differ slightly between texts and regions.' } },
        ],
      });
    }
    const secs = [];
    if (v.samagri) secs.push({ h: { hi: 'पूजन सामग्री', en: 'Puja materials' }, kind: 'paras', paras: [v.samagri] });
    if (v.niyam?.length) secs.push({ h: { hi: 'नियम', en: 'Rules' }, kind: 'steps', steps: v.niyam, bullets: true });
    if (v.vidhi?.length) secs.push({ h: { hi: 'पूजा विधि', en: 'Puja vidhi' }, kind: 'steps', steps: v.vidhi });
    if (v.parana) secs.push({ h: { hi: 'पारण', en: 'Parana' }, kind: 'paras', paras: [v.parana] });
    if (v.mantra) secs.push({ h: { hi: 'मंत्र', en: 'Mantra' }, kind: 'mantra', text: v.mantra });
    if (secs.length) items.push({
      id: `vidhi:${v.slug}`, type: 'vidhi', title: { hi: `${v.hi} — पूजा विधि`, en: `${v.en} — Pooja vidhi` },
      sub: { hi: v.deity.hi, en: v.deity.en }, href: `/vrat/${v.slug}#vidhi`, aliases: [...names, v.deity.en, v.deity.hi],
      sections: secs,
    });
  }

  items.push({
    id: 'vidhi:common-puja', type: 'vidhi', title: COMMON_PUJA.title, sub: { hi: 'हर पूजा के लिए', en: 'For any puja' },
    href: '/vrat', aliases: ['general puja vidhi', 'ghar ki puja', 'daily puja', 'सामान्य पूजा'],
    sections: [{ kind: 'steps', steps: COMMON_PUJA.steps }],
  });

  for (const [slug, c] of Object.entries(EKADASHI)) {
    items.push({
      id: `katha:ekadashi-${slug}`, type: 'katha', title: { hi: `${c.hi} — कथा`, en: `${c.en} — Katha` },
      sub: c.alt, href: `/ekadashi/${slug}`, aliases: [c.en, c.hi, `${slugWords(slug)} ekadashi`, `${slugWords(slug)} ekadasi`, c.alt.en, c.alt.hi],
      sections: [
        { h: { hi: 'महत्त्व', en: 'Significance' }, kind: 'paras', paras: [c.why] },
        { h: { hi: 'कथा', en: 'Katha' }, kind: 'paras', paras: [c.katha] },
        ...(c.msg ? [{ h: { hi: 'संदेश', en: 'Message' }, kind: 'paras', paras: [c.msg] }] : []),
        ...(c.pray ? [{ h: { hi: 'प्रार्थना', en: 'Prayer' }, kind: 'paras', paras: [c.pray] }] : []),
      ],
    });
  }

  // a plain-text search blob per card (title, aliases, deity-ish subtitle, kind words) — body text is searched separately
  for (const it of items) it.keys = [it.title.hi, it.title.en, it.sub.hi, it.sub.en, ...it.aliases].join(' ');
  for (const it of items) it.typeWords = TYPE_WORDS[it.type];
  cached = items;
  return items;
}

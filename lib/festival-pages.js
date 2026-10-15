// lib/festival-pages.js — the 10 autumn-festival pages (content in festival-pages-a/b.js) + occurrences from the computed festival data.
import { FESTIVAL_PAGES_A } from '@/lib/festival-pages-a';
import { FESTIVAL_PAGES_B } from '@/lib/festival-pages-b';
import { FESTIVALS } from '@/lib/festivals';
import { FESTIVAL_DATES } from '@/lib/festival-data';

export const FEST_PAGES = { ...FESTIVAL_PAGES_A, ...FESTIVAL_PAGES_B };
export const FEST_SLUGS = Object.keys(FEST_PAGES);
/** festival key -> page slug (for links from the calendar and /tyohar) */
export const FEST_SLUG_BY_KEY = Object.fromEntries(Object.values(FEST_PAGES).filter(p => !p.noCalendar).map(p => [p.fk, p.slug]));

/** [{ p, c, s, e, year }] straight from the computed data (p = the day we show, c = other possible day(s), s/e = tithi window) */
export function festivalOccurrences(fk) {
  return (FESTIVAL_DATES[fk] || []).map(o => ({ p: o.p, c: o.c || [o.p], s: o.s, e: o.e, year: Number(o.p.slice(0, 4)) }));
}
export const festivalDef = (fk) => FESTIVALS.find(f => f.k === fk);

// other names people type for each festival (Hindi and Roman spellings) — used by the search cards
export const FEST_ALIASES = {
  dussehra: ['Dussehra', 'Dasara', 'Dashain', 'Vijayadashami', 'Vijaya Dashami', 'विजयादशमी', 'दशहरा', 'दसहरा', 'Ravan Dahan', 'रावण दहन', 'Shami puja'],
  'karwa-chauth': ['Karwa Chauth', 'Karva Chauth', 'Karwachauth', 'करवा चौथ', 'करवाचौथ', 'करक चतुर्थी', 'Karwa Chauth vrat katha'],
  'ahoi-ashtami': ['Ahoi Ashtami', 'Ahoi Mata', 'अहोई अष्टमी', 'अहोई माता', 'Ahoi vrat'],
  dhanteras: ['Dhanteras', 'Dhantrayodashi', 'Dhan Teras', 'धनतेरस', 'धनत्रयोदशी', 'Dhanvantari Jayanti', 'धन्वंतरि जयंती', 'Yama Deepam', 'यम दीपदान'],
  'choti-diwali': ['Choti Diwali', 'Chhoti Diwali', 'Roop Chaudas', 'Roop Chaturdashi', 'Kali Chaudas', 'Narak Chaturdashi', 'Naraka Chaturdashi', 'छोटी दिवाली', 'छोटी दीवाली', 'रूप चौदस', 'काली चौदस', 'नरक चतुर्दशी'],
  diwali: ['Diwali', 'Deepavali', 'Dipawali', 'Deepawali', 'दिवाली', 'दीवाली', 'दीपावली', 'दीपावली पूजा', 'Lakshmi Puja', 'Laxmi Puja', 'Lakshmi Pujan', 'लक्ष्मी पूजा', 'लक्ष्मी पूजन', 'Diwali puja vidhi', 'Chopda pujan'],
  'govardhan-puja': ['Govardhan Puja', 'Govardhan', 'Annakut', 'Annakoot', 'गोवर्धन पूजा', 'अन्नकूट', 'Govardhan Pooja katha'],
  'bhai-dooj': ['Bhai Dooj', 'Bhaiya Dooj', 'Bhau Beej', 'Yama Dwitiya', 'Yam Dwitiya', 'भाई दूज', 'भैया दूज', 'यम द्वितीया'],
  chhath: ['Chhath', 'Chhath Puja', 'Chhath Pooja', 'Chhathi Maiya', 'Chhathi Mata', 'छठ', 'छठ पूजा', 'छठी मैया', 'डाला छठ', 'Surya Shashthi', 'Nahay Khay', 'Kharna'],
  'tulsi-vivah': ['Tulsi Vivah', 'Tulsi Vivaah', 'Tulsi Shaligram Vivah', 'तुलसी विवाह', 'तुलसी शालिग्राम विवाह', 'Dev Uthani', 'Prabodhini'],
};

// lib/baby-names.js — the traditional starting syllables (akshar) for each nakshatra pada.
// Index = nakshatra number 0..26 (Ashwini..Revati); each has 4 padas. Families also choose by rashi letter —
// treat this as a traditional starting point, not a rule.
export const NAKSHATRAS = [
  ['अश्विनी','Ashwini'],['भरणी','Bharani'],['कृत्तिका','Krittika'],['रोहिणी','Rohini'],['मृगशिरा','Mrigashira'],['आर्द्रा','Ardra'],['पुनर्वसु','Punarvasu'],
  ['पुष्य','Pushya'],['आश्लेषा','Ashlesha'],['मघा','Magha'],['पूर्व फाल्गुनी','Purva Phalguni'],['उत्तर फाल्गुनी','Uttara Phalguni'],['हस्त','Hasta'],
  ['चित्रा','Chitra'],['स्वाति','Swati'],['विशाखा','Vishakha'],['अनुराधा','Anuradha'],['ज्येष्ठा','Jyeshtha'],['मूल','Mula'],['पूर्वाषाढ़ा','Purva Ashadha'],
  ['उत्तराषाढ़ा','Uttara Ashadha'],['श्रवण','Shravana'],['धनिष्ठा','Dhanishta'],['शतभिषा','Shatabhisha'],['पूर्व भाद्रपद','Purva Bhadrapada'],
  ['उत्तर भाद्रपद','Uttara Bhadrapada'],['रेवती','Revati'],
].map(([hi, en]) => ({ hi, en }));

// [Devanagari, Latin] per pada
export const PADA_LETTERS = [
  [['चू','chu'],['चे','che'],['चो','cho'],['ला','la']], [['ली','li'],['लू','lu'],['ले','le'],['लो','lo']], [['अ','a'],['ई','i'],['उ','u'],['ए','e']],
  [['ओ','o'],['वा','va'],['वी','vi'],['वू','vu']], [['वे','ve'],['वो','vo'],['का','ka'],['की','ki']], [['कू','ku'],['घ','gha'],['ङ','nga'],['छ','chha']],
  [['के','ke'],['को','ko'],['हा','ha'],['ही','hi']], [['हू','hu'],['हे','he'],['हो','ho'],['डा','da']], [['डी','di'],['डू','du'],['डे','de'],['डो','do']],
  [['मा','ma'],['मी','mi'],['मू','mu'],['मे','me']], [['मो','mo'],['टा','ta'],['टी','ti'],['टू','tu']], [['टे','te'],['टो','to'],['पा','pa'],['पी','pi']],
  [['पू','pu'],['ष','sha'],['ण','na'],['ठ','tha']], [['पे','pe'],['पो','po'],['रा','ra'],['री','ri']], [['रू','ru'],['रे','re'],['रो','ro'],['ता','ta']],
  [['ती','ti'],['तू','tu'],['ते','te'],['तो','to']], [['ना','na'],['नी','ni'],['नू','nu'],['ने','ne']], [['नो','no'],['या','ya'],['यी','yi'],['यू','yu']],
  [['ये','ye'],['यो','yo'],['भा','bha'],['भी','bhi']], [['भू','bhu'],['धा','dha'],['फा','pha'],['ढा','dha']], [['भे','bhe'],['भो','bho'],['जा','ja'],['जी','ji']],
  [['खी','khi'],['खू','khu'],['खे','khe'],['खो','kho']], [['गा','ga'],['गी','gi'],['गू','gu'],['गे','ge']], [['गो','go'],['सा','sa'],['सी','si'],['सू','su']],
  [['से','se'],['सो','so'],['दा','da'],['दी','di']], [['दू','du'],['थ','tha'],['झ','jha'],['ञ','na']], [['दे','de'],['दो','do'],['चा','cha'],['ची','chi']],
];

export function babyLetter(nakIdx, pada) {
  const row = PADA_LETTERS[nakIdx];
  return row ? row[Math.min(Math.max(pada, 1), 4) - 1] : null;
}

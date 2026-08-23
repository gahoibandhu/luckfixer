// lib/i18n.js
//
// Lightweight UI-chrome translation system — NOT the same thing as
// `langPref` (which controls what language the AI replies in). This
// controls the app's own buttons/labels/placeholders. Kept as a plain
// dictionary + helper (no extra i18n library dependency) since the app
// only needs two languages right now and most text is short.
//
// Scope note: fully wired into the chat page (the primary, most-used
// screen). Extending this same pattern to admin/profile/login/milan is
// straightforward — add their strings to both dictionaries below and
// swap hardcoded text for t('key') calls — but hasn't been done yet
// for every page in the app.

export const UI_LANGUAGES = [
  { code: 'hi', label: 'हिंदी' },
  { code: 'en', label: 'English' },
];

const DICT = {
  hi: {
    newChat: '+ नई चैट',
    changeKundli: 'बदलें',
    kundliDetails: '📊 विवरण',
    selectKundliPrompt: 'बाईं तरफ से कुंडली select करें या नीचे click करें।',
    noKundliYet: 'प्रोफाइल में जाकर अपनी जन्म कुंडली जोड़ें।',
    selectKundliFirst: 'पहले बाईं तरफ से कुंडली चुनें...',
    askQuestion: 'अपना प्रश्न पूछें...',
    listening: 'सुन रहा हूं...',
    send: 'भेजें',
    freeChatsLeft: 'Free chats',
    freeMinsLeft: 'Free mins',
    profile: '👤 प्रोफाइल',
    milan: '💍 मिलान',
    ramShalaka: '🕉️ राम शलाका',
    numerology: '🔢 अंक ज्योतिष',
    logout: 'Logout',
    listen: 'सुनें',
    stop: 'रोकें',
    menu: 'Menu',
    sessions: 'Chats',
    kundlis: 'कुंडलियां',
    uiLanguage: 'App भाषा',
  },
  en: {
    newChat: '+ New Chat',
    changeKundli: 'Change',
    kundliDetails: '📊 Details',
    selectKundliPrompt: 'Select a kundli from the left, or tap below.',
    noKundliYet: 'Add your birth chart from the profile page.',
    selectKundliFirst: 'Select a kundli from the left first...',
    askQuestion: 'Ask your question...',
    listening: 'Listening...',
    send: 'Send',
    freeChatsLeft: 'Free chats',
    freeMinsLeft: 'Free mins',
    profile: '👤 Profile',
    milan: '💍 Match',
    ramShalaka: '🕉️ Ram Shalaka',
    numerology: '🔢 Numerology',
    logout: 'Logout',
    listen: 'Listen',
    stop: 'Stop',
    menu: 'Menu',
    sessions: 'Chats',
    kundlis: 'Kundlis',
    uiLanguage: 'App language',
  },
};

export function t(key, uiLang) {
  return DICT[uiLang]?.[key] ?? DICT.hi[key] ?? key;
}

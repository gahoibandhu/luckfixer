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
    // profile page
    profileTitle: 'प्रोफाइल',
    backToChat: '← Chat पर जाएं',
    editProfile: 'Edit',
    closeEdit: 'बंद करें',
    fullName: 'पूरा नाम',
    save: 'Save करें',
    saving: 'Save हो रहा है...',
    mobileLabel: 'Mobile',
    todaysChats: 'आज की chats',
    myRemedies: 'मेरे उपाय',
    remedyStart: 'शुरू करें, track करें',
    contactUs: 'Contact Us / Feedback',
    contactUsSub: 'सवाल पूछें या राय दें',
    adminPanel: 'Admin पैनल',
    // kundli page
    kundliTitle: 'कुंडली',
    kundliMilan: 'कुंडली मिलान',
    myKundlis: 'मेरी कुंडलियाँ',
    addKundli: '+ नई कुंडली',
    noKundliMsg: 'अभी तक कोई कुंडली नहीं। ऊपर + बटन दबाएं।',
    chatBtn: 'Chat',
    deleteKundli: 'हटाएं',
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
    // profile page
    profileTitle: 'Profile',
    backToChat: '← Go to Chat',
    editProfile: 'Edit',
    closeEdit: 'Close',
    fullName: 'Full name',
    save: 'Save',
    saving: 'Saving...',
    mobileLabel: 'Mobile',
    todaysChats: "Today's chats",
    myRemedies: 'My Remedies',
    remedyStart: 'Start & track',
    contactUs: 'Contact Us / Feedback',
    contactUsSub: 'Ask a question or share feedback',
    adminPanel: 'Admin Panel',
    // kundli page
    kundliTitle: 'Kundli',
    kundliMilan: 'Kundli Matchmaking',
    myKundlis: 'My Kundlis',
    addKundli: '+ New Kundli',
    noKundliMsg: 'No kundli yet. Tap + above.',
    chatBtn: 'Chat',
    deleteKundli: 'Delete',
  },
};

export function t(key, uiLang) {
  return DICT[uiLang]?.[key] ?? DICT.hi[key] ?? key;
}

// Reads the saved UI-language preference (same 'lf_ui_lang' key the
// chat page's language dropdown writes to) so any page can render in
// the language the person already chose, without needing its own
// separate toggle. Call once on mount; defaults to 'hi'.
export function getSavedUiLang() {
  if (typeof window === 'undefined') return 'hi';
  return window.localStorage.getItem('lf_ui_lang') === 'en' ? 'en' : 'hi';
}

export function setSavedUiLang(code) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('lf_ui_lang', code === 'en' ? 'en' : 'hi');
  // Keep in sync with the chat page's langPref too, so switching here
  // and later opening chat doesn't feel like it "forgot" the choice —
  // 'hi' UI maps to the 'hinglish' AI-reply default rather than forcing
  // strict Hindi replies, matching chat's own default.
  window.localStorage.setItem('lf_lang_pref', code === 'en' ? 'en' : 'hinglish');
}

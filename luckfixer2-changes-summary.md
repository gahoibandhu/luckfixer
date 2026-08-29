# LuckFixer2 — Changelog

## Session: Empty/unsaved chat session fix (Aug 28, 2026)

### Bug
Kabhi-kabhi chat session bilkul khaali reh jaata tha (koi message save nahi hota), aur AI fallback chain (Gemini → Groq → SambaNova → OpenRouter → HuggingFace) bhi kaam nahi karti dikhti thi — user ko seedha generic error message milta tha.

### Root cause
`app/api/chat/route.js` mein 4 formatting functions —
`formatYogasForPrompt`, `formatAVForPrompt`, `formatNakshatraForPrompt`,
`formatVarshaphalForPrompt` — bina try/catch ke call ho rahe the.

Jab kisi kundli ka stored `planet_data` malformed/partial hota (e.g.
`nakSheet.planets` ya `varsh.areas` missing), to yeh functions throw kar
dete the. Us throw se execution seedha route ke bottom wale outer
catch-all mein chala jaata — jo `getChatResponse()` (AI fallback chain)
call hone se **pehle** hi hit ho jaata. Isliye:

- AI fallback chain kabhi try hi nahi hoti thi (isliye "fallback kaam
  nahi kar raha" — asal mein wo call hi nahi ho pa raha tha)
- `chat_messages` insert wala block bhi kabhi reach nahi hota — session
  row khaali reh jaata

Same fragility `buildFocusedContext()` ke call site pe bhi thi (life-area
specific context builder), jo same dasha/yoga/varshaphal data index karta
hai.

### Fix
Sab 5 jagah (4 formatters + buildFocusedContext call) ko non-fatal
try/catch mein wrap kiya — exactly transit/remedy-correlation/dasha-stat
blocks jaisa pattern jo already surrounding code mein use ho raha tha.
Ab agar ek section ka data malformed hai, sirf wahi section skip hota
hai — AI call aur DB save dono normally chalte rehte hain.

**File changed:** `app/api/chat/route.js` (lines ~963–1013, ~1088–1096)

### Verified
- `node --check app/api/chat/route.js` — syntax clean

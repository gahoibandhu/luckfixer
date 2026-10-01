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

## Session: IST fix, AI provider keys, birth-time rectification (Sep 30, 2026)

### 1. Birth time is now IST (not Local Mean Time) for India
`lib/astro-facts.js` `getBirthUtcOffsetHours()` (IST +5:30; war-time +6:30 for
1941-42 and 1942-45; pre-1906 and non-India keep the old LMT approximation).
The offset is sent to the pyswisseph service as `tz_offset` so both ephemeris
tiers agree. `ephemeris-service/main.py` accepts optional `tz_offset`.
**Existing saved kundlis are NOT recomputed automatically.**

### 2. SambaNova key bug + admin-managed AI keys
- `lib/ai-engine.js`: `callSambaNova` now reads `SAMBANOVA_API_KEY`, `_1`, `_2`
  (previously only `_1`/`_2`, so a rotated `SAMBANOVA_API_KEY` was ignored).
- New table `ai_provider_keys` (migration_023): keys stored AES-256-GCM encrypted
  (`lib/ai-key-vault.js`, secret = `KEY_ENCRYPTION_SECRET` env var).
- `lib/ai-providers.js`: loads admin-added providers (60s cache), generic
  OpenAI-compatible caller, auto-disable on 401/403, 5-min cooldown on 429.
- `lib/ai-engine.js`: env built-ins (priority Gemini 10, Groq 20, SambaNova 30,
  OpenRouter 40, HuggingFace 50) merged with admin keys by priority; global time
  budget so many providers can't cause a function timeout. Env chain still works
  unchanged if the table is empty/missing.
- `app/api/admin/ai-keys/route.js` (GET/POST/PATCH/DELETE/PUT-test, admin only,
  never returns a full key) + Admin panel tab "🤖 AI Keys" (`components/AdminAiProviders.jsx`).

### 3. Birth-time confirmation (rectification)
- migration_024: `birth_time_source` (exact/approx/unknown/rectified), `life_events`, `rectification`.
- `ephemeris-service/main.py`: new `POST /rectify-scan` (Lagna + Moon per N minutes).
- `lib/birth-rectification.js`: deterministic scan + Vimshottari fit scoring per
  life event, grouped into windows, honest confidence, IST-vs-LMT check.
- `app/api/kundli/rectify/route.js` (scan, ownership-checked); applying a choice
  goes through `PATCH /api/kundli` (`birth_time_source:'rectified'`) which re-runs
  the full analysis. POST/PATCH now store `birth_time_source` + `birth_time_confidence`.
- `lib/kundli-reanalysis.js`: when time isn't exact, the AI is told (factSheet.birthTimeReliability).
- UI: `components/RectifyModal.jsx`; kundli page has a "how sure is this time"
  selector (exact / approximate / don't know), a badge, and a confirm-time button.
- `vercel.json`: maxDuration 120 for the rectify route.

## Session (cont.): profile birth-time card, life details via chat, 30+ relationship rule
- migration_025: `marital_status`, `children_status`, `life_prompts_skipped` on saved_kundlis (per kundli, not per user).
- `lib/life-details.js`: options, keyword+DOB rule `decideLifeAsk()`, warm question text, and `buildLifeContextBlock()` (tells the AI how to frame answers for married / unmarried / divorced / widowed / prefer-not).
- Chat (`app/api/chat/route.js`): BEFORE the usage guard and any AI call, if the kundli's person is >= `relationship_ask_age` (app_config, default 30) and asks a relationship/marriage question with status unknown, the bot replies with a question + tap chips (no credit used, no AI call). Children question follows only after status is known and someone has been married. "बाद में" is remembered for 7 days. State is read from the DB (ownership-checked), never client-sent context; fails open if the columns are missing.
- Chat page: `LifeChips` under the bot's question; tapping saves via `/api/kundli/life-details` and replays the original question (no duplicate user bubble).
- Profile page: per-kundli card — clear "Confirm now" button when the time is unknown/approximate (subtle "Not sure of the time?" link otherwise), plus a visible, editable "life details" row with a "Remove these details" option.
- Admin > Plan tab: "Relationship Question Rule" age setting.
- RectifyModal: tap-able icon cards for events (pre-selected from marital/children status), animated clock while scanning, rotating progress lines, zodiac symbols on results.

# Support-Chain + Multi-Remedy — Implementation Notes

Reference: `Luckfixer-Support-Chain-Design-Doc.docx`. This implements
Sections 2-4 (core scoring + verdict logic) plus Value-Add 5.1
(Friend/Enemy check), and adds the multi-remedy / Lal Kitab / combo
layer you asked for on top.

## New files

- **`lib/graha-support-chain.js`** — the Support-Chain engine itself.
  `evaluateSupportChain(planets, lagnaSign, houseLords)` → array of
  entries, one per graha below the weak threshold (40/100), each with
  `baseStrength`, `effectiveStrength`, `verdict`
  (`compensated_by_support` / `partial_support` / `needs_direct_remedy`),
  the full `supports[]` breakdown (which sources counted and why/why
  not), and `bestSupport`.
- **`lib/remedy-plan.js`** — turns a support-chain verdict + the
  existing gemstone gate + the existing Lal Kitab table into ONE
  structured `remedyPlan` object: which planet(s) to focus on, a Lal
  Kitab bundle *and* a Vedic mantra for each, a gem only when actually
  eligible, and Hindi combination-guidance text when two planets are
  involved.
- **`app/api/admin/migrate-support-chain/route.js`** — back-fills
  `supportChain`/`remedyPlan` onto kundlis saved before this feature
  existed, GET to preview count / POST to run.

## Where it's wired in

- `lib/astro-facts.js` → `buildFactSheet()` now also returns
  `supportChain` and `remedyPlan` alongside the existing
  `gemstoneGuidance`/`neechaBhanga`.
- `lib/kundli-analysis-prompt.js` → new SUPPORT-CHAIN VERDICT and
  REMEDY PLAN sections in the full-analysis prompt; the old
  "remedies must cover 5 systems" instruction now explicitly requires
  multiple remedies per `remedyPlan.focusPlanets`, plus a combination
  explanation when there are two.
- `app/api/chat/route.js` → REMEDY RULE rewritten: was "ONE focused
  remedy", now "give `remedyPlan.remedies` — normally 2-3 across
  systems" with a new SUPPORT-CHAIN FOCUS rule telling the AI which
  planet(s) to actually target and why. The compact chart-essentials
  block now includes the verdict + full `remedyPlan` JSON.

## Decisions worth flagging (my view)

1. **Scoped Value-Add 5.1 in now, not later.** The doc lists it under
   "Future Development", but its own worked example (7.2) shows the
   engine gives a *wrong* verdict without it — a strong enemy graha
   would count as support. Shipping v1 without this fix means the
   first chart with an enemy aspect gets bad remedy advice, so I
   built it in rather than leaving it as a TODO. Only **natural**
   friendship is checked (not the fuller temporal/Panchadha Maitri
   combination) — documented as an extension point, not silently
   skipped, since temporal friendship is a real but separate
   refinement.
2. **5.2-5.5 (Dasha overlay, house-lordship weighting, weakness-cause
   branching, Ashtakvarga bindus) are left as explicit stub functions**
   (`dashaWeightMultiplier`, `lordshipQuality`, `weaknessCause`,
   `ashtakavargaBoost` in `graha-support-chain.js`) rather than
   implemented — each needs extra data plumbing (live dasha state,
   lordship tables, bindu counts) and bundling all five into one pass
   risked shipping something under-tested. `weaknessCause` is
   partially live already (reads existing `p.combust`/`p.dignity`/
   `p.retro`) since that data was already on hand.
3. **The Friend/Enemy gate only applies to the aspecting/conjunct
   sources**, matching the doc's own Section 3 scoping — a dispositor
   or the 9th-house lord still contributes even if it happens to be a
   natural enemy of the weak graha, because classically a dispositor
   structurally "carries" what it rules regardless of friendship;
   only a direct conjunction/aspect needed the relationship check.
   One subtlety worth knowing: the *same* planet can show up once as
   an included dispositor-support and once as an excluded
   conjunct-enemy-complication in the same entry — that's correct,
   not a bug, but it can look odd at a glance.
4. **0-100 scale reuses the existing 0-10 `strengthScore`** (×10)
   instead of inventing a second strength calculation — one source of
   truth for "how strong is this graha" across `eventScores`,
   `gemstoneGuidance`, and now `supportChain`.
5. **Fixed a latent inconsistency**: `specialist-rules.js`'s
   `LAL_KITAB_REMEDIES` table always carries a `gem` field per planet,
   including for `weakestPlanet` — which is exactly what
   `gemstone-policy.js` says not to recommend by default. The AI
   prompt only avoided this by hoping a separate instruction would
   override it. `remedyPlan.vedic.gem` is now the single gate — it is
   `null` unless `gemstoneGuidance` has certified that exact planet,
   and the prompt now explicitly tells the AI not to pull `gem` from
   the raw Lal Kitab reference block.
6. **Migration is offline/cheap.** `migrate-support-chain` recomputes
   `supportChain`/`remedyPlan` from data already stored in
   `planet_data.factSheet` (planets, lagna, houseLords) — no
   ephemeris microservice call, no AI call, safe to run on the whole
   table. It skips rows missing `lagna` (those need the heavier
   `migrate-kundlis` pass first) and rows already migrated.

## Session 2 additions (gender mandatory + prediction-integrity fix)

### Gender now mandatory at creation
- `app/profile/page.jsx` — the wizard's step-1 "आगे बढ़ें" button and
  the form submit both now hard-block on `gender` being unset; toggle
  buttons no longer allow deselecting back to empty.
- `app/api/kundli/route.js` POST — server-side validation added
  (`gender` must be one of male/female/other) — this is the real
  enforcement point, not just the UI.
- **Existing kundlis** created before this change still have
  `gender = null` — they are NOT retroactively blocked or hidden.
  Each such kundli card on `/profile` now shows a small "⚠ लिंग सेट
  करें" prompt; tapping it calls the new lightweight
  `PATCH /api/kundli/set-gender` endpoint, which updates just that
  column — deliberately NOT the same as the full re-analyze PATCH
  route, so backfilling gender doesn't cost an AI call or re-run the
  whole deterministic pipeline for every old user.

### Prediction-integrity fix: ephemeris fallback (the "prediction compromise" you flagged)
This was a real, silent gap: `astro-facts.js` had a 3-tier ephemeris
fallback (Swiss Ephemeris microservice → astronomy-engine → simulated
sine-wave pseudo-data), and computed an `engineUsed`/`engineNotice`
field labeling which tier ran — but **nothing in the codebase ever
read that field**. Not the analysis prompt, not chat, not the UI. If
both real tiers failed, the app would silently generate a full,
confident-sounding Vedic reading built on fabricated planetary
positions, with zero indication to the user (or to the AI writing the
narrative) that the underlying data wasn't real. That's the exact
kind of fabrication this app's own anti-hallucination rules exist to
prevent at the AI layer — it just wasn't enforced at the data layer.

Fix, in `lib/astro-facts.js`:
- Tier 1 (Swiss Ephemeris microservice) now gets a **second attempt
  with a longer timeout** before giving up — Render free-tier cold
  starts are the most common real cause of a Tier 1 miss, not a
  permanent outage, so this alone should eliminate most fallbacks
  with zero human involvement. Skipped entirely (no wasted retry) if
  `EPHEMERIS_SERVICE_URL` isn't configured at all, since a retry would
  fail identically and instantly.
- Tier 2 (astronomy-engine) is real astronomical data, just slightly
  less precise for lunar nodes — kept as a legitimate automatic
  fallback, unchanged.
- **Tier 3 (simulated) is no longer used as a silent automatic
  production fallback.** If both real tiers fail, `getPlanetPositions`
  now throws a typed `EphemerisUnavailableError` instead. It's only
  reachable at all if `ALLOW_SIMULATED_EPHEMERIS=true` is explicitly
  set — never by default, never silently.
- `app/api/kundli/route.js` (both POST create and PATCH re-analyze)
  catch `EphemerisUnavailableError` specifically and return a
  `503 { error, retryable: true }` — an honest "service busy, try
  again shortly" — instead of ever saving/narrating a kundli built on
  fake data. The existing frontend error slot (`data.error` →
  `setGeoError`) already surfaces this with no extra UI work needed.
- `app/api/admin/migrate-kundlis/route.js` and
  `migrate-life-domains/route.js` already wrapped their per-row
  `buildFactSheet` calls in try/catch — so they were already safe by
  construction; a thrown `EphemerisUnavailableError` just marks that
  row failed (retryable on the next batch run) instead of persisting
  fabricated data. No change needed there.

This is the one fix I'd call load-bearing for "logic that works for a
lifetime without a human noticing something's wrong" — it converts a
silent data-quality failure into a loud, typed, un-ignorable one.

## Still open (deliberately not done this pass, revisit only if needed)
- **Remedy weights (0.35/0.30/0.25/0.20/0.30) are being kept fixed**
  per explicit instruction — no outcome-driven auto-tuning was added.
  They remain named constants in `graha-support-chain.js` so they're
  still easy to hand-tune later if ever needed, but nothing in the
  app adjusts them automatically.
- AI-provider failure persistence/circuit-breaker (suggestion #1 from
  the prior round) and the shared-astro-constants consolidation
  (#2) and an automated test suite (#3) are still open — flagged
  again below in case you want them next, but not built this pass
  since the ephemeris fix was the highest-priority "prediction
  compromise" item.

## Suggested rollout order

1. Deploy code.
2. `GET /api/admin/migrate-kundlis` then `POST` (if any rows still
   lack `lagna` — existing feature, unrelated to this one).
3. `GET /api/admin/migrate-support-chain` to see the count, then
   `POST` with `{}` (all) or `{ "ids": [...] }` for a batch.
4. Spot-check a couple of migrated kundlis in `/chat` — ask for a
   remedy and confirm it references `remedyPlan.focusPlanets`
   correctly (support planet vs weak planet vs both).
5. On `/profile`, confirm old kundlis (gender = null) show the
   "⚠ लिंग सेट करें" prompt and that tapping a gender option updates
   it without a page reload or AI re-run.
6. Optional: set `EPHEMERIS_SERVICE_URL` to something briefly invalid
   in a staging env and confirm creating a kundli returns a clean 503
   with a retry message instead of ever saving one — this is the one
   behavior change most worth manually verifying before relying on it.


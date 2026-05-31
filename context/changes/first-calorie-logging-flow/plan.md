# First calorie logging flow Implementation Plan

## Overview

Implement the first end-to-end calorie tracking loop on top of the persisted nutrition foundation. After this change, an authenticated user can complete the profile fields needed for calorie calculations, get an automatic daily calorie limit when possible, submit free-text meals for server-side parsing, see saved calories/macros and today's running total, receive near-limit and over-limit warnings, retry nutrition extraction when a parse fails, and correct saved meals later in the same change.

## Current State Analysis

The app already persists profile data and raw meal entries behind Supabase-backed POST + redirect routes, then renders both on the SSR dashboard. What is still missing is everything that turns those saved records into calorie tracking: derived daily budget logic, nutrition parsing integration, daily aggregation, warning states, and any correction flow for saved meals.

### Key Discoveries:

- The dashboard already loads profile and meal data server-side in one place, so S-01 can extend a single SSR composition point instead of introducing a second protected surface (`src/pages/dashboard.astro:24-60`).
- Profile persistence is complete and already contains both the inputs needed for an automatic calorie calculation and a manual override field (`src/lib/nutrition-records.ts:20-38`, `src/components/profile/ProfileForm.astro:39-89`).
- Meal persistence is still add-and-read only, with nullable nutrition columns already available in the schema but no parser or daily summary logic yet (`supabase/migrations/20260527192001_create_meals.sql:1-42`, `src/pages/api/meals/index.ts:45-66`).
- Request logging, auth checks, and graceful config gating are already standardized for server routes and should remain the outer control flow for any parser integration (`src/lib/request-context.ts:21-45`, `src/lib/supabase.ts:13-39`, `src/pages/api/profile/index.ts:14-66`).
- F-01 review explicitly resolved that meal edit/delete does not belong in the foundation change and should arrive later within S-01 instead (`context/changes/nutrition-record-foundation/follow-ups/review-fixes.md`).
- The repo already treats OpenRouter as the intended future AI dependency, but it is not yet part of the runtime contract, so S-01 must introduce that server-only configuration explicitly (`README.md:77-86`, `context/changes/deployment/deployment-runbook.md:5-20`).

## Desired End State

An authenticated user lands on `/dashboard`, sees either a computed daily calorie budget or a clear "complete profile to unlock calorie limit" state, logs a meal in free text, and gets that meal saved with calories plus macros when parsing succeeds. The dashboard hero shows today's total calories and a two-state warning model (near limit / over limit), while the meal section shows per-meal nutrition, a visible "nutrition unavailable" state when parsing fails, and a manual retry path for failed nutrition extraction.

The slice also completes the correction loop promised after F-01 review by adding edit/delete for saved meals as a later phase within the same change, after the main parse/save/totals/warnings path is working.

### Key Decisions Made

- Auto-calculate the daily limit from profile data when no manual override is present, using a simple documented BMR/TDEE-style formula.
- Keep meal logging available even when the profile is too incomplete to compute the limit; show a blocked-limit state rather than blocking the journal.
- Run meal parsing synchronously during submission, but if parsing fails, still save the meal with empty nutrition, show a warning, and expose a manual retry action.
- Persist calories plus macros per meal when available.
- Surface the primary daily calorie status in the dashboard hero, with supporting details in the meal section.
- Deliver meal edit/delete as a later phase inside S-01, not before the main calorie loop works.
- Use a server-side parser service behind a small interface and explicit env config, with graceful behavior when parsing is unavailable.

## What We're NOT Doing

- No client-side AI calls or public API keys.
- No background queue or delayed nutrition extraction pipeline in this slice.
- No per-user timezone settings UI or persistence; S-01 uses a single MVP timezone assumption.
- No ingredient-level breakdown, confidence-scoring UI, or parser explanation transcript.
- No charts, weekly trends, or historical analytics beyond today's total and meal-level nutrition.
- No extra protected routes beyond the existing dashboard surface.
- No meal correction in F-01 foundation; edit/delete arrives only in the final S-01 phase.

## Implementation Approach

Extend the existing SSR dashboard and POST + redirect backend pattern instead of introducing a new application flow. Keep domain logic in `src/lib/` modules, add a server-only parser service boundary for OpenRouter-backed nutrition extraction, update meal persistence so the same record can carry parsed nutrition and parser status, and derive daily totals + warning state on the server before rendering the dashboard.

## Critical Implementation Details

### Timing & lifecycle

Meal submission should remain a single synchronous request/response loop for the happy path so users see updated totals immediately after redirect. The fallback path must still persist the raw meal when parsing fails, which means the save operation cannot depend on a successful parser response.

### State sequencing

The effective calorie budget is derived in priority order: manual override first, otherwise automatic calculation when the profile is sufficiently complete, otherwise "limit unavailable". Warning state must be computed only when both the daily total and an effective limit exist; incomplete-profile and parse-failure states are separate UI states, not warning variants.

### Debug & observability

All parser calls and retry flows should reuse the existing request-context logging pattern so failures can be traced by `requestId`. Parser-missing-config, parser-success, parser-failure, and retry outcomes should each produce distinct server log events.

## Phase 1: Calorie budget and daily summary foundation

### Overview

Add the data model and server-side domain logic needed to compute an effective daily calorie budget and today's aggregate nutrition summary from existing profile and meal records.

### Changes Required:

#### 1. Nutrition goal and summary domain helpers

**File**: `src/lib/nutrition-goals.ts`

**Intent**: Introduce a dedicated server-side module for effective calorie budget calculation and warning-state derivation so pages and routes stay thin. This module owns the documented BMR/TDEE-style fallback formula and the manual-override precedence rule.

**Contract**: Export typed helpers for `getEffectiveDailyCalorieLimit(profile)` and `getDailyCalorieWarning(summary, limit)` that return structured states for "manual", "automatic", or "unavailable" budget and "normal", "near_limit", or "over_limit" warning status.

#### 2. Meal-query extensions for today's nutrition summary

**File**: `src/lib/nutrition-records.ts`

**Intent**: Extend the existing data-access layer so dashboard rendering can ask for today's meals and aggregate calories/macros without duplicating query logic in Astro pages. Keep user ownership derived from the authenticated server context as in F-01.

**Contract**: Add typed helpers to fetch meals scoped to the active MVP day boundary and to return a summary object with today's meals, total calories, and summed macros for the current user.

#### 3. Day-boundary utility

**File**: `src/lib/nutrition-day.ts`

**Intent**: Centralize the MVP definition of "today" so routes, summaries, and retries all use the same date window. This prevents divergent UTC vs local-day handling from leaking into multiple call sites.

**Contract**: Export a small helper that derives the current day window for the request/session timezone assumption used in S-01 and returns values suitable for Supabase date filtering.

#### 4. Dashboard loader composition

**File**: `src/pages/dashboard.astro`

**Intent**: Expand the SSR loader so it fetches the profile, today's meals, and the derived calorie-budget summary in one place before rendering. Preserve the existing graceful error handling and generic user-facing dashboard error messaging from the review fixes.

**Contract**: Load and pass a structured dashboard view-model that includes profile completeness state, effective daily limit, today's totals, and warning status alongside the existing meal list.

### Success Criteria:

#### Automated Verification:

- Astro types stay in sync after adding new server-side modules: `npx astro sync`
- Linting passes with the new summary and budget helpers: `npm run lint`
- Production build passes with the expanded dashboard loader: `npm run build`

#### Manual Verification:

- A user with a complete profile sees an automatic daily calorie limit on the dashboard when no manual override is set
- A user with an incomplete profile can still use the meal journal and sees a clear "complete profile to unlock calorie limit" state
- A saved manual calorie limit still takes precedence over the automatic calculation

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Meal parsing, persistence, and retry flow

### Overview

Introduce server-side nutrition parsing for free-text meals, persist calories/macros when parsing succeeds, and add the fallback + retry behavior when parsing does not return usable nutrition data.

### Changes Required:

#### 1. Parser configuration contract

**File**: `astro.config.mjs`

**Intent**: Extend the server env schema to include the parser provider secrets required for S-01. Keep them server-only and optional so local/dev environments without parser config can still render a graceful degraded state.

**Contract**: Add server-secret env entries for the OpenRouter integration needed by the parser service and keep them out of any client-exposed contract.

#### 2. Meal parser service boundary

**File**: `src/lib/services/meal-parser.ts`

**Intent**: Encapsulate OpenRouter-backed nutrition extraction behind a small interface so the API route does not embed provider-specific request formatting. This keeps the integration swappable and testable at the module boundary.

**Contract**: Export a server-only parser function that accepts free-text meal input and returns either structured nutrition (`calories`, `protein`, `carbs`, `fat`) or a typed "unavailable" result that routes can handle explicitly.

#### 3. Meal persistence and retry helpers

**File**: `src/lib/nutrition-records.ts`

**Intent**: Extend meal writes so one flow can save parsed nutrition when available and save a raw meal with empty nutrition when parsing fails. Add a targeted helper for retrying nutrition extraction against an existing meal record.

**Contract**: Support create/update operations that can persist nutrition columns and re-run parser-derived nutrition for an existing owner-scoped meal record.

#### 4. Meal route validation and submission flow

**File**: `src/lib/nutrition-validation.ts`

**Intent**: Add any route-level validation needed for retry and later correction flows while preserving the existing shared Zod pattern.

**Contract**: Keep meal creation validation centered on `meal_text`, and add a minimal validated payload for retry/edit/delete operations introduced later in the slice.

#### 5. Meal submission and retry API routes

**File**: `src/pages/api/meals/index.ts`

**Intent**: Replace the raw-save-only route with a parser-aware flow that logs parser states, saves the meal either with nutrition or with an unavailable state, and redirects back with explicit success/warning feedback. Reuse the same auth/config/requestId control flow already used by existing POST routes.

**Contract**: `POST /api/meals` remains the create route, but it must now call the parser service before finalizing the saved meal payload; when parsing fails, it still persists the meal and redirects with a warning-safe query param.

#### 6. Manual retry route

**File**: `src/pages/api/meals/retry.ts`

**Intent**: Add a dedicated route for re-running nutrition extraction on a saved meal without conflating that behavior with create. This keeps retry semantics explicit and fits the repo's route-per-action convention.

**Contract**: Expose a POST-only owner-scoped retry endpoint that re-parses one saved meal, updates nutrition fields when successful, and redirects back to `/dashboard` with success/error feedback.

#### 7. Schema and generated type updates for parser state

**File**: `supabase/migrations/<timestamp>_add_meal_nutrition_status.sql`

**Intent**: Persist enough meal status to distinguish successful nutrition extraction from "nutrition unavailable" so the UI and retry flow can be accurate without inference from null fields alone.

**Contract**: Add explicit meal parser status metadata plus any supporting columns needed for retry-safe rendering, then update `src/lib/database.types.ts` to reflect the new schema.

### Success Criteria:

#### Automated Verification:

- Supabase migrations apply cleanly with the new meal parser status contract: `npx supabase db reset`
- Astro types stay in sync after the new routes and env schema: `npx astro sync`
- Linting passes with the parser service and retry route added: `npm run lint`
- Production build passes with parser-aware routes and persistence logic: `npm run build`

#### Manual Verification:

- Submitting a valid meal with parser config present saves the meal and shows calories plus macros on the dashboard
- When parsing fails, the meal is still saved, calories/macros stay empty, and the user sees a visible warning state instead of losing the entry
- Retrying a failed meal from the dashboard updates that same meal when nutrition extraction later succeeds

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Dashboard totals, warning states, and nutrition feedback UI

### Overview

Surface the new calorie-tracking information in the dashboard hero and meal journal so users can understand today's budget, current intake, and parser outcomes at a glance.

### Changes Required:

#### 1. Dashboard hero status panel

**File**: `src/components/dashboard/DashboardHero.astro`

**Intent**: Turn the current foundation placeholder into the primary daily calorie status surface. This is where the slice's top-level budget, total, and warning signal should live.

**Contract**: Accept props for effective daily limit, today's calories, warning state, and incomplete-profile state, then render a stable summary UI that distinguishes normal, near-limit, over-limit, and unavailable-limit cases.

#### 2. Meal journal section summary

**File**: `src/components/meals/MealJournalSection.astro`

**Intent**: Add supporting context below the hero so users can see the meal journal as part of a single daily loop instead of a raw text box plus history. Keep the section responsible for entry form, meal history, and daily supporting details.

**Contract**: Render today's total calories/macros summary and the parser warning state above the entry form/history while continuing to accept server-provided meal data from `dashboard.astro`.

#### 3. Per-meal nutrition and retry affordances

**File**: `src/components/meals/MealHistory.astro`

**Intent**: Replace the current "Foundation" placeholder badge with actual meal nutrition state. Failed parses should be visible, not silent, and each failed meal should expose a manual retry action.

**Contract**: Render calories/macros when available, a "nutrition unavailable" state when not, and a retry form/action for meals eligible for manual re-parse.

#### 4. Meal entry form feedback adjustments

**File**: `src/components/meals/MealEntryForm.astro`

**Intent**: Adjust the copy and any hidden fields/action targeting needed for the parser-aware journal flow while keeping the interaction server-driven and non-JS-dependent by default.

**Contract**: The form remains a standard HTML POST to `/api/meals`, but its UX copy should now describe parsing and retry expectations rather than saying nutrition enrichment comes later.

#### 5. Dashboard page wiring

**File**: `src/pages/dashboard.astro`

**Intent**: Pass the new summary data and parser-aware meal records into the hero and meal components without shifting auth or data-loading responsibility into child components.

**Contract**: Keep `dashboard.astro` as the single SSR composition layer that gathers and distributes the new calorie-tracking view-model.

### Success Criteria:

#### Automated Verification:

- Astro types stay in sync after the dashboard prop contracts change: `npx astro sync`
- Linting passes with the new dashboard hero and meal history states: `npm run lint`
- Production build passes with the SSR calorie-tracking UI: `npm run build`

#### Manual Verification:

- The dashboard hero shows today's calorie total and the effective limit when enough data exists
- The UI shows a near-limit state before the user goes over budget and a distinct over-limit state after crossing it
- Each saved meal shows either nutrition details or an explicit "nutrition unavailable" state with a retry action

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Meal correction flow inside S-01

### Overview

Finish the user loop by adding meal edit/delete after the main calorie-tracking path is working, matching the post-review decision that correction belongs inside S-01 rather than the F-01 foundation change.

### Changes Required:

#### 1. Meal ownership delete policy completion

**File**: `supabase/migrations/<timestamp>_enable_meal_delete.sql`

**Intent**: Finish the remaining owner-scoped meal permissions after retry support is already in place. Update access lands with parser status in Phase 2 so retries can mutate existing meals, while delete remains phase-scoped here.

**Contract**: Add the remaining authenticated owner-scoped `delete` grant/policy for `public.meals`, keeping the correction flow owner-scoped end to end.

#### 2. Meal update/delete helpers

**File**: `src/lib/nutrition-records.ts`

**Intent**: Add focused data-access helpers for editing and deleting one owner-scoped meal without spreading Supabase mutation logic across routes.

**Contract**: Export typed helpers for update and delete operations that require a meal id plus the current authenticated user id.

#### 3. Correction routes

**File**: `src/pages/api/meals/update.ts`

**Intent**: Add explicit route actions for meal correction that preserve the current route-per-action pattern and request logging semantics.

**Contract**: Introduce POST-only update/delete endpoints that validate ownership, re-run parsing when edited meal text changes, and redirect back with success/error feedback.

#### 4. Meal history correction UI

**File**: `src/components/meals/MealHistory.astro`

**Intent**: Add correction controls only after nutrition rendering and retry states are already stable. Keep the controls lightweight and aligned with the same server-driven form pattern used elsewhere in the app.

**Contract**: Render edit/delete affordances per saved meal and preserve the existing nutrition-state display for successful and failed parses.

### Success Criteria:

#### Automated Verification:

- Supabase migrations apply cleanly with meal update/delete policies added: `npx supabase db reset`
- Astro types stay in sync after correction routes and contracts are added: `npx astro sync`
- Linting passes with meal correction UI and routes: `npm run lint`
- Production build passes with the completed S-01 meal lifecycle: `npm run build`

#### Manual Verification:

- Editing a saved meal updates its text and re-runs nutrition extraction before the dashboard refresh
- Deleting a saved meal removes it from today's totals and meal history after redirect
- Correction controls remain owner-scoped and do not break the retry path for failed nutrition states

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

## Testing Strategy

### Unit Tests:

- Validate the calorie-limit helper across manual override, complete-profile auto-calc, and incomplete-profile unavailable states
- Validate warning-state derivation for normal, near-limit, and over-limit totals
- Validate parser-result mapping into success vs unavailable persistence payloads
- Validate day-boundary helper behavior for the chosen MVP timezone assumption

### Integration Tests:

- Submit a meal with parser success and confirm the redirect lands on an updated daily summary
- Submit a meal with parser failure and confirm the meal persists with an unavailable-nutrition state plus retry affordance
- Retry a failed meal and confirm the existing record is updated rather than duplicated
- Edit or delete a saved meal in Phase 4 and confirm today's totals recompute correctly

### Manual Testing Steps:

1. Save a complete profile and verify the dashboard shows an automatically computed calorie limit when no manual limit is set.
2. Save a manual calorie limit and verify it overrides the automatic one.
3. Submit a meal that should parse cleanly and verify calories/macros appear in the meal list and in today's summary.
4. Trigger a parser failure scenario and verify the meal is still saved, the UI shows "nutrition unavailable", and retry is offered.
5. Retry a failed meal and verify the same meal updates when parsing succeeds.
6. Edit and delete saved meals in the final phase and verify totals/warnings refresh correctly.

## Performance Considerations

- Daily totals should be computed from a tightly scoped "today" query, not from the full recent history list, so the dashboard does not degrade as meal history grows.
- The parser call is on the critical path for meal submission in the happy path, so request timeouts and failure handling need to be explicit; degraded success should be faster than repeated blocking retries.
- The dashboard should reuse one server-computed summary model rather than recomputing warning logic independently in multiple components.

## Migration Notes

- S-01 introduces the first non-Supabase runtime secret beyond the current deployment contract, so `.env`, `.dev.vars`, CI secrets, and Cloudflare production secrets all need coordinated updates when parser integration lands.
- Add parser-status migration before wiring retry and correction UI so failed/successful nutrition states can be represented explicitly from the start.
- Ship the `update` policy with the parser-status migration so the retry route can mutate existing meals safely, then add `delete` in Phase 4 when correction controls land.

## References

- Roadmap slice: `context/foundation/roadmap.md`
- Product requirements: `context/foundation/prd.md`
- F-01 review follow-up: `context/changes/nutrition-record-foundation/follow-ups/review-fixes.md`
- Dashboard SSR composition: `src/pages/dashboard.astro:24-60`
- Existing meal route pattern: `src/pages/api/meals/index.ts:9-67`
- Profile data inputs: `src/components/profile/ProfileForm.astro:39-89`
- Meal history rendering baseline: `src/components/meals/MealHistory.astro:15-34`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Calorie budget and daily summary foundation

#### Automated

- [x] 1.1 Astro types stay in sync after adding new server-side modules
- [x] 1.2 Linting passes with the new summary and budget helpers
- [x] 1.3 Production build passes with the expanded dashboard loader

#### Manual

- [x] 1.4 A user with a complete profile sees an automatic daily calorie limit on the dashboard when no manual override is set
- [x] 1.5 A user with an incomplete profile can still use the meal journal and sees a clear "complete profile to unlock calorie limit" state
- [x] 1.6 A saved manual calorie limit still takes precedence over the automatic calculation

### Phase 2: Meal parsing, persistence, and retry flow

#### Automated

- [x] 2.1 Supabase migrations apply cleanly with the new meal parser status contract
- [x] 2.2 Astro types stay in sync after the new routes and env schema
- [x] 2.3 Linting passes with the parser service and retry route added
- [x] 2.4 Production build passes with parser-aware routes and persistence logic

#### Manual

- [x] 2.5 Submitting a valid meal with parser config present saves the meal and shows calories plus macros on the dashboard
- [x] 2.6 When parsing fails, the meal is still saved, calories/macros stay empty, and the user sees a visible warning state instead of losing the entry
- [x] 2.7 Retrying a failed meal from the dashboard updates that same meal when nutrition extraction later succeeds

### Phase 3: Dashboard totals, warning states, and nutrition feedback UI

#### Automated

- [x] 3.1 Astro types stay in sync after the dashboard prop contracts change
- [x] 3.2 Linting passes with the new dashboard hero and meal history states
- [x] 3.3 Production build passes with the SSR calorie-tracking UI

#### Manual

- [x] 3.4 The dashboard hero shows today's calorie total and the effective limit when enough data exists
- [x] 3.5 The UI shows a near-limit state before the user goes over budget and a distinct over-limit state after crossing it
- [x] 3.6 Each saved meal shows either nutrition details or an explicit "nutrition unavailable" state with a retry action

### Phase 4: Meal correction flow inside S-01

#### Automated

- [x] 4.1 Supabase migrations apply cleanly with meal update/delete policies added
- [x] 4.2 Astro types stay in sync after correction routes and contracts are added
- [x] 4.3 Linting passes with meal correction UI and routes
- [x] 4.4 Production build passes with the completed S-01 meal lifecycle

#### Manual

- [x] 4.5 Editing a saved meal updates its text and re-runs nutrition extraction before the dashboard refresh
- [x] 4.6 Deleting a saved meal removes it from today's totals and meal history after redirect
- [x] 4.7 Correction controls remain owner-scoped and do not break the retry path for failed nutrition states

---

## Discovered Scope

The following additions were not in the original plan but were introduced during live testing to fix real OpenRouter API quirks. They are documented here so future reviewers understand their origin.

### 1. OpenRouter error envelope detection (`meal-parser.ts`)

**Location**: `src/lib/services/meal-parser.ts` — `openRouterErrorSchema`

A 200 OK response from OpenRouter can carry `{"error": {"message": "..."}}` in the body (e.g., model quota exceeded). Without the envelope check the parser tried to extract `choices` from an error object and produced a confusing `invalid_response` result. The fix adds a `safeParse` check against `openRouterErrorSchema` before parsing `choices`, returning a proper `provider_error` result with the error message.

### 2. Array response normalization (`meal-parser.ts`)

**Location**: `src/lib/services/meal-parser.ts` — `normalizeParsedNutritionPayload()`

Despite `response_format: {type: "json_object"}`, `gpt-4.1-mini` occasionally returns a JSON array instead of a single object. The fix wraps the parsed payload in a normalizer that first tries the direct object schema and falls back to accepting `array[0]`, aligning with the model's actual behavior.

### 3. Rich parser log fields on meal routes

**Location**: `src/pages/api/meals/index.ts`, `retry.ts`, `update.ts`

The initial warning log on parser failures carried only `reason`. Added `detail`, `providerStatus`, and `message` fields so log entries are self-contained and failures can be diagnosed without replaying the request.


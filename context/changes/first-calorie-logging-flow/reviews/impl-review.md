<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: First calorie logging flow

- **Plan**: `C:\Projects\context\changes\first-calorie-logging-flow\plan.md`
- **Scope**: Phases 1-4 of 4
- **Date**: 2026-05-29
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — README still contradicts the shipped calorie-tracking implementation

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `README.md:139`, `README.md:184`
- **Detail**: The change correctly adds parser env documentation, but the README still says “No database tables or migrations are required” and still describes the runtime contract as only `SUPABASE_URL` and `SUPABASE_KEY`. That documentation now conflicts with the implemented profiles/meals schema plus optional `OPENROUTER_*` parser contract.
- **Fix**: Update the stale README statements so the setup and deployment guidance matches the actual meals/profile migrations and optional parser configuration.
- **Decision**: FIXED

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/lib/services/meal-parser.ts:6`
- **Detail**: `REQUEST_TIMEOUT_MS = 40_000` (40 s). Cloudflare Workers free tier enforces a 30 s wall-clock limit. The `AbortController` fires at 40 s, but CF will terminate the Worker at ~30 s with a **524 error page** rather than the app's graceful "Meal saved, but nutrition unavailable" flash message. Local dev via `npm run dev` is not affected.
- **Fix A ⭐ Recommended**: Reduce `REQUEST_TIMEOUT_MS` to `25_000` (25 s) so the abort fires before CF's wall-clock limit.
  - Strength: User always sees the app's own graceful fallback instead of a bare CF error page. No plan change required.
  - Tradeoff: Models that respond in 25–40 s will now time out where they previously succeeded.
  - Confidence: HIGH — Cloudflare docs confirm 30 s default wall-clock for the free plan.
  - Blind spot: Actual p95 latency of the configured model is unknown; if it reliably responds <25 s the tradeoff is negligible.
- **Fix B**: Document in the deployment runbook that Workers Paid is required, and set `wrangler.jsonc` `limits.cpu_ms` accordingly.
  - Strength: Preserves the full 40 s window; correct long-term.
  - Tradeoff: Adds a paid-plan dependency to the MVP.
  - Confidence: MEDIUM — requires coordinating infra decisions outside this code change.
  - Blind spot: Haven't verified whether `wrangler.jsonc` already sets custom limits.
- **Decision**: FIXED — reduced to 28 000 ms (stays under CF Workers 30 s wall-clock limit)

### F3 — Retry route has no server-side guard against re-parsing successful meals

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/pages/api/meals/retry.ts:47–50`
- **Detail**: The retry route fetches the meal and immediately calls `parseMealNutrition()` without checking `meal.parser_status`. A meal with `parser_status = 'success'` can be re-parsed via a crafted POST, potentially overwriting correct nutrition with a failed or differently rounded result. The UI renders the retry button only for failed meals, so this is not reachable via normal use — but there is no server-side enforcement.
- **Fix**: Before calling the parser, add `if (meal.parser_status === 'success')` and redirect with `mealError` (or silently no-op). The pattern for this kind of early exit is already used at lines 33–44 in the same file.
- **Decision**: FIXED — added parser_status === 'success' guard before calling parser

### F4 — Daily totals silently truncated at 50 meals per day

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/lib/nutrition-records.ts:241`
- **Detail**: `listMealsForUserOnDay` defaults to `limit = 50`. If a user logs >50 meals in a day, `getDailyMealSummary()` silently undercounts calories. The plan's performance section called for a "tightly scoped today query" but didn't resolve this cap. For MVP the threshold is almost never reached, but the silent failure mode is a correctness gap.
- **Fix**: Add a code comment documenting the known 50-meal MVP cap, or replace the in-memory `reduce` with a separate `SUM` aggregate query not subject to the display limit.
- **Decision**: FIXED — added comment documenting the 50-meal MVP cap

### F5 — Unplanned additions in meal-parser.ts not reflected in the plan

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `src/lib/services/meal-parser.ts:18–50, 124–138, 214–227`
- **Detail**: Three additions not in the original plan: (1) `openRouterErrorSchema` — handles 200 OK responses carrying an error envelope, (2) `normalizeParsedNutritionPayload()` — handles the model returning a JSON array instead of an object, (3) `detail`/`providerStatus`/`message` log fields in all three meal routes. All three were bug fixes discovered during live testing; they improve reliability and are benign.
- **Fix**: Append a short "Discovered scope" addendum to the plan noting the three additions and why they were needed. Keeps the plan accurate for future reviewers.
- **Decision**: FIXED — added "Discovered Scope" addendum to plan.md

## Automated verification

| Command | Result | Notes |
|---|---|---|
| `npx supabase db reset` | PASS | Applied all migrations through `20260529203600_enable_meal_delete.sql` successfully. |
| `npx astro sync` | PASS | Astro types generated successfully. |
| `npm run lint` | PASS | ESLint passed; Astro parser emitted repeated `projectService` warnings only. |
| `npm run build` | PASS | Production build passed; sitemap warning remains because `site` is unset. |

## Manual verification review

All manual checklist items in the plan are marked complete. The implementation contains corresponding code paths for:

- automatic vs manual calorie limit precedence
- meal logging while the calorie limit is unavailable
- parse-failure fallback with meal persistence and warning feedback
- retry, edit, and delete flows scoped to the current owner
- dashboard hero and meal journal totals/warning states

This review did not execute browser-based manual flows, but the completed checklist items are supported by observable code changes rather than obvious rubber-stamping.

## Planned area review

| File / area | What the plan expected | What exists now | Verdict |
|---|---|---|---|
| `src/lib/nutrition-goals.ts` | `getEffectiveDailyCalorieLimit(profile)` and `getDailyCalorieWarning(summary, limit)` with manual/automatic/unavailable and normal/near_limit/over_limit states | Exports both helpers with typed unions and warning-state derivation | MATCH |
| `src/lib/nutrition-records.ts` (Phase 1) | Typed helpers for today’s meals and daily summary totals/macros | Adds day-scoped meal query and `getDailyMealSummary()` reducer | MATCH |
| `src/lib/nutrition-day.ts` | Central helper for today’s day window | Adds `getNutritionDayWindow()` returning `dateKey`, `startIso`, `endIso`, `timeZone` | MATCH |
| `src/pages/dashboard.astro` (Phase 1) | Single SSR composition layer for profile, daily meals, effective limit, totals, warning status | Loads profile + today’s meals in parallel and computes summary, limit, warning before rendering | MATCH |
| `astro.config.mjs` | Optional server-only OpenRouter parser env entries | Adds optional secret `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` | MATCH |
| `src/lib/services/meal-parser.ts` | Server-only parser returning structured nutrition or typed unavailable result | Implements OpenRouter-backed parser with success/unavailable result union and timeout/error handling | MATCH |
| `src/lib/nutrition-records.ts` (Phase 2) | Persist parsed nutrition/unavailable state and retry updates | Adds persistence mapper plus owner-scoped retry update helper | MATCH |
| `src/lib/nutrition-validation.ts` | Shared Zod payloads for retry/edit/delete | Adds `meal_id` and edit schemas alongside meal create validation | MATCH |
| `src/pages/api/meals/index.ts` | Parser-aware create route that still saves meal on parse failure with warning-safe redirect | Parses synchronously, always saves meal, redirects with success or warning query params | MATCH |
| `src/pages/api/meals/retry.ts` | POST owner-scoped retry route updating same meal | Fetches owner meal, re-runs parser, updates same record, redirects with feedback | MATCH |
| `supabase/migrations/20260529203500_add_meal_parser_status.sql` + `src/lib/database.types.ts` | Explicit parser status metadata and generated types | Adds parser status/error/attempted columns, update policy, and regenerated TS types | MATCH |
| `src/components/dashboard/DashboardHero.astro` | Hero states for totals + limit + normal/near_limit/over_limit/unavailable | Renders daily calories, effective limit, unavailable copy, and normal/near/over labels | MATCH |
| `src/components/meals/MealJournalSection.astro` | Summary context for today’s calories/macros and parser warning state | Renders totals/macros summary and parser-pending notice above form/history | MATCH |
| `src/components/meals/MealHistory.astro` (Phase 3) | Meal-level nutrition state and retry action | Renders nutrition cards or unavailable state plus retry form | MATCH |
| `src/components/meals/MealEntryForm.astro` | Parser-aware copy for server-driven form | Updates copy to describe automatic parsing plus retry/edit fallback | MATCH |
| `src/pages/dashboard.astro` (Phase 3) | Wire new summary data into components | Passes summary/limit/warning data into hero and meal journal components | MATCH |
| `supabase/migrations/20260529203600_enable_meal_delete.sql` | Owner-scoped delete grant/policy | Adds authenticated delete grant and owner delete policy only | MATCH |
| `src/lib/nutrition-records.ts` (Phase 4) | Update/delete helpers for owner-scoped meal changes | Adds owner-scoped `updateMealForUser()` and `deleteMealForUser()` helpers | MATCH |
| `src/pages/api/meals/update.ts` and `src/pages/api/meals/delete.ts` | POST-only correction routes | Adds POST update/delete handlers with validation, auth, logging, and redirect feedback | MATCH |
| `src/components/meals/MealHistory.astro` (Phase 4) | Edit/delete affordances while preserving nutrition display | Adds edit disclosure form and delete form while keeping nutrition state UI intact | MATCH |

## Extra files / scope check

| File / area | What exists now | Verdict |
|---|---|---|
| `src/components/dashboard/FlashMessage.astro` | New shared flash-message component used by `dashboard.astro` for error/success/warning redirects | EXTRA (acceptable support code) |
| `README.md` | Parser env docs added, but stale migration/runtime-contract lines remain | EXTRA (acceptable, but see F1) |
| `.env.example` | Adds optional `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` examples | EXTRA (acceptable support docs) |
| `.dev.vars.example` | Adds optional `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` examples | EXTRA (acceptable support docs) |

No material scope creep was found beyond the plan guardrails. The implementation stays server-side for parsing, does not add new protected routes, does not introduce background extraction, and does not extend analytics beyond today’s totals and meal nutrition.

# Remaining Budget Food Suggestions Implementation Plan

## Overview

S-03 adds food suggestions constrained by remaining daily calorie budget (FR-008). The feature is shown on Dashboard below Hero, uses deterministic local logic, and supports two modes: fallback catalog for low-data users and history-based personalization after enough meal-text evidence is available.

## Current State Analysis

- Dashboard currently calculates calorie budget state (`normal`, `near_limit`, `over_limit`, `unavailable`) and renders summary UI, but no suggestion block exists.
- `DailyMealSummary` and `DailyCalorieWarning` are already computed server-side and available in `dashboard.astro`.
- Data model stores `meal_text` and nutrition totals per meal, but no structured ingredient list.
- There is no recommendation service/module in `src/lib` today.

### Key Discoveries:

- `dashboard.astro` already wires `effectiveLimit`, `calorieWarning`, and day meals, so suggestion computation can remain server-side in page load flow (`src/pages/dashboard.astro`).
- Calorie-limit semantics are centralized in `src/lib/nutrition-goals.ts`; S-03 should follow this as the source of truth for `unavailable` / `over_limit`.
- Parser and DB contracts only expose `meal_text` + macros (`src/lib/services/meal-parser.ts`, `src/lib/database.types.ts`), so ingredient readiness must use `meal_text` token heuristics (no migration in S-03).

## Desired End State

Dashboard shows a suggestion card under Hero and above meal journal when:
1. daily calorie limit is available, and
2. remaining calories are greater than zero.

The card displays exactly 3 suggestions that each fit the remaining budget. For low-data users, suggestions come from a static MVP catalog. After at least 10 unique normalized ingredient-like tokens are detected from successfully parsed meal texts, suggestions switch to history-informed ranking.

### Verification of End State

- User without configured calorie limit sees a CTA-style message and no suggestions list.
- User over limit sees over-limit messaging and no suggestions list.
- User with budget remaining sees 3 budget-fitting suggestions.
- Mode transition works: fallback before threshold, personalized mode after threshold.

## What We're NOT Doing

- No DB migration or schema change for structured ingredients/preferences.
- No external AI call for recommendations in S-03.
- No exclusion/allergen personalization yet.
- No API endpoint for suggestions; logic remains server-side in dashboard rendering.
- No editing flow for accepting/rejecting suggestions.

## Implementation Approach

Implement a pure server-side recommendation service in `src/lib` and call it from `dashboard.astro`. The service receives day meals + calorie warning context and returns a typed view model for three states: `hidden_unavailable`, `hidden_over_limit`, `visible_suggestions`.

Suggestion generation strategy:
- **Fallback mode**: static in-code catalog with calorie values.
- **Personalized mode**: derive frequent normalized tokens from successful `meal_text` entries, map token patterns to catalog items, and rank candidates while enforcing `calories <= remainingCalories`.
- Threshold to enable personalized mode: minimum 10 unique normalized tokens.

## Critical Implementation Details

### State sequencing

Evaluate visibility guardrails first (`unavailable`, `over_limit`) and return hidden states immediately. Only then compute candidate suggestions; this avoids contradictory UI (showing food when status says unavailable/over-limit).

### User experience spec

Section placement is fixed: below `DashboardHero` and above meal journal. Keep copy explicit about why suggestions are hidden for `unavailable` and `over_limit` states.

## Phase 1: Build suggestion domain service

### Overview

Create a dedicated service that computes suggestion state and items from existing dashboard data without introducing persistence or API changes.

### Changes Required:

#### 1. New suggestion types and catalog

**File**: `src/lib/services/food-suggestions.ts`

**Intent**: Introduce strongly typed domain model for suggestions and the static MVP catalog used in fallback mode.

**Contract**: Export `FoodSuggestion`, `FoodSuggestionState`, and `FoodSuggestionsResult` types; export immutable catalog of MVP suggestions with at least `{ id, name, calories, tags }`.

#### 2. Token normalization and readiness threshold

**File**: `src/lib/services/food-suggestions.ts`

**Intent**: Implement meal-text token extraction and normalization to support threshold-based personalization readiness.

**Contract**: Export helper that derives normalized ingredient-like tokens from `meal_text` of meals with `parser_status === "success"`, applies stop-word filtering, and reports `isPersonalizationReady` when unique-token count is `>= 10`.

#### 3. Main suggestion computation

**File**: `src/lib/services/food-suggestions.ts`

**Intent**: Compute final result state and top 3 suggestions using remaining calories and readiness mode.

**Contract**: Export `getFoodSuggestionsForRemainingBudget(input)` returning:
- `hidden_unavailable` when calorie limit is unavailable,
- `hidden_over_limit` when remaining calories `<= 0`,
- `visible_suggestions` with exactly 3 items (or fewer only if catalog constraint makes that impossible, explicitly flagged in result metadata).

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- For unavailable limit input, service returns `hidden_unavailable`.
- For over-limit input, service returns `hidden_over_limit`.
- For remaining budget input, service returns budget-fitting items (`item.calories <= remainingCalories`).
- Before 10 unique tokens, result metadata indicates fallback mode.
- At/after 10 unique tokens, result metadata indicates personalized mode.

---

## Phase 2: Integrate suggestions into dashboard UI

### Overview

Wire suggestion service into dashboard page load and render a dedicated suggestions section under Hero.

### Changes Required:

#### 1. Compute suggestion view-model in dashboard page

**File**: `src/pages/dashboard.astro`

**Intent**: Call suggestion service with existing meals, summary, and calorie warning context.

**Contract**: Add server-side `foodSuggestions` object to page data flow; no client fetch; no new route.

#### 2. New suggestions presentation component

**File**: `src/components/dashboard/FoodSuggestions.astro`

**Intent**: Render stateful block for hidden/visible modes with concise copy and 3-item list style consistent with dashboard design.

**Contract**: Props include typed `foodSuggestions`; component handles:
- unavailable state (CTA to profile completion),
- over-limit state (limit exceeded message),
- visible state (3 suggestion chips/cards with calories).

#### 3. Place component in dashboard layout

**File**: `src/pages/dashboard.astro`

**Intent**: Insert component below `DashboardHero` and above `MealJournalSection`.

**Contract**: Render order becomes `DashboardHero -> FoodSuggestions -> MealJournalSection`.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- Suggestions section appears under Hero and above meal journal.
- Unavailable-limit user sees hidden-unavailable messaging, no suggestion list.
- Over-limit user sees hidden-over-limit messaging, no suggestion list.
- Eligible user sees exactly 3 suggestions with calories not exceeding remaining budget.
- No regressions in existing Hero + meal journal rendering.

---

## Phase 3: Validation, docs, and edge-case hardening

### Overview

Finalize S-03 by validating edge behavior and documenting heuristics/limitations for future iterations.

### Changes Required:

#### 1. Edge-case handling and safeguards

**File**: `src/lib/services/food-suggestions.ts`

**Intent**: Ensure deterministic behavior for sparse/ambiguous tokens and catalog exhaustion.

**Contract**: Enforce stable sorting and deterministic fallback; include result metadata field for `reason` (e.g., `unavailable`, `over_limit`, `insufficient_catalog`).

#### 2. Plan and docs alignment

**File**: `context/changes/remaining-budget-food-suggestions/plan.md`

**Intent**: Keep progress and manual verification evidence aligned during implementation.

**Contract**: Progress section reflects completed checks; no scope expansion beyond declared S-03 boundaries.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- Threshold transition is observable and consistent (fallback -> personalized at 10 unique tokens).
- Token heuristics do not break on Polish/English mixed meal text examples.
- Suggestions remain deterministic across page refresh for same input day.
- Hidden states never render suggestion list.

**Implementation Note**: After each phase, pause for human manual verification before moving on.

---

## Testing Strategy

### Unit Tests:

- Validate token normalization and stop-word filtering.
- Validate threshold switch at exactly 10 unique tokens.
- Validate calorie-filtering (`<= remainingCalories`) and stable ranking.

### Integration Tests:

- Dashboard SSR path computes and renders correct suggestion state for unavailable/over-limit/visible cases.
- Component composition order remains Hero -> Suggestions -> Journal.

### Manual Testing Steps:

1. User with incomplete profile: open dashboard and verify unavailable CTA + no list.
2. User over limit: verify over-limit message + no list.
3. User under limit with low data: verify fallback mode suggestions.
4. User under limit with >=10 unique tokens from successful meals: verify personalized mode.
5. Verify all shown items fit remaining calories and total UI layout is stable on mobile and desktop.

## Performance Considerations

- Keep computation O(n) over today's meals plus small catalog filtering.
- No external API calls in request path.
- Avoid heavy regex/tokenization overhead; precompile static stop-word set.

## Migration Notes

- No DB migration required in S-03.
- Future enhancement can add structured ingredient/preferences schema; current heuristic mode is intentional MVP.

## References

- Roadmap: `context/foundation/roadmap.md` (S-03)
- PRD: `context/foundation/prd.md` (FR-008)
- Dashboard page: `src/pages/dashboard.astro`
- Goal logic: `src/lib/nutrition-goals.ts`
- Meal storage: `src/lib/nutrition-records.ts`, `src/lib/database.types.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` â€” <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Build suggestion domain service

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — 7d90cf5
- [x] 1.2 Build passes: `npm run build` — 7d90cf5

#### Manual

- [x] 1.3 Unavailable input returns `hidden_unavailable` — 7d90cf5
- [x] 1.4 Over-limit input returns `hidden_over_limit` — 7d90cf5
- [x] 1.5 Visible input returns budget-fitting suggestions (`calories <= remaining`) — 7d90cf5
- [x] 1.6 Fallback mode before 10 unique tokens — 7d90cf5
- [x] 1.7 Personalized mode at/after 10 unique tokens — 7d90cf5

### Phase 2: Integrate suggestions into dashboard UI

#### Automated

- [x] 2.1 Lint passes: `npm run lint` — 7d90cf5
- [x] 2.2 Build passes: `npm run build` — 7d90cf5

#### Manual

- [x] 2.3 Suggestions section is below Hero and above meal journal — 7d90cf5
- [x] 2.4 Unavailable-limit state hides list and shows CTA message — 7d90cf5
- [x] 2.5 Over-limit state hides list and shows over-limit message — 7d90cf5
- [x] 2.6 Eligible user sees exactly 3 budget-fitting suggestions — 7d90cf5
- [x] 2.7 No regressions in Hero and meal journal rendering — 7d90cf5

### Phase 3: Validation, docs, and edge-case hardening

#### Automated

- [x] 3.1 Lint passes: `npm run lint` — 7d90cf5
- [x] 3.2 Build passes: `npm run build` — 7d90cf5

#### Manual

- [x] 3.3 Threshold transition is consistent at exactly 10 unique tokens — 7d90cf5
- [x] 3.4 Mixed-language meal text does not break token heuristic — 7d90cf5
- [x] 3.5 Suggestions are deterministic for same-day same-input refresh — 7d90cf5
- [x] 3.6 Hidden states never render suggestion list — 7d90cf5

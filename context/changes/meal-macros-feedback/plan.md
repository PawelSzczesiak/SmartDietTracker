# Macro Feedback in DashboardHero â€” Implementation Plan

## Overview

S-02 extends the DashboardHero with a compact macro-totals row (protein / carbs / fat) shown when at least one meal has been successfully parsed. FR-009 is already fulfilled for per-meal and daily-journal views; this plan closes the only remaining gap â€” the hero section.

## Current State Analysis

- `DailyMealSummary` (`src/lib/nutrition-records.ts` lines 23â€“29) carries `totalProtein`, `totalCarbs`, `totalFat` but no flag indicating whether any meal was actually parsed successfully.
- `getDailyMealSummary()` (lines 259â€“276) sums null-as-zero across all meals, so totals are non-zero only if macros were parsed â€” but a consumer cannot distinguish "zero because no meals" from "zero because meals were all skipped/failed".
- `DashboardHero.astro` already receives `summary?: DailyMealSummary` and renders the two calorie/limit tiles; macro display is absent.
- `MealJournalSection.astro` already shows macros in the same Tailwind style (lines 40â€“51) â€” the chip pattern to replicate is established.

### Key Discoveries

- `DailyMealSummary` is consumed in `DashboardHero.astro`, `MealJournalSection.astro`, and `dashboard.astro` â€” adding a field there propagates automatically with TypeScript.
- `getDailyMealSummary` iterates `MealRecord[]`; checking `.some(m => m.parser_status === 'success')` is O(n) and zero-cost at the call site.
- `MealJournalSection.astro` already shows macros unconditionally â€” that is out of scope for this change; only hero visibility matters here.

## Desired End State

After this plan:

- `DailyMealSummary.hasParsedMacros: boolean` exists and is computed correctly.
- `DashboardHero` renders a compact 3-chip row (Protein / Carbs / Fat) below the calorie grid **only when** `summary.hasParsedMacros === true`.
- When no meals have `parser_status === 'success'` the chip row is absent â€” no UI noise.
- `npm run lint` and `npm run build` pass with no new errors.

## What We're NOT Doing

- No macro targets or limits â€” raw totals only.
- No changes to `MealJournalSection.astro` (already shows macros).
- No changes to per-meal macro display in `MealHistory.astro`.
- No new routes, API changes, or DB migrations.

## Implementation Approach

One logical unit of work in two file edits:

1. Extend the `DailyMealSummary` type and its factory with `hasParsedMacros`.
2. Add the conditional chip row to `DashboardHero.astro`, reusing the established Tailwind micro-style from `MealJournalSection.astro`.

---

## Phase 1: Add `hasParsedMacros` to `DailyMealSummary`

### Overview

Adds a computed boolean to the summary type so that consumers can gate UI on whether any macros are available â€” without needing the raw `MealRecord[]` array.

### Changes Required

#### 1. `DailyMealSummary` interface â€” `src/lib/nutrition-records.ts`

**File**: `src/lib/nutrition-records.ts`

**Intent**: Add `hasParsedMacros: boolean` to the `DailyMealSummary` interface (after the existing `totalFat` field, line ~28). This field is the single authoritative signal for whether any macro data is meaningful.

**Contract**: `hasParsedMacros: boolean` â€” `true` iff at least one meal in the day has `parser_status === 'success'`.

#### 2. `getDailyMealSummary` computation â€” `src/lib/nutrition-records.ts`

**File**: `src/lib/nutrition-records.ts`

**Intent**: Set `hasParsedMacros` in the returned object by checking whether any meal was successfully parsed. The function already iterates `MealRecord[]`.

**Contract**: `hasParsedMacros: meals.some(m => m.parser_status === 'success')` â€” evaluated once, no additional DB calls.

### Success Criteria

#### Automated Verification

- TypeScript compilation passes: `npm run build`
- No lint errors: `npm run lint`

#### Manual Verification

- `getDailyMealSummary([])` returns `hasParsedMacros: false`
- `getDailyMealSummary([{ parser_status: 'failed', ... }])` returns `hasParsedMacros: false`
- `getDailyMealSummary([{ parser_status: 'success', ... }])` returns `hasParsedMacros: true`

---

## Phase 2: Macro chips row in DashboardHero

### Overview

Adds a conditional 3-chip row (Protein / Carbs / Fat) below the existing calorie grid in `DashboardHero.astro`, visible only when `summary.hasParsedMacros` is true.

### Changes Required

#### 1. Macro chips row â€” `src/components/dashboard/DashboardHero.astro`

**File**: `src/components/dashboard/DashboardHero.astro`

**Intent**: Render a compact row of three chips showing `totalProtein`, `totalCarbs`, `totalFat` (all `.toFixed(1) g`) below the 3-column tile grid, gated on `summary?.hasParsedMacros`.

**Contract**: Chips sit in a `<div class="mt-4 flex flex-wrap gap-3">` container placed immediately after the `</div>` that closes the `grid` on line 80. Each chip is a `<span>` following the established micro-label + value pattern from `MealJournalSection.astro` (lines 40â€“51) but at smaller text scale to keep it compact.

Visibility gate: `{summary?.hasParsedMacros && ( ... )}`.

Values: `summary.totalProtein.toFixed(1)`, `summary.totalCarbs.toFixed(1)`, `summary.totalFat.toFixed(1)`.

### Success Criteria

#### Automated Verification

- Lint passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification

- Dashboard with no meals logged: macro chips row is **not visible**.
- Dashboard after logging a meal that fails parsing: macro chips row is **not visible**.
- Dashboard after logging a meal that parses successfully: macro chips row **appears** with correct protein / carbs / fat values.
- Values match what `MealJournalSection` shows for the same day.
- Layout is responsive â€” chips wrap correctly on narrow viewports.

**Implementation Note**: After Phase 2 automated checks pass, verify manually using the live dev server before marking done.

---

## Testing Strategy

### Manual Testing Steps

1. Sign in and open Dashboard with no meals â€” confirm no macro chips visible.
2. Add a meal with a description that should fail parsing (e.g., gibberish) â€” confirm chips still absent.
3. Add a real meal (e.g., "100g chicken breast") â€” wait for parsing â€” confirm chips appear with non-zero macros.
4. Cross-check: the values shown in DashboardHero chips match the Protein/Carbs/Fat totals in the Meal Journal section.
5. Resize browser to mobile width â€” confirm chips wrap cleanly and don't overflow.

## References

- `src/lib/nutrition-records.ts` â€” `DailyMealSummary`, `getDailyMealSummary`
- `src/components/dashboard/DashboardHero.astro` â€” calorie tiles to extend
- `src/components/meals/MealJournalSection.astro` lines 40â€“51 â€” chip style to replicate

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` â€” <commit sha>` when a step lands.

### Phase 1: Add hasParsedMacros to DailyMealSummary

#### Automated

- [x] 1.1 TypeScript compilation passes: `npm run build` — 90911b8
- [x] 1.2 No lint errors: `npm run lint` — 90911b8

#### Manual

- [x] 1.3 `getDailyMealSummary([])` returns `hasParsedMacros: false` — 90911b8
- [x] 1.4 `getDailyMealSummary` with all-failed meals returns `hasParsedMacros: false` — 90911b8
- [x] 1.5 `getDailyMealSummary` with one success meal returns `hasParsedMacros: true` — 90911b8

### Phase 2: Macro chips row in DashboardHero

#### Automated

- [x] 2.1 Lint passes: `npm run lint` — 90911b8
- [x] 2.2 Build passes: `npm run build` — 90911b8

#### Manual

- [x] 2.3 No meals logged → chips row absent — 90911b8
- [x] 2.4 Meal with failed parsing → chips row absent — 90911b8
- [x] 2.5 Meal with successful parsing → chips row visible with correct values — 90911b8
- [x] 2.6 Values match MealJournalSection totals for the same day — 90911b8
- [x] 2.7 Chips wrap correctly on mobile-width viewport — 90911b8

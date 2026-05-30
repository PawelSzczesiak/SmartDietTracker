# Macro Feedback in DashboardHero — Plan Brief

> Full plan: `context/changes/meal-macros-feedback/plan.md`

## What & Why

S-02 adds daily macro totals (protein / carbs / fat) to the DashboardHero section so users see the full nutritional picture — not just calories — in the most prominent screen area. FR-009 was partially delivered in S-01; the hero is the only remaining gap.

## Starting Point

Macros are already stored per meal and shown in both the per-meal cards (`MealHistory.astro`) and the Meal Journal daily summary (`MealJournalSection.astro`). The hero card (`DashboardHero.astro`) shows only calories and the daily limit.

## Desired End State

After loading or refreshing Dashboard when at least one meal was successfully parsed, the hero shows three compact chips — Protein / Carbs / Fat — immediately below the calorie tiles. When no meals have been parsed yet the chips are absent, avoiding noise on first load.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Where to show macros | DashboardHero (hero section) | Only location missing macros; per-meal and journal views already done | Plan |
| Format | Raw totals only (no targets) | Keeps S-02 in its "simple extension" mandate; macro goals are out of scope for MVP | Plan |
| Visibility gate | `hasParsedMacros: boolean` on `DailyMealSummary` | Clean single flag, no raw MealRecord[] needed in the hero component | Plan |
| UI style | Compact chips (flex row, smaller text) | Consistent with existing macro chips in MealJournalSection; avoids hero layout disruption | Plan |

## Scope

**In scope:**
- Add `hasParsedMacros` field to `DailyMealSummary` type and `getDailyMealSummary()` factory
- Add conditional macro chips row to `DashboardHero.astro`

**Out of scope:**
- Macro targets or daily limits
- Any changes to `MealJournalSection` or `MealHistory`
- New API routes or DB migrations

## Architecture / Approach

Two file edits. `getDailyMealSummary()` gains a boolean flag computed via `.some(m => m.parser_status === 'success')`. `DashboardHero.astro` renders a `flex flex-wrap gap-3` chips row conditioned on that flag, using the Tailwind micro-label + value pattern already established in `MealJournalSection.astro`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Add `hasParsedMacros` | Type + computation in `nutrition-records.ts` | None — additive change, TypeScript will catch any misuse |
| 2. Macro chips in DashboardHero | Conditional chip row in `DashboardHero.astro` | Cosmetic — layout clash on narrow viewports (verify wrap) |

**Prerequisites:** S-01 done (macros already parsed and stored) ✅  
**Estimated effort:** ~1 session, 2 file edits

## Open Risks & Assumptions

- `MealJournalSection.astro` shows macros unconditionally (even when no meals parsed); this plan does not fix that — intentional out-of-scope decision.
- If a user has no successful meals today the chips are absent; the first successful parse will make them appear on next load/navigate.

## Success Criteria (Summary)

- DashboardHero shows protein / carbs / fat chips after at least one meal parses successfully
- Chips are absent when no meals exist or all parsing failed
- Chip values match the Meal Journal section for the same day

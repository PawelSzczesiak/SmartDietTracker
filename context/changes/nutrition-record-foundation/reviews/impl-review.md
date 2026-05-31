<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Nutrition record foundation

- **Plan**: `context/changes/nutrition-record-foundation/plan.md`
- **Scope**: Full plan review (Phases 1-3)
- **Date**: 2026-05-28
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | FAIL |

## Findings

### F1 — Dashboard exposes raw backend error details

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/pages/dashboard.astro:26`
- **Detail**: The dashboard catch block stores `error.message` in `dashboardError` and renders it back to the user. The profile and meal POST handlers intentionally redirect with generic messages instead, so the dashboard currently leaks lower-level Supabase/PostgREST details that the rest of the app avoids exposing.
- **Fix**: Replace the rendered raw exception message with a generic dashboard failure message and keep the detailed error only in server-side logs.
  - Strength: Aligns dashboard behavior with the existing API error-handling pattern in `src/pages/api/profile/index.ts` and `src/pages/api/meals/index.ts`.
  - Tradeoff: Users lose immediate access to low-level error text, so troubleshooting depends on logs or a request ID.
  - Confidence: HIGH — the repo already uses generic redirect feedback for the same failure class.
  - Blind spot: The dashboard loader path does not currently attach a request ID the way POST routes do.
- **Decision**: FIXED

### F2 — Meal input is unbounded in validation and schema

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/lib/nutrition-validation.ts:60`
- **Detail**: `meal_text` is only validated with `.min(1)`, and the `meals` table stores it as unrestricted `text` with no maximum-length check. Very large submissions can bloat rows and slow dashboard rendering or listing.
- **Fix**: Add a reasonable max length in Zod and enforce the same ceiling with a matching database `CHECK` constraint.
  - Strength: Protects both the app layer and the database from oversized payloads while preserving the existing free-form journal model.
  - Tradeoff: Requires a product choice for the max size and a follow-up migration to keep validation and schema aligned.
  - Confidence: HIGH — both affected boundaries are visible in the current implementation.
  - Blind spot: The right limit depends on expected journal-entry size, which the plan does not specify.
- **Decision**: FIXED

### F3 — Current automated verification no longer passes

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `src/pages/dashboard.astro:39`
- **Detail**: The review rerun of `npm run lint` fails. Most failures are Prettier `Delete CR` errors on changed files, and `src/pages/dashboard.astro:39` also triggers `@typescript-eslint/prefer-nullish-coalescing` because the flash-message gate uses chained `||`.
- **Fix**: Normalize the changed files to LF and replace the chained `||` condition with nullish-safe logic that satisfies the existing lint rule.
- **Decision**: FIXED

### F4 — Meal-table RLS is narrower than the plan wording

- **Severity**: 👀 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `supabase/migrations/20260527192001_create_meals.sql:29`
- **Detail**: The plan describes owner-scoped read/write access for meals, but the migration grants and policies only cover `select` and `insert`. That still matches the implemented F-01 behavior of add-and-read only, but it is narrower than the broader Phase 1 wording.
- **Fix**: Either tighten the plan wording to say add-and-read only at the storage layer too, or add owner-scoped update policy/grant if future phases need it.
  - Strength: Makes the contract explicit before later reviews treat the current mismatch as unintended drift.
  - Tradeoff: Updating DB permissions now slightly expands capability that the current UI does not use; updating the plan instead preserves the stricter runtime.
  - Confidence: MEDIUM — the mismatch is clear, but either resolution can be defensible.
  - Blind spot: We have not verified whether the next planned slice expects storage-layer updates before UI support lands.
- **Decision**: FIXED — narrowed F-01 contract to add-and-read only; follow-up edit/delete planned for S-01

### F5 — Saved age value `0` disappears in the profile summary

- **Severity**: 👀 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/components/profile/ProfileSummary.astro:11`
- **Detail**: The summary uses truthiness checks like `profile?.age ? ... : null`, but the validation layer explicitly allows `age = 0`. A persisted zero value will therefore be hidden in the UI as if it were missing.
- **Fix**: Use explicit null checks for nullable numeric fields instead of truthiness checks.
- **Decision**: FIXED

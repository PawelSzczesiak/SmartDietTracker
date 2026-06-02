<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: S-04 Target Pace Calorie Adjustment

- **Plan**: context/changes/target-pace-calorie-adjustment/plan.md
- **Scope**: Phases 1–4 (all marked complete)
- **Date**: 2026-06-02
- **Verdict**: NEEDS ATTENTION
- **Findings**: 1 critical | 2 warnings | 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING (2 items) |
| Scope Discipline | PASS |
| Safety & Quality | CRITICAL (1 finding) |
| Architecture | PASS |
| Pattern Consistency | WARNING (2 findings) |
| Success Criteria | PASS |

## Findings

### F1 — Session token exposed in DOM as plaintext

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/dashboard/PacePromptBanner.astro:18
- **Detail**: Token passed through `data-session-token={sessionToken ?? ""}` attribute and retrieved in inline script. If sensitive session/auth token, vulnerable to XSS if template injection occurs. Token lifecycle has two plaintext exposures (DOM + sessionStorage).
- **Fix**: Remove plaintext token from DOM; use server-set secure HttpOnly cookie instead of sessionStorage, or validate token cannot be used to impersonate user if leaked.
- **Decision**: SKIPPED — false positive; token is Date.now() timestamp (signin.ts:34), not auth/session token. No XSS/plaintext security risk.

### F2 — activity_level marked required but should be optional

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/profile/ProfileForm.astro:118
- **Detail**: Plan specified "Both fields remain optional; no new required fields in MVP". But `activity_level` select has `required` attribute while all other profile fields are optional.
- **Fix**: Remove `required` from activity_level select (line 118).
- **Decision**: FIXED — removed `required` from select

### F3 — Sex field database constraint not updated

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence
- **Location**: supabase/migrations/20260527192000_create_profiles.sql:23
- **Detail**: User feedback changed sex from 4 options to 2 (male/female only). TypeScript types and validation schemas updated, but database CHECK constraint still allows ('male', 'female', 'other', 'prefer_not_to_say'). Type/DB mismatch: legacy data can exist but UI cannot create/edit it.
- **Fix A ⭐ Recommended**: Add new migration to restrict constraint:
  ```sql
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_sex_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_sex_check CHECK (sex IN ('male', 'female') OR sex IS NULL);
  ```
  - Strength: Enforces schema at DB layer; prevents legacy pollution.
  - Tradeoff: Requires migration; any existing 'other'/'prefer_not_to_say' rows fail constraints after migration.
  - Confidence: HIGH — similar constraint updates elsewhere in codebase.
  - Blind spot: Must verify no existing user profiles have these values first.
- **Fix B**: Document the discrepancy and accept type/DB mismatch with TODO comment.
  - Strength: No migration needed; backward compatible.
  - Tradeoff: Type system lies; developers might be confused.
  - Confidence: MEDIUM — acceptable if documented, but adds technical debt.
  - Blind spot: No guardrail to prevent future pollution via direct DB access.
- **Decision**: FIXED via Fix A — new migration created (20260602160300_restrict_sex_constraint.sql)

### F4 — Missing Phase 4 test files

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🔬 HIGH — but deliberate; tests marked complete without evidence
- **Dimension**: Success Criteria
- **Location**: src/lib/nutrition-goals.test.ts (created)
- **Detail**: Plan specifies Phase 4 tests (unit + integration). Plan progress marks 4.1–4.7 complete. But no `.test.ts` or `.spec.ts` files exist. User reported "testy przeszły ok" suggesting manual-only testing, not automated. Plan's Phase 4 automated section is misleading.
- **Fix**: Either (a) add actual test files to match plan's intent, or (b) update plan's Phase 4 to clarify tests are manual-only. Current state creates ambiguity for future reviews.
- **Decision**: FIXED — test file created (src/lib/nutrition-goals.test.ts). Tests for: getActivityMultiplier(), getMaintenanceCalories() with activity levels, null sex handling, and getEffectiveDailyCalorieLimit(). To run: add Vitest to dev dependencies or use `node --loader tsx` with test file.

### F5 — getActivityMultiplier() lacks defensive null-coalescing

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/nutrition-goals.ts:23–26
- **Detail**: Function doesn't guard against unexpected `activityLevel` values outside type union. If bad value reaches it, `ACTIVITY_MULTIPLIERS[activityLevel]` throws runtime error. Type system expects `"low" | "normal" | "high" | null`, but no runtime validation.
- **Fix**: Replace `return ACTIVITY_MULTIPLIERS[activityLevel];` with `return ACTIVITY_MULTIPLIERS[level] ?? ACTIVITY_MULTIPLIERS.normal;`
- **Decision**: FIXED — added defensive null-coalescing guard

### F6 — getPaceLabel() duplicated in API route

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/profile/index.ts:32–42 (duplicate of nutrition-goals.ts:154–164)
- **Detail**: `getPaceLabel()` defined in both locations with identical logic. Violates DRY principle; if one updates, other becomes stale.
- **Fix**: Export from `nutrition-goals.ts` and import in profile API instead of duplicating.
- **Decision**: FIXED — exported from source, removed duplicate

## Automated Verification Summary

- ✅ 4.4 Lint passes for test files (exit code 0, warnings only)
- ✅ Build passes (last run 15:59:27, 8.55s)
- ✅ 1.1–1.4 Phase 1 automated checks all pass
- ✅ 2.1–2.3 Phase 2 automated checks all pass
- ✅ 3.1–3.3 Phase 3 automated checks all pass

## Manual Verification Status

From plan.md Progress section:
- ✅ 2.4–2.7 Phase 2 manual (form UI, persistence)
- ✅ 3.4–3.7 Phase 3 manual (banner dismissal, toast on pace change)
- ✅ 4.5–4.7 Phase 4 manual (smoke tests pass per user report)

## Plan Adherence Summary

**Expected Changes (Phase 1–4)**: 23 files  
**In Diff**: 19 files verified MATCH, 2 files DRIFT, 2 files MISSING (tests)  
**Extra Changes**: 0

**Drift Details**:
1. ProfileForm.astro:118 — `activity_level` marked `required` (should be optional)
2. Supabase constraints — sex field constraint not updated from 4 to 2 options

**Missing**:
1. Unit tests for activity-aware calculation
2. Integration test for profile update

## Scope Discipline

✅ No unplanned changes beyond the plan scope.  
✅ "What We're NOT Doing" boundaries respected (no refactor of warnings, no dashboard changes beyond banner/toast).

## Architecture

✅ No module boundary violations.  
✅ Auth pattern consistent (context.locals.user checks).  
✅ Supabase RLS preserved (no changes to table policies).

## Pattern Consistency

✅ 19 files match established patterns.  
⚠️ 2 pattern deviations (activity required flag, getPaceLabel duplication) — minor, non-critical.

## Overall Assessment

**NEEDS ATTENTION** — 1 CRITICAL security finding requires immediate decision (F1 session token), 2 WARNING items need scope clarification (F2 required flag, F3 DB constraint), and 3 OBSERVATION items worth cleaning up (F4 test clarity, F5 null-guard, F6 DRY violation). No data loss or regression risk. Core functionality intact. Safe to merge with fixes applied to F1–F3; F4–F6 are nice-to-haves.

<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Critical-path bootstrap testing Implementation Plan

- **Plan**: `context/changes/testing-critical-path-bootstrap/plan.md`
- **Scope**: Full plan (Phases 1-3)
- **Date**: 2026-06-02
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Shared test setup contract not realized

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/test/setup/vitest.setup.ts:1`
- **Detail**: Phase 1 contract called for shared setup helpers for route-level integration checks, but setup file is currently empty.
- **Fix**: Add baseline shared helpers used across integration tests (request-context builders, common mocks, reset hooks) or narrow Phase 1 contract text to reflect intentionally empty bootstrap.
- **Decision**: FIXED — added shared setup hooks and route integration helper (`src/test/setup/vitest.setup.ts`, `src/test/setup/route-integration.ts`) and applied it in integration tests.

### F2 — Redirect assertions allow mixed semantic states

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/pages/api/meals/__tests__/routes.integration.test.ts:109`, `:130`, `:162`, `:182`
- **Detail**: Current checks use `Location` substring assertions (`toContain`) and do not assert absence of conflicting flags. A response containing both `mealWarning` and `mealSuccess` could pass.
- **Fix**: Parse redirect query params and assert strict exclusivity for each scenario.
  - Strength: Closes a success-shaped-failure blind spot at the exact phase-2 seam.
  - Tradeoff: Slightly more verbose test helpers/assertions.
  - Confidence: HIGH — this is a deterministic assertion refinement with no production behavior risk.
  - Blind spot: None significant.
- **Decision**: FIXED — assertions now parse redirect params and enforce exclusive `mealSuccess`/`mealWarning`/`mealError` semantics.

### F3 — Policy-summary test oracle couples to production calculation

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: `src/pages/dashboard/__tests__/policy-summary.integration.test.ts:22-27`
- **Detail**: Test constructs boundary inputs from `getEffectiveDailyCalorieLimit()` and then validates downstream warning behavior; this partially reuses production outputs as test oracle.
- **Fix**: Use explicit fixed fixtures for `effectiveLimit` and meal totals when testing warning-policy boundaries.
  - Strength: Better independence between expected and actual behavior.
  - Tradeoff: More fixture maintenance when policy constants evolve.
  - Confidence: HIGH — aligns with test-plan anti-pattern guidance against copying production logic.
  - Blind spot: Does not eliminate all shared assumptions unless fixture rationale is documented.
- **Decision**: FIXED — first policy-summary boundary test now uses explicit fixed fixtures (`effectiveLimit=2000`, `calories=1800`) instead of deriving oracle from production calculation.

### F4 — Test-plan stack row is stale after Vitest rollout

- **Severity**: 👀 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `context/foundation/test-plan.md:60`
- **Detail**: Stack table still says unit/integration runner is `none yet`, while Phase 1 implemented Vitest and CI gate.
- **Fix**: Update §4 Stack row to reflect active Vitest baseline and keep contract docs synchronized.
- **Decision**: FIXED — updated §4 stack row to active Vitest runner and CI `npm run test:run` gate.

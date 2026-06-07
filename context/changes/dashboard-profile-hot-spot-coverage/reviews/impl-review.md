<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Dashboard and profile hot-spot integration coverage

- **Plan**: `context/changes/dashboard-profile-hot-spot-coverage/plan.md`
- **Scope**: Full plan
- **Date**: 2026-06-07
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Findings

### F1 — Profile tests can leak mock state between cases

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/pages/api/profile/__tests__/policy.integration.test.ts:43-46`
- **Detail**: `vi.clearAllMocks()` resets call history but not implementations, so the one-off `createClient.mockReturnValueOnce(null)` setup and other mock implementations can make the suite order-dependent if the cases evolve.
- **Fix**: Replace `vi.clearAllMocks()` with `vi.resetAllMocks()` and re-seed the baseline mock implementations in `beforeEach`.
  - Strength: Removes state leakage and matches isolated-test expectations.
  - Tradeoff: Requires re-declaring default mock behavior in the setup block.
  - Confidence: HIGH — Vitest behavior is well-defined here.
  - Blind spot: None significant.
- **Decision**: FIXED (via `vi.resetAllMocks()` + re-seeding `createClient`)

### F2 — Redirect assertions do not pin the target pathname

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `src/pages/api/profile/__tests__/policy.integration.test.ts:67-120`
- **Detail**: The profile route tests assert query params on `Location` but not the destination pathname, so a regression that redirects to the wrong page could still pass.
- **Fix**: Parse `Location` with `new URL(location, "http://localhost")` and assert `/dashboard` for the non-auth branches, alongside the existing query-param checks.
  - Strength: Tightens the contract to the actual redirect target the plan describes.
  - Tradeoff: A few extra assertions per test.
  - Confidence: HIGH — same URL parsing pattern is already used elsewhere in the repo.
  - Blind spot: None significant.
- **Decision**: FIXED (pathname + query-param assertions added)

### F3 — Repo lint gate is still red because of an unrelated e2e file

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: `tests/e2e/dashboard-meal-state-sync.spec.ts:1-80`
- **Detail**: `npm run lint` still fails on a pre-existing CRLF / rule issue in an unrelated e2e file, so the plan's "repo lint passes" criterion is not satisfied in this workspace even though the touched tests pass.
- **Fix**: Normalize the unrelated e2e file (or otherwise clear the existing lint failure) and rerun repo lint before treating the plan's automated gate as green.
  - Strength: Makes the repository-wide gate truthful again.
  - Tradeoff: Outside this change's direct scope; may require a separate cleanup pass.
  - Confidence: HIGH — the lint output already points at the unrelated file.
  - Blind spot: None significant.
- **Decision**: FIXED (normalized `tests/e2e/dashboard-meal-state-sync.spec.ts` and cleared lint gate)

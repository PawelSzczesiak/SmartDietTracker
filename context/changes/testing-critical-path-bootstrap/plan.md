# Critical-path bootstrap testing Implementation Plan

## Overview

Bootstrap the first repository test baseline for Phase 1 of `context/foundation/test-plan.md`, covering risks #1, #2, #3 with unit + integration tests. This plan adds a minimal test harness, locks parser contract/error semantics, and protects calorie-policy boundaries with deterministic checks wired into CI.

## Current State Analysis

The app already contains the production seams we need to verify (parser boundary, meal route redirects, persisted parser status, calorie-policy math), but there is currently no first-party test runner or `test` scripts (`package.json:5-14`, `context/foundation/test-plan.md:60-61`).

Current CI runs only `npm ci`, `npx astro sync`, `npm run lint`, and `npm run build` (`.github/workflows/ci.yml:18-21`), so test coverage for these critical risks is still unenforced.

## Desired End State

After this plan is implemented, the repository has a stable Vitest-based unit+integration baseline that:

1. Proves parser behavior against independent-oracle fixtures (including adversarial cases).
2. Proves timeout/error paths are explicit and never success-shaped.
3. Proves calorie-limit remaining-budget and warning behavior across policy boundaries.

Verification is complete when the new tests run locally and in CI via `npm run test:run`, and Phase 1 cookbook placeholders in `context/foundation/test-plan.md` are replaced with concrete usage guidance.

### Key Discoveries:

- Meal create/update/retry already expose stable integration seams: parser call -> persistence mapping -> redirect feedback (`src/pages/api/meals/index.ts:72-159`, `src/pages/api/meals/update.ts:72-159`, `src/pages/api/meals/retry.ts:72-186`).
- Parser unavailable states are explicit and persisted through `parser_status` and `parser_error` (`src/lib/services/meal-parser.ts:161-275`, `src/lib/nutrition-records.ts:82-103`).
- Calorie policy logic is centralized and deterministic, with key boundaries at `>= 90%`, `> limit`, and guided healthy-edge comparisons (`src/lib/nutrition-goals.ts:203-436`).
- CI/testing baseline is currently missing; this phase must introduce and enforce it (`package.json:5-14`, `.github/workflows/ci.yml:18-21`).

## What We're NOT Doing

- We are not adding e2e tests in this phase.
- We are not changing production parser/policy business logic.
- We are not introducing provider-level network integration tests for parser transport behavior.
- We are not implementing Phase 2 hot-spot integrations (#4, #5) or Phase 3 abuse guardrails (#6).

## Implementation Approach

Adopt a single-runner Vitest setup for both unit and integration in three increments: first establish harness and CI wiring, then add parser contract + failure-path integration tests at route boundaries, then add calorie-policy boundary coverage and document cookbook conventions in `test-plan.md`.

## Critical Implementation Details

### Timing & lifecycle

Integration tests should execute route handlers with real `FormData` and authenticated request context, because production semantics depend on redirect query params and middleware/session-derived identity (`src/middleware.ts:7-52`, `src/lib/supabase.ts:17-39`).

### State sequencing

Failure-path assertions must validate both UI-facing redirect semantics and persisted parser state in the same test flow; asserting only one side can miss success-shaped regressions.

## Phase 1: Bootstrap test harness and CI gate

### Overview

Introduce the minimal test infrastructure needed to execute unit+integration checks and enforce them in CI for this phase.

### Changes Required:

#### 1. Test runner and scripts

**File**: `package.json`

**Intent**: Add a single command surface for unit+integration testing that matches existing repository scripts and can be reused by later rollout phases.

**Contract**: Add Vitest-based scripts (`test`, `test:watch`, `test:run`) without changing existing lint/build commands.

#### 2. Vitest configuration and shared setup

**File**: `vitest.config.ts` (new), `src/test/setup/**` (new)

**Intent**: Standardize deterministic test execution and common setup for route-level integration checks.

**Contract**: Define a shared config for unit+integration projects, include common setup utilities, and expose stable helpers for authenticated request context + parser stubbing.

#### 3. CI gate update

**File**: `.github/workflows/ci.yml`

**Intent**: Enforce risk coverage continuously once the test baseline lands.

**Contract**: Add `npm run test:run` to the main CI job after `npx astro sync` and before build, keeping current lint/build gates intact.

### Success Criteria:

#### Automated Verification:

- Dependencies install cleanly with new test packages: `npm install`
- New test command executes successfully: `npm run test:run`
- Lint remains green after config/script changes: `npm run lint`
- CI workflow includes enforced test gate: `.github/workflows/ci.yml`

#### Manual Verification:

- Local developer flow can run unit+integration tests with one command before opening a PR
- CI output clearly shows failing tests as a blocking quality signal

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Add parser contract and failure-path integration coverage

### Overview

Cover risks #1 and #2 by proving parser correctness against independent oracles and proving explicit non-success behavior for timeout/error paths.

### Changes Required:

#### 1. Parser contract fixture corpus

**File**: `src/test/fixtures/parser-contract/**` (new)

**Intent**: Build independent oracle data for parser behavior that does not mirror production parsing implementation.

**Contract**: Include known scenarios plus adversarial descriptions, with expected business-level outcomes for success and unavailable states.

#### 2. Parser unit contract tests

**File**: `src/lib/services/meal-parser.test.ts` (new)

**Intent**: Lock parser output normalization/union semantics against oracle fixtures and malformed provider responses.

**Contract**: Assert success/unavailable contract shape, numeric normalization constraints, and timeout/provider/invalid-response mapping semantics.

#### 3. Meal route integration tests (create/update/retry)

**File**: `src/pages/api/meals/__tests__/routes.integration.test.ts` (new)

**Intent**: Prove route handlers never misclassify degraded parser outcomes as success.

**Contract**: Execute handlers with real `FormData`; assert redirect query signal (`mealWarning` vs `mealSuccess`) and persisted `parser_status/parser_error` for each route (`index`, `update`, `retry`).

#### 4. Dashboard flash/semantic integration checks

**File**: `src/pages/dashboard/__tests__/flash-semantics.integration.test.ts` (new)

**Intent**: Ensure warning and success feedback remain visually and semantically distinct on dashboard render.

**Contract**: Assert warning query params render warning variant and success query params render success variant, with no mixed-state false positives.

### Success Criteria:

#### Automated Verification:

- Parser contract tests pass against fixture corpus: `npm run test:run -- parser`
- Meal route integration tests pass for success and unavailable/error paths: `npm run test:run -- meals`
- Full suite remains green with lint/build: `npm run test:run && npm run lint && npm run build`

#### Manual Verification:

- Submitting/editing/retrying a meal in local app shows success/warning feedback consistent with test assertions
- Parser timeout/unavailable scenario never appears as success in dashboard messaging

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Add calorie-policy boundary coverage and cookbook updates

### Overview

Cover risk #3 with a full boundary matrix and convert Phase 1 cookbook placeholders into concrete testing instructions.

### Changes Required:

#### 1. Nutrition policy boundary unit tests

**File**: `src/lib/nutrition-goals.test.ts` (new)

**Intent**: Protect warning and goal-policy edges where subtle regressions are most likely.

**Contract**: Cover `near_limit` (>= 90%), `over_limit` (> limit), exact-boundary behavior, manual vs automatic limit precedence, and direction branches (`loss`, `gain`, `maintain`, `no_direction`, `pace_missing`, `incomplete`).

#### 2. Profile-to-dashboard integration tests for policy flow

**File**: `src/pages/api/profile/__tests__/policy.integration.test.ts` (new), `src/pages/dashboard/__tests__/policy-summary.integration.test.ts` (new)

**Intent**: Prove profile updates propagate to policy/advisory output and dashboard state consistently.

**Contract**: Execute profile POST with realistic boundary payloads, then assert derived policy/warning output and remaining-budget semantics on dashboard integration seams.

#### 3. Cookbook section updates in test plan

**File**: `context/foundation/test-plan.md`

**Intent**: Replace Phase 1 placeholders with concrete “how to add test” patterns for parser contract, failure-path integration, and calorie-policy boundary tests.

**Contract**: Update §6.1, §6.2, and §6.6 with location, naming, reference test pattern, and run command aligned with the landed Phase 1 suite.

### Success Criteria:

#### Automated Verification:

- Calorie-policy boundary unit matrix passes: `npm run test:run -- nutrition-goals`
- Policy integration tests pass for profile->dashboard flow: `npm run test:run -- policy`
- Entire quality gate stays green with tests enforced: `npm run test:run && npm run lint && npm run build`

#### Manual Verification:

- Boundary scenarios (90% threshold, exact limit, over-limit, direction changes) match expected dashboard behavior in local run
- `test-plan.md` cookbook clearly explains how to add one new unit and one new integration test using Phase 1 conventions

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

## Testing Strategy

### Unit Tests:

- Parser result contract and normalization behaviors (`meal-parser`).
- Calorie-policy boundary matrix in `nutrition-goals` (thresholds + direction modes).
- Utility helpers used for deterministic fixture/oracle processing.

### Integration Tests:

- Route-handler tests for meal create/update/retry with real `FormData`, explicit parser-outcome stubbing, and DB assertions.
- Profile POST -> dashboard policy/warning integration path.
- Dashboard flash semantics for warning vs success distinction.

### Manual Testing Steps:

1. Start app with Supabase configured and sign in as a test user.
2. Submit meal flows that map to success and unavailable parser outcomes; confirm redirect feedback matches expected semantics.
3. Update profile to boundary cases (manual/auto, loss/gain/maintain) and confirm dashboard warning/policy output.
4. Run the documented cookbook commands and verify they map to real test files.

## Performance Considerations

- Keep integration tests deterministic (stub parser boundary) to avoid flaky network-driven runtime.
- Reuse setup fixtures/helpers to minimize duplicate bootstrapping overhead in CI.
- Prefer route-handler invocation over full browser/e2e for this phase’s cost × signal target.

## Migration Notes

- No database schema migration is planned in this testing bootstrap phase.
- CI behavior changes by adding a required test step once harness lands.

## References

- Related research: `context/changes/testing-critical-path-bootstrap/research.md`
- Risk contract: `context/foundation/test-plan.md`
- Parser boundary: `src/lib/services/meal-parser.ts:161-275`
- Persistence mapping: `src/lib/nutrition-records.ts:82-202`
- Meal route seams: `src/pages/api/meals/index.ts:72-159`, `src/pages/api/meals/update.ts:72-159`, `src/pages/api/meals/retry.ts:72-186`
- Calorie policy boundaries: `src/lib/nutrition-goals.ts:203-436`
- Dashboard feedback seam: `src/pages/dashboard.astro:139-150`
- CI baseline: `.github/workflows/ci.yml:18-21`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Bootstrap test harness and CI gate

#### Automated

- [x] 1.1 Dependencies install cleanly with new test packages — 2f2b8e7
- [x] 1.2 New test command executes successfully — 2f2b8e7
- [x] 1.3 Lint remains green after config/script changes — 2f2b8e7
- [x] 1.4 CI workflow includes enforced test gate — 2f2b8e7

#### Manual

- [x] 1.5 Local developer flow can run unit+integration tests with one command before opening a PR — 2f2b8e7
- [x] 1.6 CI output clearly shows failing tests as a blocking quality signal — 2f2b8e7

### Phase 2: Add parser contract and failure-path integration coverage

#### Automated

- [x] 2.1 Parser contract tests pass against fixture corpus — dad0809
- [x] 2.2 Meal route integration tests pass for success and unavailable/error paths — dad0809
- [x] 2.3 Full suite remains green with lint/build — dad0809

#### Manual

- [x] 2.4 Submitting/editing/retrying a meal in local app shows success/warning feedback consistent with test assertions — dad0809
- [x] 2.5 Parser timeout/unavailable scenario never appears as success in dashboard messaging — dad0809

### Phase 3: Add calorie-policy boundary coverage and cookbook updates

#### Automated

- [x] 3.1 Calorie-policy boundary unit matrix passes — d2fa146
- [x] 3.2 Policy integration tests pass for profile->dashboard flow — d2fa146
- [x] 3.3 Entire quality gate stays green with tests enforced — d2fa146

#### Manual

- [x] 3.4 Boundary scenarios match expected dashboard behavior in local run — d2fa146
- [x] 3.5 Test-plan cookbook clearly explains how to add new unit/integration tests with Phase 1 conventions — d2fa146

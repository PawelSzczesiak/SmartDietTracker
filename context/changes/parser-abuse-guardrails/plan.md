# Parser Abuse Guardrails Implementation Plan

## Overview

This change closes Phase 3 of the test plan by adding a dedicated abuse-guardrail regression spec for the meal parser path and validating it with a live browser AI-native review.
The goal is to prove that repeated meal-submit/retry activity still degrades in the current warning-only way, without adding a new runtime rate limit or changing parser behavior.

## Current State Analysis

- The parser already has an explicit timeout and typed unavailable outcomes, so the basic failure contract is in place (`src/lib/services/meal-parser.ts:161-275`).
- Meal create/update/retry already translate parser outcomes into warning/success redirects and persist degraded parser state (`src/pages/api/meals/index.ts:72-158`, `src/pages/api/meals/update.ts:72-160`, `src/pages/api/meals/retry.ts:72-186`, `src/lib/nutrition-records.ts:82-123`).
- Performance verification already showed meal submit latency is dominated by parser time when the parse path is hot, so abuse protection needs to prove the repeated-use path stays safe without pretending the cost disappeared (`context/changes/performance-verification-path/plan.md:11-25`, `context/changes/performance-verification-path/verification/runs/20260531-191518.md:8-23`).
- There is no explicit rate limit, quota, or cooldown guard in the current codebase, so any runtime guardrail would be a separate feature rather than a test-phase refinement.

## Desired End State

After this plan is complete, the repository has a dedicated regression spec that exercises repeated meal-submit/retry abuse on the full route path and proves the app still falls back to warning-only semantics instead of false success.
The phase also has a live browser review on the running app so a human has verified the repeated-use behavior and the UI remains usable under the selected abuse shape.

### Key Discoveries:

- `src/lib/services/meal-parser.ts:161-275` already turns slow or failed provider calls into explicit unavailable results.
- `src/pages/api/meals/index.ts:93-158` and `src/pages/api/meals/retry.ts:120-185` already expose the warning-only user-facing contract this phase must preserve.
- `context/foundation/test-plan.md:31-43, 53-54` defines the abuse risk as repeated costly parser requests, not a new parser algorithm problem.
- The cheapest useful proof is a dedicated route-level spec plus live browser review; a perf harness or runtime throttle would be a different slice.

## What We're NOT Doing

- No runtime rate limit, quota, debounce, or cooldown guard.
- No parser algorithm changes.
- No broad performance harness or p95/p99 baseline work.
- No browser E2E sweep.
- No changes to the existing warning-only fallback contract.

## Implementation Approach

Keep Phase 3 narrow and verification-focused.
Add one dedicated integration spec that drives the meal create/retry path through a repeated-use scenario with deterministic parser stubs, then validate the same abuse shape in the running browser with a live AI-native review.

## Critical Implementation Details

Repeated use should stay warning-only even when the parser is slow or unavailable. The phase should prove the full meal-submit path remains usable and never turns an abuse-shaped degraded response into a success-shaped redirect.

## Phase 1: Repeated meal-abuse guardrail coverage

### Overview

Add the dedicated regression spec for repeated meal-submit/retry behavior and validate the live-browser review path against the same risk.

### Changes Required:

#### 1. Dedicated abuse-guardrail integration spec

**File**: `src/pages/api/meals/__tests__/abuse-guardrails.integration.test.ts`

**Intent**: Prove the full meal-submit path still behaves safely when the same user triggers repeated parser-heavy actions.

**Contract**: Exercise meal create/retry flows with a 5-action burst, keep the parser boundary deterministic with stubs, and assert repeated unavailable/slow outcomes stay warning-only without introducing false success or state leakage.

### Success Criteria:

#### Automated Verification:

- The dedicated abuse-guardrail integration spec passes: `npm run test:run -- src/pages/api/meals/__tests__/abuse-guardrails.integration.test.ts`
- Repo lint passes with the new spec in place: `npm run lint`

#### Manual Verification:

- Run the live browser review on the running app with 5 rapid meal actions and confirm the UI stays warning-only.
- Confirm the repeated-use path does not collapse into a false success or unusable dashboard state.

## Testing Strategy

### Unit Tests:

- Reuse existing parser unit coverage only if the abuse spec needs a small helper-level assertion.

### Integration Tests:

- Dedicated repeated-use meal abuse regression on the full meal-submit path.

### Manual Testing Steps:

1. Start the app with the normal parser configuration.
2. Use the live browser review to trigger 5 rapid meal actions on the full submit path.
3. Confirm the app keeps warning-only fallback semantics and remains usable after the burst.

## Performance Considerations

Keep the repeated-use scenario tight at 5 actions so the spec stays deterministic and fast while still exercising the abuse shape.

## Migration Notes

None. This change only adds verification coverage and a browser review step.

## References

- Related research: `context/foundation/test-plan.md`
- Parser boundary: `src/lib/services/meal-parser.ts:161-275`
- Meal create route: `src/pages/api/meals/index.ts:72-158`
- Meal retry route: `src/pages/api/meals/retry.ts:72-185`
- Parser persistence mapping: `src/lib/nutrition-records.ts:82-123`
- Performance evidence: `context/changes/performance-verification-path/plan.md:11-25`, `context/changes/performance-verification-path/verification/runs/20260531-191518.md:8-23`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Repeated meal-abuse guardrail coverage

#### Automated

- [x] 1.1 Add a dedicated integration spec for repeated meal-submit/retry abuse on the full route path.
- [x] 1.2 Keep the abuse spec deterministic with parser-boundary stubs and unique meal data.

#### Manual

- [x] 1.3 Validate the repeated-use behavior in the live browser with 5 rapid meal actions and confirm warning-only fallback.

# Dashboard and profile hot-spot integration coverage Implementation Plan

## Overview

This change closes phase 2 of the test plan by hardening the highest-churn dashboard/profile seams with route-level integration coverage.
The goal is to keep the test slice narrow: no browser E2E, no live Supabase dependency, and no dashboard state-sync expansion beyond the flash-message contract.

## Current State Analysis

- The dashboard already centralizes flash semantics in `src/pages/dashboard/flash-messages.ts`, and there is an existing integration test file for that contract.
- The profile POST route already distinguishes unauthenticated, config-missing, validation, and success paths in `src/pages/api/profile/index.ts`.
- The repo already has a route-integration harness in `src/test/setup/route-integration.ts`, so these checks can stay at the request boundary without introducing new test infrastructure.

## Desired End State

After this plan lands, phase 2 will have durable integration coverage for the two hot spots it is meant to protect:
dashboard flash ordering/variants and profile boundary redirects.
The tests will prove the seams behave correctly with mocked route contexts, while leaving the product behavior and data model unchanged.

### Key Discoveries:

- `src/pages/dashboard/flash-messages.ts:1-38` already defines the flash message order and variant mapping.
- `src/pages/api/profile/index.ts:32-110` already routes unauthenticated, config-missing, validation, toast, and success outcomes through redirects.
- `src/test/setup/route-integration.ts:1-18` already provides the fake APIRoute context used by existing route tests.

## What We're NOT Doing

- No browser-level E2E coverage in this phase.
- No live Supabase-backed integration suite.
- No dashboard state-sync assertions beyond the flash-message contract.
- No new production logic for dashboard or profile behavior.

## Implementation Approach

Keep phase 2 focused on the smallest useful integration slice: extend the existing dashboard flash semantics test and the profile route policy test.
Use the current mocked route harness so the tests stay fast, deterministic, and aligned with the repository's existing pattern for route-boundary coverage.

## Phase 1: Harden dashboard flash semantics

### Overview

Lock down the dashboard flash-message contract so message ordering and variants stay stable across profile and meal outcomes.

### Changes Required:

#### 1. Dashboard flash integration test

**File**: `src/pages/dashboard/__tests__/flash-semantics.integration.test.ts`

**Intent**: Extend the existing dashboard flash coverage so the contract for error, warning, and success messages stays explicit.

**Contract**: Assert the order and variant mapping returned by `getDashboardFlashMessages`, including mixed query-param combinations and the error-first precedence already used by the dashboard page.

### Success Criteria:

#### Automated Verification:

- Dashboard flash integration tests pass with the expanded cases.
- Repo lint passes with the new assertions in place.

#### Manual Verification:

- Open the dashboard with representative flash query params and confirm the banner order matches the tested priority.

**Implementation Note**: Keep this phase limited to flash semantics; do not pull in page refresh/state-sync assertions.

## Phase 2: Harden profile route boundary checks

### Overview

Lock down the profile save path so unauthenticated and config-missing requests keep returning the expected redirects and query flags.

### Changes Required:

#### 1. Profile policy integration test

**File**: `src/pages/api/profile/__tests__/policy.integration.test.ts`

**Intent**: Extend the existing route-integration coverage so the profile POST boundary is protected against false-success redirects and missing-auth/config regressions.

**Contract**: Assert the redirect behavior for unauthenticated and config-missing cases, and preserve the existing success/toast semantics when the route completes normally.

### Success Criteria:

#### Automated Verification:

- Profile policy integration tests pass with the added failure-path coverage.
- Repo lint passes with the new assertions in place.

#### Manual Verification:

- Submit the profile form in signed-in and signed-out states locally and confirm the redirect targets and flash params match the test contract.

## Testing Strategy

### Unit Tests:

- Reuse existing helper-level assertions only where they directly support the integration contract.

### Integration Tests:

- Dashboard flash semantics across combined query-param cases.
- Profile route boundary behavior for unauthenticated and config-missing failures.

### Manual Testing Steps:

1. Load the dashboard with flash query params and verify message ordering.
2. Submit the profile form while signed out and verify the sign-in redirect.
3. Trigger a config-missing profile save path and verify the error redirect.

## Performance Considerations

None beyond keeping the tests mocked at the route seam so they stay fast and repeatable.

## Migration Notes

None. This change only adds/extends tests.

## References

- Related research: `context/foundation/test-plan.md`
- `src/pages/dashboard/flash-messages.ts:1-38`
- `src/pages/dashboard/__tests__/flash-semantics.integration.test.ts:1-53`
- `src/pages/api/profile/index.ts:32-110`
- `src/pages/api/profile/__tests__/policy.integration.test.ts:1-89`
- `src/test/setup/route-integration.ts:1-18`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Harden dashboard flash semantics

#### Automated

- [x] 1.1 Extend the dashboard flash integration cases so mixed query-param combinations keep error-first ordering and correct variants. — 2321447
- [x] 1.2 Lock the dashboard flash helper contract to the existing prefix/variant mapping used by the page. — 2321447

#### Manual

- [x] 1.3 Confirm the dashboard banner order in the browser matches the tested priority for representative flash states. — 2321447

### Phase 2: Harden profile route boundary checks

#### Automated

- [x] 2.1 Extend the profile route integration coverage to assert unauthenticated redirects land on sign-in without a false success/toast flag. — a2bf2cf
- [x] 2.2 Extend the profile route integration coverage to assert config-missing redirects surface `profileError` while preserving the happy-path redirect contract. — a2bf2cf

#### Manual

- [x] 2.3 Confirm the profile form redirect targets and flash params in signed-in and signed-out local runs. — a2bf2cf

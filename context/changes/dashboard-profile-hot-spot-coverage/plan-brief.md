# Dashboard and profile hot-spot integration coverage — Plan Brief

> Full plan: `context/changes/dashboard-profile-hot-spot-coverage/plan.md`
> Research: `context/foundation/test-plan.md`

## What & Why

Phase 2 of the test plan hardens the dashboard/profile hot spots with narrow integration coverage.
The point is to protect the flash-message contract and profile redirect boundaries without widening scope into browser E2E or live Supabase.

## Starting Point

The dashboard already computes flash messages through `src/pages/dashboard/flash-messages.ts`, and the profile POST route already separates unauthenticated, config-missing, validation, toast, and success outcomes.
The repo also already has a route-integration harness, so the new coverage can stay at the request boundary.

## Desired End State

When this plan is done, phase 2 will have durable tests that prove dashboard flash ordering and profile boundary redirects stay correct.
The product behavior stays the same; only the safety net gets tighter.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Test depth | Integration-only | It gives the best signal for these route/page seams without paying for browser E2E. | Test plan + user confirmation |
| Dashboard scope | Flash semantics only | State-sync assertions were cut to keep the phase tight and focused on the highest-signal regression. | User confirmation |
| Profile scope | Route boundary only | Ownership is protected at the request boundary instead of adding live Supabase/RLS complexity. | User confirmation |
| Harness | Mock at the route seam | Existing test harness support already fits this shape and keeps the suite fast. | Codebase research |
| Failure cases | Unauthorized + config-missing | These are the boundary failures most likely to regress without broadening the slice. | User confirmation |
| Priority | Dashboard first | Flash-message regressions are the first thing to protect if the slice has to stay small. | User confirmation |

## Scope

**In scope:**

- Dashboard flash-message ordering and variant mapping.
- Profile POST redirect behavior for unauthenticated and config-missing cases.
- Reuse of the existing route-integration test harness.

**Out of scope:**

- Browser E2E.
- Live Supabase integration.
- Dashboard state-sync assertions beyond flash semantics.
- New product logic for dashboard/profile behavior.

## Architecture / Approach

Keep the work at the route/page seam and validate the observable contract only.
That means extending the existing integration tests rather than adding a new test runner or a new runtime dependency.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Harden dashboard flash semantics | Stable flash ordering and variants for dashboard messages | Over-testing implementation details instead of the user-visible contract |
| 2. Harden profile route boundary checks | Redirect and flag behavior for profile save failures | Missing a boundary case that looks safe in happy-path-only tests |

**Prerequisites:** Existing Vitest and route-integration setup already in the repo.  
**Estimated effort:** ~1-2 focused sessions.

## Open Risks & Assumptions

- The current integration files may already cover part of the desired behavior, so the actual delta may be small.
- The profile route tests should stay mocked at the boundary; moving to live Supabase would add cost without improving this slice.

## Success Criteria (Summary)

- Dashboard flash ordering stays locked to the current contract.
- Profile redirect failures stay explicit and do not produce false success states.
- The whole slice remains fast, mocked, and integration-only.

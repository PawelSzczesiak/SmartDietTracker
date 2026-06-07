# Parser Abuse Guardrails — Plan Brief

> Full plan: `context/changes/parser-abuse-guardrails/plan.md`
> Research: `context/foundation/test-plan.md`

## What & Why

Phase 3 of the test plan is about proving the parser path stays safe under repeated-use abuse without changing runtime behavior.
The app already has timeout and degraded-result semantics; this plan makes those guarantees explicit for a repeated meal-submit/retry shape and validates them in a live browser review.

## Starting Point

The parser already returns typed success/unavailable outcomes, and the meal routes already convert those outcomes into warning/success redirects with persisted parser status.
What’s missing is dedicated evidence that repeated parser-heavy actions from one user still stay warning-only and do not drift into false success.

## Desired End State

When this plan is done, the repo has a dedicated abuse-guardrail integration spec for the meal path and a browser-reviewed runtime check for the same repeated-use scenario.
The user experience remains warning-only; the plan does not introduce a new runtime throttle or cooldown.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Scope | Verification-only | The current phase is about proving the behavior, not adding a runtime guard. |
| Abuse shape | Repeated meal submits/retries from one user | That is the most direct representation of the resource-abuse risk. |
| Evidence | Integration tests + live browser review | This gives deterministic coverage plus runtime confirmation on the running app. |
| User experience | Warning-only fallback | It matches the existing degraded-path contract and avoids introducing a harsher UX change. |
| Load | 5 rapid actions | Enough to expose the pattern without turning the spec into a perf harness. |
| File shape | Dedicated spec | Keeps the abuse guardrail isolated from the existing meal route semantics tests. |

## Scope

**In scope:**

- Dedicated repeated-use abuse regression coverage for the meal route.
- Parser-boundary stubbing for deterministic integration behavior.
- Live browser review of the running app under the same repeated-use shape.

**Out of scope:**

- Runtime rate limiting, quotas, cooldowns, or debounce behavior.
- Parser algorithm changes.
- Broad performance harness work.
- Browser E2E coverage sweep.

## Architecture / Approach

Use a dedicated integration spec under the meal API test folder to protect the repeated-use risk, and use the browser only for a live AI-native confirmation that the UI still behaves warning-only under the same shape.
The plan intentionally stays on the existing route/parser seam instead of adding a new runtime policy layer.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Repeated meal-abuse guardrail coverage | A dedicated regression spec plus live browser confirmation for repeated meal-submit/retry abuse | The spec could become a perf test in disguise if the burst grows too large |

**Prerequisites:** Existing meal route integration harness, parser boundary stubbing, and a running local app with a configured parser environment.  
**Estimated effort:** ~1 focused session.

## Open Risks & Assumptions

- The phase assumes the current warning-only fallback remains the right UX for repeated parser cost.
- The browser review assumes the running app can be exercised with 5 rapid meal actions without requiring a new runtime throttle.

## Success Criteria (Summary)

- Repeated meal-submit/retry abuse stays warning-only in the dedicated spec.
- The live browser review confirms the UI remains usable under the same burst.
- No runtime guardrail is introduced in this phase.

# Critical-path bootstrap testing — Plan Brief

> Full plan: `context/changes/testing-critical-path-bootstrap/plan.md`
> Research: `context/changes/testing-critical-path-bootstrap/research.md`

## What & Why

We are bootstrapping the first enforced unit+integration test baseline for Phase 1 of the quality contract, focused on risks #1 parser correctness, #2 timeout/error semantics, and #3 calorie-policy boundaries. This closes a current gap where critical behavior exists in production code but is not protected by a first-party test gate.

## Starting Point

The code already has clear seams for parser integration, persistence status mapping, and calorie policy logic, but the repository has no test runner/scripts and CI does not run tests yet. Existing risk evidence and integration seams were mapped in `research.md`.

## Desired End State

After this plan, the repo runs a stable Vitest-based suite covering parser contract oracles, non-success timeout/error behavior, and policy boundary math. CI blocks merges on failing tests via `npm run test:run`, and `test-plan.md` cookbook entries for Phase 1 are updated from placeholders to concrete usage patterns.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Test runner | Vitest for unit + integration | Lowest-risk fit with Astro/Vite stack and one-command workflow | Plan |
| Integration depth | Route-handler integration with real `FormData` + DB assertions | Captures redirect semantics and persisted parser status without costly e2e | Plan |
| Parser oracle strategy | Known fixtures + adversarial corpus | Reduces happy-path bias while preserving business realism | Plan |
| Timeout/error verification | Deterministic stubs at parser boundary | Fast and reliable for explicit status-mapping checks | Plan |
| Calorie-policy coverage | Full boundary matrix (threshold + direction modes) | Directly protects risk #3 edge regressions | Plan |
| CI enforcement | Add required `npm run test:run` in main CI now | Locks risk coverage immediately for Phase 1 | Plan |

## Scope

**In scope:**
- Add Vitest harness, scripts, and shared setup for unit+integration tests
- Add parser contract + failure-path route integration coverage
- Add calorie-policy boundary unit/integration coverage
- Update Phase 1 cookbook entries in `context/foundation/test-plan.md`
- Enforce tests in `.github/workflows/ci.yml`

**Out of scope:**
- e2e test rollout
- Production business-logic changes for parser/policy
- Network-level parser provider integration tests
- Phase 2/3 risks from the rollout table

## Architecture / Approach

Use one test runner with two layers: unit tests for pure contract/boundary logic, and integration tests that call API route handlers with realistic request payloads plus persistence assertions. Keep parser failure injection at the service boundary to maximize determinism and CI stability while still verifying user-visible redirect semantics and dashboard message states.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Harness + CI gate | Vitest baseline, scripts, shared setup, required CI step | Tooling drift or CI instability on first rollout |
| 2. Parser + failure-path tests | Oracle-backed parser tests and meal route degraded-path integration coverage | False-success semantics hidden behind redirects |
| 3. Policy boundaries + cookbook | Full calorie-policy matrix + documented Phase 1 testing patterns | Boundary regressions or undocumented test conventions |

**Prerequisites:** Existing Supabase local flow for integration assertions; repository dependencies install cleanly.
**Estimated effort:** ~2-3 sessions across 3 phases.

## Open Risks & Assumptions

- Assumes route-handler integration approach can access stable test seams for authenticated context and persistence without brittle mocks.
- CI runtime may increase after adding tests; fixture/setup optimization may be needed to keep feedback fast.

## Success Criteria (Summary)

- Critical risk paths (#1, #2, #3) are covered by deterministic unit+integration tests.
- `npm run test:run` is required and passing in CI.
- `test-plan.md` Phase 1 cookbook sections are concretely updated and usable for new tests.

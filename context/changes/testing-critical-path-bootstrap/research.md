---
date: 2026-06-02T21:01:15.635+02:00
researcher: Copilot (GPT-5.3-Codex)
git_commit: 8458ee50d28f5160f9c149c38e91ce34795747e9
branch: s-04-finalize-impl-review
repository: PawelSzczesiak/SmartDietTracker
topic: "testing-critical-path-bootstrap"
tags: [research, codebase, parser, timeout, calorie-policy, testing]
status: complete
last_updated: 2026-06-02
last_updated_by: Copilot (GPT-5.3-Codex)
---

# Research: testing-critical-path-bootstrap

**Date**: 2026-06-02T21:01:15.635+02:00  
**Researcher**: Copilot (GPT-5.3-Codex)  
**Git Commit**: 8458ee50d28f5160f9c149c38e91ce34795747e9  
**Branch**: s-04-finalize-impl-review  
**Repository**: PawelSzczesiak/SmartDietTracker

## Research Question

Phase 1 "Critical-path bootstrap" grounding for `context/foundation/test-plan.md` risks #1, #2, #3 (unit + integration):
- #1 parser output correctness with independent oracle
- #2 timeout/error paths explicit and never success-shaped
- #3 calorie remaining-budget and warnings at policy boundaries

## Summary

Risk #1 is centered on the `parseMealNutrition` contract and downstream persistence/display seams; the best independent oracles are boundary contracts (DB constraints, API semantics, fixture-backed expectations), not duplicated parser math. Risk #2 already has explicit unavailable/error branches, but create/update/retry all use redirect-based UX, so integration tests must assert warning-vs-success query semantics and persisted `parser_status`. Risk #3 logic is well-factored in `nutrition-goals.ts` with clear thresholds and direction policy; boundary tests should focus on 90% warning threshold, over-limit transition, manual-limit advisory behavior, and gain/loss healthy-edge comparisons.

## Detailed Findings

### Risk #1 — Parser behavior contract and oracle seams

- Meal creation/update/retry all call parser then persist structured parser result ([src/pages/api/meals/index.ts:77](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/pages/api/meals/index.ts#L77), [src/pages/api/meals/update.ts:77](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/pages/api/meals/update.ts#L77), [src/pages/api/meals/retry.ts:104](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/pages/api/meals/retry.ts#L104), [src/lib/nutrition-records.ts:82-123](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/nutrition-records.ts#L82-L123)).
- Parser output is normalized by zod-based union schema and response sanitization ([src/lib/services/meal-parser.ts:24-50](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/services/meal-parser.ts#L24-L50), [src/lib/services/meal-parser.ts:111-137](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/services/meal-parser.ts#L111-L137)).
- Independent-oracle anchors exist at contract boundaries: DB nutrition non-negative checks and parser status enum ([supabase/migrations/20260527192001_create_meals.sql:13-16](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/supabase/migrations/20260527192001_create_meals.sql#L13-L16), [supabase/migrations/20260529203500_add_meal_parser_status.sql:7-8](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/supabase/migrations/20260529203500_add_meal_parser_status.sql#L7-L8)).
- Historical guidance explicitly warns against oracle-copy anti-pattern for this phase ([context/foundation/test-plan.md:38](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/context/foundation/test-plan.md#L38)).

### Risk #2 — Timeout/error semantics and false-success prevention

- Timeout is explicit at parser boundary (`AbortController` + timeout result mapping to unavailable) ([src/lib/services/meal-parser.ts:166-169](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/services/meal-parser.ts#L166-L169), [src/lib/services/meal-parser.ts:255-257](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/services/meal-parser.ts#L255-L257)).
- Provider non-2xx and provider-shaped errors are mapped to unavailable, not success ([src/lib/services/meal-parser.ts:202-227](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/services/meal-parser.ts#L202-L227)).
- Persistence keeps explicit degraded state via `parser_status` and `parser_error` ([src/lib/nutrition-records.ts:95-103](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/nutrition-records.ts#L95-L103), [src/lib/nutrition-records.ts:117-120](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/nutrition-records.ts#L117-L120)).
- Create/update/retry use redirects for both success and degraded flows, so integration assertions must disambiguate `mealWarning` vs `mealSuccess` and rendered flash variant ([src/pages/api/meals/index.ts:117-119](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/pages/api/meals/index.ts#L117-L119), [src/pages/api/meals/index.ts:157](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/pages/api/meals/index.ts#L157), [src/pages/dashboard.astro:146-149](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/pages/dashboard.astro#L146-L149), [src/components/dashboard/FlashMessage.astro:16-20](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/components/dashboard/FlashMessage.astro#L16-L20)).

### Risk #3 — Calorie boundary and warning-policy correctness

- Core policy logic is centralized and deterministic in `nutrition-goals.ts` (direction, effective limit, healthy edge, warning state) ([src/lib/nutrition-goals.ts:187-265](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/nutrition-goals.ts#L187-L265), [src/lib/nutrition-goals.ts:267-436](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/nutrition-goals.ts#L267-L436)).
- Threshold behavior to lock in tests: `near_limit` at `>= 0.9 * limit`, `over_limit` only when `consumed > limit` ([src/lib/nutrition-goals.ts:421-435](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/nutrition-goals.ts#L421-L435)).
- Warning-only policy seam (manual limit remains active; healthy edge is advisory) is reflected in both logic and UI messaging ([src/lib/nutrition-goals.ts:218-240](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/nutrition-goals.ts#L218-L240), [src/components/profile/ProfileSection.astro:126-130](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/components/profile/ProfileSection.astro#L126-L130)).
- Input defaults and schema constraints influencing boundaries are aligned across validation/UI/migrations ([src/lib/nutrition-validation.ts:80-89](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/lib/nutrition-validation.ts#L80-L89), [src/components/profile/ProfileForm.astro:114-123](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/src/components/profile/ProfileForm.astro#L114-L123), [supabase/migrations/20260602130000_add_activity_level_to_profiles.sql:2-5](https://github.com/PawelSzczesiak/SmartDietTracker/blob/8458ee50d28f5160f9c149c38e91ce34795747e9/supabase/migrations/20260602130000_add_activity_level_to_profiles.sql#L2-L5)).

## Code References

- `src/lib/services/meal-parser.ts:161-267` - Parser provider call, timeout/error mapping, unavailable semantics.
- `src/lib/nutrition-records.ts:82-147` - Mapping parser result into persisted meal nutrition and parser status.
- `src/pages/api/meals/index.ts:77-158` - Create meal control flow for warning/error/success redirect semantics.
- `src/pages/api/meals/update.ts:77-158` - Update meal control flow parity with create.
- `src/pages/api/meals/retry.ts:104-185` - Retry semantics and success/degraded paths.
- `src/lib/nutrition-goals.ts:187-436` - Goal direction, effective limit, policy boundary checks, warning status computation.
- `src/pages/dashboard.astro:62-86,140-150` - Integration seam for totals, warning state, and flash rendering.
- `src/lib/nutrition-validation.ts:41-89` - Profile boundary validation and activity-level defaults.

## Architecture Insights

- Parser concerns are intentionally split into: provider boundary (`meal-parser.ts`), persistence translation (`nutrition-records.ts`), and UX signaling (meal API routes + dashboard flash). This separation supports mixed unit/integration strategy with minimal overlap.
- Calorie policy is mostly pure-domain logic, making it suitable for boundary-heavy unit tests first, then thin integration checks from profile POST to dashboard rendering.
- Redirect-based UX status signaling is a key integration contract for risks #1 and #2; a substantial failure mode is semantic mismatch between query params, flash variant, and persisted parser status.

## Historical Context (from prior changes)

- `context/changes/first-calorie-logging-flow/plan.md` - Prior decision to keep meal save path explicit even when parser fails; timeout/failure behavior called out as critical.
- `context/changes/performance-verification-path/plan.md` - Latency/timeout verification context reinforcing risk #2 importance.
- `context/changes/evidence-based-target-policy/change.md` and `plan.md` - Warning-only target policy (no auto-cap) that directly shapes risk #3 assertions.
- `context/archive/2026-05-27-nutrition-record-foundation/plan.md` - Foundation excluded parser/policy guarantees, validating Phase 1 as first strong guardrail for these paths.

## Related Research

- `context/changes/testing-critical-path-bootstrap/research.md` (this document)

## Open Questions

- Which runner/setup should Phase 1 standardize on for unit+integration in this repository (currently no first-party test runner configured in `test-plan.md` §4).
- For parser contract tests, should the oracle fixture corpus be seeded from archived known-edge scenarios only, or extended with new adversarial descriptions in the same phase.

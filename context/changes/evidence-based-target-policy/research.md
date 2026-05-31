---
date: 2026-05-31T14:02:05.9345234+02:00
researcher: Copilot (GPT-5.3-Codex)
git_commit: 5a53971
branch: master
repository: PawelSzczesiak/SmartDietTracker
topic: "F-03 evidence-based target policy (FR-011): thresholds and safety behavior"
tags: [research, codebase, nutrition-goals, target-pace, f-03]
status: complete
last_updated: 2026-05-31
last_updated_by: Copilot (GPT-5.3-Codex)
---

# Research: F-03 evidence-based target policy (FR-011): thresholds and safety behavior

**Date**: 2026-05-31T14:02:05.9345234+02:00  
**Researcher**: Copilot (GPT-5.3-Codex)  
**Git Commit**: 5a53971  
**Branch**: master  
**Repository**: PawelSzczesiak/SmartDietTracker

## Research Question

What is needed to unblock and define F-03 (`evidence-based-target-policy`) so the app can support FR-010/FR-011 (target pace modes + safe calorie-limit adjustment), including the unresolved decision: hard cap vs warning-only?

## Summary

F-03 is blocked by two unresolved policy decisions already recorded in PRD/roadmap: numeric thresholds for pace modes and enforcement behavior when requested pace is unsafe. The codebase currently has a single calorie-limit function with manual/automatic/unavailable states and near/over warning states, but no target-pace field, no safety-policy persistence, and no API/UI surface for pace selection.  

The safest path consistent with FR-011 and external guidance is: **hard-cap unsafe targets for general users**, plus explicit warning/explanation UX. This keeps behavior aligned with the existing server-side guardrail model and avoids silent unsafe recommendations.

## Detailed Findings

### Current codebase state (integration seams for F-03)

- `profiles` currently stores `target_weight`, but not target pace (`slow/normal/fast`) or policy metadata (`src/lib/database.types.ts:4`, `src/lib/database.types.ts:11`, `src/lib/database.types.ts:34`; `supabase/migrations/20260527192000_create_profiles.sql:11`, `supabase/migrations/20260527192000_create_profiles.sql:17`).
- Profile validation/API pipeline has no `target_pace` field (`src/lib/nutrition-validation.ts:37`, `src/lib/nutrition-validation.ts:53`, `src/lib/nutrition-validation.ts:104`; `src/pages/api/profile/index.ts:32`, `src/pages/api/profile/index.ts:46`; `src/components/profile/ProfileForm.astro:65`).
- Effective calorie limit is computed in one place with precedence `manual -> automatic -> unavailable` (`src/lib/nutrition-goals.ts:70`, `src/lib/nutrition-goals.ts:71`, `src/lib/nutrition-goals.ts:79`, `src/lib/nutrition-goals.ts:93`).
- Existing dashboard warning model is state-based (`normal`, `near_limit`, `over_limit`, `unavailable`) and already user-visible (`src/lib/nutrition-goals.ts:6`; `src/components/dashboard/DashboardHero.astro:21`).

### Historical context and constraints

- FR-011 explicitly requires evidence-based adjustment and a **warning or cap** when pace is too aggressive (`context/foundation/prd.md:73`).
- The exact thresholds and cap-vs-warning behavior are still open questions, and both block F-03/S-04 (`context/foundation/prd.md:102`, `context/foundation/prd.md:103`; `context/foundation/roadmap.md:95`, `context/foundation/roadmap.md:97`, `context/foundation/roadmap.md:99`, `context/foundation/roadmap.md:148`).
- Earlier foundation intentionally deferred all target-pace and evidence-policy logic, so no hidden implementation exists yet (`context/changes/nutrition-record-foundation/plan.md:31`; `context/archive/2026-05-27-nutrition-record-foundation/plan.md:31`).
- Completed slices (S-01/S-02/S-03) depend on stable existing limit-state semantics; F-03 should extend those semantics, not fork them (`context/foundation/roadmap.md:32`, `context/foundation/roadmap.md:33`, `context/foundation/roadmap.md:34`, `context/foundation/roadmap.md:137`).

### External evidence snapshot (for policy decision)

- Widely cited safe weight-loss pace: ~0.23-0.9 kg/week (0.5-2 lb/week), usually tied to ~500-1000 kcal/day deficit.
- Conservative healthy weight-gain guidance often centers around ~0.23-0.45 kg/week (0.5-1 lb/week), typically ~250-500 kcal/day surplus.
- For consumer apps, guidance frequently recommends minimum calorie floors (commonly 1200/day women, 1500/day men) and hard restriction of more aggressive targets unless under clinical supervision.

Sources captured during this research:
- CDC healthy-weight guidance: https://www.cdc.gov/healthyweight/losing_weight/index.html
- NIDDK safe weight-loss program guidance: https://www.niddk.nih.gov/health-information/weight-management/choosing-safe-successful-weight-loss-program
- NICE obesity guideline overview: https://www.nice.org.uk/guidance/cg189

## Code References

- `src/lib/nutrition-goals.ts:70-98` - Single source for effective daily limit logic (best seam for FR-011 policy integration).  
  https://github.com/PawelSzczesiak/SmartDietTracker/blob/5a539718dcc4bbab039dce5ed49f2ed3c5c33168/src/lib/nutrition-goals.ts#L70-L98
- `src/lib/nutrition-goals.ts:100-139` - Existing warning-state computation model.  
  https://github.com/PawelSzczesiak/SmartDietTracker/blob/5a539718dcc4bbab039dce5ed49f2ed3c5c33168/src/lib/nutrition-goals.ts#L100-L139
- `src/lib/nutrition-validation.ts:37-63` - Profile input schema (currently no pace field).  
  https://github.com/PawelSzczesiak/SmartDietTracker/blob/5a539718dcc4bbab039dce5ed49f2ed3c5c33168/src/lib/nutrition-validation.ts#L37-L63
- `src/components/profile/ProfileForm.astro:65-89` - Profile form fields where pace selection UI would be added.  
  https://github.com/PawelSzczesiak/SmartDietTracker/blob/5a539718dcc4bbab039dce5ed49f2ed3c5c33168/src/components/profile/ProfileForm.astro#L65-L89
- `src/pages/api/profile/index.ts:32-47` - Profile POST handler using parsed form input.  
  https://github.com/PawelSzczesiak/SmartDietTracker/blob/5a539718dcc4bbab039dce5ed49f2ed3c5c33168/src/pages/api/profile/index.ts#L32-L47
- `supabase/migrations/20260527192000_create_profiles.sql:11-30` - Current profile schema and checks (no pace/policy columns).  
  https://github.com/PawelSzczesiak/SmartDietTracker/blob/5a539718dcc4bbab039dce5ed49f2ed3c5c33168/supabase/migrations/20260527192000_create_profiles.sql#L11-L30
- `context/foundation/prd.md:73,102-103` - FR-011 + open policy decisions.
- `context/foundation/roadmap.md:87-99,141-150,166-167` - F-03/S-04 blockers and unknowns.

## Architecture Insights

- The app already has a clean server-side decision point (`getEffectiveDailyCalorieLimit`) where F-03 policy can live without dispersing logic across UI/routes.
- Existing product behavior favors explicit state machines (e.g., unavailable/over-limit hidden states and warnings), so F-03 should add a typed policy state rather than ad-hoc booleans.
- Because `target_weight` currently has no behavioral effect, F-03 should formally connect profile goal inputs to limit computation and to user-facing rationale text (`sourceLabel`-style provenance).

## Historical Context (from prior changes)

- `context/changes/nutrition-record-foundation/plan.md` and its archived copy explicitly deferred this domain; F-03 is expected to introduce this policy for the first time.
- `context/changes/first-calorie-logging-flow/plan-brief.md` established a warning-centric UX and non-blocking logging flow; F-03 should preserve this for meal logging while still enforcing safe pace policy at goal-setting boundaries.
- `context/changes/remaining-budget-food-suggestions/plan.md` depends on stable calorie warning states; F-03 changes must remain backward-compatible with these states.

## Related Research

- No prior `research.md` artifacts found under `context/changes/**/research.md` or `context/archive/**/research.md`.

## Proposed Policy Direction (to unblock planning)

1. **Adopt hard safety caps for pace-derived limits** in general consumer mode, with clear warning text when user-selected pace is clipped.
2. **Keep meal logging non-blocking** even when profile/pace policy is unresolved, consistent with S-01 behavior.
3. **Define pace bands as policy constants** (slow/normal/fast) with separate mappings for loss vs gain and a documented min-calorie floor.
4. **Persist both requested and applied pace outcome** (requested mode, applied mode, cap reason) for explainability/audit in UI.

## Confirmed Product Decision (neutral wording)

- Enforcement model: **warning-only** (no automatic clipping/capping of user-selected calorie limit).
- UI must always show a concrete **healthy edge limit toward the selected goal**:
  - For weight-loss goals: show **minimum healthy limit** (`set at least X kcal`) that removes warning.
  - For weight-gain goals: show **maximum healthy limit** (`set at most Y kcal`) that removes warning.
- Use neutral copy in docs/UI: **"recommended healthy edge limit for your goal"** instead of always saying "maximum limit".

## Open Questions

- Should the app support gain-mode pacing in MVP or only reduction pacing first?
- Are calorie floors sex-specific only, or should they incorporate additional profile factors?
- What copy/tone should be used when overriding unsafe targets to preserve trust and avoid a punitive UX?

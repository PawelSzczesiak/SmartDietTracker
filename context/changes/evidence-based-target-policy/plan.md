# Evidence-based target policy Implementation Plan

## Overview

Codify the evidence-based target-pace policy behind F-03 so the app has one reusable, server-side source of truth for healthy pace bands, warning-only enforcement, and directional "healthy edge" guidance before S-04 applies pace-based calorie adjustment.

This plan intentionally focuses on the policy contract and advisory UX, not the full target-pace calorie-adjustment feature. Its job is to settle thresholds, data shape, and warning behavior in code so S-04 can build on stable rules instead of reopening product decisions.

## Current State Analysis

The app already has a single server-side seam for calorie-budget behavior in `getEffectiveDailyCalorieLimit`, and the dashboard consumes its result plus `DailyCalorieWarning` to drive both the hero state and downstream features like food suggestions (`src/lib/nutrition-goals.ts:70-139`, `src/pages/dashboard.astro:37-60`, `src/lib/services/food-suggestions.ts:236-289`). The profile persistence stack is also already centralized across Supabase schema, generated database types, Zod validation, the profile API route, and the profile form (`supabase/migrations/20260527192000_create_profiles.sql:11-30`, `src/lib/database.types.ts:4-38`, `src/lib/nutrition-validation.ts:37-63`, `src/pages/api/profile/index.ts:32-46`, `src/components/profile/ProfileForm.astro:11-99`).

What is missing is the entire F-03 policy layer: there is no `target_pace` field, no typed policy state for loss/gain/maintain, no healthy-edge calculation, and no UI surface for warning-only guidance. `target_weight` currently exists but has no behavioral effect, so the policy must explicitly connect profile goal inputs to derived advisory behavior without silently changing the active tracking budget yet (`src/components/profile/ProfileSummary.astro:21-28`, `src/lib/nutrition-goals.ts:79-97`).

## Desired End State

When this plan is complete, the app persists a user's selected target pace, computes evidence-based policy guidance on the server, and exposes a typed advisory state that explains whether the current goal/limit combination stays within the healthy edge for the selected direction. The policy covers loss, gain, and maintain/no-direction behavior, with warning-only enforcement and no automatic clipping of the user's active calorie budget.

Verification of the end state is concrete: a signed-in user can save a target pace on the profile, see it persist after refresh, and see policy guidance rendered consistently in the profile area and the dashboard hero. Manual calorie limits remain active for tracking, meal logging stays non-blocking, and downstream calorie-budget consumers continue to use the active requested limit while the UI separately shows the recommended healthy edge for the current goal.

### Key Discoveries:

- `getEffectiveDailyCalorieLimit` is already the canonical source for manual/automatic/unavailable limit semantics, so F-03 should extend domain output around it rather than fork budget logic elsewhere (`src/lib/nutrition-goals.ts:70-98`).
- `DailyCalorieWarning` is consumed by both dashboard status and food suggestions, so F-03 must preserve requested-limit tracking behavior unless it explicitly wants downstream budget features to change too (`src/lib/nutrition-goals.ts:100-139`, `src/lib/services/food-suggestions.ts:236-289`).
- The profile pipeline already follows a stable migration -> generated types -> validation -> API -> Astro form flow, which is the right place to introduce `target_pace` as the only persisted F-03 input (`supabase/migrations/20260527192000_create_profiles.sql:11-30`, `src/lib/database.types.ts:4-38`, `src/lib/nutrition-validation.ts:37-63`, `src/lib/nutrition-records.ts:46-58`, `src/pages/api/profile/index.ts:32-46`).
- Product direction is already settled upstream: warning-only enforcement, directional healthy-edge messaging, support for both loss and gain, and maintain/no-pace behavior when current and target weight match (`context\changes\evidence-based-target-policy\research.md:99-105`, `context\changes\evidence-based-target-policy\change.md:12-13`).

## What We're NOT Doing

- We are not shipping S-04's full pace-based calorie-limit adjustment flow in this change.
- We are not auto-capping or silently overriding a user's active calorie limit when the selected goal is outside the healthy edge.
- We are not introducing a new test runner or first-party unit-test framework; automated verification remains aligned with the repo's current `astro sync` + lint + build safety net.
- We are not redesigning meal logging, dashboard layout, or food-suggestion visibility rules beyond the minimum copy/state changes needed to keep the warning-only policy coherent.
- We are not adding personalized clinical logic beyond the agreed evidence-based mode bands and maintain/no-direction branch.

## Implementation Approach

Implement F-03 as a policy foundation in four layers: first extend the persisted profile contract with `target_pace`, then add a pure server-side policy model that derives direction, healthy-edge thresholds, and warning/advisory state from the saved profile plus the active calorie budget, then wire that model into the profile experience where users make goal decisions, and finally surface the active advisory summary in the dashboard without changing requested-limit tracking semantics.

The key design choices already settled are: support both loss and gain in the first delivery; treat equal current/target weight as maintain/no pace applied; use more aggressive top-end weekly pace bands (`loss 0.25 / 0.5 / 0.9 kg`, `gain 0.25 / 0.4 / 0.5 kg`); keep manual calorie limits active but still evaluated and warned; persist only user inputs; and keep downstream tracking/suggestions based on the active requested limit while the healthy edge appears as a separate advisory value.

## Critical Implementation Details

### State sequencing

The active calorie budget and the advisory policy state must remain distinct. `getEffectiveDailyCalorieLimit` continues to decide which budget is active for tracking, while the new policy helper evaluates that active budget against the selected target direction and pace. This ordering prevents hidden dual-budget behavior and keeps food suggestions aligned with today's actual tracked budget.

### User experience spec

The full explanation belongs next to the editable profile goal fields, and the dashboard hero should only echo a compact summary of the current advisory state. That keeps the warning actionable where the user edits the goal while still making the active policy state visible after save.

## Phase 1: Extend the persisted profile contract

### Overview

Add the minimum durable data shape F-03 needs so pace selection becomes part of the saved profile contract without persisting derived advisory fields that can drift.

### Changes Required:

#### 1. Profile schema migration

**File**: `supabase/migrations/<timestamp>_add_target_pace_to_profiles.sql`

**Intent**: Persist the user's selected pace mode as durable profile state that later policy calculations and UI reads can consume consistently.

**Contract**: Add nullable `target_pace` to `profiles`, constrained to the canonical mode values used by the product (`slow`, `normal`, `fast`), without storing derived warning or healthy-edge metadata.

#### 2. Generated database and domain types

**File**: `src/lib/database.types.ts`

**Intent**: Keep generated Supabase row/insert/update shapes aligned with the migration so server helpers and UI props remain type-safe.

**Contract**: Extend the `profiles` row/insert/update contracts with nullable `target_pace`, matching the migration values exactly.

#### 3. Validation and persistence pipeline

**File**: `src/lib/nutrition-validation.ts`, `src/lib/nutrition-records.ts`, `src/pages/api/profile/index.ts`

**Intent**: Accept the new profile input end-to-end using the same server-side validation and upsert flow already used for the rest of the profile.

**Contract**: The shared profile schema accepts nullable `target_pace`, transforms it into the repo's camelCase form for persistence helpers, and the existing POST + redirect profile route continues to treat `context.locals.user` as the identity source.

### Success Criteria:

#### Automated Verification:

- Local Supabase applies the new profile schema cleanly: `npx supabase db reset`
- Astro types regenerate successfully after the schema change: `npx astro sync`
- Lint passes with the new profile contract in place: `npm run lint`
- Build passes with the extended profile pipeline wired through: `npm run build`

#### Manual Verification:

- A signed-in user can save `slow`, `normal`, or `fast` target pace and see it persist after a full page refresh
- A profile can still be saved when `target_pace` is empty, matching the existing optional-field profile model

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Build the evidence-based policy engine

### Overview

Introduce the reusable server-side policy model that turns saved profile inputs plus the active calorie budget into typed direction, healthy-edge, and warning/advisory outputs.

### Changes Required:

#### 1. Policy constants and typed policy state

**File**: `src/lib/nutrition-goals.ts`

**Intent**: Define the canonical pace-band constants and return types so the app has one explicit policy contract for loss, gain, and maintain branches.

**Contract**: Add typed policy outputs that capture direction (`loss`, `gain`, `maintain`, `unknown` as needed by profile completeness), selected pace, recommended healthy edge, warning status, and a human-readable provenance/advisory label that downstream UI can render without re-deriving the rules.

#### 2. Healthy-edge calculation helper

**File**: `src/lib/nutrition-goals.ts`

**Intent**: Centralize the evidence-based mapping from selected pace + goal direction to weekly-change guidance and the calorie edge value shown to users.

**Contract**: Implement the agreed bands for both loss and gain, treat equal current/target weight as maintain/no pace applied, and evaluate the current active calorie budget against the healthy edge without mutating that budget.

#### 3. Integration with existing calorie-budget model

**File**: `src/lib/nutrition-goals.ts`, `src/pages/dashboard.astro`

**Intent**: Make the new policy output available alongside the existing effective-limit and warning objects so the dashboard can consume it server-side.

**Contract**: Preserve the current `manual -> automatic -> unavailable` limit precedence and keep `DailyCalorieWarning` based on the active requested limit, while additionally exposing the derived policy/advisory state to page-level consumers.

### Success Criteria:

#### Automated Verification:

- Astro sync, lint, and build all pass after the policy types and helpers are added: `npx astro sync && npm run lint && npm run build`

#### Manual Verification:

- Loss and gain goals each resolve to the agreed pace-band mapping for `slow`, `normal`, and `fast`
- Equal current and target weight resolves to maintain/no pace applied with no misleading loss/gain warning
- A manual calorie limit outside the healthy edge shows a warning and recommended healthy edge without being auto-clipped
- Existing near-limit / over-limit daily tracking behavior remains based on the active requested limit

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Wire policy into the profile experience

### Overview

Let users set target pace and understand the policy outcome where they edit their goal, using the existing profile section and save flow.

### Changes Required:

#### 1. Pace-selection form control

**File**: `src/components/profile/ProfileForm.astro`

**Intent**: Add the target-pace input to the existing profile form without introducing a separate wizard or client-side state machine.

**Contract**: Render a pace selector using the canonical saved values, prefill it from the persisted profile, and submit it through the existing `/api/profile` HTML form.

#### 2. Profile advisory presentation

**File**: `src/components/profile/ProfileSection.astro`, `src/components/profile/ProfileSummary.astro`

**Intent**: Show the full warning-only explanation and healthy-edge guidance in the profile area where the user can act on it immediately.

**Contract**: The profile section renders the policy state derived on the server, clearly distinguishes the active calorie budget from the recommended healthy edge, and uses neutral directional copy for loss (`set at least X kcal`) vs gain (`set at most Y kcal`) goals.

#### 3. Save-flow messaging alignment

**File**: `src/pages/api/profile/index.ts`, any profile feedback components already used on `/dashboard`

**Intent**: Keep validation and save outcomes explicit when the profile contains a pace selection but incomplete inputs prevent a full policy evaluation.

**Contract**: Incomplete-profile states remain non-fatal: the profile save succeeds when valid, and the UI explains what is still missing before a healthy-edge recommendation can be shown.

### Success Criteria:

#### Automated Verification:

- Lint passes with the new profile UI and route integration: `npm run lint`
- Build passes with the policy data flowing into the profile section: `npm run build`

#### Manual Verification:

- A signed-in user can choose a pace in the profile form and see it reflected in the saved profile view
- The profile area shows warning-only guidance for an unsafe manual limit without blocking save
- The profile area shows neutral directional healthy-edge copy for both loss and gain goals
- A maintain/equal-weight profile does not show misleading pace-enforcement copy

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Surface advisory state in the dashboard

### Overview

Expose the active policy summary on the main dashboard while keeping downstream calorie-budget features coherent with the warning-only model.

### Changes Required:

#### 1. Dashboard hero advisory summary

**File**: `src/components/dashboard/DashboardHero.astro`, `src/pages/dashboard.astro`

**Intent**: Add a compact dashboard summary of the current policy/advisory state so the warning remains visible after profile save.

**Contract**: The hero receives the derived policy state from the server, renders a concise advisory summary next to the current budget/status cards, and does not imply silent auto-capping of the active daily limit.

#### 2. Copy alignment for downstream budget consumers

**File**: `src/components/dashboard/FoodSuggestions.astro`, `src/components/meals/MealJournalSection.astro`

**Intent**: Remove wording that would contradict the warning-only model while preserving the existing visibility/state rules of downstream features.

**Contract**: Tracking, remaining-budget calculations, and suggestion visibility continue to follow the active requested limit; only the explanatory copy is adjusted where needed so users do not confuse the advisory healthy edge with the active tracked budget.

### Success Criteria:

#### Automated Verification:

- Lint passes after the dashboard messaging updates: `npm run lint`
- Build passes with the dashboard policy summary in place: `npm run build`

#### Manual Verification:

- Dashboard hero shows the current advisory state after profile save without requiring the user to reopen the profile section
- Food suggestions and meal tracking still behave against the active requested limit, not the advisory healthy edge
- No dashboard copy suggests that the app silently capped the user's chosen calorie limit

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

## Testing Strategy

### Unit Tests:

- There is currently no first-party unit-test runner in the repository, so this plan does not add one for F-03.
- Keep the policy helper in `src/lib/nutrition-goals.ts` pure and deterministic so the logic can be covered later if a lightweight test harness is introduced.

### Integration Tests:

- Validate the profile schema/type pipeline with `npx supabase db reset` and `npx astro sync`.
- Validate end-to-end SSR wiring with `npm run lint` and `npm run build`.

### Manual Testing Steps:

1. Save each pace mode on a profile and confirm the value persists after refresh.
2. Verify loss-goal guidance and gain-goal guidance each show the expected healthy-edge number and direction-specific copy.
3. Save an equal-weight goal and confirm the UI falls back to maintain/no-pace messaging.
4. Set an aggressive manual calorie limit and confirm the app warns without blocking save or silently changing the tracked budget.
5. Confirm dashboard hero, meal tracking, and food suggestions all remain consistent with the active requested limit after policy guidance appears.

## Performance Considerations

Keep policy derivation synchronous and server-side with no additional network calls. The new helper should work from already-loaded profile and effective-limit inputs so dashboard rendering remains a pure extension of the existing SSR data flow.

## Migration Notes

F-03 adds one nullable profile field and no backfill. Existing profiles should remain valid with `target_pace = null`, and the policy engine must treat that state as "no pace selected yet" rather than a persistence error.

## References

- Related research: `context\changes\evidence-based-target-policy\research.md`
- Product requirements: `context\foundation\prd.md`
- Roadmap foundation + downstream dependency: `context\foundation\roadmap.md`
- Current profile schema: `supabase/migrations/20260527192000_create_profiles.sql:11-30`
- Generated profile types: `src/lib/database.types.ts:4-38`
- Current profile validation flow: `src/lib/nutrition-validation.ts:37-63`
- Current profile persistence helper: `src/lib/nutrition-records.ts:46-58`
- Current profile save route: `src/pages/api/profile/index.ts:32-46`
- Current budget logic seam: `src/lib/nutrition-goals.ts:70-139`
- Current dashboard integration: `src/pages/dashboard.astro:37-60`
- Current dashboard status UI: `src/components/dashboard/DashboardHero.astro:45-79`
- Current suggestion-budget dependency: `src/lib/services/food-suggestions.ts:236-289`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Extend the persisted profile contract

#### Automated

- [x] 1.1 Local Supabase applies the new profile schema cleanly — de8ad11
- [x] 1.2 Astro types regenerate successfully after the schema change — de8ad11
- [x] 1.3 Lint passes with the new profile contract in place — de8ad11
- [x] 1.4 Build passes with the extended profile pipeline wired through — de8ad11

#### Manual

- [x] 1.5 A signed-in user can save `slow`, `normal`, or `fast` target pace and see it persist after a full page refresh — de8ad11
- [x] 1.6 A profile can still be saved when `target_pace` is empty — de8ad11

### Phase 2: Build the evidence-based policy engine

#### Automated

- [x] 2.1 Astro sync, lint, and build all pass after the policy types and helpers are added — e7d3cb8

#### Manual

- [x] 2.2 Loss and gain goals each resolve to the agreed pace-band mapping for `slow`, `normal`, and `fast` — e7d3cb8
- [x] 2.3 Equal current and target weight resolves to maintain/no pace applied with no misleading loss/gain warning — e7d3cb8
- [x] 2.4 A manual calorie limit outside the healthy edge shows a warning and recommended healthy edge without being auto-clipped — e7d3cb8
- [x] 2.5 Existing near-limit / over-limit daily tracking behavior remains based on the active requested limit — e7d3cb8

### Phase 3: Wire policy into the profile experience

#### Automated

- [x] 3.1 Lint passes with the new profile UI and route integration — e7d3cb8
- [x] 3.2 Build passes with the policy data flowing into the profile section — e7d3cb8

#### Manual

- [x] 3.3 A signed-in user can choose a pace in the profile form and see it reflected in the saved profile view — e7d3cb8
- [x] 3.4 The profile area shows warning-only guidance for an unsafe manual limit without blocking save — e7d3cb8
- [x] 3.5 The profile area shows neutral directional healthy-edge copy for both loss and gain goals — e7d3cb8
- [x] 3.6 A maintain/equal-weight profile does not show misleading pace-enforcement copy — e7d3cb8

### Phase 4: Surface advisory state in the dashboard

#### Automated

- [x] 4.1 Lint passes after the dashboard messaging updates
- [x] 4.2 Build passes with the dashboard policy summary in place

#### Manual

- [x] 4.3 Dashboard hero shows the current advisory state after profile save without requiring the user to reopen the profile section
- [x] 4.4 Food suggestions and meal tracking still behave against the active requested limit, not the advisory healthy edge
- [x] 4.5 No dashboard copy suggests that the app silently capped the user's chosen calorie limit

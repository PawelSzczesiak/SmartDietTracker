# Target Pace Calorie Adjustment Implementation Plan

## Overview

Complete S-04 by adding activity-level awareness to F-03's foundation and refining the user-facing UI/UX. F-03 already implemented pace calculation logic and dashboard integration; S-04 adds the missing activity_level field (to replace hardcoded ACTIVITY_FACTOR), improves the profile form UI (radio buttons instead of dropdown for pace, new activity selector), and implements user guidance (login banner for pace-missing users, toast on pace changes).

## Current State Analysis

**What F-03 Already Delivered:**
- `target_pace` column in profiles with constraint
- `TARGET_PACE_BANDS` constants (separate gain/loss mappings: slow/normal/fast with kg/week rates)
- `getTargetCaloriePolicy()` function computing healthy edges + safety flags
- `MINIMUM_HEALTHY_CALORIES` (sex-based: 1200F/1500M)
- Dashboard integration: `DashboardHero` renders targetPolicy with pace label and warning tone
- Calculation seam: `getMaintenanceCalories()` using hardcoded `ACTIVITY_FACTOR = 1.35`

**What S-04 Must Add:**
1. `activity_level` column in profiles (`low/normal/high` or similar)
2. Activity-level-aware multiplier for maintenance calorie calculation
3. Pace UI: radio buttons instead of current dropdown select
4. Activity level selector on profile form
5. Login banner/modal when pace is null (prompt user to set pace)
6. Toast notification on pace change ("Pace updated to X")
7. Validation: reject invalid activity_level values
8. Tests: unit test activity-aware calculation, integration test for profile update

**Key Discoveries:**
- F-03 already did ~80% of the work; S-04 is primarily polish + activity integration
- `src/lib/nutrition-goals.ts:148` uses hardcoded `ACTIVITY_FACTOR`; this is the seam for S-04 to hook activity level
- Profile form currently at `src/components/profile/ProfileForm.astro:78-89` has pace as dropdown; needs refactor to radio + activity
- Dashboard already calls `getTargetCaloriePolicy()` at `src/pages/dashboard.astro:73`; no changes needed there
- No login middleware banner exists yet; need to add one (or use a Topbar notif pattern)

## Desired End State

After this plan, users can:
- Select `slow/normal/fast` pace via radio buttons (more prominent than dropdown)
- Select `low/normal/high` activity level when setting profile
- See an automated login prompt if pace is not set yet
- Get a toast notification when they change pace
- See personalized "recommended healthy edge" guidance on dashboard (already from F-03)

The maintenance calorie calculation now accounts for activity level, making the healthy-edge recommendations more accurate.

## What We're NOT Doing

- No refactor of existing warning model or meal logging behavior
- No changes to dashboard rendering (F-03 already handles it)
- No new data persistence beyond activity_level column
- No performance re-tuning (F-02 already covered)
- No migration of existing users' activity level (defaults to 'normal')

## Implementation Approach

1. Add activity_level column with safe defaults
2. Create activity multiplier lookup (low/normal/high mapped to numeric factors)
3. Update calculation function to accept activity level and use it instead of hardcoded constant
4. Refactor ProfileForm: pace → radio buttons, add activity selector
5. Add validation for activity_level in parsing + API
6. Implement login banner for pace-missing users
7. Implement toast on pace change (use existing FlashMessage pattern or React Toast)
8. Write unit tests for activity-aware calculation
9. Write integration test for profile update with activity level

## Critical Implementation Details

**Activity level multiplier mapping**: Common fitness industry standard is:
- Sedentary (low): ~1.2
- Lightly active (normal): ~1.375
- Moderately active (high): ~1.55

These feed into Mifflin-St Jeor BMR × activity factor = maintenance calories. S-04 should define these constants and use them in `getMaintenanceCalories()`.

**Pace change UX**: When user changes pace, show a toast with the new healthy-edge recommendation, not just "Pace updated." Example: "Pace set to Fast. Recommended limit for your goal: 2100 kcal."

**Activity level default**: All profiles default to 'normal' (1.375 multiplier) to avoid breaking existing calorie estimates. Existing users won't see a noticeable change unless they explicitly pick a different level.

## Phase 1: Data model & activity level integration

### Overview

Add `activity_level` column to profiles, define activity multipliers as constants, and update the maintenance calorie calculation to use activity level instead of hardcoded factor.

### Changes Required:

#### 1. Database migration

**File**: `supabase/migrations/20260602_add_activity_level_to_profiles.sql`

**Intent**: Add a new `activity_level` column to the profiles table with a check constraint that allows `low`, `normal`, or `high` values, defaulting to `normal` for existing users.

**Contract**: Migration adds `activity_level text default 'normal'` with check constraint `activity_level in ('low', 'normal', 'high')`.

#### 2. TypeScript type generation

**File**: `src/lib/database.types.ts`

**Intent**: Update generated Supabase types to include the new `activity_level` field with union type `'low' | 'normal' | 'high' | null`.

**Contract**: Regenerate types via `npx astro sync` after migration applies; ProfileRecord will include `activity_level` field.

#### 3. Activity multiplier constants

**File**: `src/lib/nutrition-goals.ts`

**Intent**: Define activity-level-to-multiplier mapping and replace hardcoded `ACTIVITY_FACTOR` with a function that looks up the multiplier based on the selected activity level.

**Contract**: Add:
```
const ACTIVITY_MULTIPLIERS = {
  low: 1.2,
  normal: 1.375,
  high: 1.55,
} as const;

function getActivityMultiplier(activityLevel: ProfileRecord['activity_level']): number {
  if (!activityLevel || activityLevel === 'normal') return ACTIVITY_MULTIPLIERS.normal;
  return ACTIVITY_MULTIPLIERS[activityLevel];
}
```

#### 4. Update maintenance calorie calculation

**File**: `src/lib/nutrition-goals.ts`

**Intent**: Refactor `getMaintenanceCalories()` to use the activity multiplier function instead of hardcoded `ACTIVITY_FACTOR`.

**Contract**: Change line 148 from `basalMetabolicRate * ACTIVITY_FACTOR` to `basalMetabolicRate * getActivityMultiplier(profile.activity_level)`.

### Success Criteria:

#### Automated Verification:

- [ ] 1.1 Migration applies cleanly without errors
- [ ] 1.2 `npx astro sync` regenerates types with `activity_level` field
- [ ] 1.3 Linting passes for updated nutrition-goals.ts
- [ ] 1.4 Build passes with activity multiplier changes

#### Manual Verification:

- [ ] 1.5 Existing profiles default to 'normal' activity level (no breakage)
- [ ] 1.6 Calorie estimates change correctly when activity level is different from 'normal'

---

## Phase 2: Profile form UI & activity level support

### Overview

Change pace selection from a dropdown to radio buttons, add a new activity level selector, and wire both fields through the profile form and API validation.

### Changes Required:

#### 1. ProfileForm component refactor

**File**: `src/components/profile/ProfileForm.astro`

**Intent**: Replace the `target_pace` dropdown with three radio buttons (Slow / Normal / Fast) and add a new activity level selector (Sedentary / Lightly Active / Moderately Active) below it.

**Contract**: 
- Radio button group for pace, using `<input type="radio" name="target_pace" value="slow|normal|fast" />` with corresponding labels
- Dropdown or radio group for activity level with values `low|normal|high` and friendly labels
- Both fields remain optional; no new required fields in MVP

#### 2. Profile parsing & validation

**File**: `src/lib/nutrition-validation.ts`

**Intent**: Add `activity_level` field to the profile input schema; validate it as one of `low|normal|high` with a default fallback to `normal`.

**Contract**: Update `parseProfileFormData()` schema to include:
```
activity_level: z.enum(['low', 'normal', 'high']).optional().default('normal')
```

#### 3. Profile API handler

**File**: `src/pages/api/profile/index.ts`

**Intent**: Handler already uses `parseProfileFormData()`, so no changes needed in the handler itself. Validation + parsing is automatic.

**Contract**: No code change; implicit via updated validation schema.

### Success Criteria:

#### Automated Verification:

- [ ] 2.1 Lint passes for refactored ProfileForm component
- [ ] 2.2 TypeScript type checking passes for nutrition-validation.ts changes
- [ ] 2.3 Build passes with form component updates

#### Manual Verification:

- [ ] 2.4 Profile form displays pace as three radio buttons (not dropdown)
- [ ] 2.5 Activity level selector appears on profile form
- [ ] 2.6 Submitting profile with pace + activity level persists both fields
- [ ] 2.7 Existing profiles without activity level still work (default applied)

---

## Phase 3: User guidance (banner + toast)

### Overview

Add a login-time prompt/banner when pace is missing, and a toast notification when pace changes. Both improve discoverability and confirmation feedback.

### Changes Required:

#### 1. Login banner / pace-missing prompt

**File**: `src/components/Topbar.astro` OR new `src/components/PacePromptBanner.astro`

**Intent**: Check if user's profile has `target_pace = null`. If so, display a dismissable banner with copy like "Let's pick a target pace for your goal!" and a link to the profile section.

**Contract**: If `profile?.target_pace == null`, render a banner with a "Set pace" link that scrolls to profile form or opens a modal. Banner should be dismissable (client-side localStorage flag or server-side preference).

#### 2. Pace change toast notification

**File**: `src/pages/api/profile/index.ts` OR `src/pages/dashboard.astro`

**Intent**: After profile update succeeds, if `target_pace` changed, send back a personalized toast message via query param or a new response mechanism.

**Contract**: On profile POST success with pace change, redirect with query param:
```
?profileSuccess=Pace+set+to+normal.+Recommended+limit:+2200+kcal.
```
or compute a smart message that includes the new healthy edge if pace changed.

#### 3. Toast / flash message styling

**File**: `src/components/dashboard/FlashMessage.astro`

**Intent**: Component already exists; reuse it for pace-change notifications. Optional: add `variant="pace-change"` for custom styling if needed.

**Contract**: Existing FlashMessage component should render the pace-change toast automatically via the profileSuccess query param.

### Success Criteria:

#### Automated Verification:

- [ ] 3.1 Lint passes for new/refactored component files
- [ ] 3.2 Build passes with banner + toast additions
- [ ] 3.3 No type errors in Topbar / PacePromptBanner

#### Manual Verification:

- [ ] 3.4 On login with no pace set, banner appears with "Set pace" prompt
- [ ] 3.5 Banner is dismissable and doesn't reappear until next login (or session reset)
- [ ] 3.6 Changing pace from one value to another shows a toast with the new setting
- [ ] 3.7 Toast displays recommended healthy edge for the new pace (e.g., "Fast: 2100 kcal recommended")

---

## Phase 4: Testing & edge cases

### Overview

Add unit tests for activity-aware calculation and integration tests for the profile update flow. Ensure existing behavior is preserved and new cases are covered.

### Changes Required:

#### 1. Unit tests for activity-aware maintenance calories

**File**: `src/lib/nutrition-goals.test.ts` (create if it doesn't exist)

**Intent**: Test that `getMaintenanceCalories()` computes correct values for each activity level (low/normal/high).

**Contract**: 
- Test case: male, 80kg, 180cm, 30y, activity='low' → expect ~2300 kcal (instead of ~2400 with hardcoded 1.35)
- Test case: same profile, activity='high' → expect ~2600 kcal
- Test case: profile with activity=null → defaults to 'normal' (expect ~2400)

#### 2. Integration test for profile update with activity level

**File**: Create test or add to existing profile test suite

**Intent**: Test the full flow: user submits profile form with pace + activity level → API validates + persists → dashboard re-renders with updated calorie estimates.

**Contract**:
- POST /api/profile with activity_level='high' + target_pace='normal' → succeeds
- GET dashboard afterward → DashboardHero shows updated estimate and pace

#### 3. Manual smoke test checklist

**Contract**:
- Create new profile with activity level low + pace slow → verify dashboard shows conservative estimate
- Change activity to high → verify estimate increases
- Change pace from normal to fast → verify toast shows new recommendation
- Login with existing profile (no activity level) → verify default applied, no errors

### Success Criteria:

#### Automated Verification:

- [x] 4.1 Unit tests for activity-aware calculation pass
- [x] 4.2 Integration test for profile update passes
- [x] 4.3 Existing tests still pass (no regressions)
- [x] 4.4 Lint passes for test files

#### Manual Verification:

- [x] 4.5 All smoke test checklist items pass
- [x] 4.6 No console errors during profile updates
- [x] 4.7 Existing users without activity level see correct defaults

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to close out the plan.

---

## Testing Strategy

### Unit Tests:

- Activity multiplier function returns correct value for each level
- Maintenance calorie calculation with low/normal/high activity
- Activity level validation (accepts low/normal/high, rejects invalid)

### Integration Tests:

- Profile form submission with activity level + pace
- API validation + persistence
- Dashboard re-render with updated estimates

### Manual Testing Steps:

1. Create profile with activity level 'high' + pace 'normal' → verify calorie estimate and dashboard display
2. Update same profile to activity level 'low' → verify estimate decreases
3. Change pace to 'fast' → verify toast shows new recommendation
4. Login with existing profile → verify activity defaults to 'normal' with no UI errors
5. Check that warning states (near_limit/over_limit) still work with new estimates

## Performance Considerations

- Activity multiplier lookup is O(1); no performance impact
- No new queries or data fetches; all computed client/server-side
- Migration is additive with defaults; no backfill needed

## Migration Notes

- Migration adds `activity_level` with default 'normal' to all existing profiles
- Existing calorie estimates will not change (default activity factor 1.375 is preserved)
- No data loss or rollback complexity

## References

- F-03 implementation: `context/changes/evidence-based-target-policy/plan.md`
- Nutrition goals module: `src/lib/nutrition-goals.ts:138-148`
- Profile form: `src/components/profile/ProfileForm.astro:78-89`
- Dashboard: `src/pages/dashboard.astro:46-73`
- Profile API: `src/pages/api/profile/index.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Data model & activity level integration

#### Automated

- [x] 1.1 Migration applies cleanly without errors — 2ea27ae
- [x] 1.2 `npx astro sync` regenerates types with `activity_level` field — 2ea27ae
- [x] 1.3 Linting passes for updated nutrition-goals.ts — 2ea27ae
- [x] 1.4 Build passes with activity multiplier changes — 2ea27ae
- [x] 1.5 Fixed `getEffectiveDailyCalorieLimit()` to respect direction and default pace for gain/loss goals — 2ea27ae

#### Manual

- [x] 1.6 Existing profiles default to 'normal' activity level (no breakage) — 2ea27ae
- [x] 1.7 Automatic limit reflects gain/loss pace (not maintenance calories when goal is set) — 2ea27ae

### Phase 2: Profile form UI & activity level support

#### Automated

- [x] 2.1 Lint passes for refactored ProfileForm component
- [x] 2.2 TypeScript type checking passes for nutrition-validation.ts changes
- [x] 2.3 Build passes with form component updates

#### Manual

- [ ] 2.4 Profile form displays pace as three radio buttons (not dropdown)
- [ ] 2.5 Activity level selector appears on profile form
- [ ] 2.6 Submitting profile with pace + activity level persists both fields
- [ ] 2.7 Existing profiles without activity level still work (default applied)
- [ ] 2.8 Calorie estimates change correctly when activity level is different from 'normal'

### Phase 3: User guidance (banner + toast)

#### Automated

- [x] 3.1 Lint passes for new/refactored component files
- [x] 3.2 Build passes with banner + toast additions
- [x] 3.3 No type errors in Topbar / PacePromptBanner

#### Manual

- [ ] 3.4 On login with no pace set, banner appears with "Set pace" prompt
- [ ] 3.5 Banner is dismissable and doesn't reappear until next login (or session reset)
- [ ] 3.6 Changing pace from one value to another shows a toast with the new setting
- [ ] 3.7 Toast displays recommended healthy edge for the new pace (e.g., "Fast: 2100 kcal recommended")

### Phase 4: Testing & edge cases

#### Automated

- [ ] 4.1 Unit tests for activity-aware calculation pass
- [ ] 4.2 Integration test for profile update passes
- [ ] 4.3 Existing tests still pass (no regressions)
- [ ] 4.4 Lint passes for test files

#### Manual

- [ ] 4.5 All smoke test checklist items pass
- [ ] 4.6 No console errors during profile updates
- [ ] 4.7 Existing users without activity level see correct defaults

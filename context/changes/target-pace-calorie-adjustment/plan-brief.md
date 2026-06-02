# Target Pace Calorie Adjustment — Plan Brief

> Full plan: `context/changes/target-pace-calorie-adjustment/plan.md`
> Related: F-03 foundation (`context/changes/evidence-based-target-policy/`)

## What & Why

Complete S-04 by integrating activity-level awareness into F-03's pace-based calorie guidance and improving the user-facing profile form. F-03 already built the pace calculation engine and dashboard integration; S-04 adds the missing variable (activity level) to make calorie estimates more personalized, plus UI/UX polish (radio buttons, form selector, login prompt, toast feedback).

## Starting Point

F-03 delivered:
- `target_pace` column (slow/normal/fast) in profiles
- Pace-to-calorie calculation logic with healthy-edge safety checks
- Dashboard integration showing pace label + warning tones
- Hardcoded activity factor (1.35) in the maintenance calorie calculation

S-04 finds these gaps:
- No activity level column (low/normal/high) to replace hardcoded factor
- Pace UI is a dropdown, not prominent radio buttons
- No login-time prompt when pace is missing
- No toast feedback when pace changes

## Desired End State

Users can select their activity level when setting profile, see more accurate calorie estimates, and get clear guidance on pace selection. The pace calculation now accounts for individual activity level, making healthy-edge recommendations fit the user's life better. Improving discoverability and feedback makes the feature less invisible.

## Key Decisions Made

| Decision                       | Choice                                                    | Why                                                                    | Source |
|--------------------------------|-----------------------------------------------------------|--------|--------|
| Activity levels                | Three tiers: low (1.2) / normal (1.375) / high (1.55)     | Standard fitness industry multipliers; balance precision + UX simplicity. | Research (F-03) |
| Pace UI                        | Radio buttons (not dropdown)                              | Pace is high-priority; radio buttons make all three options equally visible. | Plan |
| Default behavior               | Existing users get activity='normal', no breakage         | Preserves existing calorie estimates; activity level is optional field. | Plan |
| Guidance timing                | Login banner if pace is null; toast on pace change      | Encourages discovery without interrupting meal logging; confirmation feedback. | Plan |
| Testing approach               | Unit tests for activity math + integration test for form | Covers the new calculation logic + full profile update flow.           | Plan |

## Scope

**In scope:**
- Add `activity_level` column (low/normal/high) with 'normal' default
- Update maintenance calorie calculation to use activity level
- Refactor profile form: pace as radio buttons, add activity selector
- Implement login banner for pace-missing users
- Toast notification on pace change with healthy-edge recommendation
- Unit + integration tests for activity-aware calculation

**Out of scope:**
- Changes to dashboard or warning rendering (F-03 handles it)
- New data persistence beyond activity_level column
- Migration of existing users' activity values (defaults applied)
- Performance re-tuning (F-02 already done)

## Architecture / Approach

**Data flow:**
1. Profile form → activity level + pace inputs → API validation + persistence
2. Dashboard loads profile → calculates maintenance calories using activity multiplier
3. getTargetCaloriePolicy() computes healthy edge → DashboardHero renders warning/guidance

**Constants:**
- `ACTIVITY_MULTIPLIERS = { low: 1.2, normal: 1.375, high: 1.55 }`
- These feed into Mifflin-St Jeor BMR × multiplier = maintenance calories

**UX touchpoints:**
- Profile form: radio buttons for pace (not dropdown), activity selector below
- Login: banner if `profile.target_pace == null` with "Set pace" link
- On profile save: toast with new pace + recommended healthy edge (e.g., "Fast: 2100 kcal")

## Phases at a Glance

| Phase     | Deliverable                              | Key Risk                                  |
|-----------|------------------------------------------|-------------------------------------------|
| 1. Data   | Activity level column + calculation logic | Migration applied; types regenerated      |
| 2. Form   | Radio buttons, activity selector, validation | Form UX refactor; backward compatibility  |
| 3. UX     | Login banner + pace-change toast         | Banner dismiss logic; toast routing       |
| 4. Tests  | Unit + integration tests, smoke checklist | Coverage of activity-aware paths         |

**Prerequisites:** F-03 implementation complete (target_pace column + getTargetCaloriePolicy)  
**Estimated effort:** ~2-3 sessions across 4 phases (activity integration is straightforward; form refactor + toast are main effort)

## Open Risks & Assumptions

- **Assumption**: Mifflin-St Jeor BMR formula + activity multipliers are accurate enough for MVP (no clinical validation)
- **Assumption**: Activity-level defaults to 'normal' (existing users won't notice calorie estimate shift)
- **Risk**: Toast/banner may not render if error handling doesn't catch profile update failures
- **Risk**: If activity level is omitted from form, defaults apply server-side but UI doesn't reflect it until reload

## Success Criteria (Summary)

1. Calorie estimates adjust correctly based on activity level (low/normal/high)
2. Profile form UI uses radio buttons for pace + dropdown for activity level
3. Users without pace set see login banner + can dismiss it
4. Changing pace triggers toast showing new recommendation + healthy edge
5. All tests pass; no regressions in existing warning/suggestion behavior

# Nutrition record foundation — Plan Brief

> Full plan: `context/changes/nutrition-record-foundation/plan.md`

## What & Why

This change creates the first durable, app-owned data layer in SmartDietTracker: a persisted user profile record plus a persisted meal journal tied to the authenticated Supabase user. The goal is to turn the current auth-only placeholder dashboard into a real product foundation that S-01 can build on, without prematurely implementing calorie parsing or advanced nutrition logic.

## Starting Point

Today the repo already has working Supabase SSR auth, protected routes, and a consistent POST + redirect form pattern. What it does not have is any domain persistence: there are no custom Supabase migrations, no profile/meals tables, and no dashboard experience beyond a signed-in welcome screen.

## Desired End State

After this plan lands, an authenticated user can stay on `/dashboard`, save profile data, add meal journal entries, and see both persist after refresh. The data is isolated per user with RLS, and the dashboard becomes the central protected app surface for the next product slice.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Scope boundary | Full foundation plus minimal dashboard integration | The foundation should prove durable profile + journal storage on the real protected screen, not just in backend plumbing. | Plan |
| Profile model | Nullable `age`, `sex`, `current_weight`, `height`, `target_weight`, `manual_daily_calorie_limit` | This supports FR-002/FR-003 now and avoids an immediate schema expansion in S-01. | Plan |
| Meal record shape | Raw meal text plus ownership/time fields and nullable nutrient columns | It keeps F-01 honest while making the storage model forward-compatible with S-01/S-02. | Plan |
| Primary UI surface | Keep everything on `/dashboard` | The repo already protects this route and it is the natural home for the first real in-app experience. | Plan |
| Interaction pattern | SSR dashboard + POST endpoints + HTML forms | This matches the existing auth flow and avoids introducing a second data interaction model too early. | Research + Plan |
| Edit policy | Profile editable, meals add/read only | It keeps the foundation useful without expanding scope into full meal CRUD. | Plan |

## Scope

**In scope:**
- Supabase migrations for `profiles` and `meals`
- RLS policies and user-scoped ownership rules
- Protected server-side profile and meal write/read paths
- Dashboard UI for profile editing, meal entry, and meal history

**Out of scope:**
- Calorie parsing and macro calculation
- Meal edit/delete flows
- Separate onboarding route or wizard
- Target pace / health-policy logic

## Architecture / Approach

The plan builds bottom-up in three phases: first establish durable Supabase schema and RLS, then add typed server-side helpers and POST endpoints aligned with the current auth pattern, then replace the placeholder dashboard with profile and meal journal sections rendered from server-loaded data. Supabase Auth remains the identity source of truth; app-owned tables hang off that user id.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Establish durable domain storage | `profiles` and `meals` tables with tracked migrations and RLS | Schema or policy choices could force rework if they are too narrow for S-01 |
| 2. Add protected profile and meal data paths | Typed server helpers plus protected write/read endpoints | Ownership or validation drift between routes and RLS could create subtle bugs |
| 3. Replace the placeholder dashboard with the foundation UI | Real `/dashboard` sections for profile and meal journal persistence | UI can over-promise calorie features that are intentionally deferred |

**Prerequisites:** working Supabase local environment, authenticated dashboard access, current repo conventions preserved  
**Estimated effort:** ~3-5 focused sessions across 3 phases

## Open Risks & Assumptions

- The plan assumes a single profile row per authenticated user is enough for MVP.
- The meal schema assumes nullable nutrient columns are the safest bridge into S-01/S-02.
- Local Supabase migration flow must be verified early because this is the project's first app-owned schema.

## Success Criteria (Summary)

- A signed-in user can save profile data on `/dashboard` and still see it after refresh.
- A signed-in user can add meal journal entries on `/dashboard` and still see them after refresh.
- User-owned profile and meal data are isolated correctly and not visible across accounts.

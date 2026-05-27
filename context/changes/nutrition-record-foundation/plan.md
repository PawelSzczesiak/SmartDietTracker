# Nutrition record foundation Implementation Plan

## Overview

Implement the durable application-owned data foundation that the roadmap's first vertical slice depends on: a persisted user profile record plus a persisted meal journal, both scoped to the authenticated Supabase user and surfaced on the protected dashboard.

This change intentionally stops short of the full calorie-logging experience from S-01. Its job is to replace the current auth-only placeholder with durable profile and journal primitives that later slices can enrich without reshaping the storage model or dashboard structure again.

## Current State Analysis

The project already has working Supabase SSR authentication, a protected `/dashboard` route, and a consistent server-side POST + redirect pattern for forms. What is missing is the entire domain layer above auth: there are no custom Supabase migrations, no app-owned profile or meal tables, no RLS policies for user-owned records, no protected profile or meal endpoints, and no dashboard UI beyond a welcome message.

This means F-01 has to establish the first durable data model and the first authenticated CRUD-like application flows outside of Supabase Auth itself. The good news is that the auth, logging, and form conventions are already stable, so the plan can stay aligned with existing repo patterns rather than introducing a new architecture.

## Desired End State

When this plan is complete, an authenticated user can open `/dashboard`, create or update a persisted profile record, submit meal journal entries as free-form text, and see their saved entries rendered from the database on the same protected page. All persisted records are isolated per user with RLS, and the dashboard is hydrated from server-side reads instead of temporary state.

Verification of the end state is simple and concrete: a user signs in, fills profile fields, refreshes the page and still sees the saved values; the user adds a meal note, refreshes the page and still sees it in their history; a second user cannot access or see the first user's profile or meal entries.

### Key Discoveries:

- Supabase SSR auth and route protection are already in place and should remain the identity source of truth (`src/middleware.ts:5`, `src/lib/supabase.ts:11`).
- The dashboard is currently only an authenticated placeholder, so F-01 can repurpose it directly without dismantling existing product logic (`src/pages/dashboard.astro:7`).
- Form and server submission conventions already exist: React island forms submit to POST endpoints, with server-side redirects and request-scoped logging (`src/components/auth/SignUpForm.tsx:14`, `src/pages/api/auth/signup.ts:5`, `src/lib/request-context.ts:21`).
- Supabase local config has migrations enabled but no schema paths configured, confirming that no app-owned database layer exists yet (`supabase/config.toml:53`).

## What We're NOT Doing

- We are not implementing calorie parsing, macro extraction, or AI meal interpretation from S-01/S-02.
- We are not implementing target pace modes, evidence-based weight-change policy, or any health recommendation logic from F-03/S-04.
- We are not adding meal edit/delete flows in this change; meals are add-and-read only.
- We are not introducing a separate onboarding route or wizard; profile and journal live on `/dashboard`.
- We are not replacing the current auth flow or switching away from the POST + redirect SSR pattern already used in the repo.

## Implementation Approach

Build the foundation in three layers, in order: first the durable Supabase schema and ownership rules, then typed server-side read/write paths that follow the current auth API conventions, then a dashboard UI that uses those paths to render and mutate persisted profile and journal data on the existing protected route.

The design choices already settled during planning are: keep the experience centered on `/dashboard`, store the full nullable profile shape needed for the next slice (`age`, `sex`, `current_weight`, `height`, `target_weight`, `manual_daily_calorie_limit`), store meal rows as raw text plus timestamps and nullable nutrient columns, and keep the interaction model SSR-first with standard HTML forms posting to protected endpoints.

## Critical Implementation Details

The app-owned tables must key off the authenticated Supabase user id rather than introducing any second identity model. Every read and write path in this plan should derive ownership from the server-side auth session and enforce it again with RLS, so the dashboard can trust server-loaded data without client-side ownership checks.

The meal schema should be forward-compatible with S-01/S-02: nutrient columns may remain nullable in F-01, but the shape should exist now so later slices can enrich journal entries without another storage redesign.

For the new profile and meal routes, `context.locals.user` populated by `src/middleware.ts` is the primary identity source inside the request lifecycle. The routes should reject missing user context up front and reuse the existing POST + redirect SSR error style, rather than re-resolving user identity separately in each handler.

## Phase 1: Establish durable domain storage

### Overview

Create the first application-owned persistence layer in Supabase: a profile table and a meal journal table, both isolated by user and ready for future calorie/macronutrient enrichment.

### Changes Required:

#### 1. Supabase migration configuration

**File**: `supabase/config.toml`

**Intent**: Point local Supabase tooling at tracked migration files so schema changes for profiles and meals become part of the repo instead of ad-hoc database state.

**Contract**: Update `db.migrations.schema_paths` from the current empty value to `["./migrations/*.sql"]` so local Supabase applies the tracked SQL files under `supabase/migrations/`, and local reset/apply flows continue to work with the repository structure.

#### 2. Profile schema migration

**File**: `supabase/migrations/<timestamp>_create_profiles.sql`

**Intent**: Introduce a single profile row per authenticated user with the nullable fields already chosen for the next slice.

**Contract**: Create a `profiles` table keyed by `user_id` (referencing the Supabase auth user), containing nullable `age`, `sex`, `current_weight`, `height`, `target_weight`, `manual_daily_calorie_limit`, plus audit timestamps. Add RLS policies so authenticated users can only select/insert/update their own row.

#### 3. Meal journal schema migration

**File**: `supabase/migrations/<timestamp>_create_meals.sql`

**Intent**: Introduce durable meal journal rows owned by the authenticated user, with enough shape to support later nutrient enrichment.

**Contract**: Create a `meals` table with `id`, `user_id`, `meal_text`, `consumed_at`, derived day/date support if needed for dashboard grouping, nullable `calories`, `protein`, `carbs`, `fat`, and audit timestamps. Add indexes for user/date access patterns and RLS policies that limit read/write access to the owning authenticated user.

### Success Criteria:

#### Automated Verification:

- Local Supabase applies the new schema cleanly: `npx supabase db reset`
- Astro types regenerate successfully after the schema/config additions: `npx astro sync`
- Lint passes with the new migration/config files in place: `npm run lint`
- Build passes with no regressions from the storage foundation changes: `npm run build`

#### Manual Verification:

- Supabase Studio shows both `profiles` and `meals` tables with the expected columns
- RLS policies are visibly present for both tables and scoped to authenticated users

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Add protected profile and meal data paths

### Overview

Build the server-side read/write surface that the dashboard will use: profile upsert/update, meal creation, and server-loaded dashboard queries that respect the authenticated user.

### Changes Required:

#### 1. Domain query helpers

**File**: `src/lib/<domain helper modules>`

**Intent**: Centralize profile and meal access patterns so the dashboard and endpoints do not inline raw Supabase table calls throughout the app.

**Contract**: Add typed helpers for: reading the current user's profile, upserting the current user's profile, inserting a meal row, and reading the current user's recent meals for dashboard display. Ownership comes from `context.locals.user` / the authenticated user id passed from server context, never from a client-submitted `user_id`.

#### 2. Input validation and request shaping

**File**: `src/lib/<validation module>` and/or route-local validation helpers

**Intent**: Validate profile and meal form payloads before they reach Supabase, using a single shared contract for both route handlers and future dashboard rendering assumptions.

**Contract**: Profile submissions accept the chosen nullable fields and normalize empty strings to null where appropriate. Meal submissions require non-empty `meal_text` and a valid timestamp/date input if the UI exposes it.

#### 3. Protected profile write path

**File**: `src/pages/api/profile/index.ts` (or equivalent repo-aligned path)

**Intent**: Add a server-side POST endpoint that accepts dashboard form submissions for profile creation/update using the authenticated user's session.

**Contract**: The route follows the existing POST + redirect + request logging pattern from `/api/auth/*`, treats `context.locals.user` as the primary identity source, rejects missing authenticated user context up front, and redirects back to `/dashboard` with explicit error context when validation or persistence fails.

#### 4. Protected meal creation path

**File**: `src/pages/api/meals/index.ts` (or equivalent repo-aligned path)

**Intent**: Add a server-side POST endpoint for creating meal journal entries from the dashboard.

**Contract**: The route writes `meal_text` and time metadata for the current authenticated user from `context.locals.user`, leaves nutrient columns nullable in F-01, and redirects back to `/dashboard` with success/error feedback following the same server-side pattern as the auth routes.

#### 5. Server-side dashboard loader integration

**File**: `src/pages/dashboard.astro`

**Intent**: Replace the placeholder-only dashboard data model with server-loaded reads for the current user's profile and meal journal.

**Contract**: On GET, the dashboard loads the current authenticated user's profile and recent meals on the server, passes them into the UI composition, and gracefully handles the empty-state case when no profile or meals exist yet.

### Success Criteria:

#### Automated Verification:

- Astro types regenerate successfully after the new routes/helpers: `npx astro sync`
- Lint passes for the new server helpers and endpoints: `npm run lint`
- Build passes with the new protected data paths wired into the dashboard: `npm run build`

#### Manual Verification:

- An authenticated user can save profile data and see it persist after a full page refresh
- An authenticated user can add a meal journal entry and see it persist after a full page refresh
- A logged-out user cannot reach the protected data experience and is redirected by existing auth middleware

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Replace the placeholder dashboard with the foundation UI

### Overview

Turn `/dashboard` into the first real app screen by rendering persisted profile and meal journal sections using the same visual and interaction patterns already used in the auth flow.

### Changes Required:

#### 1. Profile form and display components

**File**: `src/components/profile/<profile components>`

**Intent**: Add React island and/or Astro composition pieces that let the user create or edit their persisted profile directly on the protected dashboard.

**Contract**: The profile UI exposes the planned fields (`age`, `sex`, `current_weight`, `height`, `target_weight`, `manual_daily_calorie_limit`), pre-fills saved values when present, supports editing, and submits to the protected profile POST route using standard HTML form semantics.

#### 2. Meal journal entry and history components

**File**: `src/components/meals/<meal components>`

**Intent**: Add a minimal meal journal shell that supports creating and reading persisted meal entries without bringing in calorie parsing yet.

**Contract**: The meal UI includes a free-form meal text submission form and a rendered history list for recent entries. Nutrient values remain optional/placeholder-aware in F-01 and the UI does not promise parsed calories yet.

#### 3. Dashboard layout integration

**File**: `src/pages/dashboard.astro` and any supporting Astro layout/component files

**Intent**: Compose the profile and journal sections into a coherent first app screen while preserving the existing protected-route behavior and sign-out affordance.

**Contract**: `/dashboard` renders: a signed-in identity header, profile section, meal journal section, empty states, and any server feedback messages from redirects. Existing auth guard behavior stays centralized in `src/middleware.ts`.

### Success Criteria:

#### Automated Verification:

- Astro types regenerate successfully after the new dashboard components: `npx astro sync`
- Lint passes for the new UI components and route integration: `npm run lint`
- Production build succeeds with the dashboard foundation UI in place: `npm run build`

#### Manual Verification:

- A newly signed-in user can complete the dashboard profile form without leaving `/dashboard`
- The dashboard shows empty states before data exists and persisted data after profile and meal submissions
- Profile data can be edited later, while meal entries remain add-and-read only
- The dashboard still provides a working sign-out path and does not expose another user's data

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

## Testing Strategy

### Unit Tests:

- There is currently no first-party unit test runner in this repository, so the plan relies on type generation, lint, and build as the automated safety net.
- Keep validation helpers and domain access code small and deterministic so they can be covered later if a test runner is introduced.

### Integration Tests:

- Validate the local Supabase schema lifecycle with `npx supabase db reset`.
- Validate the integrated app flow with `npx astro sync`, `npm run lint`, and `npm run build`.

### Manual Testing Steps:

1. Sign up a fresh user and sign in.
2. Open `/dashboard` and confirm the profile section renders with empty defaults.
3. Save a profile, refresh the page, and confirm all persisted values re-render.
4. Add one or more meal journal entries, refresh the page, and confirm they persist and render in history order.
5. Sign out, sign back in as a different user, and confirm the original user's profile and meals are not visible.

## Performance Considerations

The dashboard should remain SSR-first and only load the current user's profile plus a bounded recent meal list, not an unbounded journal history. Query shapes in F-01 should optimize for `user_id` and recent-date access so the future S-01 dashboard can extend the same paths without reworking data access.

## Migration Notes

This is the first app-owned database layer in the project, so there is no legacy domain data to backfill. The important migration concern is consistency between local Supabase configuration, tracked SQL migrations, and production rollout order so schema drift does not appear between environments.

## References

- Roadmap item: `context/foundation/roadmap.md`
- Product requirements: `context/foundation/prd.md`
- Auth guard and identity source: `src/middleware.ts:5`
- Supabase SSR client pattern: `src/lib/supabase.ts:11`
- Existing form pattern: `src/components/auth/FormField.tsx:22`
- Existing POST + redirect route pattern: `src/pages/api/auth/signup.ts:5`
- Existing request logging utilities: `src/lib/request-context.ts:21`
- Current dashboard placeholder: `src/pages/dashboard.astro:7`
- Supabase migration config gap: `supabase/config.toml:53`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Establish durable domain storage

#### Automated

- [x] 1.1 Local Supabase applies the new schema cleanly — e8fb499
- [x] 1.2 Astro types regenerate successfully after the schema/config additions — e8fb499
- [x] 1.3 Lint passes with the new migration/config files in place — e8fb499
- [x] 1.4 Build passes with no regressions from the storage foundation changes — e8fb499

#### Manual

- [x] 1.5 Supabase Studio shows both tables with the expected columns — e8fb499
- [x] 1.6 RLS policies are visibly present for both tables and scoped to authenticated users — e8fb499

### Phase 2: Add protected profile and meal data paths

#### Automated

- [x] 2.1 Astro types regenerate successfully after the new routes and helpers — e8fb499
- [x] 2.2 Lint passes for the new server helpers and endpoints — e8fb499
- [x] 2.3 Build passes with the new protected data paths wired into the dashboard — e8fb499

#### Manual

- [x] 2.4 An authenticated user can save profile data and see it persist after a full page refresh — e8fb499
- [x] 2.5 An authenticated user can add a meal journal entry and see it persist after a full page refresh — e8fb499
- [x] 2.6 A logged-out user cannot reach the protected data experience and is redirected by existing auth middleware — e8fb499

### Phase 3: Replace the placeholder dashboard with the foundation UI

#### Automated

- [x] 3.1 Astro types regenerate successfully after the new dashboard components
- [x] 3.2 Lint passes for the new UI components and route integration
- [x] 3.3 Production build succeeds with the dashboard foundation UI in place

#### Manual

- [x] 3.4 A newly signed-in user can complete the dashboard profile form without leaving `/dashboard`
- [x] 3.5 The dashboard shows empty states before data exists and persisted data after profile and meal submissions
- [x] 3.6 Profile data can be edited later, while meal entries remain add-and-read only
- [x] 3.7 The dashboard still provides a working sign-out path and does not expose another user's data

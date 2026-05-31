# Evidence-based target policy — Plan Brief

> Full plan: `context\changes\evidence-based-target-policy\plan.md`
> Research: `context\changes\evidence-based-target-policy\research.md`

## What & Why

This change codifies the target-pace policy behind F-03 so the app has a stable, evidence-based contract for healthy pace bands, warning-only enforcement, and directional "healthy edge" guidance before S-04 applies pace-aware calorie adjustment. The goal is to stop revisiting the same product decisions and turn them into reusable server-side behavior plus clear advisory UX.

## Starting Point

Today the app already has one server-side calorie-budget seam and a complete profile save pipeline, but no `target_pace` field, no typed policy state, and no UI that explains whether the user's selected goal stays inside a healthy evidence-based edge. `target_weight` exists in the profile yet still has no behavioral effect on calorie-budget guidance.

## Desired End State

When this plan lands, a user can save a target pace on the profile and the app can derive a consistent advisory state for loss, gain, or maintain goals. The dashboard and profile both show warning-only healthy-edge guidance, while meal tracking and food suggestions continue to follow the user's active requested limit rather than a silently capped number.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Enforcement model | Warning-only, no auto-cap | This preserves explicit user control and matches the confirmed product decision already recorded upstream. | Research |
| Direction scope | Support both loss and gain | F-03 should fully unblock S-04 instead of leaving one goal direction undefined. | Plan |
| Pace bands | Loss `0.25 / 0.5 / 0.9`, gain `0.25 / 0.4 / 0.5` kg/week | This keeps distinct modes while staying grounded in the researched healthy ranges. | Plan |
| Equal weights | Maintain / no pace applied | A same-weight goal should not force artificial loss/gain messaging. | Plan |
| Manual-limit interaction | Manual limit stays active but is warned | This keeps the active budget visible while still surfacing the healthy edge. | Plan |
| Persistence model | Persist only `target_pace` input | Derived advisory data can be recomputed and should not drift in storage. | Plan |
| Downstream budget behavior | Track against requested limit, show advisory separately | Hidden dual-budget logic would make warnings harder to trust. | Plan |
| UI placement | Full explanation in Profile, compact summary in Dashboard hero | The warning must be actionable where goals are edited and still visible afterward. | Plan |

## Scope

**In scope:**
- add `target_pace` to the persisted profile contract
- implement reusable server-side policy types and healthy-edge calculations
- surface warning-only guidance in Profile and Dashboard hero
- keep copy consistent with the active-budget-vs-advisory distinction

**Out of scope:**
- full S-04 pace-based calorie-limit adjustment
- automatic clipping/capping of user limits
- new test runner or broad dashboard redesign
- changing food-suggestion visibility logic beyond copy alignment

## Architecture / Approach

Keep the existing SSR dashboard and profile save flow intact. Add one nullable input (`target_pace`), derive policy state on the server in `src/lib/nutrition-goals.ts`, thread that state through the dashboard/profile loader path, and render it in two places: detailed guidance near the editable profile goal fields and a compact advisory summary in `DashboardHero`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Persist profile contract | Durable `target_pace` field across migration, types, validation, and save flow | Schema/type drift across Supabase and TypeScript |
| 2. Build policy engine | Typed loss/gain/maintain guidance and healthy-edge calculation | Accidentally mixing advisory state with active budget behavior |
| 3. Wire profile experience | Pace selector plus full warning/advisory explanation near goal editing | Confusing copy around manual-limit interaction |
| 4. Surface dashboard advisory | Compact hero summary and copy-safe downstream messaging | Users misreading advisory guidance as silent auto-capping |

**Prerequisites:** Existing F-01/S-01 profile + dashboard flow remains in place; Supabase migrations and Astro type sync are available locally.
**Estimated effort:** ~2-3 implementation sessions across 4 phases

## Open Risks & Assumptions

- F-03 should stay a foundation change and not quietly absorb all of S-04.
- The agreed pace bands are product decisions; changing them later should only require policy constants and copy updates, not schema redesign.
- Without a first-party test runner, manual scenario coverage remains important for loss/gain/maintain and manual-limit warning cases.

## Success Criteria (Summary)

- A signed-in user can save a target pace and see it persist after refresh.
- The app derives and displays consistent warning-only healthy-edge guidance for loss, gain, and maintain scenarios.
- Dashboard tracking and food suggestions continue to follow the active requested limit, with no silent cap implied by the UI.

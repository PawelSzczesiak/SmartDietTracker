# First calorie logging flow — Plan Brief

> Full plan: `context/changes/first-calorie-logging-flow/plan.md`

## What & Why

This change turns the current profile + meal persistence foundation into the first usable calorie-tracking loop. The user should be able to complete the profile needed for calorie calculations, get a daily limit, log meals in free text, see parsed calories/macros and today's total, receive near-limit / over-limit warnings, and manually retry failed nutrition extraction instead of losing an entry.

## Starting Point

`/dashboard` already loads the saved profile and latest meals server-side, and both profile save plus meal save already follow the repo's POST + redirect + request logging pattern. What does not exist yet is the calorie-budget logic, parser integration, daily aggregation, warning UI, or meal correction flow.

## Desired End State

When the plan is done, the dashboard hero becomes the main calorie status surface: it shows the effective daily limit, today's total, and clear warning states. Each meal entry is saved with calories plus macros when parsing succeeds, or kept with an explicit "nutrition unavailable" state and retry action when parsing fails; edit/delete is added as the final S-01 phase.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Daily limit source | Manual override first, otherwise automatic BMR/TDEE-style estimate | This preserves the existing manual field while making S-01 useful without forcing manual setup. |
| Incomplete profile behavior | Allow meal logging, but show limit as unavailable | Logging meals should not be blocked just because auto-calculation inputs are incomplete. |
| Parsing timing | Synchronous during meal submission | The happy path should immediately update today's totals after redirect without background reconciliation. |
| Parse failure fallback | Save the meal, keep kcal/macros empty, show warning + Retry | The user keeps the journal entry and gets a clear recovery path instead of silent failure or data loss. |
| Nutrition payload | Persist calories plus macros when available | The schema already supports these fields and they make S-02/S-03 easier to build later. |
| Warning model | Two states: near limit and over limit | This keeps the MVP readable while still giving a meaningful signal before and after the threshold. |
| Primary status placement | Dashboard hero | The top-level daily state belongs in the main summary area, with meal section as supporting detail. |
| Meal correction scope | Add edit/delete in the last S-01 phase | This respects the F-01 review decision while still closing the user loop inside S-01. |
| Parser integration | Server-side service behind explicit env-gated interface | It matches the repo's server-driven route pattern and avoids leaking provider details into routes or the client. |

## Scope

**In scope:**
- effective daily calorie budget (manual override or automatic estimate)
- server-side meal parsing with OpenRouter-backed service boundary
- persisted meal calories and macros
- today's calorie summary and warning states
- retry flow for meals whose nutrition extraction failed
- meal edit/delete as a final S-01 phase

**Out of scope:**
- client-side AI calls
- async background parsing pipeline
- timezone preference management UI
- ingredient-level breakdowns, charts, and weekly analytics
- new protected pages outside `/dashboard`

## Architecture / Approach

Keep the existing SSR dashboard and POST + redirect flow intact. Add domain helpers in `src/lib/` for calorie-budget and daily-summary logic, a server-only parser service in `src/lib/services/meal-parser.ts`, route actions for create/retry/correction, and UI extensions in `DashboardHero` plus the meal journal to render summary, warnings, parser state, and correction actions.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Calorie budget and daily summary foundation | Effective limit logic plus today's aggregate summary model | Wrong formula or day-boundary assumptions would ripple through the whole slice |
| 2. Meal parsing, persistence, and retry flow | Parser integration, nutrition persistence, fallback save, retry path | External parser latency/failure on the request path |
| 3. Dashboard totals, warning states, and nutrition feedback UI | Hero summary, warnings, meal nutrition rendering, retry affordance | UI state complexity across success, incomplete-profile, and failed-parse cases |
| 4. Meal correction flow inside S-01 | Owner-scoped edit/delete completing the meal lifecycle | Policy and totals recomputation bugs after correction |

**Prerequisites:** Supabase foundation from F-01, parser provider credentials added to local/prod secrets, and agreement to keep a single MVP timezone assumption
**Estimated effort:** ~3-4 implementation sessions across 4 phases

## Open Risks & Assumptions

- The MVP uses one request/session timezone assumption for "today" instead of stored per-user timezone preferences.
- OpenRouter is treated as the parser provider introduced by this slice, so env schema and deploy secrets must expand beyond the current Supabase-only contract.
- Synchronous parsing is acceptable for MVP request latency as long as failure falls back to saved raw meals plus retry.

## Success Criteria (Summary)

- A signed-in user can log a free-text meal and see today's calories update on the dashboard.
- The dashboard shows a meaningful calorie-budget state: automatic/manual limit when available, otherwise a clear incomplete-profile state.
- Failed nutrition extraction does not lose the meal entry and gives the user an explicit retry path.

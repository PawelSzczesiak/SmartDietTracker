# F-02 Performance Verification Runbook

## Purpose

Use this runbook to verify meal-submit and dashboard-refresh performance without changing product behavior.

## Prerequisites

- S-01 is already implemented.
- You can start the app locally or point the baseline runner at a deployed preview.
- You have either:
  - `PERF_SESSION_COOKIE`, or
  - `PERF_EMAIL` + `PERF_PASSWORD`, or
  - `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for auth bootstrap.

## Local execution

1. Start the app in the F-02 worktree.
2. Run:
   ```bash
   npm run perf:baseline
   ```
3. Review the generated files in:
   `context/changes/performance-verification-path/verification/runs/`

## What the report must show

- Meal submit percentile data (`p50`, `p95`, `p99`)
- Dashboard refresh percentile data (`p50`, `p95`, `p99`)
- Explicit `PASS` / `WARN` evaluation against:
  - NFR-01: meal processing under `3s p95`
  - NFR-02: dashboard refresh under `400ms p99`
- A warning block when a threshold is missed, with:
  - affected flow
  - measured value
  - suggested next action

## Manual smoke checklist

Run these in the app after the baseline report is generated:

1. Add 3 different meals and confirm each save still returns the normal success or fallback warning state.
2. Refresh the dashboard and confirm the page still loads with the expected calorie summary and suggestions.
3. Trigger a warning/fallback case and confirm the UX still shows the same warning copy and redirect behavior.

## How to read the logs

- `meals.create.*` events should include `requestId`, span names, and total duration.
- `dashboard.load.*` events should include `requestId`, `data_fetch`, `suggestions_compute`, and total duration.
- If meal submit is slow, compare the span breakdown before changing parser or persistence code.

## Close-out

After a successful run:

1. Keep the report files next to the change.
2. Update the issue with a short implementation summary and the manual checklist you ran.
3. Sync roadmap status if the change is complete.

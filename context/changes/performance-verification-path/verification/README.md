# F-02 Verification Artifacts

This directory stores repeatable baseline performance evidence for F-02.

## Run command

```bash
npm run perf:baseline
```

## Required inputs

- `PERF_BASE_URL` (optional, default `http://127.0.0.1:4321`)
- `PERF_SAMPLES` (optional, default `10`)
- Auth (one option required):
  - `PERF_SESSION_COOKIE` (full `cookie` header string from an authenticated session), or
  - `PERF_EMAIL` and `PERF_PASSWORD`
  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (preferred for local auth bootstrap)

  If no auth inputs are set, the runner falls back to a deterministic local test account and tries to bootstrap it with the local Supabase admin API when the service key is available:
  - email: `perf.baseline+<run-id>@local.test`
  - password: `PerfBaseline!12345`

## Output location

Each run writes two files under `context/changes/performance-verification-path/verification/runs/`:

- `<run-id>.json` machine-readable result
- `<run-id>.md` human summary

`<run-id>` uses UTC timestamp format: `YYYYMMDD-HHMMSS`.

## JSON shape

```json
{
  "runId": "20260531-205700",
  "createdAtIso": "2026-05-31T20:57:00.000Z",
  "baseUrl": "http://127.0.0.1:4321",
  "sampleSize": 10,
  "metrics": {
    "meal_submit": { "sampleSize": 10, "min": 0, "max": 0, "avg": 0, "p50": 0, "p95": 0, "p99": 0 },
    "dashboard_refresh": { "sampleSize": 10, "min": 0, "max": 0, "avg": 0, "p50": 0, "p95": 0, "p99": 0 }
  },
  "evaluation": {
    "overall": "pass|warn",
    "thresholds": { "mealP95Ms": 3000, "dashboardP99Ms": 400 },
    "flows": {
      "meal_submit": { "status": "pass|warn", "metric": "p95", "measuredMs": 0 },
      "dashboard_refresh": { "status": "pass|warn", "metric": "p99", "measuredMs": 0 }
    },
    "warnings": [
      {
        "flow": "meal_submit|dashboard_refresh",
        "reason": "threshold breach",
        "breakdownHint": "which span logs to inspect",
        "recommendation": "non-blocking follow-up"
      }
    ]
  }
}
```

## Interpretation rules

- **Pass** when:
  - meal submit `p95 <= 3000ms` (NFR-01),
  - dashboard refresh `p99 <= 400ms` (NFR-02).
- **Warn** otherwise. Warn is non-blocking in this foundation slice.
- For warn runs, use `warnings[]` plus request-log span events (`meals.create.*`, `dashboard.load.*`) to isolate bottlenecks before optimization work.

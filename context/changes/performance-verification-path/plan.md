# Performance verification path Implementation Plan

## Overview

Implement a practical verification path for performance and stability of the meal flow and dashboard refresh, without changing product behavior. This foundation makes NFR-01 (`meal processing < 3s p95`) and NFR-02 (`dashboard refresh < 400ms p99`) measurable and repeatable.

The scope is intentionally operational: instrumentation, repeatable baseline measurement, runbook, and non-blocking CI visibility. We are not tuning parser algorithms or changing nutrition logic in this change.

## Current State Analysis

The current flow is functionally complete (S-01/S-02/S-03), but performance verification is ad hoc. Meal submission runs synchronously through parser + persistence + redirect, and dashboard reloads SSR data, yet there is no structured duration telemetry or repeatable benchmark path to evaluate NFR drift over time.

### Key Discoveries:

- Meal create path is synchronous and parser-dependent (`src/pages/api/meals/index.ts:47-49`), with parser timeout currently at 28s (`src/lib/services/meal-parser.ts:6`), so tail latency can dominate user experience.
- Dashboard data load composes profile + day meals + successful meals in one SSR point (`src/pages/dashboard.astro:46-50`) but has no duration breakdown.
- Request context already provides requestId and structured event logging (`src/lib/request-context.ts:21-39`), giving a stable seam for timing instrumentation.
- CI currently runs only `npm ci`, `npx astro sync`, `npm run lint`, `npm run build` (`.github/workflows/ci.yml:18-21`), with no perf verification stage.
- Current npm scripts include no performance command (`package.json:5-13`).

## Desired End State

After this plan, the project has a repeatable, documented baseline verification path for meal submit and dashboard refresh, using both end-to-end timings and server-side span breakdowns. Teams can run one command to generate a baseline report, compare current behavior against NFR targets, and publish results in a non-blocking CI workflow.

NFR breaches are visible and actionable (with breakdown and recommendations) but do not hard-block delivery in this foundation step, per agreed workflow. Manual smoke checks remain required to validate user-visible stability.

## What We're NOT Doing

- No parser refactor and no nutrition algorithm changes.
- No dashboard UX redesign for perceived-performance optimization.
- No production telemetry table/migration in Supabase.
- No blocking perf gate in the main CI job.
- No SLO alerting/monitoring platform integration beyond repo artifacts and workflow output.

## Implementation Approach

Build the verification path in three layers:
1. add timing instrumentation to the critical server flow,
2. add a repeatable baseline harness and report artifacts,
3. operationalize with runbook/manual checklist and non-blocking CI entrypoint.

This keeps risk low and delivers measurable evidence quickly, aligned with the project speed goal and existing SSR + request-log conventions.

## Critical Implementation Details

### Timing & lifecycle

Instrumentation must measure both full request duration and internal spans (`parse`, `db_write`, `dashboard_load`, `suggestions_compute`) in the same request context, so each run can explain latency, not just report it.

### State sequencing

Even when parser latency exceeds NFR target, behavior remains warning-only for this change: report the breach and recommendation, but do not auto-modify user limits or parser config.

### Debug & observability

Every performance run should emit a machine-readable artifact (JSON) and a human summary (Markdown) keyed by timestamp/run-id, so comparisons remain possible without adding runtime data storage.

## Phase 1: Instrument performance-critical server spans

### Overview

Add duration-aware telemetry to critical meal and dashboard code paths using existing request-context logging patterns.

### Changes Required:

#### 1. Request timing helpers

**File**: `src/lib/request-context.ts`

**Intent**: Extend the existing request logging utility with lightweight timing helpers so routes/pages can emit consistent duration fields.

**Contract**: Provide utilities to capture span start/stop and log `durationMs` with `requestId`, while keeping current event schema backward-compatible.

#### 2. Meal route instrumentation

**File**: `src/pages/api/meals/index.ts`

**Intent**: Measure the latency-critical create flow and expose breakdown between parser call and persistence.

**Contract**: Emit structured timing events for meal create total duration and key internal spans (`parse`, `persist`, `redirect_ready`) in the route's existing request context.

#### 3. Retry/update/delete instrumentation alignment

**File**: `src/pages/api/meals/retry.ts`, `src/pages/api/meals/update.ts`, `src/pages/api/meals/delete.ts`

**Intent**: Keep mutation routes observability-consistent so stability regressions are traceable across all meal actions.

**Contract**: Emit route-level total duration and operation span events with consistent naming/fields across all mutation endpoints.

#### 4. Dashboard load span instrumentation

**File**: `src/pages/dashboard.astro`

**Intent**: Add visibility into SSR data-load costs and suggestion-computation cost during dashboard refresh.

**Contract**: Emit dashboard load timing events for overall load and key sub-spans (data fetch + suggestion compute), keyed by requestId.

### Success Criteria:

#### Automated Verification:

- Astro types remain valid after instrumentation additions: `npx astro sync`
- Lint passes for updated request/route/page files: `npm run lint`
- Build passes with instrumentation in SSR and API routes: `npm run build`

#### Manual Verification:

- Logs include requestId-linked duration events for meal create path with parser/persist breakdown
- Logs include requestId-linked duration events for dashboard load path
- Existing user-facing behavior (success/warning/error redirects and dashboard rendering) remains unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Build repeatable baseline measurement harness

### Overview

Add a baseline-only measurement harness and report artifacts that calculate p95/p99 for the required user flows.

### Changes Required:

#### 1. Baseline perf runner script

**File**: `scripts/perf/baseline-meal-dashboard.mjs`

**Intent**: Provide a deterministic local/CI script that executes baseline scenario requests and captures response-time distributions.

**Contract**: Script authenticates with provided test credentials/session context, executes baseline sequence (meal submit + dashboard refresh), and outputs percentile metrics (`p50/p95/p99`) for each flow.

#### 2. NPM command surface

**File**: `package.json`

**Intent**: Expose the baseline harness through a standard project command.

**Contract**: Add a dedicated script (e.g. `perf:baseline`) that runs the baseline perf runner with documented env inputs.

#### 3. Report artifact format

**File**: `context/changes/performance-verification-path/verification/README.md`

**Intent**: Standardize where and how runs are recorded.

**Contract**: Define artifact shape and location for JSON + Markdown run outputs, including timestamp, sample size, and measured percentiles for meal and dashboard paths.

#### 4. Baseline result writer

**File**: `scripts/perf/baseline-meal-dashboard.mjs`

**Intent**: Persist each run as reusable evidence, not console-only output.

**Contract**: Write one machine-readable result file and one human-readable summary file per run into the verification artifact path.

### Success Criteria:

#### Automated Verification:

- Baseline script executes and produces JSON + Markdown artifacts via `npm run perf:baseline`
- Lint passes after script and package updates: `npm run lint`
- Build remains green after perf tooling additions: `npm run build`

#### Manual Verification:

- A single baseline run report clearly shows meal submit and dashboard refresh percentiles
- Report includes explicit pass/warn evaluation against NFR-01 and NFR-02 thresholds
- When NFR is breached, report records warning with flow breakdown and follow-up recommendation (non-blocking)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Operationalize verification path (runbook + non-blocking CI)

### Overview

Document and operationalize how to run, read, and act on performance verification in day-to-day delivery.

### Changes Required:

#### 1. F-02 verification runbook

**File**: `context/changes/performance-verification-path/perf-runbook.md`

**Intent**: Give a practical step-by-step operational procedure for local and CI verification, including manual smoke checks.

**Contract**: Runbook defines prerequisites, execution steps, interpretation rules, manual smoke checklist (3 meals + dashboard refresh + warning/fallback validation), and escalation/follow-up guidance for NFR warnings.

#### 2. Non-blocking CI workflow

**File**: `.github/workflows/perf-baseline.yml`

**Intent**: Add optional/scheduled visibility for performance baseline runs without destabilizing main CI.

**Contract**: Workflow runs `npm run perf:baseline`, publishes artifacts, and is explicitly non-blocking for merge decisions.

#### 3. Foundation/roadmap linkage update

**File**: `context/foundation/roadmap.md`

**Intent**: Keep roadmap status in sync once F-02 path is implemented and verified.

**Contract**: Update F-02 status and done-log entry consistently with repository roadmap conventions.

### Success Criteria:

#### Automated Verification:

- Non-blocking perf workflow is syntactically valid and runnable on dispatch: `.github/workflows/perf-baseline.yml`
- Existing CI path still passes unchanged: `npm run lint`, `npm run build`
- Perf command remains executable in CI context with documented inputs: `npm run perf:baseline`

#### Manual Verification:

- Runbook steps can be followed end-to-end by another developer without extra tribal knowledge
- Manual smoke checklist is executed and results are captured next to baseline artifacts
- Issue/update workflow includes perf summary and manual verification checklist for F-02 close-out

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

## Testing Strategy

### Unit Tests:

- No first-party unit test runner exists; this plan relies on lint/build plus deterministic harness output contracts.
- Keep perf runner internals modular so percentile calculation and report formatting can be unit-tested later if test tooling is added.

### Integration Tests:

- Run baseline measurement command end-to-end and verify artifact generation.
- Validate instrumented routes/pages continue to return expected redirects/rendering while emitting timing logs.
- Validate non-blocking workflow execution on manual dispatch.

### Manual Testing Steps:

1. Start app with required env and authenticated baseline user.
2. Run `npm run perf:baseline` and confirm JSON + Markdown artifacts are generated.
3. Verify report includes p95 meal-submit and p99 dashboard-refresh values with pass/warn evaluation.
4. Perform smoke flow: add 3 meals, refresh dashboard, verify warning states and parser-fallback behavior.
5. Confirm logs contain requestId-linked timing events for measured runs.

## Performance Considerations

- Baseline-only profile is intentionally lightweight; stress/degraded profiles are deferred to future iteration to preserve delivery speed.
- Instrumentation overhead must remain minimal and should not materially change request behavior.
- Report interpretation must separate parser latency from persistence and dashboard load to avoid incorrect optimization focus.

## Migration Notes

- No database schema migration is planned for F-02.
- Changes are operational/tooling + observability only.
- CI addition is non-blocking by design in this foundation step.

## References

- Roadmap F-02 definition: `context/foundation/roadmap.md`
- PRD NFR targets: `context/foundation/prd.md`
- Meal create route: `src/pages/api/meals/index.ts:47-49`
- Dashboard SSR load seam: `src/pages/dashboard.astro:46-50`
- Request logging seam: `src/lib/request-context.ts:21-39`
- Existing CI baseline: `.github/workflows/ci.yml:18-21`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Instrument performance-critical server spans

#### Automated

- [x] 1.1 Astro types remain valid after instrumentation additions
- [x] 1.2 Lint passes for updated request/route/page files
- [x] 1.3 Build passes with instrumentation in SSR and API routes

#### Manual

- [x] 1.4 Logs include requestId-linked duration events for meal create path with parser/persist breakdown
- [x] 1.5 Logs include requestId-linked duration events for dashboard load path
- [x] 1.6 Existing user-facing behavior remains unchanged

### Phase 2: Build repeatable baseline measurement harness

#### Automated

- [ ] 2.1 Baseline script executes and produces JSON + Markdown artifacts via `npm run perf:baseline`
- [ ] 2.2 Lint passes after script and package updates
- [ ] 2.3 Build remains green after perf tooling additions

#### Manual

- [ ] 2.4 Baseline run report shows meal submit and dashboard refresh percentiles
- [ ] 2.5 Report includes explicit pass/warn evaluation against NFR-01 and NFR-02
- [ ] 2.6 NFR breach is recorded as non-blocking warning with breakdown and recommendation

### Phase 3: Operationalize verification path (runbook + non-blocking CI)

#### Automated

- [ ] 3.1 Non-blocking perf workflow is valid and runnable on dispatch
- [ ] 3.2 Existing CI path still passes unchanged (`npm run lint`, `npm run build`)
- [ ] 3.3 Perf command remains executable in CI context with documented inputs

#### Manual

- [ ] 3.4 Runbook can be followed end-to-end by another developer
- [ ] 3.5 Manual smoke checklist is executed and captured with baseline artifacts
- [ ] 3.6 Issue/update workflow includes perf summary and manual verification checklist for close-out

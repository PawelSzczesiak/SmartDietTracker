# Quality Gates Wiring Implementation Plan

## Overview

Phase 4 closes the remaining quality-gate gap in this repo by turning typecheck into a first-class command, routing local edit checks through that command, and adding the same gate to CI.
The phase also refreshes the repo guidance docs and the canonical test plan so the documented gate story matches the actual wiring.

## Current State Analysis

- `package.json` already has `test`, `test:run`, `lint`, and `build`, but no dedicated `typecheck` script (`package.json:5-16`).
- The per-edit Copilot hook already has a `typecheck` mode, but it shells out directly to `npx astro check` instead of using a shared command surface (`scripts/copilot-hooks/per-edit-quality.mjs:20-29`, `.github/hooks/per-edit-quality.json:3-15`).
- CI currently runs `npm ci`, `npx astro sync`, `npm run test:run`, `npm run lint`, and `npm run build`, so the required typecheck gate is still missing from the main job (`.github/workflows/ci.yml:13-25`).
- Repo-facing guidance still claims there is no first-party test script/suite or only mentions lint/build as the gate, which is now stale (`AGENTS.md:14-17`, `AGENTS.md:29-32`, `CLAUDE.md:29-32`, `CLAUDE.md:52-54`, `.github/copilot-instructions.md:14-17`, `.github/copilot-instructions.md:52-54`).
- The canonical rollout plan still shows Phase 4 as not started, so this change also needs to close that bookkeeping loop when the wiring lands (`context/foundation/test-plan.md:49-55`).

## Desired End State

After this plan is complete, `npm run typecheck` exists as the single command for Astro type checking, and the local edit hook uses it instead of duplicating the Astro check invocation.
The existing CI job also enforces that same typecheck gate after `npx astro sync`, the repo guidance docs describe the new gate surface accurately, and `context/foundation/test-plan.md` marks Phase 4 complete.

### Key Discoveries:

- `package.json:5-16` has the command surface this phase should extend, so the least risky change is adding a single `typecheck` script rather than introducing a new runner.
- `scripts/copilot-hooks/per-edit-quality.mjs:20-29` already separates lint vs typecheck behavior, which makes it a natural place to swap in the shared command.
- `.github/workflows/ci.yml:18-25` already has the right job shape and ordering; Phase 4 only needs to insert the missing gate, not redesign CI.
- `AGENTS.md:29-32`, `CLAUDE.md:29-32`, and `.github/copilot-instructions.md:14-17,52-54` are the stale docs that should be synchronized with the new gate floor.
- `context/foundation/test-plan.md:49-55` is the source of truth for the rollout, so closing Phase 4 should update that status once the wiring is in place.

## What We're NOT Doing

- No pre-push hook.
- No new e2e, visual-diff, or AI-native gate.
- No new test runner or CI job split.
- No changes to the app’s runtime behavior, only the quality-floor wiring and related docs.

## Implementation Approach

Keep the phase small and single-sourced: add one `typecheck` script, point the local edit hook at that script, then insert the same gate into the existing CI job after Astro type generation.
Once the commands are wired, refresh the human-facing docs and the canonical test plan so contributors and future agents see the same gate story everywhere.

## Critical Implementation Details

`npx astro sync` must stay ahead of `npm run typecheck` in CI, because the typecheck gate depends on generated Astro types.
The local hook should call `npm run typecheck` instead of duplicating `astro check` directly so there is one command surface to maintain.

## Phase 1: Normalize the typecheck command surface

### Overview

Add a dedicated `typecheck` script and make the local edit hook call that script so lint and typecheck both flow through stable command names.

### Changes Required:

#### 1. Package command surface

**File**: `package.json`

**Intent**: Add a first-class typecheck command that becomes the shared entry point for local hooks and CI.

**Contract**: Add `npm run typecheck` as a wrapper around Astro type checking without changing the existing test, lint, or build commands.

#### 2. Per-edit quality hook

**File**: `scripts/copilot-hooks/per-edit-quality.mjs`

**Intent**: Route the hook’s typecheck mode through the shared npm script so the hook does not drift from the standard command surface.

**Contract**: Keep lint mode on `npm run lint`, but make typecheck mode invoke `npm run typecheck` for edit/create events.

### Success Criteria:

#### Automated Verification:

- The new command runs successfully: `npm run typecheck`
- Existing lint still passes after the hook change: `npm run lint`

#### Manual Verification:

- Editing a TypeScript file through the Copilot edit loop surfaces the typecheck gate using the new shared command.

## Phase 2: Wire CI and documentation to the new gate set

### Overview

Promote the new typecheck command into CI, then refresh the repo guidance docs and the rollout plan so the documented gate floor matches the actual one.

### Changes Required:

#### 1. CI workflow

**File**: `.github/workflows/ci.yml`

**Intent**: Enforce the shared typecheck gate continuously in the existing CI job.

**Contract**: Insert `npm run typecheck` after `npx astro sync` and before the existing test/lint/build steps, without splitting the job or changing its secrets model.

#### 2. Repo guidance docs

**File**: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`

**Intent**: Remove the stale “no test script / no first-party test suite” guidance and describe the current gate surface accurately.

**Contract**: Update the command and CI sections so they mention `npm run typecheck`, the current test scripts, and the actual CI order.

#### 3. Canonical rollout bookkeeping

**File**: `context/foundation/test-plan.md`

**Intent**: Close out the rollout phase in the source-of-truth test plan once the gate wiring lands.

**Contract**: Mark Phase 4 complete and refresh the plan freshness date so the rollout ledger matches the implemented state.

### Success Criteria:

#### Automated Verification:

- CI workflow contains the new gate in the existing job: `.github/workflows/ci.yml`
- Repo guidance no longer claims there is no first-party test script or test suite: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`
- The canonical rollout plan shows Phase 4 as complete: `context/foundation/test-plan.md`

#### Manual Verification:

- Review the updated docs and CI workflow and confirm they describe the same gate order and command surface.

## Testing Strategy

### Unit Tests:

- None added; this phase wires commands and gates rather than app logic.

### Integration Tests:

- Verify the command surface and CI wiring through the existing scripts and workflow files.

### Manual Testing Steps:

1. Run `npm run typecheck` locally.
2. Confirm the edit hook uses the same command for typecheck mode.
3. Inspect the CI workflow and repo guidance docs to confirm the gate story is consistent.

## Performance Considerations

Keep the local hook on a single shared command and keep CI in the existing job so the gate floor stays predictable without adding extra job fan-out.

## Migration Notes

None. This phase only adds/renames command wiring and updates documentation.

## References

- Related research: `context/foundation/test-plan.md`
- Gate bootstrap prior art: `context/changes/testing-critical-path-bootstrap/plan.md:51-97`
- Current command surface: `package.json:5-16,67-74`
- Current hook wiring: `scripts/copilot-hooks/per-edit-quality.mjs:20-29`, `.github/hooks/per-edit-quality.json:3-15`
- Current CI order: `.github/workflows/ci.yml:13-25`
- Repo guidance docs: `AGENTS.md:14-17,29-32`, `CLAUDE.md:29-32,52-54`, `.github/copilot-instructions.md:14-17,52-54`
- Canonical rollout ledger: `context/foundation/test-plan.md:49-55`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Normalize the typecheck command surface

#### Automated

- [x] 1.1 Add a first-class `typecheck` command to the npm script surface. — 750ed2c
- [x] 1.2 Route the per-edit quality hook through `npm run typecheck`. — 750ed2c

#### Manual

- [x] 1.3 Confirm a TypeScript edit triggers the typecheck gate through the shared command. — 750ed2c

### Phase 2: Wire CI and documentation to the new gate set

#### Automated

- [x] 2.1 Insert `npm run typecheck` into the existing CI job after `npx astro sync`. — f17faf2
- [x] 2.2 Refresh the repo guidance docs so they describe the current test and gate commands. — f17faf2
- [x] 2.3 Mark Phase 4 complete in `context/foundation/test-plan.md`. — f17faf2

#### Manual

- [x] 2.4 Review the updated docs and rollout plan for consistency with the new gate order. — f17faf2

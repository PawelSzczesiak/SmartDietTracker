# Quality Gates Wiring — Plan Brief

> Full plan: `context/changes/quality-gates-wiring/plan.md`

## What & Why

Phase 4 of the test plan closes the remaining quality-floor gap in this repo. It makes typecheck a first-class command, wires that same gate into local editing and CI, and updates the guidance docs so the documented gate story matches the real one.

## Starting Point

The repo already runs lint, tests, and build in CI, and it already has a per-edit hook plus Playwright/e2e scaffolding. What’s missing is a shared `typecheck` command, CI enforcement for it, and up-to-date guidance files that no longer describe the old “no test script” state.

## Desired End State

Contributors can run one shared typecheck command locally, the edit hook uses that same command, and CI enforces it in the existing job after Astro types are generated. The repo guidance and rollout plan all agree on the current gate floor, so future work does not inherit stale instructions.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| ------------------------------ | ----------------- | ----------------- | ---------------- |
| Typecheck command surface | Add `npm run typecheck` via `npm exec astro check` | Gives the repo one shared command for hooks and CI. | Research / Plan |
| Local hook behavior | Keep lint + typecheck in the hook, but call `npm run typecheck` | Avoids duplicating the Astro check command in multiple places. | User / Research |
| CI placement | Add typecheck as a separate step in the existing CI job after `astro sync` | Keeps the gate in the current pipeline without extra job fan-out. | User / Research |
| Docs to refresh | Update `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` | Removes stale guidance that still says there is no first-party test script/suite. | User / Research |

## Scope

**In scope:** add a shared typecheck script, route the edit hook through it, add CI enforcement, refresh repo guidance docs, and mark Phase 4 complete in the canonical test plan.

**Out of scope:** pre-push hooks, new e2e/visual/AI-native gates, new runners, CI job fan-out, or any runtime app behavior changes.

## Architecture / Approach

Keep the quality floor single-sourced: the npm script becomes the canonical typecheck entry point, the edit hook calls that script, and CI inserts the same gate into the existing job after Astro type generation.
Once the wiring lands, update the docs and rollout ledger so the human-facing story matches the actual enforcement path.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --------- | ---------------------- | ------------------------- |
| 1. Normalize the typecheck command surface | A shared `typecheck` script and hook usage | Hook drift if the script and hook don’t stay aligned |
| 2. Wire CI and docs | CI enforcement, refreshed guidance, and rollout bookkeeping | Documentation or CI order drifting from the new command surface |

**Prerequisites:** the existing Astro check command, current CI job, and per-edit hook are already in place.
**Estimated effort:** ~1 session across 2 phases.

## Open Risks & Assumptions

- Astro type generation must still happen before typecheck in CI.
- The phase stays narrow and does not expand into pre-push or e2e gate promotion.

## Success Criteria (Summary)

- `npm run typecheck` exists and is used by the edit hook.
- CI enforces typecheck in the existing job after Astro sync.
- Repo guidance and the canonical test plan all reflect the same gate floor.

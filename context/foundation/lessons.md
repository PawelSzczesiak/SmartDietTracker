# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Keep GitHub issues synced with delivered changes

- **Context:** Delivery workflow / GitHub Issues
- **Problem:** Implementation and implementation review can materially change the final delivered scope, but the linked GitHub issue may stay stale if nobody updates it after the code lands. Local checkouts without `git remote` can also create a false impression that GitHub issue sync is blocked, even though `gh` can target the repo explicitly with `-R`.
- **Rule:** After completing changes that affect a tracked GitHub issue, update that issue immediately and proactively as a default close-out step (without waiting for a user reminder) with the current implementation status, a short summary of what changed, and a manual verification checklist. If the local repository has no configured git remote, use `gh` with an explicit `-R <owner>/<repo>` target instead of treating that as a blocker.
- **Applies to:** Any roadmap or change-tracking issue that is affected by implementation, review, or post-review fixes.

## Sync roadmap statuses after each implemented slice

- **Context:** Roadmap and change lifecycle synchronization
- **Problem:** After implementing and reviewing slices, `context/foundation/roadmap.md` can remain stale (`proposed`/`blocked`) unless statuses are updated immediately, which creates confusion about real project progress.
- **Rule:** After each implemented slice is closed, update the corresponding roadmap status entries (table row and slice section) so roadmap state matches the actual `change.md` lifecycle.
- **Applies to:** Every completed slice tracked in `context/changes/*` and represented in `context/foundation/roadmap.md`.

---
change_id: testing-critical-path-bootstrap
title: Bootstrap critical-path tests for parser, failure modes, and calorie policy
status: implemented
created: 2026-06-02
updated: 2026-06-02
archived_at: null
---

## Notes

Open a change folder for rollout Phase 1 of context/foundation/test-plan.md: "Critical-path bootstrap". Risks covered: #1, #2, #3. Test types planned: unit + integration. Risk response intent:
- #1: prove parser output is behavior-correct against an independent oracle; challenge happy-path assumptions.
- #2: prove timeout/error paths are explicit and never look like success.
- #3: prove calorie-limit remaining-budget and warnings stay correct at policy boundaries.
After creating the folder, follow the downstream continuation rule.

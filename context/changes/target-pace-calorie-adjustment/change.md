---
change_id: target-pace-calorie-adjustment
title: Target pace calorie adjustment
status: impl_reviewed
created: 2026-06-02
updated: 2026-06-02
completed: 2026-06-02
archived_at: null
---

## Notes

Implements S-04: user can select slow/normal/fast goal pace + activity level, and system adjusts daily calorie limit within safe ranges (FR-010, FR-011), powered by evidence-based policy from F-03.

Scope: Add activity_level field (low/normal/high), change pace UI to radio buttons, implement login banner + toast, add tests. F-03 already delivered pace calculation logic and dashboard integration.

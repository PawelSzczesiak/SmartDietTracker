# Review follow-ups

## F4 — meal edit/delete after F-01

- Keep `nutrition-record-foundation` scoped to meal save + read-only access.
- Add meal edit/delete in **S-01 (`first-calorie-logging-flow`)**, preferably as the last phase of that slice after calorie parsing, daily totals, and warning logic are already visible end-to-end.
- Why S-01: once meals affect kcal totals and warnings, users need a correction path on the same core logging flow; this is a better fit than S-02, which is about richer nutrition feedback rather than journal lifecycle.

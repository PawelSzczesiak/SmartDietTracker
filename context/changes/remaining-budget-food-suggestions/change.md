---
id: remaining-budget-food-suggestions
title: Remaining budget food suggestions
status: implementing
created: 2026-05-30
updated: 2026-05-30
roadmap_id: S-03
prd_refs:
  - FR-008
prerequisites:
  - first-calorie-logging-flow
  - meal-macros-feedback
---

## Summary

Add dashboard food suggestions that fit the user's remaining calorie budget, with a fallback catalog for new users and a personalized mode based on meal history once enough data is available.

## Outcome

Users see 3 actionable food suggestions under DashboardHero when calorie limit is available and not exceeded. Suggestions switch from static MVP list to history-based personalization after at least 10 unique ingredient-like tokens are detected from parsed meal texts.

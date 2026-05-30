# Remaining Budget Food Suggestions — Plan Brief

> Full plan: `context/changes/remaining-budget-food-suggestions/plan.md`

## What & Why

S-03 introduces food suggestions that fit the user's remaining daily calorie budget (FR-008). The goal is to turn the calorie budget from passive feedback into actionable guidance: what the user can still eat today without exceeding the limit.

## Starting Point

Dashboard already computes calorie status and remaining budget, and S-01/S-02 already provide meal logging plus macro visibility. What is missing is recommendation logic and a dedicated suggestion UI block.

## Desired End State

Users see 3 suggestions below DashboardHero when limit is available and remaining calories are positive. New users get static fallback suggestions; users with enough meal history switch to personalized suggestions based on normalized meal-text tokens (threshold: 10 unique tokens).

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Suggestion strategy | Hybrid: fallback then personalization | Delivers MVP quickly while enabling progressive personalization | Plan |
| Personalization threshold | 10 unique normalized meal-text tokens | Balanced readiness signal without schema changes | Plan |
| Over-limit behavior | Hide suggestions and show over-limit message | Keeps UX consistent with calorie-limit guardrails | Plan |
| Unavailable-limit behavior | Hide suggestions and show CTA to complete profile | Aligns with existing unavailable-limit flow | Plan |
| UI placement | Below Hero, above meal journal | Best visibility without overloading Hero | Plan |
| Exclusions/allergens | Out of scope for S-03 | Avoids DB/profile scope expansion in this slice | Plan |

## Scope

**In scope:**
- New server-side suggestion domain service in `src/lib/services`
- Dashboard integration and new `FoodSuggestions.astro` component
- Deterministic hidden/visible state handling and threshold transition logic

**Out of scope:**
- DB migrations for structured ingredients/preferences
- External AI recommendation calls
- Exclusion/allergen personalization
- New suggestion API endpoint

## Architecture / Approach

A pure SSR flow: `dashboard.astro` computes `foodSuggestions` using existing meals + calorie state and renders a new component. The service returns one of three states (`hidden_unavailable`, `hidden_over_limit`, `visible_suggestions`) and enforces calorie-fit filtering (`item.calories <= remainingCalories`).

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Suggestion domain service | Typed engine, catalog, threshold, state model | Heuristic token quality from free-text meal input |
| 2. Dashboard integration | New suggestions section and render wiring | Layout regressions and inconsistent state messaging |
| 3. Validation & hardening | Determinism and edge-case guardrails | Ambiguous tokens in mixed-language entries |

**Prerequisites:** S-01 + S-02 completed, dashboard calorie flow active  
**Estimated effort:** ~2 sessions across 3 phases

## Open Risks & Assumptions

- Ingredient inference uses `meal_text` tokens, not structured ingredient entities.
- Personalized suggestions will be approximate until schema-level ingredient modeling exists.

## Success Criteria (Summary)

- Suggestion block appears only when budget logic allows it and shows exactly 3 budget-fitting items.
- Fallback-to-personalized transition occurs at 10 unique normalized tokens.
- Over-limit/unavailable states never show suggestion items and remain UX-consistent with current dashboard logic.

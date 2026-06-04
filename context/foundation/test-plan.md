# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-02

## 1. Strategy

Tests in this project follow three non-negotiable principles:

1. **Cost × signal.** The cheapest test that gives a real signal for the risk wins. Do not promote to e2e because e2e "feels safer." Do not add an AI-native layer when a deterministic assertion already catches the regression.
2. **User concerns are first-class evidence.** Risks anchored in lived concerns (parser quality, timeout incidents, calorie-limit logic uncertainty) are treated as equal to PRD and roadmap evidence.
3. **Risks are scenarios, not code locations.** This plan captures what can fail and why we believe it is likely. It does not claim which file owns the failure; that grounding is produced by `/10x-research` per rollout phase.

Hot-spot scope used for likelihood weighting: `src`, `scripts`, `supabase`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by risk = impact × likelihood.

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|---|---|---|---|
| 1 | Meal parser błędnie interpretuje opis posiłku, przez co user dostaje mylący feedback kcal/makro i stanu dnia | High | High | PRD FR-004..FR-007 (`context/foundation/prd.md`), interview Q1, roadmap S-01/S-02 (`context/foundation/roadmap.md`) |
| 2 | Odpowiedź modelu trwa zbyt długo i request kończy się timeoutem, więc user nie dostaje wyniku po posiłku | High | High | NFR latency (`context/foundation/prd.md`), interview Q2, roadmap F-02 (`context/foundation/roadmap.md`) |
| 3 | Logika limitu kalorii wylicza zły remaining budget i błędne ostrzeżenia | High | High | PRD FR-003/FR-007/FR-011 (`context/foundation/prd.md`), interview Q3, hot-spot dir `src/components/profile` (11 changes/30d) |
| 4 | Dashboard po zapisie posiłku pokazuje nieaktualny lub niepełny stan dnia | High | Medium | PRD FR-006/FR-007 (`context/foundation/prd.md`), roadmap S-01..S-03 (`context/foundation/roadmap.md`), hot-spot dir `src/components/dashboard` (9 changes/30d) |
| 5 | Abuse scenario: zalogowany user może odczytać lub zmodyfikować cudze dane profilu/posiłków (ownership drift) | High | Medium | Access model (`context/foundation/prd.md`), archived slice outcome (`context/archive/2026-05-27-nutrition-record-foundation/plan.md`), hot-spot dir `src/pages/api` (15 changes/30d) |
| 6 | Kosztowne requesty parsera mogą być nadużyte i degradować usługę (resource abuse) | Medium | Medium | PRD input + NFR (`context/foundation/prd.md`), interview Q2, tech stack has_ai=true (`context/foundation/tech-stack.md`) |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | Ten sam opis posiłku daje stabilny, biznesowo poprawny wynik i łapie znane błędne klasyfikacje | "Happy-path parse działa, więc parser jest OK" | granice kontraktu wejście/wyjście, zachowanie na niejednoznacznym tekście | integration / contract | oracle skopiowany z implementacji parsera |
| #2 | Timeout/error path jest jawny: brak fałszywego sukcesu i czytelny sygnał dla usera | "Końcowe 200 znaczy brak ryzyka" | limity czasu, translacja błędu, retry/fallback semantyka | integration | tylko test zielonej ścieżki |
| #3 | Remaining budget i warning state są zgodne z policy dla wartości brzegowych celu | "Jeden przykładowy profil reprezentuje wszystkie przypadki" | zasada obliczeń, granice celu/tempa, mapowanie warning policy | unit + integration | asercje kopiujące produkcyjne wyliczenie |
| #4 | Po zapisie posiłku dashboard zawsze pokazuje aktualny dzienny stan i historię | "Render po submit zawsze jest świeży" | źródło prawdy po zapisie, kolejność odczytu/zapisu, semantyka odświeżenia | integration | snapshot bez znaczących asercji zachowania |
| #5 | Ownership jest egzekwowany dla odczytu i zapisu każdego rekordu użytkownika | "Authenticated == authorized" | reguła własności zasobu i checki na granicy API | integration | mockowanie autoryzacji zamiast realnej ścieżki |
| #6 | System ogranicza kosztowne sekwencje parsera i nie degraduje flow użytkownika | "Rzadki timeout można zignorować" | polityka limitowania i zachowanie przy przeciążeniu | integration + gate | e2e-heavy zamiast tańszej walidacji granic |

## 3. Phased Rollout

Each row is a discrete rollout phase. Status is orchestrator state and advances left-to-right.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|---|---|---|---|---|---|
| 1 | Critical-path bootstrap | Bootstrap test baseline and protect highest business-risk flows first | #1, #2, #3 | unit + integration | complete | context/changes/testing-critical-path-bootstrap/ |
| 2 | Integration around hot-spots | Catch API/dashboard ownership and state-sync regressions in high-churn areas | #4, #5 | integration | not started | — |
| 3 | AI/runtime abuse guardrails | Add focused safeguards for costly parser usage and selective runtime checks | #6, cross-cutting | integration + selective AI-native review | not started | — |
| 4 | Quality-gates wiring | Lock required quality floor in local + CI gates | cross-cutting | gates | not started | — |

## 4. Stack

| Layer | Tool | Version | Notes |
|---|---|---|---|
| unit + integration | Vitest | 3.2.4 | Baseline runner active with Phase 1 bootstrap; CI gate runs `npm run test:run` |
| API mocking | none yet | n/a | Choose only if needed by selected integration runner in §3 Phase 1 |
| e2e | none yet | n/a | Add only for critical flows that cannot be protected cheaper |
| accessibility | none yet | n/a | Consider after baseline test flow exists |
| (optional) AI-native | Playwright browser tools — checked: 2026-06-02 | n/a | Use selectively for runtime/visual gaps only; not a replacement for deterministic tests |

**Stack grounding tools (current session):**
- Docs: none — no dedicated docs MCP exposed in this session; checked: 2026-06-02
- Search: web_search — available for current support/status checks when needed; checked: 2026-06-02
- Runtime/browser: Playwright browser tools — available for selective runtime/visual verification; checked: 2026-06-02
- Provider/platform: GitHub MCP + gh CLI — available for issue/PR quality-gate workflow; Cloudflare/Supabase provider MCP not exposed; checked: 2026-06-02

## 5. Quality Gates

| Gate | Where | Required? | Catches |
|---|---|---|---|
| lint + typecheck | local + CI | required | syntax/type drift |
| unit + integration | local + CI | required after §3 Phase 1 | logic regressions in parser/limit/dashboard paths |
| e2e on critical flows | CI on PR | required after §3 Phase 2 | broken user-critical end-to-end paths |
| post-edit hook | local (agent loop) | recommended after §3 Phase 3 | fast edit-time regressions |
| visual diff (deterministic) | CI on PR | optional | rendering regressions where DOM assertions are insufficient |
| multimodal visual review | CI on PR | optional | selective screen regressions classic diff misses |
| pre-prod smoke | between merge + prod | optional | environment-specific failures |

## 6. Cookbook Patterns

### 6.1 Adding a unit test

**Location:** `src/**/*.test.ts` (domain-first; start with pure helpers like `src/lib/nutrition-goals.test.ts` and `src/lib/services/meal-parser.test.ts`)

**Naming pattern:** `<module>.test.ts`, test titles in behavior form (`returns near_limit at exactly 90% threshold`)

**Reference pattern (Phase 1):**
- Boundary matrix for warning policy: `src/lib/nutrition-goals.test.ts`
- Parser contract fixture-driven checks: `src/lib/services/meal-parser.test.ts` + `src/test/fixtures/parser-contract/cases.ts`

**Run command:** `npm run test:run -- <module-keyword>` (examples: `npm run test:run -- nutrition-goals`, `npm run test:run -- parser`)

### 6.2 Adding an integration test

**Location:** Route/page seams under feature folders, typically `src/pages/**/__tests__/*.integration.test.ts`

**Naming pattern:** `<flow>.integration.test.ts`, scenario titles must encode success vs degraded semantics

**Reference pattern (Phase 1):**
- Meal route degraded-path semantics + persistence assertions: `src/pages/api/meals/__tests__/routes.integration.test.ts`
- Dashboard flash semantic mapping: `src/pages/dashboard/__tests__/flash-semantics.integration.test.ts`
- Profile policy flow checks: `src/pages/api/profile/__tests__/policy.integration.test.ts`

**Run command:** `npm run test:run -- <feature-keyword>` (examples: `npm run test:run -- meals`, `npm run test:run -- policy`)

### 6.3 Adding an e2e test

TBD — see §3 Phase 2 for dashboard state-sync critical-flow pattern.

### 6.4 Adding a test for a new API endpoint

TBD — see §3 Phase 2 for ownership/authorization regression pattern.

### 6.5 Adding a test for AI/runtime safeguards

TBD — see §3 Phase 3 for resource-abuse and fallback-behavior pattern.

### 6.6 Per-rollout-phase notes

**Phase 1 (Critical-path bootstrap)**
- Runner baseline: Vitest (`npm run test:run`) is now required in CI.
- Anti-flake policy: timeout/error tests stub parser boundary outcomes; no provider-network dependency in integration layer.
- Oracle policy: parser correctness uses fixture corpus (`known + adversarial`) and never copies production math as expected output.
- First added files:
  - `vitest.config.ts`
  - `src/test/setup/vitest.setup.ts`
  - `src/test/fixtures/parser-contract/cases.ts`
  - `src/lib/services/meal-parser.test.ts`
  - `src/pages/api/meals/__tests__/routes.integration.test.ts`
  - `src/lib/nutrition-goals.test.ts`
  - `src/pages/api/profile/__tests__/policy.integration.test.ts`
  - `src/pages/dashboard/__tests__/flash-semantics.integration.test.ts`
  - `src/pages/dashboard/__tests__/policy-summary.integration.test.ts`

## 7. What We Deliberately Don't Test

- Brak jawnie uzgodnionych wykluczeń na tym etapie (interview Q5: "nie wiem"). Re-evaluate po zakończeniu §3 Phase 1, gdy pojawi się realny koszt utrzymania testów.

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-02
- Stack versions last verified: 2026-06-02
- AI-native tool references last verified: 2026-06-02

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.

---
project: SmartDietTracker
version: 1
status: draft
created: 2026-05-25
updated: 2026-05-31
prd_version: 1
main_goal: speed
top_blocker: time
---

## Vision recap

Roadmapa ma dowieźć najkrótszą ścieżkę do MVP, w którym użytkownik po posiłku dostaje natychmiastowy feedback o dystansie do dziennego limitu kalorii.

Klucz produktu nie leży w rozbudowanej bazie produktów, tylko w tym, że wpis naturalnym językiem jest szybszy niż ręczne wyszukiwanie składników i od razu aktualizuje stan dnia.

Przy budżecie jednego tygodnia po godzinach sekwencja musi faworyzować jeden działający flow end-to-end, a nie szerokie pokrycie nice-to-have.

## North star

Gwiazda przewodnia — pierwsza pionowa historyjka, która udowadnia, że produkt działa w realnym użyciu — to **S-01: użytkownik przechodzi pierwszy flow od logowania do wpisania posiłku i zobaczenia limitu**.

To najkrótszy zakres, który jednocześnie pokrywa primary success criterion i sprawdza hipotezę, że naturalny tekst rzeczywiście obniża tarcie logowania kalorii.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-01 | nutrition-record-foundation | (foundation) konto użytkownika ma trwały rekord profilu i dziennik posiłków gotowe pod pierwszy flow | — | FR-001, FR-002, FR-006 | done |
| F-02 | performance-verification-path | (foundation) zespół ma ścieżkę weryfikacji wydajności i stabilności dla flow posiłku i dashboardu | S-01 | NFR-01, NFR-02 | proposed |
| S-01 | first-calorie-logging-flow | użytkownik może zalogować się, uzupełnić profil, dostać limit kalorii, wpisać posiłek tekstem i zobaczyć dzienną sumę oraz ostrzeżenia | F-01 | US-01, FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007 | done |
| S-02 | meal-macros-feedback | użytkownik może po wpisaniu posiłku zobaczyć nie tylko kcal, ale też makroskładniki | S-01 | FR-009 | done |
| S-03 | remaining-budget-food-suggestions | użytkownik może dostać sugestie dodatkowych porcji jedzenia w ramach pozostałego limitu kalorii | S-01 | FR-008 | done |
| F-03 | evidence-based-target-policy | (foundation) zespół ma uzgodnioną politykę bezpiecznych progów zmian masy ciała dla trybów celu | S-01 | FR-011 | done |
| S-04 | target-pace-calorie-adjustment | użytkownik może wybrać tryb spokojnie / normalnie / szybko, a system dostosowuje limit kalorii zgodnie z bezpiecznym zakresem | F-03, S-01 | FR-010, FR-011 | proposed |

## Streams

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Core MVP | `F-01` → `S-01` | Najkrótsza ścieżka do walidacji głównej obietnicy produktu przy celu speed. |
| B | Richer nutrition feedback | `S-01` → `S-02` | Rozszerza główny flow o większą wartość informacyjną bez zmiany podstawowego zachowania. |
| C | Smart daily guidance | `S-01` → `S-03` | Dodaje inteligentne sugestie dopiero po potwierdzeniu, że bazowy flow działa. |
| D | Quality guardrail | `S-01` → `F-02` | Domyka NFR-y po pierwszej walidacji, zamiast blokować start MVP. |
| E | Safe target pace | `S-01` → `F-03` → `S-04` | Rozszerza produkt o wybór tempa celu, ale wymaga najpierw polityki opartej o bezpieczne zalecenia. |

## Baseline

Co jest już na miejscu w codebase na dzień 2026-05-25.

- **Frontend:** present — Astro SSR z React islands, TypeScript, Tailwind CSS 4 i shadcn/ui są już spięte.
- **Backend / API:** present — endpointy serwerowe i middleware istnieją, więc pierwszy flow nie zaczyna od zera po stronie request handling.
- **Data:** partial — istnieje tylko warstwa auth/session; brak jeszcze własnej persystencji domenowej dla profilu i posiłków.
- **Auth:** present — Supabase SSR, logowanie i ochrona tras są już wdrożone.
- **Deploy / infra:** present — Cloudflare Workers, Wrangler i CI są gotowe do dalszego użycia.
- **Observability:** present — request ID i ustrukturyzowane logi już istnieją.

## Foundations

### F-01: Trwały rekord profilu i dziennika posiłków

- **Outcome:** (foundation) konto użytkownika ma trwały rekord profilu i dziennik posiłków gotowe pod pierwszy flow.
- **Change ID:** nutrition-record-foundation
- **PRD refs:** FR-001, FR-002, FR-006
- **Unlocks:** S-01
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Bez tego pierwszy flow end-to-end rozpadnie się na dane tymczasowe i nie pokaże wiarygodnego stanu dashboardu po zapisie.
- **Status:** done

### F-02: Ścieżka weryfikacji wydajności i stabilności

- **Outcome:** (foundation) zespół ma ścieżkę weryfikacji wydajności i stabilności dla flow posiłku i dashboardu.
- **Change ID:** performance-verification-path
- **PRD refs:** NFR-01, NFR-02
- **Unlocks:** S-02, S-03, weryfikacja produkcyjna flow wpisu posiłku
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Przy celu speed nie warto tym blokować startu MVP, ale bez jawnej ścieżki weryfikacji kolejne rozszerzenia mogą rozjechać się z NFR-ami.
- **Status:** done

### F-03: Polityka bezpiecznych progów zmian masy ciała

- **Outcome:** (foundation) zespół ma uzgodnioną politykę bezpiecznych progów zmian masy ciała dla trybów celu.
- **Change ID:** evidence-based-target-policy
- **PRD refs:** FR-011
- **Unlocks:** S-04
- **Prerequisites:** S-01
- **Parallel with:** F-02, S-02, S-03
- **Blockers:** —
- **Unknowns:**
  - Jakie konkretne progi zmian masy ciała mapujemy na tryby spokojnie / normalnie / szybko dla redukcji i ewentualnego zwiekszania masy? — Owner: product + implementation research. Block: yes.
- **Risk:** Ta funkcja dotyka rekomendacji zdrowotnych, więc bez jawnej polityki evidence-based łatwo wdrożyć zbyt agresywne lub mylące zalecenia.
- **Status:** proposed

## Slices

### S-01: Pierwsze logowanie kalorii end-to-end

- **Outcome:** użytkownik może zalogować się, uzupełnić profil, dostać limit kalorii, wpisać posiłek tekstem i zobaczyć dzienną sumę oraz ostrzeżenia.
- **Change ID:** first-calorie-logging-flow
- **PRD refs:** US-01, FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** To największy slice w roadmapie, ale przy celu speed nie ma sensu rozdrabniać go na kilka połowicznych flow bez pełnej walidacji produktu.
- **Status:** done

### S-02: Makroskładniki obok kalorii

- **Outcome:** użytkownik może po wpisaniu posiłku zobaczyć nie tylko kcal, ale też makroskładniki.
- **Change ID:** meal-macros-feedback
- **PRD refs:** FR-009
- **Prerequisites:** S-01
- **Parallel with:** F-02, S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Ten slice łatwo rozrosnąć do bardziej zaawansowanej analizy żywieniowej, więc powinien pozostać prostym rozszerzeniem istniejącego flow wpisu posiłku.
- **Status:** done

### S-03: Sugestie jedzenia w ramach pozostałego limitu

- **Outcome:** użytkownik może dostać sugestie dodatkowych porcji jedzenia w ramach pozostałego limitu kalorii.
- **Change ID:** remaining-budget-food-suggestions
- **PRD refs:** FR-008
- **Prerequisites:** S-01
- **Parallel with:** F-02, S-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** To pierwszy slice, który naprawdę zwiększa "smartness" produktu, więc powinien wejść dopiero po udowodnieniu, że podstawowy logging kalorii działa stabilnie.
- **Status:** done

### S-04: Wybór tempa dojścia do wagi docelowej

- **Outcome:** użytkownik może wybrać tryb spokojnie / normalnie / szybko, a system dostosowuje limit kalorii zgodnie z bezpiecznym zakresem.
- **Change ID:** target-pace-calorie-adjustment
- **PRD refs:** FR-010, FR-011
- **Prerequisites:** F-03, S-01
- **Parallel with:** F-02, S-02, S-03
- **Blockers:** F-03
- **Unknowns:**
  - Jak mapujemy neutralny komunikat "recommended healthy edge limit for your goal" na finalne teksty UI dla redukcji i zwiekszania masy? — Owner: product + implementation. Block: no.
- **Risk:** To mocne rozszerzenie wartości produktu, ale wdrożone bez guardrailów zdrowotnych może obniżyć zaufanie użytkownika.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | nutrition-record-foundation | Przygotować trwały rekord profilu i dziennik posiłków pod pierwszy flow | yes | To jedyny fundament bezpośrednio odblokowujący gwiazdę przewodnią |
| S-01 | first-calorie-logging-flow | Dowieźć pierwszy flow logowania kalorii end-to-end | no | Najpierw musi wylądować F-01 |
| F-02 | performance-verification-path | Dodać ścieżkę weryfikacji wydajności i stabilności dla flow posiłku | no | Ma sens po uruchomieniu S-01 |
| S-02 | meal-macros-feedback | Pokazać makroskładniki obok kalorii dla wpisanego posiłku | no | Rozszerzenie podstawowego flow po S-01 |
| S-03 | remaining-budget-food-suggestions | Zaproponować dodatkowe porcje jedzenia w ramach pozostałego limitu | no | Warstwa smart guidance po walidacji core flow |
| F-03 | evidence-based-target-policy | Uzgodnić politykę bezpiecznych progów zmian masy ciała dla trybów celu | yes | Decyzja enforcement zamknięta (warning-only + healthy edge limit); do doprecyzowania progi liczbowe |
| S-04 | target-pace-calorie-adjustment | Dodać wybór tempa celu i dostosowanie limitu kalorii | no | Start dopiero po F-03 |

## Open Roadmap Questions

1. **Jakie konkretne evidence-based progi zmian masy ciala mapujemy na tryby spokojnie / normalnie / szybko dla redukcji i ewentualnego zwiekszania masy?** — Owner: product + implementation research. Block: F-03, S-04.
2. **Jakie finalne copy UI stosujemy dla neutralnego komunikatu "recommended healthy edge limit for your goal" (redukcja vs zwiekszanie)?** — Owner: product + implementation. Block: no.

## Parked

- **Własna baza produktów spożywczych** — Why parked: PRD wskazuje to wprost jako poza zakresem MVP.
- **Skanowanie kodów kreskowych** — Why parked: PRD wskazuje to wprost jako poza zakresem MVP.
- **Rozpoznawanie posiłków ze zdjęć** — Why parked: PRD wskazuje to wprost jako poza zakresem MVP.
- **Planowanie treningów i integracje ze smartwatchami** — Why parked: PRD wskazuje to wprost jako poza zakresem MVP.
- **Natywna aplikacja mobilna** — Why parked: PRD wskazuje to wprost jako poza zakresem MVP.

## Done

- **F-01: (foundation) konto użytkownika ma trwały rekord profilu i dziennik posiłków gotowe pod pierwszy flow** — Archived 2026-05-27 → `context/archive/2026-05-27-nutrition-record-foundation/`. Lesson: —.
- **S-01: użytkownik może zalogować się, uzupełnić profil, dostać limit kalorii, wpisać posiłek tekstem i zobaczyć dzienną sumę oraz ostrzeżenia** — Implemented + reviewed (`impl_reviewed`) on 2026-05-30 → `context/changes/first-calorie-logging-flow/`.
- **S-02: użytkownik może po wpisaniu posiłku zobaczyć nie tylko kcal, ale też makroskładniki** — Implemented + reviewed (`impl_reviewed`) on 2026-05-30 → `context/changes/meal-macros-feedback/`.
- **S-03: użytkownik może dostać sugestie dodatkowych porcji jedzenia w ramach pozostałego limitu kalorii** — Implemented + reviewed (`impl_reviewed`) on 2026-05-30 → `context/changes/remaining-budget-food-suggestions/`.

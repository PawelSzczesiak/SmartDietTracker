# Performance verification path — Plan Brief

> Full plan: `context/changes/performance-verification-path/plan.md`

## What & Why

Implementujemy foundation F-02, które daje powtarzalną ścieżkę weryfikacji wydajności i stabilności dla flow dodania posiłku oraz odświeżenia dashboardu. Celem jest domknięcie NFR-01/NFR-02 dowodami, a nie deklaracjami. To ma ograniczyć ryzyko regresji przy kolejnych zmianach bez spowalniania delivery blokującą bramką CI.

## Starting Point

Flow działa funkcjonalnie, ale pomiary wydajności są niesformalizowane: brak spanów czasu w logach, brak komendy baseline i brak workflow perf w CI. Krytyczna ścieżka to synchroniczny parser w `POST /api/meals` i SSR load dashboardu.

## Desired End State

Po wdrożeniu zespoł ma jedną komendę baseline (`npm run perf:baseline`), standard raportu (JSON + Markdown), instrumentację z requestId i breakdownem czasów oraz runbook z manualnym smoke-checkiem. Weryfikacja ma status non-blocking: przy przekroczeniu NFR powstaje warning z rekomendacją, ale bez automatycznego failowania release w tym etapie.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Scope F-02 | Instrumentacja + baseline harness + runbook | To najmniejszy zakres, który daje realnie powtarzalne dowody NFR. |
| Metryki | End-to-end HTTP + serwerowe spany | Łączy perspektywę usera i diagnostykę backendu. |
| Profil obciążenia | Baseline only | Priorytetem jest szybkie domknięcie foundation bez rozbudowy scenariuszy stress/degraded. |
| Storage wyników | Artefakty repo, bez tabel telemetryjnych | Unika ryzyka migracji i utrzymania runtime DB tylko dla telemetry. |
| Obsługa breach NFR | Warning-only w raporcie (non-blocking) | Zgodne z celem speed i decyzją o miękkim egzekwowaniu na tym etapie. |
| Integracja CI | Osobny non-blocking workflow/perf command | Daje widoczność bez destabilizacji głównego CI. |
| Manual smoke | 3 posiłki + refresh + warning/fallback | Pokrywa pełny user loop niskim kosztem czasu. |
| Scope guardrail | Bez refaktoru parsera/algorytmów | Zapobiega scope creep; F-02 ma weryfikować, nie przebudowywać logikę. |

## Scope

**In scope:**
- Instrumentacja czasu dla meal API i dashboard load.
- Skrypt baseline z raportami JSON/Markdown.
- Runbook operacyjny + manual smoke-check.
- Non-blocking workflow dla uruchamiania perf baseline.

**Out of scope:**
- Refaktor parsera i zmiany algorytmów żywieniowych.
- Zmiany UX dashboardu pod perceived performance.
- Produkcyjny telemetry store w Supabase.
- Blocking gate w głównym CI.

## Architecture / Approach

Podejście ma 3 warstwy: (1) obserwowalność w runtime (spójne spany i duration), (2) powtarzalny harness baseline i zapis artefaktów, (3) operacjonalizacja przez runbook i workflow. Wykorzystujemy istniejący wzorzec `requestId` + structured logs i nie zmieniamy kontraktu funkcjonalnego endpointów.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Instrument performance-critical server spans | Spójne logi z duration breakdown dla meal + dashboard | Niedokładne spany mogą fałszywie wskazać bottleneck |
| 2. Build repeatable baseline measurement harness | Komenda baseline i artefakty raportu | Brak stabilności danych wejściowych może zaburzać porównania |
| 3. Operationalize verification path | Runbook + non-blocking workflow | Brak regularnego uruchamiania obniży wartość ścieżki |

**Prerequisites:** S-01 ukończone (spełnione), środowisko z działającym auth i parser config dla pomiaru ścieżki meal.
**Estimated effort:** ~2-3 sesje przez 3 fazy.

## Open Risks & Assumptions

- Baseline-only może nie wykryć części regresji pod obciążeniem stress/degraded.
- Non-blocking model wymaga dyscypliny zespołu w reagowaniu na warningi NFR.
- Parser latency zależy od zewnętrznego providera i może mieć duży jitter między przebiegami.

## Success Criteria (Summary)

- Mamy powtarzalny pomiar p95/p99 dla meal submit i dashboard refresh.
- Każdy przebieg daje artefakt z pass/warn i breakdownem źródła opóźnień.
- Zespół potrafi wykonać pełny runbook i manual smoke bez dodatkowych ustnych instrukcji.

<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Evidence-based target policy

- **Plan**: `context/changes/evidence-based-target-policy/plan.md`
- **Scope**: Full plan (Phases 1-4)
- **Date**: 2026-05-31
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | FAIL |

## Findings

### F1 — Plan zakładał zmianę w `api/profile`, ale implementacja obeszła to pośrednio

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/pages/api/profile/index.ts`
- **Detail**: Plan dla Fazy 1 wprost wskazywał `src/pages/api/profile/index.ts` jako plik do objęcia zmianą w pipeline `target_pace`. Zachowanie końcowe działa poprawnie, bo route już wcześniej przekazywał cały `parsed.data` do `upsertProfileForUser`, ale sam planowany punkt integracji nie został faktycznie zmieniony. To jest drift względem planu na poziomie implementacji pliku, nie błąd funkcjonalny.
- **Fix**: Zaktualizować plan/review note, że route nie wymagał zmiany, bo integracja była już zapewniona przez istniejący przepływ.
- **Decision**: FIXED — route `src/pages/api/profile/index.ts` nie wymagał zmiany, bo istniejący flow już przekazywał cały `parsed.data` do `upsertProfileForUser`; drift został udokumentowany w review note.

### F2 — Roadmap nie została zsynchronizowana po wdrożeniu F-03

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `context/foundation/roadmap.md:35`
- **Detail**: `change.md` ma już `status: implemented`, ale `context/foundation/roadmap.md` nadal pokazuje `F-03` jako `proposed`. To łamie ustaloną regułę repo: po wdrożeniu slice'a statusy w roadmapie mają być aktualizowane zgodnie z lifecycle change'a. W efekcie dokumentacja planistyczna jest już niespójna z rzeczywistym stanem prac.
- **Fix**: Zaktualizować wpis `F-03` w roadmapie do stanu zgodnego z wdrożeniem i odblokować zależność dla `S-04`, jeśli roadmap to implikuje.
- **Decision**: FIXED — roadmap zsynchronizowana z wdrożeniem; `F-03` oznaczone jako `done`, a `S-04` odblokowane do stanu `proposed`.

### F3 — Plan oznacza pełny lint jako zaliczony, ale repo-wide lint nadal failuje

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: `context/changes/evidence-based-target-policy/plan.md:293`, `context/changes/evidence-based-target-policy/plan.md:305`, `context/changes/evidence-based-target-policy/plan.md:318`, `context/changes/evidence-based-target-policy/plan.md:332`
- **Detail**: W `## Progress` kroki 1.3, 2.1, 3.1 i 4.1 są oznaczone jako wykonane z SHA, ale pełny `npm run lint` nadal kończy się błędem. Aktualny fail nie wygląda na regresję F-03 — to repo-wide baseline `prettier/prettier` związany z CRLF/LF (ostatni pełny run: 395 błędów). Mimo to plan w obecnej formie komunikuje, że pełny lint dla faz przeszedł, co w review jest nieprawdą względem literalnych success criteria.
- **Fix A ⭐ Recommended**: Skorygować plan/review artifacts tak, by jasno zapisać adaptację: touched-file lint pass + known repo-wide CRLF baseline.
  - Strength: Zachowuje prawdziwy stan repo i nie udaje pełnego green CI, a jednocześnie nie miesza F-03 z niezależnym baseline problemem.
  - Tradeoff: Plan pozostaje częściowo odstępstwem od oryginalnego wording success criteria.
  - Confidence: HIGH — pełny lint został ponownie uruchomiony i failuje na niespokrewnionym baseline formatowania.
  - Blind spot: Nie sprawdzałem, czy zespół woli poprawiać baseline od razu zamiast dokumentować adaptację.
- **Fix B**: Naprawić cały repo-wide CRLF/LF baseline teraz i dopiero wtedy utrzymać obecne odhaczenia bez zastrzeżeń.
  - Strength: Przywraca literalną zgodność z success criteria i pełny green lint.
  - Tradeoff: Duży, nieskopowany zakres poza F-03; ryzyko mieszania zmian funkcjonalnych z masowym formattingiem.
  - Confidence: MEDIUM — technicznie wykonalne, ale wyraźnie wykracza poza ten change.
  - Blind spot: Nie oszacowałem pełnego blast radius dla repo-wide normalizacji linii.
- **Decision**: FIXED via Fix A — plan artifacts now document the implementation-time adaptation: touched-file lint passed, while full `npm run lint` still fails on the known repository-wide CRLF/LF baseline.

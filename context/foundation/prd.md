---
project: SmartDietTracker
version: 1
status: draft
created: 2026-05-18
context_type: greenfield
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 1
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

Osoba, ktora chce utrzymac wage, doswiadcza wysokiego tarcia przy klasycznym logowaniu kalorii, bo musi recznie wyszukiwac produkty i wpisywac dane po kazdym posilku.

Najbardziej bolesny moment wystepuje bezposrednio po jedzeniu, gdy uzytkownik chce szybko ocenic, czy zbliza sie do dziennego limitu kalorii. Obecnie koszt to czas i spadek regularnosci prowadzenia diety.

Kluczowy insight: opisywanie posilku naturalnym jezykiem jest szybsze i bardziej naturalne dla uzytkownika niz manualne wyszukiwanie skladnikow w bazie produktow.

## User & Persona

Primary persona: pojedyncza osoba dbajaca o utrzymanie wagi, ktora po kazdym posilku chce natychmiastowego feedbacku o dystansie do dziennego limitu kalorii.

## Success Criteria

### Primary

- Uzytkownik przechodzi pierwszy flow end-to-end: rejestruje konto, uzupelnia wage obecna i docelowa, otrzymuje automatyczny limit kalorii, wpisuje posilek naturalnym tekstem i od razu widzi dzienna sume kcal oraz pozostaly limit.

### Secondary

- System wyswietla sugestie ilosci produktow, ktore uzytkownik moze jeszcze zjesc danego dnia na bazie preferencji oraz pozostalego limitu kalorii.
- Uzytkownik moze wybrac tempo osiagniecia wagi docelowej (spokojnie / normalnie / szybko), a system dopasowuje limit kalorii zgodnie z bezpiecznym, evidence-based zakresem zmian masy ciala.

### Guardrails

- Dashboard zawsze pokazuje aktualna sume kcal i dzienny limit po dodaniu posilku.

## User Stories

### US-01: Pierwsze logowanie posilku i kontrola limitu

- **Given** nowy zarejestrowany uzytkownik
- **When** przechodzi konfiguracje profilu i dodaje pierwszy posilek
- **Then** widzi aktualny stan dobowego limitu kalorii oraz liczbe zjedzonych kalorii na czytelnym wykresie

## Functional Requirements

- FR-001: User can create account and sign in. Priority: must-have
  > Socrates: Counter-argument considered: login may add first-use friction in MVP. Resolution: kept as written.
- FR-002: User can submit optional profile data (age, sex, current weight, height, target weight). Priority: must-have
  > Socrates: Counter-argument considered: too many required fields at onboarding. Resolution: kept fields, but all are optional in MVP.
- FR-003: User can get an automatic daily calorie limit when current and target weight are provided and no manual limit is set. Priority: must-have
  > Socrates: Counter-argument considered: auto limit can be inaccurate without context. Resolution: kept with condition that auto suggestion appears only when profile input is present and manual limit is not set.
- FR-004: User can add meal using natural-language text input. Priority: must-have
  > Socrates: Counter-argument considered: natural-language inputs can be ambiguous. Resolution: kept as written.
- FR-005: User can see parsed kcal value for entered meal. Priority: must-have
  > Socrates: Counter-argument considered: full macro output may overload MVP. Resolution: split requirement; kcal remains must-have.
- FR-006: User can see today's meal history and progress status in one simplified dashboard view (sum kcal vs daily limit). Priority: must-have
  > Socrates: Counter-argument considered: separate components may clutter MVP dashboard. Resolution: merged into one simplified view.
- FR-007: User can see warning state when close to daily limit and when over limit. Priority: must-have
  > Socrates: Counter-argument considered: warning thresholds may demotivate users. Resolution: kept as written.
- FR-008: User can get suggestions of additional food portions based on preferences and remaining daily kcal budget. Priority: nice-to-have
  > Socrates: Counter-argument considered: suggestion quality may be low in MVP. Resolution: kept as nice-to-have only.
- FR-009: User can see parsed macro values (protein, carbs, fat) for entered meal. Priority: nice-to-have
- FR-010: User can choose a target pace for reaching target weight from three modes: slow, normal, fast. Priority: nice-to-have
- FR-011: System adjusts daily calorie limit based on the selected target pace using evidence-based healthy weight-change guidance and shows a warning or cap when the requested pace would exceed that guidance. Priority: nice-to-have

## Non-Functional Requirements

- Przetwarzanie wpisu posilku i zwrot wyniku trwa < 3 s p95.
- Odswiezenie stanu paska postepu po zapisie wpisu trwa < 400 ms p99.

## Business Logic

Aplikacja automatycznie klasyfikuje i wylicza makroskladniki z tekstu posilku oraz dynamicznie ostrzega uzytkownika o ryzyku przekroczenia dobowego limitu kalorii wyznaczonego na podstawie jego profilu zdrowotnego i wybranego tempa dochodzenia do wagi docelowej.

Regula konsumuje tekstowy opis posilku, aktualna sume kalorii oraz ustawienia celu wagi, a jako wynik zwraca ustrukturyzowany obiekt z wartosciami odzywczymi i aktualizuje stan paska postepu wraz z ostrzezeniem po zatwierdzeniu wpisu.

## Access Control

Uzytkownik uzyskuje dostep przez login.

Model uprawnien w MVP jest plaski: kazdy zalogowany uzytkownik ma ten sam zakres funkcji.

## Non-Goals

- Nie budujemy wlasnej bazy produktow spozywczych; MVP opiera sie na interpretacji AI.
- Nie wdrazamy skanowania kodow kreskowych.
- Nie wdrazamy rozpoznawania posilkow ze zdjec.
- Nie wdrazamy modulu planowania treningow ani integracji ze smartwatchami.
- Nie budujemy natywnej aplikacji mobilnej w MVP.

## Open Questions

1. **Jakie konkretne evidence-based progi zmian masy ciala mapujemy na tryby spokojnie / normalnie / szybko dla redukcji i ewentualnego zwiekszania masy?** - Owner: product + implementation research. By: przed planowaniem tego rozszerzenia.
2. **Czy przy probie ustawienia zbyt agresywnego tempa system ma twardo ograniczac limit, czy tylko ostrzegac i proponowac bezpieczniejszy zakres?** - Owner: product. By: przed planowaniem tego rozszerzenia.
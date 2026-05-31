---
project: SmartDietTracker
context_type: greenfield
created: 2026-05-18
updated: 2026-05-18
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 1
  hard_deadline: null
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: pain category
      decision: workflow friction
    - topic: insight
      decision: natural-language logging is faster than product search
    - topic: primary persona scope
      decision: single named user for MVP
    - topic: access strategy
      decision: login
    - topic: role model
      decision: flat model
    - topic: mvp timeline
      decision: 1 week after-hours
    - topic: product type
      decision: web app
    - topic: target scale users
      decision: dozens to a hundred
    - topic: hard deadline
      decision: no deadline
  frs_drafted: 9
  quality_check_status: accepted
---

## Seed Idea

# #SmartDietTracker – MVP ideas

### Główny problem
Tradycyjne aplikacje do liczenia kalorii wymagają manualnego wyszukiwania produktów, ważenia składników i żmudnego wprowadzania danych, co jest czasochłonne i szybko zniechęca użytkowników do systematycznego dbania o dietę.

### Najmniejszy zestaw funkcjonalności
- Rejestracja i prosty formularz profilu (wiek, płeć, obecna waga, wzrost, waga docelowa)
- Automatyczne wyliczanie zapotrzebowania kalorycznego (BMR) oraz wskaźnika BMI z określeniem stanu (nadwaga/niedowaga)
- Automatyczne sugerowanie i możliwość ręcznego ustawienia dziennego limitu kalorii
- Generowanie wartości odżywczych (kalorie, białko, węglowodany, tłuszcze) przez AI na podstawie potocznego tekstu posiłku (np. "zjadłem 3 jajka sadzone i bułkę")
- Główny panel (Dashboard) z historią posiłków z danego dnia oraz paskiem postępu (dzisiejsza suma kcal / limit)
- System ostrzeżeń wizualnych i tekstowych na froncie przy zbliżaniu się do limitu (np. żółty pasek >85%) lub jego przekroczeniu (czerwony pasek)

### Co NIE wchodzi w zakres MVP
- Zaawansowana baza danych produktów spożywczych (opieramy się w 100% na wiedzy i interpretacji AI)
- Skaner kodów kreskowych z opakowań produktów
- Dodawanie zdjęć posiłków i rozpoznawanie jedzenia z fotografii
- Moduł planowania treningów i integracja ze smartwatchami (Apple Watch, Garmin itp.)
- Aplikacja mobilna (na początek wyłącznie responsywna aplikacja webowa - PWA)

### Kryteria sukcesu
- 80% wpisów tekstowych użytkownika jest poprawnie interpretowanych przez AI i zwraca prawidłowy obiekt JSON
- Użytkownik jest w stanie wprowadzić posiłek w czasie krótszym niż 10 sekund (brak konieczności wyszukiwania produktów składowych)

## Vision & Problem Statement

Osoba, która chce utrzymać wagę, doświadcza wysokiego tarcia przy klasycznym logowaniu kalorii, bo musi ręcznie wyszukiwać produkty i wpisywać dane po każdym posiłku.

Najbardziej bolesny moment występuje bezpośrednio po jedzeniu, gdy użytkownik chce szybko ocenić, czy zbliża się do dziennego limitu kalorii. Obecnie koszt to czas i spadek regularności prowadzenia diety.

Kluczowy insight: opisywanie posiłku naturalnym językiem jest szybsze i bardziej naturalne dla użytkownika niż manualne wyszukiwanie składników w bazie produktów.

## User & Persona

Primary persona: pojedyncza osoba dbająca o utrzymanie wagi, która po każdym posiłku chce natychmiastowego feedbacku o dystansie do dziennego limitu kalorii.

## Access Control

Użytkownik uzyskuje dostęp przez login.

Model uprawnień w MVP jest płaski: każdy zalogowany użytkownik ma ten sam zakres funkcji.

## Success Criteria

### Primary

- Użytkownik przechodzi pierwszy flow end-to-end: rejestruje konto, uzupełnia wagę obecną i docelową, otrzymuje automatyczny limit kalorii, wpisuje posiłek naturalnym tekstem i od razu widzi dzienną sumę kcal oraz pozostały limit.

### Secondary

- System wyświetla sugestię ilości produktów, które użytkownik może jeszcze zjeść danego dnia na bazie preferencji oraz pozostałego limitu kalorii.
- Użytkownik może wybrać tempo osiągania wagi docelowej (spokojnie / normalnie / szybko), a system dopasowuje limit kalorii zgodnie z bezpiecznym, evidence-based zakresem zmian masy ciała.

### Guardrails

- Dashboard zawsze pokazuje aktualną sumę kcal i dzienny limit po dodaniu posiłku.

## User Stories

### US-01: Pierwsze logowanie posiłku i kontrola limitu

- **Given** nowy zarejestrowany użytkownik
- **When** przechodzi konfigurację profilu i dodaje pierwszy posiłek
- **Then** widzi aktualny stan dobowego limitu kalorii oraz liczbę zjedzonych kalorii na czytelnym wykresie

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

## Business Logic

Aplikacja automatycznie klasyfikuje i wylicza makroskładniki z tekstu posiłku oraz dynamicznie ostrzega użytkownika o ryzyku przekroczenia dobowego limitu kalorii wyznaczonego na podstawie jego profilu zdrowotnego i wybranego tempa dochodzenia do wagi docelowej.

Reguła konsumuje tekstowy opis posiłku, aktualną sumę kalorii oraz ustawienia celu wagi, a jako wynik zwraca ustrukturyzowany obiekt z wartościami odżywczymi i aktualizuje stan paska postępu wraz z ostrzeżeniem po zatwierdzeniu wpisu.

## Non-Functional Requirements

- Przetwarzanie wpisu posiłku i zwrot wyniku trwa < 3 s p95.
- Odświeżenie stanu paska postępu po zapisie wpisu trwa < 400 ms p99.

## Non-Goals

- Nie budujemy własnej bazy produktów spożywczych; MVP opiera się na interpretacji AI.
- Nie wdrażamy skanowania kodów kreskowych.
- Nie wdrażamy rozpoznawania posiłków ze zdjęć.
- Nie wdrażamy modułu planowania treningów ani integracji ze smartwatchami.
- Nie budujemy natywnej aplikacji mobilnej w MVP.

## Quality cross-check

- Access Control: present.
- Business Logic: present.
- Project artifacts: present.
- Timeline-cost acknowledgment: present (mvp_weeks = 1).
- Non-Goals: present.
- Preserved behavior: n/a (greenfield).

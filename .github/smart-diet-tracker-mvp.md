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

# Plan testów dla projektu 10xDevsFinalProject

## 1. Wprowadzenie i cele testowania

Celem testowania jest zapewnienie wysokiej jakości, bezpieczeństwa oraz niezawodności aplikacji edukacyjnej opartej na frameworku Astro, React oraz Supabase. Testy mają na celu wykrycie defektów na wczesnym etapie, weryfikację zgodności z wymaganiami oraz zapewnienie pozytywnego doświadczenia użytkownika końcowego.

## 2. Zakres testów

Zakres obejmuje:

- Komponenty frontendowe (Astro, React, Shadcn/ui)
- API (Astro endpoints, Supabase)
- Integrację z bazą danych (Supabase)
- Procesy autoryzacji i rejestracji użytkowników
- Generowanie i zarządzanie fiszkami
- Obsługę błędów i powiadomień
- Middleware i logikę serwisową

## 3. Typy testów do przeprowadzenia

- Testy jednostkowe (unit tests) – logika serwisów, walidacje, komponenty React
- Testy integracyjne – komunikacja frontend-backend, API, interakcje z bazą danych
- Testy end-to-end (E2E) – kluczowe ścieżki użytkownika (np. rejestracja, logowanie, generowanie fiszek)
- Testy wydajnościowe – API, generowanie fiszek, operacje na bazie danych
- Testy bezpieczeństwa – autoryzacja, zarządzanie sesją, dostęp do danych
- Testy dostępności (a11y) – zgodność z ARIA, nawigacja klawiaturą, czytniki ekranu
- Testy regresyjne – po każdej większej zmianie w kodzie

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### Autoryzacja i rejestracja

- Poprawna rejestracja nowego użytkownika
- Logowanie z poprawnymi i błędnymi danymi
- Resetowanie hasła (poprawny i błędny e-mail)
- Aktualizacja hasła po zalogowaniu
- Obsługa błędów (np. nieprawidłowe dane, zablokowane konto)

### Generowanie i zarządzanie fiszkami

- Generowanie fiszek na podstawie tekstu wejściowego
- Wyświetlanie listy wygenerowanych fiszek
- Obsługa błędów generowania (np. przekroczenie limitu, błąd API)
- Usuwanie i edycja fiszek

### Interfejs użytkownika

- Responsywność i poprawne wyświetlanie na różnych urządzeniach
- Dostępność (nawigacja klawiaturą, ARIA)
- Powiadomienia o błędach i sukcesach

### API i integracja z bazą danych

- Poprawność odpowiedzi endpointów (statusy, dane)
- Walidacja danych wejściowych (zod)
- Bezpieczeństwo endpointów (autoryzacja, dostęp do danych użytkownika)

### Middleware i logika serwisowa

- Poprawna obsługa ciasteczek i sesji
- Middleware modyfikujące request/response

## 5. Środowisko testowe

- Oddzielna baza testowa Supabase (lokalnie lub w chmurze)
- Konfiguracja środowiska testowego w plikach `.env`
- Symulacja środowisk produkcyjnych i deweloperskich
- Przeglądarki: Chrome, Firefox, Edge (aktualne wersje)
- Systemy operacyjne: Windows, macOS, Linux

## 6. Narzędzia do testowania

- Unit/integration: Vitest, Jest, React Testing Library
- E2E: Playwright lub Cypress
- Linter: ESLint
- Formatowanie: Prettier
- Testy dostępności: axe-core, Lighthouse
- Testy wydajnościowe: k6, Artillery
- CI/CD: GitHub Actions (automatyzacja testów)

## 7. Harmonogram testów

1. Testy jednostkowe i integracyjne – na bieżąco podczas developmentu
2. Testy E2E – po zakończeniu kluczowych funkcjonalności
3. Testy wydajnościowe i bezpieczeństwa – przed wdrożeniem na produkcję
4. Testy regresyjne – po każdej większej zmianie w kodzie
5. Testy dostępności – przed wydaniem wersji produkcyjnej

## 8. Kryteria akceptacji testów

- 100% przejścia testów jednostkowych i integracyjnych dla kluczowych komponentów
- Brak krytycznych i wysokich błędów w testach E2E
- Brak regresji w funkcjonalnościach podstawowych
- Spełnienie wymagań wydajnościowych (czasy odpowiedzi API, generowanie fiszek)
- Zgodność z wytycznymi dostępności (WCAG 2.1 AA)
- Zabezpieczenie danych użytkowników i poprawna autoryzacja

## 9. Role i odpowiedzialności w procesie testowania

- QA Engineer: przygotowanie i realizacja scenariuszy testowych, raportowanie błędów
- Developerzy: implementacja testów jednostkowych, naprawa wykrytych defektów
- DevOps: konfiguracja środowisk testowych, automatyzacja testów w CI/CD
- Product Owner: akceptacja kryteriów testowych, odbiór funkcjonalności

## 10. Procedury raportowania błędów

- Zgłaszanie błędów w systemie issue tracker (np. GitHub Issues)
- Opis błędu: środowisko, kroki do odtworzenia, oczekiwany i rzeczywisty rezultat, zrzuty ekranu/logi
- Priorytetyzacja błędów: krytyczny, wysoki, średni, niski
- Weryfikacja naprawy przez QA przed zamknięciem zgłoszenia
- Regularne przeglądy statusu błędów na spotkaniach zespołu

<plan_testów>

Plan testów dla projektu 10xDevsFinalProject

1. Wprowadzenie i cele testowania
   Celem testowania jest zapewnienie wysokiej jakości, bezpieczeństwa oraz niezawodności aplikacji edukacyjnej opartej na frameworku Astro, React oraz Supabase. Testy mają na celu wykrycie defektów na wczesnym etapie, weryfikację zgodności z wymaganiami oraz zapewnienie pozytywnego doświadczenia użytkownika końcowego.

2. Zakres testów
   Zakres obejmuje:

Komponenty frontendowe (Astro, React, Shadcn/ui)
API (Astro endpoints, Supabase)
Integrację z bazą danych (Supabase)
Procesy autoryzacji i rejestracji użytkowników
Generowanie i zarządzanie fiszkami
Obsługę błędów i powiadomień
Middleware i logikę serwisową 3. Typy testów do przeprowadzenia
Testy jednostkowe (unit tests) – logika serwisów, walidacje, komponenty React
Testy integracyjne – komunikacja frontend-backend, API, interakcje z bazą danych
Testy end-to-end (E2E) – kluczowe ścieżki użytkownika (np. rejestracja, logowanie, generowanie fiszek)
Testy wydajnościowe – API, generowanie fiszek, operacje na bazie danych
Testy bezpieczeństwa – autoryzacja, zarządzanie sesją, dostęp do danych
Testy dostępności (a11y) – zgodność z ARIA, nawigacja klawiaturą, czytniki ekranu
Testy regresyjne – po każdej większej zmianie w kodzie 4. Scenariusze testowe dla kluczowych funkcjonalności
Autoryzacja i rejestracja
Poprawna rejestracja nowego użytkownika
Logowanie z poprawnymi i błędnymi danymi
Resetowanie hasła (poprawny i błędny e-mail)
Aktualizacja hasła po zalogowaniu
Obsługa błędów (np. nieprawidłowe dane, zablokowane konto)
Generowanie i zarządzanie fiszkami
Generowanie fiszek na podstawie tekstu wejściowego
Wyświetlanie listy wygenerowanych fiszek
Obsługa błędów generowania (np. przekroczenie limitu, błąd API)
Usuwanie i edycja fiszek
Interfejs użytkownika
Responsywność i poprawne wyświetlanie na różnych urządzeniach
Dostępność (nawigacja klawiaturą, ARIA)
Powiadomienia o błędach i sukcesach
API i integracja z bazą danych
Poprawność odpowiedzi endpointów (statusy, dane)
Walidacja danych wejściowych (zod)
Bezpieczeństwo endpointów (autoryzacja, dostęp do danych użytkownika)
Middleware i logika serwisowa
Poprawna obsługa ciasteczek i sesji
Middleware modyfikujące request/response 5. Środowisko testowe
Oddzielna baza testowa Supabase (lokalnie lub w chmurze)
Konfiguracja środowiska testowego w plikach .env
Symulacja środowisk produkcyjnych i deweloperskich
Przeglądarki: Chrome, Firefox, Edge (aktualne wersje)
Systemy operacyjne: Windows, macOS, Linux 6. Narzędzia do testowania
Unit/integration: Vitest, Jest, React Testing Library
E2E: Playwright lub Cypress
Linter: ESLint
Formatowanie: Prettier
Testy dostępności: axe-core, Lighthouse
Testy wydajnościowe: k6, Artillery
CI/CD: GitHub Actions (automatyzacja testów) 7. Harmonogram testów
Testy jednostkowe i integracyjne – na bieżąco podczas developmentu
Testy E2E – po zakończeniu kluczowych funkcjonalności
Testy wydajnościowe i bezpieczeństwa – przed wdrożeniem na produkcję
Testy regresyjne – po każdej większej zmianie w kodzie
Testy dostępności – przed wydaniem wersji produkcyjnej 8. Kryteria akceptacji testów
100% przejścia testów jednostkowych i integracyjnych dla kluczowych komponentów
Brak krytycznych i wysokich błędów w testach E2E
Brak regresji w funkcjonalnościach podstawowych
Spełnienie wymagań wydajnościowych (czasy odpowiedzi API, generowanie fiszek)
Zgodność z wytycznymi dostępności (WCAG 2.1 AA)
Zabezpieczenie danych użytkowników i poprawna autoryzacja 9. Role i odpowiedzialności w procesie testowania
QA Engineer: przygotowanie i realizacja scenariuszy testowych, raportowanie błędów
Developerzy: implementacja testów jednostkowych, naprawa wykrytych defektów
DevOps: konfiguracja środowisk testowych, automatyzacja testów w CI/CD
Product Owner: akceptacja kryteriów testowych, odbiór funkcjonalności 10. Procedury raportowania błędów
Zgłaszanie błędów w systemie issue tracker (np. GitHub Issues)
Opis błędu: środowisko, kroki do odtworzenia, oczekiwany i rzeczywisty rezultat, zrzuty ekranu/logi
Priorytetyzacja błędów: krytyczny, wysoki, średni, niski
Weryfikacja naprawy przez QA przed zamknięciem zgłoszenia
Regularne przeglądy statusu błędów na spotkaniach zespołu
</plan_testów>

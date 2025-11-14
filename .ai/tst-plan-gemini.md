# Kompleksowy Plan Testów dla Aplikacji do Generowania Fiszek

---

## 1. Wprowadzenie i cele testowania

### 1.1. Wprowadzenie

Niniejszy dokument przedstawia kompleksowy plan testów dla aplikacji do generowania fiszek, zbudowanej w oparciu o nowoczesny stos technologiczny obejmujący Astro, React, Supabase oraz Openrouter.ai. Celem projektu jest dostarczenie narzędzia, które umożliwia użytkownikom tworzenie fiszek ręcznie oraz automatyczne generowanie ich na podstawie dostarczonego tekstu z wykorzystaniem modeli AI.

Plan ten ma na celu usystematyzowanie procesu zapewnienia jakości (QA), identyfikację kluczowych obszarów do testowania oraz zdefiniowanie strategii, narzędzi i obowiązków w całym cyklu życia oprogramowania.

### 1.2. Cele testowania

Główne cele procesu testowania to:

- **Weryfikacja funkcjonalności:** Zapewnienie, że wszystkie funkcje aplikacji, w tym operacje CRUD na fiszkach i generacjach, działają zgodnie ze specyfikacją.
- **Zapewnienie niezawodności:** Sprawdzenie stabilności aplikacji, ze szczególnym uwzględnieniem integracji z usługami zewnętrznymi (Supabase, Openrouter.ai).
- **Identyfikacja i eliminacja defektów:** Wczesne wykrywanie i raportowanie błędów w celu minimalizacji ich wpływu na użytkownika końcowego.
- **Walidacja wydajności:** Ocena czasu odpowiedzi API, zwłaszcza dla operacji wymagających przetwarzania przez AI.
- **Weryfikacja integralności danych:** Upewnienie się, że dane są poprawnie zapisywane, aktualizowane i powiązane w bazie danych PostgreSQL.
- **Ocena użyteczności i wyglądu:** Sprawdzenie, czy interfejs użytkownika jest intuicyjny, responsywny i spójny wizualnie.

---

## 2. Zakres testów

### 2.1. Funkcjonalności objęte testami

- **Moduł generacji fiszek (Generations):**
  - Tworzenie nowej generacji na podstawie tekstu źródłowego.
  - Walidacja długości tekstu źródłowego.
  - Integracja z API Openrouter.ai.
  - Obsługa błędów i logowanie nieudanych generacji.
  - Pobieranie listy generacji i szczegółów pojedynczej generacji.
- **Moduł fiszek (Flashcards):**
  - Operacje CRUD (Create, Read, Update, Delete) na fiszkach.
  - Tworzenie fiszek ręczne, wygenerowanych przez AI oraz edytowanych przez użytkownika.
  - Walidacja typów danych i pól wymaganych (np. `source`).
  - Paginacja na liście fiszek.
- **Warstwa API:**
  - Testowanie wszystkich endpointów REST API (zgodność ze zdefiniowanymi DTO).
  - Weryfikacja kodów odpowiedzi HTTP.
  - Obsługa autentykacji i autoryzacji (zabezpieczenie dostępu do danych użytkownika).
- **Baza danych:**
  - Weryfikacja poprawności schematu bazy danych.
  - Sprawdzenie integralności referencyjnej (np. relacji między fiszkami a generacjami).
  - Poprawność zapisywanych typów danych.
- **Interfejs użytkownika (UI):**
  - Testowanie komponentów React (np. `button.tsx`).
  - Weryfikacja responsywności i wyglądu na różnych urządzeniach.
  - Spójność wizualna z systemem projektowym opartym na Tailwind CSS.

### 2.2. Funkcjonalności wyłączone z testów

- Bezpośrednie testowanie infrastruktury Supabase i Openrouter.ai (zakładamy ich niezawodność).
- Testy wydajnościowe bazowego serwera PostgreSQL (skupiamy się na wydajności zapytań generowanych przez aplikację).
- Szczegółowe testy przeglądarek nieobsługiwanych w wymaganiach projektu.

---

## 3. Typy testów do przeprowadzenia

W celu zapewnienia kompleksowego pokrycia testowego, przeprowadzone zostaną następujące typy testów:

| Typ testu                                  | Opis                                                                                                                                                       | Narzędzia                                   | Odpowiedzialność                      |
| :----------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------ | :------------------------------------ |
| **Testy jednostkowe (Unit Tests)**         | Weryfikacja pojedynczych funkcji i komponentów w izolacji, np. logika komponentu React `button`, funkcje pomocnicze w `lib/utils.ts`.                      | Vitest, React Testing Library               | Deweloperzy                           |
| **Testy integracyjne (Integration Tests)** | Testowanie interakcji pomiędzy modułami, np. komunikacja warstwy API z klientem Supabase, integracja middleware.                                           | Vitest, Supertest, Mock Service Worker      | Deweloperzy, Inżynierowie QA          |
| **Testy End-to-End (E2E)**                 | Symulacja pełnych przepływów użytkownika na poziomie API. Weryfikacja kompletnych scenariuszy, np. od wysłania tekstu do wygenerowania i zapisania fiszek. | Playwright, Cypress                         | Inżynierowie QA                       |
| **Testy wizualnej regresji**               | Automatyczne porównywanie zrzutów ekranu komponentów UI w celu wykrycia niezamierzonych zmian wizualnych.                                                  | Storybook z dodatkiem Chromatic, Playwright | Inżynierowie QA, Frontend Deweloperzy |
| **Testy wydajnościowe (API)**              | Pomiar czasu odpowiedzi endpointów API pod obciążeniem, ze szczególnym uwzględnieniem `POST /generations`.                                                 | k6, Apache JMeter                           | Inżynierowie QA                       |
| **Testy bezpieczeństwa**                   | Weryfikacja podstawowych aspektów bezpieczeństwa, takich jak ochrona endpointów i polityki RLS (Row Level Security) w Supabase.                            | Ręczna weryfikacja, skanery (np. OWASP ZAP) | Inżynierowie QA, Deweloperzy          |
| **Testy eksploracyjne**                    | Ręczne, kreatywne testowanie aplikacji w celu znalezienia nieoczywistych błędów i problemów z użytecznością.                                               | -                                           | Inżynierowie QA                       |

---

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Generowanie fiszek (API)

| ID Scenariusza | Opis                                                                                        | Oczekiwany rezultat                                                                                                                       | Priorytet |
| :------------- | :------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------- | :-------- |
| **TC-GEN-01**  | Pomyślne utworzenie generacji z poprawnym tekstem źródłowym.                                | Status `200 OK`, odpowiedź zawiera `generation_id` i proponowane fiszki. W bazie danych tworzony jest nowy rekord w tabeli `generations`. | Krytyczny |
| **TC-GEN-02**  | Próba utworzenia generacji z tekstem źródłowym poniżej wymaganego minimum.                  | Status `400 Bad Request` z komunikatem błędu o walidacji.                                                                                 | Wysoki    |
| **TC-GEN-03**  | Próba utworzenia generacji z tekstem źródłowym powyżej dozwolonego maksimum.                | Status `400 Bad Request` z komunikatem błędu o walidacji.                                                                                 | Wysoki    |
| **TC-GEN-04**  | Obsługa błędu po stronie API Openrouter.ai (np. nieprawidłowy klucz API, błąd serwera 5xx). | Status `502 Bad Gateway` lub podobny, błąd jest logowany w tabeli `generation_error_logs`.                                                | Wysoki    |
| **TC-GEN-05**  | Pobranie listy wszystkich generacji dla danego użytkownika.                                 | Status `200 OK`, odpowiedź zawiera listę generacji bez pola `user_id`.                                                                    | Średni    |
| **TC-GEN-06**  | Pobranie szczegółów pojedynczej generacji wraz z powiązanymi z nią fiszkami.                | Status `200 OK`, odpowiedź zawiera dane generacji oraz listę powiązanych fiszek.                                                          | Średni    |

### 4.2. Zarządzanie fiszkami (API)

| ID Scenariusza | Opis                                                                | Oczekiwany rezultat                                                                                     | Priorytet |
| :------------- | :------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------ | :-------- |
| **TC-FC-01**   | Pomyślne utworzenie jednej, ręcznie dodanej fiszki.                 | Status `201 Created`, odpowiedź zawiera dane utworzonej fiszki. W bazie danych pojawia się nowy rekord. | Krytyczny |
| **TC-FC-02**   | Pomyślne utworzenie wielu fiszek pochodzących z generacji AI.       | Status `201 Created`, odpowiedź zawiera listę utworzonych fiszek.                                       | Krytyczny |
| **TC-FC-03**   | Pomyślna aktualizacja istniejącej fiszki (zmiana `front` i `back`). | Status `200 OK`, zaktualizowane dane są poprawnie zapisane w bazie.                                     | Wysoki    |
| **TC-FC-04**   | Pobranie listy fiszek z użyciem paginacji (np. strona 2, limit 10). | Status `200 OK`, odpowiedź zawiera 10 fiszek z drugiej strony oraz metadane paginacji.                  | Wysoki    |
| **TC-FC-05**   | Próba utworzenia fiszki z nieprawidłową wartością w polu `source`.  | Status `400 Bad Request` z komunikatem o błędzie walidacji.                                             | Wysoki    |
| **TC-FC-06**   | Usunięcie istniejącej fiszki.                                       | Status `204 No Content`, rekord zostaje usunięty z bazy danych.                                         | Średni    |
| **TC-FC-07**   | Próba modyfikacji fiszki należącej do innego użytkownika.           | Status `403 Forbidden` lub `404 Not Found` (w zależności od implementacji polityki RLS).                | Krytyczny |

---

## 5. Środowisko testowe

Zostaną przygotowane trzy odizolowane środowiska w celu zapewnienia stabilności i powtarzalności testów.

| Środowisko                   | Opis                                                                           | Baza danych                               | Klucze API                 | Cel                                             |
| :--------------------------- | :----------------------------------------------------------------------------- | :---------------------------------------- | :------------------------- | :---------------------------------------------- |
| **Lokalne (Local)**          | Uruchamiane na maszynach deweloperów z wykorzystaniem lokalnego CLI Supabase.  | Lokalna instancja Supabase (Docker).      | Testowe klucze z limitami. | Testy jednostkowe, dewelopment.                 |
| **Testowe/Staging**          | Wdrożone na DigitalOcean z wykorzystaniem obrazu Docker. Zintegrowane z CI/CD. | Dedykowany, odizolowany projekt Supabase. | Dedykowane klucze testowe. | Testy integracyjne, E2E, UAT.                   |
| **Produkcyjne (Production)** | Środowisko dostępne dla użytkowników końcowych.                                | Produkcyjny projekt Supabase.             | Produkcyjne klucze API.    | Monitorowanie, testy typu "smoke" po wdrożeniu. |

---

## 6. Narzędzia do testowania

- **Framework testowy:** Vitest (dla testów jednostkowych i integracyjnych).
- **Biblioteki pomocnicze:** React Testing Library, Supertest, Mock Service Worker.
- **Testy E2E i regresja wizualna:** Playwright.
- **Testy wydajnościowe:** k6.
- **CI/CD:** GitHub Actions.
- **Zarządzanie kodem:** Git, GitHub.
- **Zarządzanie zadaniami i błędami:** GitHub Issues / Jira.
- **Dokumentacja API:** Swagger / OpenAPI.

---

## 7. Harmonogram testów

Testowanie będzie procesem ciągłym, zintegrowanym z cyklem rozwoju oprogramowania.

- **Testy jednostkowe i integracyjne:** Będą pisane przez deweloperów równolegle z tworzeniem nowych funkcjonalności i uruchamiane automatycznie w pipeline CI przy każdym pushu do repozytorium.
- **Testy E2E:** Będą uruchamiane automatycznie w pipeline CI/CD po każdym wdrożeniu na środowisko testowe.
- **Testy regresji:** Pełny cykl testów automatycznych i manualnych będzie przeprowadzany przed każdym wydaniem produkcyjnym.
- **Testy eksploracyjne:** Będą prowadzone na bieżąco na środowisku testowym przez zespół QA.

---

## 8. Kryteria akceptacji testów

### 8.1. Kryteria wejścia (rozpoczęcia testów)

- Kod źródłowy został pomyślnie zbudowany i wdrożony na środowisku testowym.
- Wszystkie testy jednostkowe i podstawowe testy integracyjne przechodzą pomyślnie.
- Dostępna jest dokumentacja dla testowanych funkcjonalności.

### 8.2. Kryteria wyjścia (zakończenia testów)

- Osiągnięto co najmniej 85% pokrycia kodu testami jednostkowymi dla krytycznych modułów.
- Wszystkie zaplanowane scenariusze testowe zostały wykonane.
- 100% testów automatycznych E2E kończy się sukcesem.
- Nie istnieją żadne nierozwiązane błędy o priorytecie krytycznym lub wysokim.
- Wszystkie błędy o niższym priorytecie są udokumentowane i zaakceptowane przez Product Ownera do ewentualnej naprawy w przyszłych iteracjach.

---

## 9. Role i odpowiedzialności w procesie testowania

| Rola                | Główne odpowiedzialności                                                                                                                                                                                                                                           |
| :------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deweloperzy**     | - Tworzenie i utrzymanie testów jednostkowych i integracyjnych.<br>- Naprawa błędów zgłoszonych przez zespół QA.<br>- Uczestnictwo w code review w celu zapewnienia jakości kodu.                                                                                  |
| **Inżynierowie QA** | - Projektowanie, tworzenie i utrzymanie planu testów oraz scenariuszy testowych.<br>- Automatyzacja testów E2E, wydajnościowych i wizualnej regresji.<br>- Wykonywanie testów manualnych i eksploracyjnych.<br>- Raportowanie i zarządzanie cyklem życia defektów. |
| **DevOps**          | - Konfiguracja i utrzymanie środowisk testowych.<br>- Integracja testów automatycznych z pipeline'em CI/CD.                                                                                                                                                        |
| **Product Owner**   | - Definiowanie kryteriów akceptacji dla funkcjonalności.<br>- Priorytetyzacja naprawy błędów.<br>- Ostateczna akceptacja produktu przed wdrożeniem.                                                                                                                |

---

## 10. Procedury raportowania błędów

Wszystkie wykryte błędy będą raportowane w dedykowanym systemie do śledzenia zadań (np. GitHub Issues). Każdy raport o błędzie musi zawierać następujące elementy:

- **Tytuł:** Zwięzły i jednoznaczny opis problemu.
- **Środowisko:** Wersja aplikacji, przeglądarka, system operacyjny, na którym wystąpił błąd.
- **Kroki do odtworzenia:** Szczegółowa, numerowana lista czynności prowadzących do wystąpienia błędu.
- **Rezultat oczekiwany:** Opis, jak aplikacja powinna się zachować.
- **Rezultat aktualny:** Opis faktycznego zachowania aplikacji.
- **Priorytet:** (Krytyczny, Wysoki, Średni, Niski) - określający wpływ błędu na działanie systemu.
- **Dotkliwość (Severity):** (Blokujący, Poważny, Drobny, Trywialny) - określająca techniczny wpływ błędu.
- **Załączniki:** Zrzuty ekranu, nagrania wideo, logi konsoli, które pomogą w diagnozie problemu.

Każdy zgłoszony błąd przejdzie przez cykl życia: `Nowy -> W analizie -> Do naprawy -> W trakcie naprawy -> Do weryfikacji -> Zamknięty / Ponownie otwarty`.

# 🔐 Jak uruchomić autentykację w aplikacji

## ✅ Co zostało zaimplementowane

Pełny system autentykacji Supabase z SSR (Server-Side Rendering) został zintegrowany:

### 1. **Backend (API Endpoints)**
- ✅ `POST /api/auth/login` - logowanie użytkownika
- ✅ `POST /api/auth/signup` - rejestracja nowego użytkownika
- ✅ `POST /api/auth/logout` - wylogowanie użytkownika
- ✅ `POST /api/auth/reset-password` - resetowanie hasła

### 2. **Middleware**
- ✅ Weryfikacja sesji użytkownika na każdej stronie
- ✅ Automatyczne przekierowanie do `/auth/login` dla niezalogowanych użytkowników
- ✅ Obsługa cookies i JWT tokenów z Supabase

### 3. **Frontend (Strony i Formularze)**
- ✅ `/auth/login` - strona logowania z pełną walidacją
- ✅ `/auth/signup` - strona rejestracji z walidacją hasła
- ✅ `/auth/reset-password` - strona resetowania hasła
- ✅ Wszystkie formularze połączone z prawdziwymi API endpoints

### 4. **Konfiguracja**
- ✅ `supabase.client.ts` z funkcją `createSupabaseServerInstance` dla SSR
- ✅ TypeScript types zaktualizowane (user w `Astro.locals`)
- ✅ Zmienne środowiskowe przygotowane

---

## 🚀 Jak uruchomić

### Krok 1: Skonfiguruj Supabase

1. **Utwórz projekt w Supabase:**
   - Przejdź na https://supabase.com
   - Zaloguj się i utwórz nowy projekt
   - Poczekaj na inicjalizację (może potrwać kilka minut)

2. **Pobierz credentials:**
   - W panelu projektu przejdź do **Settings** → **API**
   - Skopiuj:
     - **Project URL** (np. `https://xxxxx.supabase.co`)
     - **anon/public key** (długi klucz zaczynający się od `eyJ...`)

3. **Skonfiguruj Email Auth:**
   - W panelu przejdź do **Authentication** → **Providers**
   - Upewnij się, że **Email** jest włączony
   - Opcjonalnie dostosuj ustawienia potwierdzania email

### Krok 2: Utwórz plik `.env`

Skopiuj `.env.example` do `.env` i wypełnij danymi z Supabase:

```bash
cp .env.example .env
```

Edytuj `.env`:
```env
SUPABASE_URL=https://twoj-projekt.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENROUTER_API_KEY=twoj_klucz_openrouter
```

### Krok 3: Zainstaluj zależności (jeśli jeszcze nie)

```bash
npm install
```

### Krok 4: Uruchom aplikację

```bash
npm run dev
```

Aplikacja uruchomi się na http://localhost:3000

---

## 📝 Jak testować autentykację

### Test 1: Rejestracja nowego użytkownika
1. Przejdź na http://localhost:3000/auth/signup
2. Wprowadź email i hasło (min. 8 znaków)
3. Kliknij "Załóż konto"
4. Zostaniesz przekierowany/-a na stronę główną jako zalogowany użytkownik

### Test 2: Logowanie
1. Przejdź na http://localhost:3000/auth/login
2. Wprowadź email i hasło utworzone w teście 1
3. Kliknij "Zaloguj się"
4. Zostaniesz przekierowany/-a na stronę główną

### Test 3: Ochrona stron
1. Wyloguj się (kliknij przycisk "Wyloguj się" na stronie głównej)
2. Spróbuj przejść na http://localhost:3000/generate
3. Zostaniesz automatycznie przekierowany/-a na `/auth/login`

### Test 4: Reset hasła
1. Przejdź na http://localhost:3000/auth/reset-password
2. Wprowadź email
3. Kliknij "Wyślij instrukcje"
4. Sprawdź email - powinieneś otrzymać link do resetu hasła od Supabase

---

## 🔧 Jak działa system

### Przepływ logowania:
```
1. Użytkownik wypełnia formularz logowania
   ↓
2. Frontend wysyła POST /api/auth/login z { email, password }
   ↓
3. Backend weryfikuje dane z Supabase Auth
   ↓
4. Supabase ustawia cookies z JWT tokenem
   ↓
5. Frontend przekierowuje na stronę główną
   ↓
6. Middleware sprawdza token na każdej stronie
   ↓
7. Astro.locals.user zawiera dane użytkownika
```

### Middleware chroni wszystkie strony oprócz:
- `/auth/login`
- `/auth/signup`
- `/auth/reset-password`
- Wszystkie endpointy `/api/auth/*`

### Dane użytkownika dostępne w każdej stronie:
```typescript
// W pliku .astro
const { user } = Astro.locals;

if (user) {
  console.log(user.id);    // UUID użytkownika
  console.log(user.email); // Email użytkownika
}
```

---

## 🐛 Rozwiązywanie problemów

### Problem: "Missing required environment variables"
**Rozwiązanie:** Sprawdź czy plik `.env` istnieje i zawiera `SUPABASE_URL` oraz `SUPABASE_KEY`

### Problem: "Nieprawidłowy adres email lub hasło" przy poprawnych danych
**Rozwiązanie:** 
1. Sprawdź czy użytkownik istnieje w panelu Supabase (Authentication → Users)
2. Upewnij się, że email został potwierdzony (jeśli masz włączone potwierdzanie)

### Problem: Przekierowanie do /auth/login w kółko
**Rozwiązanie:** 
1. Wyczyść cookies przeglądarki
2. Sprawdź czy cookies są ustawiane poprawnie (DevTools → Application → Cookies)

### Problem: CORS errors
**Rozwiązanie:** Upewnij się, że w Supabase (Settings → API) masz dodany `http://localhost:3000` do dozwolonych domen

---

## 📚 Następne kroki

Teraz możesz:

1. **Dodać więcej pól do profilu użytkownika:**
   - Utwórz tabelę `profiles` w Supabase
   - Dodaj kolumny jak `display_name`, `avatar_url`, etc.
   - Zaktualizuj typy w `database.types.ts`

2. **Zabezpieczyć endpointy API:**
   ```typescript
   // W pliku API endpoint
   const { user } = Astro.locals;
   if (!user) {
     return new Response(JSON.stringify({ error: "Unauthorized" }), {
       status: 401,
     });
   }
   ```

3. **Dodać role użytkowników:**
   - Wykorzystaj Supabase RLS (Row Level Security)
   - Utwórz custom claims w JWT

4. **Zintegrować z istniejącymi features:**
   - Zapisywanie fiszek tylko dla zalogowanych użytkowników
   - Historia generacji per użytkownik
   - Prywatne kolekcje

---

## 📖 Dokumentacja

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Astro SSR Guide](https://docs.astro.build/en/guides/server-side-rendering/)
- [@supabase/ssr Package](https://github.com/supabase/ssr)

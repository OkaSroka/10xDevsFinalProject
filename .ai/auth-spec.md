# Authentication & Registration Module Specification

## 1. User Interface Architecture

### 1.1 Layout & Entry Point (`src/pages/index.astro`)

- Keeps navigation, typography, and footer consistent across the app.
- Injects the authenticated user (if present) into the React tree so the `authStore` (Zustand) can hydrate before client-side interactivity takes over.
- Hosts the `Topbar`, `TwoPane`, and `CollectionsSidebar` components, ensuring their props stay in sync with the global auth state.

### 1.2 `Topbar` (`src/components/Topbar.tsx`)

- Shows the logo and the `10xRules` title alongside action buttons.
- When no user is signed in, renders **Log in** and **Sign up** CTAs that route to the Astro auth pages.
- When a user session exists, swaps those actions for a **Log out** button and exposes user-specific quick actions as needed.
- Receives the authenticated user as a prop from the page, ensuring the `authStore` initializes with the same data both on the server and the client.

### 1.3 `TwoPane` (`src/components/TwoPane.tsx`)

- Splits the main workspace into the **RuleBuilder** (left) and **RulePreview** (right) panes.
- Reacts to global auth changes (e.g., showing read-only previews for anonymous visitors if business logic requires).

### 1.4 `CollectionsSidebar` (`src/components/CollectionsSidebar.tsx`)

- Lists saved rule collections (US-003 scope) once the user is authenticated.
- In anonymous mode, either displays a call-to-action such as "Sign in to view your collections" or exposes a trimmed-down sample view.
- Uses the `authStore` to determine whether to unlock full CRUD capabilities for collections.

## 2. Authorization UI Elements & Interactions

### 2.1 Dedicated Auth Pages

- New Astro routes under `src/pages/auth/` (`login.astro`, `signup.astro`, `reset-password.astro`) mount React forms.
- Each page bootstraps the shared `authStore`, so returning to the main workspace reflects the updated session instantly.

### 2.2 Sign-up Form Requirements

- **Email**: mandatory, validated for proper format.
- **Password**: minimum 8 characters with client-side hints; server re-validates.
- **Confirm password**: must match the password before enabling submission.

### 2.3 Login Form Requirements

- Requires an email plus password pair.
- Provides inline errors for empty fields or invalid combinations returned by the API.

### 2.4 State-driven UI Reactions

- On successful login or sign-up, the shared auth store updates session details.
- `Topbar` swaps to the Log out action; `CollectionsSidebar` enables its management controls.
- Failed attempts surface consistent Tailwind-styled alerts (dark-mode friendly, Fluent 2.0 spacing and colors).

## 3. Validation & Error Messaging

### 3.1 Client-side

- Validate non-empty, correctly formatted emails before issuing requests.
- Enforce password length (>=8 chars) and confirmation equality.
- Display inline helper text:
  - "Nieprawidłowy adres email."
  - "Hasło musi zawierać co najmniej 8 znaków."
  - "Hasła nie pasują do siebie."

### 3.2 Server-side

- Use schema validation (Zod or equivalent) to reject malformed payloads with HTTP 400.
- Sign-up enforces unique emails; responds with "Konto z tym adresem email już istnieje."
- Login failures respond with "Nieprawidłowy adres email lub hasło." without revealing which field failed.
- Errors bubble back as JSON `{ status, code, message }`, enabling UI components to map them to localized copy.

## 4. Backend Logic

### 4.1 API Surface (`src/pages/api/auth/`)

- `POST /api/auth/signup`: creates a Supabase Auth user and seeds any app-specific metadata.
- `POST /api/auth/login`: performs credential login; returns session tokens/cookies.
- `POST /api/auth/logout`: revokes the Supabase session and clears auth cookies.
- `POST /api/auth/reset-password`: triggers password reset emails through Supabase.

### 4.2 Data Model

- Relies on Supabase Auth for identity primitives (`id`, `email`, password hash, verification state).
- Any domain-specific profile data should live in a companion table keyed by `user_id`.

### 4.3 Input Validation Pipeline

- Centralize Zod schemas per endpoint to guarantee parity between client and server validation.
- Map schema parsing failures to descriptive `400` responses with per-field details where helpful.

### 4.4 Error Handling

- Wrap each API handler in `try/catch`; log unexpected exceptions with enough context (request id, user id) for triage.
- Never leak stack traces to the client; reuse the structured error envelope consumed by the UI.

## 5. Authentication System

### 5.1 Supabase Auth Flows

- **Sign-up**: `supabase.auth.signUp({ email, password })`; optionally request email verification based on project policy.
- **Login**: `supabase.auth.signInWithPassword({ email, password })`; translate Supabase errors into the standardized API responses.
- **Logout**: `supabase.auth.signOut()`; ensure the global store clears its session snapshot.
- **Password reset**: `supabase.auth.resetPasswordForEmail(email)`; show success confirmation regardless of account existence to prevent enumeration.

### 5.2 Astro Integration & State Management

- Server-rendered pages fetch the current session (Supabase server client + cookies) and pass the user down as props.
- Middleware (`src/middleware/index.ts`) guards protected routes by verifying a valid JWT/session before allowing access.
- Zustand `authStore` keeps `{ user, session, status }`; hydration happens once on page load to avoid flicker between server and client states.
- `Topbar`, `CollectionsSidebar`, and other components subscribe to the store via selectors to keep re-renders scoped.

### 5.3 Security Considerations

- All traffic is served over HTTPS; Supabase client is configured to reject insecure origins.
- Store JWT/session tokens in HTTP-only, `Secure` cookies with `SameSite=Lax` (or `Strict` if feasible) to mitigate XSS/CSRF.
- Apply CSRF protections to form submissions (e.g., double-submit cookie pattern) and sanitize all user-facing strings.
- Do not integrate third-party identity providers per US-004 -- email/password remains the sole path.

## 6. Enhancement Opportunities

1. **Progressive disclosure in `CollectionsSidebar`**: show anonymized sample collections with blurred actions to better communicate locked features.
2. **Session persistence banner**: if a session is close to expiring, prompt the user to refresh, reducing surprise logouts during rule editing.
3. **Observability hooks**: add structured logs/metrics around auth events (success, failure, reset) to spot abuse or onboarding friction early.

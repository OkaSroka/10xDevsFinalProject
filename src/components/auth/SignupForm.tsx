import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { PASSWORD_MIN_LENGTH } from "./constants";
import { validateEmail, validatePassword } from "./validation";

type FormStatus =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

export function SignupForm() {
  const [values, setValues] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [didSubmit, setDidSubmit] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validationErrors = useMemo(() => {
    const confirmPasswordError = (() => {
      if (!values.confirmPassword.trim()) {
        return "Potwierdź swoje hasło.";
      }
      if (values.confirmPassword !== values.password) {
        return "Hasła muszą być takie same.";
      }
      return "";
    })();

    return {
      email: validateEmail(values.email),
      password: validatePassword(values.password),
      confirmPassword: confirmPasswordError,
    };
  }, [values]);

  const isValid = Object.values(validationErrors).every((error) => !error);

  const shouldShowError = (field: keyof typeof validationErrors) =>
    (touched[field] || didSubmit) && Boolean(validationErrors[field]);

  const handleChange =
    (field: keyof typeof values) => (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleBlur = (field: keyof typeof touched) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDidSubmit(true);

    if (!isValid) {
      setStatus({
        type: "error",
        message: "Sprawdź wymagane pola i popraw zaznaczone błędy.",
      });
      return;
    }

    setStatus({ type: "idle" });
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.error || "Wystąpił błąd podczas rejestracji.",
        });
        setIsSubmitting(false);
        return;
      }

      setStatus({
        type: "success",
        message:
          "Konto utworzone pomyślnie! Sprawdź swoją skrzynkę email i potwierdź adres, aby się zalogować.",
      });
      setIsSubmitting(false);
    } catch {
      setStatus({
        type: "error",
        message: "Wystąpił błąd połączenia. Spróbuj ponownie później.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="signup-title" data-test-id="signup-form-section">
      <Card className="bg-transparent px-5" data-test-id="signup-form-card">
        <CardHeader className="px-0 pt-0">
          <CardTitle
            id="signup-title"
            className="text-2xl font-semibold text-white"
          >
            Stwórz konto 10xRules
          </CardTitle>
          <CardDescription className="text-base text-slate-300">
            Rejestracja daje dostęp do indywidualnych kolekcji fiszek i historii
            generowania.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-0 pb-0">
          {status.type !== "idle" && (
            <Alert
              data-test-id="signup-form-status"
              variant={status.type === "error" ? "destructive" : "default"}
              className="bg-white/5 text-slate-100"
            >
              <AlertTitle>
                {status.type === "error"
                  ? "Nie udało się zweryfikować danych"
                  : "Formularz zwalidowany"}
              </AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          <form
            className="space-y-5"
            data-test-id="signup-form"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <label
                htmlFor="signup-email"
                className="text-sm font-medium text-white"
              >
                Adres email
              </label>
              <Input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nazwa@firma.com"
                value={values.email}
                data-test-id="signup-email-input"
                onChange={handleChange("email")}
                onBlur={handleBlur("email")}
                aria-invalid={shouldShowError("email")}
                aria-describedby="signup-email-helper"
              />
              <p
                id="signup-email-helper"
                className={`text-sm ${shouldShowError("email") ? "text-rose-300" : "text-slate-400"}`}
              >
                {shouldShowError("email")
                  ? validationErrors.email
                  : "Utworzymy konto Supabase powiazane z tym adresem."}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="signup-password"
                className="text-sm font-medium text-white"
              >
                Hasło
              </label>
              <div className="relative">
                <Input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Wybierz hasło"
                  value={values.password}
                  data-test-id="signup-password-input"
                  onChange={handleChange("password")}
                  onBlur={handleBlur("password")}
                  aria-invalid={shouldShowError("password")}
                  aria-describedby="signup-password-helper"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <p
                id="signup-password-helper"
                className={`text-sm ${shouldShowError("password") ? "text-rose-300" : "text-slate-400"}`}
              >
                {shouldShowError("password")
                  ? validationErrors.password
                  : `Hasło powinno mieć min. ${PASSWORD_MIN_LENGTH} znaków.`}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="signup-password-confirm"
                className="text-sm font-medium text-white"
              >
                Potwierdź hasło
              </label>
              <div className="relative">
                <Input
                  id="signup-password-confirm"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Powtórz hasło"
                  value={values.confirmPassword}
                  data-test-id="signup-confirm-password-input"
                  onChange={handleChange("confirmPassword")}
                  onBlur={handleBlur("confirmPassword")}
                  aria-invalid={shouldShowError("confirmPassword")}
                  aria-describedby="signup-password-confirm-helper"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  aria-label={
                    showConfirmPassword ? "Ukryj hasło" : "Pokaż hasło"
                  }
                >
                  {showConfirmPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <p
                id="signup-password-confirm-helper"
                className={`text-sm ${shouldShowError("confirmPassword") ? "text-rose-300" : "text-slate-400"}`}
              >
                {shouldShowError("confirmPassword")
                  ? validationErrors.confirmPassword
                  : "Upewnimy się, że oba hasła są identyczne."}
              </p>
            </div>

            <Button
              type="submit"
              data-test-id="signup-submit-button"
              className="cursor-pointer w-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:translate-y-0.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Tworzenie konta..." : "Załóż konto"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-400">
            Masz juz konto?{" "}
            <a
              href="/auth/login"
              className="font-semibold text-white hover:text-cyan-200"
            >
              Zaloguj się
            </a>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

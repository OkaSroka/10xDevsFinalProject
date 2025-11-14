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

import { validateEmail, validatePassword } from "./validation";

type FormStatus =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

export function LoginForm() {
  const [values, setValues] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [didSubmit, setDidSubmit] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationErrors = useMemo(
    () => ({
      email: validateEmail(values.email),
      password: validatePassword(values.password),
    }),
    [values],
  );

  const isValid = Object.values(validationErrors).every(
    (errorMessage) => !errorMessage,
  );

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
        message: "Sprawdź zaznaczone pola i popraw błędy walidacji.",
      });
      return;
    }

    setStatus({ type: "idle" });
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
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
          message: data.error || "Wystąpił błąd podczas logowania.",
        });
        setIsSubmitting(false);
        return;
      }

      setStatus({
        type: "success",
        message: "Zalogowano pomyślnie! Przekierowanie...",
      });

      // Redirect to main page after successful login
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (error) {
      setStatus({
        type: "error",
        message: "Wystąpił błąd połączenia. Spróbuj ponownie później.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="login-title" data-test-id="login-form-section">
      <Card className="bg-transparent px-5" data-test-id="login-form-card">
        <CardHeader className="px-0 pt-0">
          <CardTitle
            id="login-title"
            className="text-2xl font-semibold text-white"
          >
            Witaj ponownie
          </CardTitle>
          <CardDescription className="text-base text-slate-300">
            Zaloguj się, aby kontynuować pracę nad swoimi kolekcjami i
            generacjami fiszek.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-0 pb-0">
          {status.type !== "idle" && (
            <Alert
              data-test-id="login-form-status"
              variant={status.type === "error" ? "destructive" : "default"}
              className="bg-white/5 text-slate-100"
            >
              <AlertTitle>
                {status.type === "error"
                  ? "Nie udało się wysłać formularza"
                  : "Formularz gotowy"}
              </AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          <form
            className="space-y-5"
            data-test-id="login-form"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <label
                htmlFor="login-email"
                className="text-sm font-medium text-white"
              >
                Adres email
              </label>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ty@10xrules.dev"
                value={values.email}
                data-test-id="login-email-input"
                aria-invalid={shouldShowError("email")}
                aria-describedby="login-email-helper"
                onChange={handleChange("email")}
                onBlur={handleBlur("email")}
              />
              <p
                id="login-email-helper"
                className={`text-sm ${shouldShowError("email") ? "text-rose-300" : "text-slate-400"}`}
              >
                {shouldShowError("email")
                  ? validationErrors.email
                  : "Używamy adresu email jako identyfikatora konta."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-white"
                >
                  Hasło
                </label>
                <a
                  href="/auth/reset-password"
                  className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
                >
                  Zapomniałeś hasła?
                </a>
              </div>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Twoje hasło"
                value={values.password}
                data-test-id="login-password-input"
                aria-invalid={shouldShowError("password")}
                aria-describedby="login-password-helper"
                onChange={handleChange("password")}
                onBlur={handleBlur("password")}
              />
              <p
                id="login-password-helper"
                className={`text-sm ${shouldShowError("password") ? "text-rose-300" : "text-slate-400"}`}
              >
                {shouldShowError("password")
                  ? validationErrors.password
                  : "Hasło musi mieć minimum 8 znaków."}
              </p>
            </div>

            <Button
              type="submit"
              data-test-id="login-submit-button"
              className="cursor-pointer w-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:translate-y-0.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logowanie..." : "Zaloguj się"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-400">
            Nie masz jeszcze konta?{" "}
            <a
              href="/auth/signup"
              className="font-semibold text-white hover:text-cyan-200"
            >
              Zarejestruj się
            </a>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

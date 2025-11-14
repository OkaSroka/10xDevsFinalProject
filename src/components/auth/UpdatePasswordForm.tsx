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
import { validatePassword } from "./validation";

type FormStatus =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

export function UpdatePasswordForm() {
  const [values, setValues] = useState({ password: "", confirmPassword: "" });
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });
  const [didSubmit, setDidSubmit] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationErrors = useMemo(() => {
    const passwordError = validatePassword(values.password);
    let confirmPasswordError = "";

    if (!values.confirmPassword) {
      confirmPasswordError = "Potwierdź swoje hasło.";
    } else if (values.password !== values.confirmPassword) {
      confirmPasswordError = "Hasła muszą być takie same.";
    }

    return {
      password: passwordError,
      confirmPassword: confirmPasswordError,
    };
  }, [values]);

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
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.error || "Wystąpił błąd podczas zmiany hasła.",
        });
        setIsSubmitting(false);
        return;
      }

      setStatus({
        type: "success",
        message: "Hasło zmienione pomyślnie! Przekierowanie do logowania...",
      });

      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
    } catch {
      setStatus({
        type: "error",
        message: "Wystąpił błąd połączenia. Spróbuj ponownie później.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="update-password-title"
      data-test-id="update-password-form-section"
    >
      <Card className="bg-transparent px-5" data-test-id="update-password-form-card">
        <CardHeader className="px-0 pt-0">
          <CardTitle
            id="update-password-title"
            className="text-2xl font-semibold text-white"
          >
            Ustaw nowe hasło
          </CardTitle>
          <CardDescription className="text-base text-slate-300">
            Wprowadź nowe hasło dla swojego konta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-0 pb-0">
          {status.type !== "idle" && (
            <Alert
              data-test-id="update-password-form-status"
              variant={status.type === "error" ? "destructive" : "default"}
              className="bg-white/5 text-slate-100"
            >
              <AlertTitle>
                {status.type === "error"
                  ? "Nie udało się zmienić hasła"
                  : "Hasło zmienione"}
              </AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          <form
            className="space-y-5"
            data-test-id="update-password-form"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <label
                htmlFor="new-password"
                className="text-sm font-medium text-white"
              >
                Nowe hasło
              </label>
              <Input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Wprowadź nowe hasło"
                value={values.password}
                data-test-id="update-password-new-input"
                aria-invalid={shouldShowError("password")}
                aria-describedby="new-password-helper"
                onChange={handleChange("password")}
                onBlur={handleBlur("password")}
              />
              <p
                id="new-password-helper"
                className={`text-sm ${shouldShowError("password") ? "text-rose-300" : "text-slate-400"}`}
              >
                {shouldShowError("password")
                  ? validationErrors.password
                  : `Hasło powinno mieć min. ${PASSWORD_MIN_LENGTH} znaków.`}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirm-password"
                className="text-sm font-medium text-white"
              >
                Potwierdź hasło
              </label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Powtórz hasło"
                value={values.confirmPassword}
                data-test-id="update-password-confirm-input"
                aria-invalid={shouldShowError("confirmPassword")}
                aria-describedby="confirm-password-helper"
                onChange={handleChange("confirmPassword")}
                onBlur={handleBlur("confirmPassword")}
              />
              <p
                id="confirm-password-helper"
                className={`text-sm ${shouldShowError("confirmPassword") ? "text-rose-300" : "text-slate-400"}`}
              >
                {shouldShowError("confirmPassword")
                  ? validationErrors.confirmPassword
                  : "Upewnimy się, że oba hasła są identyczne."}
              </p>
            </div>

            <Button
              type="submit"
              data-test-id="update-password-submit-button"
              className="w-full cursor-pointer rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-base font-semibold text-white transition hover:translate-y-0.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Zmieniam hasło..." : "Zmień hasło"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

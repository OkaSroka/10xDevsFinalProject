import type { FormEvent } from "react";
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

import { validateEmail } from "./validation";

type FormStatus =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [didSubmit, setDidSubmit] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailError = useMemo(() => validateEmail(email), [email]);
  const isValid = !emailError;
  const shouldShowError = (touched || didSubmit) && Boolean(emailError);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDidSubmit(true);

    if (!isValid) {
      setStatus({
        type: "error",
        message: "Podaj poprawny adres email, aby wysłać instrukcje resetu.",
      });
      return;
    }

    setStatus({ type: "idle" });
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.error || "Wystąpił błąd podczas wysyłania instrukcji.",
        });
        setIsSubmitting(false);
        return;
      }

      setStatus({
        type: "success",
        message:
          data.message ||
          "Jeśli konto istnieje, wyślemy bezpieczny link resetujący na podany adres.",
      });
      setIsSubmitting(false);
    } catch (error) {
      setStatus({
        type: "error",
        message: "Wystąpił błąd połączenia. Spróbuj ponownie później.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="reset-password-title">
      <Card className="bg-transparent px-5">
        <CardHeader className="px-0 pt-0">
          <CardTitle
            id="reset-password-title"
            className="text-2xl font-semibold text-white"
          >
            Odzyskaj dostep
          </CardTitle>
          <CardDescription className="text-base text-slate-300">
            Wpisz adres email powiązany z kontem. Wyślemy instrukcje resetu
            hasła.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-0 pb-0">
          {status.type !== "idle" && (
            <Alert
              variant={status.type === "error" ? "destructive" : "default"}
              className="bg-white/5 text-slate-100"
            >
              <AlertTitle>
                {status.type === "error"
                  ? "Nie udało się wysłać instrukcji"
                  : "Sprawdź swoją skrzynkę"}
              </AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          <form className="space-y-5" noValidate onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="reset-email"
                className="text-sm font-medium text-white"
              >
                Adres email
              </label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="twoj.email@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={shouldShowError}
                aria-describedby="reset-email-helper"
              />
              <p
                id="reset-email-helper"
                className={`text-sm ${shouldShowError ? "text-rose-300" : "text-slate-400"}`}
              >
                {shouldShowError
                  ? emailError
                  : "Instrukcja resetu zostanie wysłana, jeśli email jest w bazie."}
              </p>
            </div>

            <Button
              type="submit"
              className="cursor-pointer w-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:translate-y-0.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Wysyłanie..." : "Wyślij instrukcje"}
            </Button>
          </form>

          <div className="flex flex-col gap-2 text-center text-sm text-slate-400">
            <a
              href="/auth/login"
              className="font-semibold text-white hover:text-cyan-200"
            >
              Wróć do logowania
            </a>
            <a
              href="/auth/signup"
              className="font-semibold text-white/80 hover:text-cyan-200"
            >
              Potrzebujesz nowego konta?
            </a>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

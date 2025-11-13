import { useEffect, useId, useMemo, useState, type ChangeEvent } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type TextInputValidationStatus =
  | "idle"
  | "too-short"
  | "too-long"
  | "valid";

export interface TextInputValidationState {
  isValid: boolean;
  status: TextInputValidationStatus;
  charactersCount: number;
  charactersRemaining: number;
}

interface TextInputAreaProps {
  value: string;
  onChange: (nextValue: string) => void;
  minCharacters: number;
  maxCharacters: number;
  placeholder?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  onValidityChange?: (state: TextInputValidationState) => void;
}

export function TextInputArea({
  value,
  onChange,
  minCharacters,
  maxCharacters,
  placeholder = "Wklej tutaj zrodlowy tekst...",
  label = "Tekst zrodlowy",
  description = "Wymagana dlugosc tekstu to od 1000 do 10000 znakow. Najlepiej dziala dobrze sformatowany fragment notatek lub artykulu.",
  disabled = false,
  onValidityChange,
}: TextInputAreaProps) {
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  const helperId = `${inputId}-helper`;
  const [touched, setTouched] = useState(false);

  const normalizedValue = value.trim();
  const charactersCount = normalizedValue.length;

  const status: TextInputValidationStatus =
    charactersCount === 0
      ? "idle"
      : charactersCount < minCharacters
        ? "too-short"
        : charactersCount > maxCharacters
          ? "too-long"
          : "valid";

  const validationState = useMemo<TextInputValidationState>(
    () => ({
      isValid: status === "valid",
      status,
      charactersCount,
      charactersRemaining: maxCharacters - charactersCount,
    }),
    [charactersCount, maxCharacters, status],
  );

  useEffect(() => {
    onValidityChange?.(validationState);
  }, [onValidityChange, validationState]);

  const helperMessage = useMemo(() => {
    if (status === "idle") {
      return `Wklej tekst o dlugosci ${minCharacters.toLocaleString(
        "pl-PL",
      )} - ${maxCharacters.toLocaleString("pl-PL")} znakow, aby rozpoczac.`;
    }

    if (status === "too-short") {
      const missing = minCharacters - charactersCount;
      return `Brakuje ${missing.toLocaleString(
        "pl-PL",
      )} znakow do minimalnej dlugosci.`;
    }

    if (status === "too-long") {
      const excess = charactersCount - maxCharacters;
      return `Usun ${excess.toLocaleString(
        "pl-PL",
      )} znakow, aby zmiescic sie w limicie.`;
    }

    return "Swietnie! Tekst spelnia wymagania dla generowania fiszek.";
  }, [charactersCount, maxCharacters, minCharacters, status]);

  const characterLabel = useMemo(() => {
    return `${charactersCount.toLocaleString("pl-PL")} znakow`;
  }, [charactersCount]);

  const showError =
    status === "too-long" || (status === "too-short" && touched);

  const fieldTone = useMemo(() => {
    if (status === "valid") {
      return "border-emerald-400/60 focus-visible:ring-emerald-300/30";
    }

    if (showError) {
      return "border-rose-400/70 focus-visible:ring-rose-300/30";
    }

    return "border-white/10 focus-visible:ring-cyan-300/20";
  }, [showError, status]);

  const helperTone = useMemo(() => {
    if (status === "valid") {
      return "text-emerald-200";
    }

    if (showError) {
      return "text-rose-200";
    }

    return "text-slate-300";
  }, [showError, status]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const describedBy = `${descriptionId} ${helperId}`;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-200"
        >
          {label}
        </label>
        <span className="text-xs text-slate-400">{characterLabel}</span>
      </div>

      <Textarea
        id={inputId}
        className={cn(
          "min-h-[360px] resize-none rounded-2xl bg-slate-950/40 text-base leading-relaxed text-white shadow-[inset_0_1px_24px_rgba(15,23,42,0.65)]",
          fieldTone,
          disabled && "cursor-not-allowed opacity-75",
        )}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        spellCheck
        disabled={disabled}
        aria-invalid={showError}
        aria-describedby={describedBy}
      />

      <p id={descriptionId} className="text-sm text-slate-300">
        {description}
      </p>
      <p
        id={helperId}
        className={`text-sm font-medium ${helperTone}`}
        aria-live="polite"
      >
        {helperMessage}
      </p>
    </div>
  );
}

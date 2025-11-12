import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GenerateButtonProps
  extends Pick<ComponentProps<typeof Button>, "className"> {
  disabled?: boolean;
  isLoading?: boolean;
  onClick?: () => void | Promise<void>;
}

export function GenerateButton({
  disabled,
  isLoading,
  onClick,
  className,
}: GenerateButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "h-12 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-6 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110",
        className,
      )}
      aria-live="polite"
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          Generowanie...
        </>
      ) : (
        "Generuj fiszki"
      )}
    </Button>
  );
}

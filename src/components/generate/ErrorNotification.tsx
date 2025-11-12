import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ErrorNotificationVariant = "error" | "success" | "info";

interface ErrorNotificationProps {
  title?: string;
  message: string;
  description?: string;
  variant?: ErrorNotificationVariant;
  action?: ReactNode;
}

const VARIANT_STYLES: Record<
  ErrorNotificationVariant,
  {
    icon: typeof AlertTriangle;
    container: string;
    accent: string;
  }
> = {
  error: {
    icon: AlertTriangle,
    container:
      "border-rose-400/50 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent text-rose-100",
    accent: "text-rose-200",
  },
  success: {
    icon: CheckCircle,
    container:
      "border-emerald-400/40 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent text-emerald-100",
    accent: "text-emerald-200",
  },
  info: {
    icon: Info,
    container:
      "border-cyan-400/40 bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent text-cyan-100",
    accent: "text-cyan-200",
  },
};

export function ErrorNotification({
  title,
  message,
  description,
  variant = "error",
  action,
}: ErrorNotificationProps) {
  const config = VARIANT_STYLES[variant];
  const Icon = config.icon;
  const ariaLive = variant === "error" ? "assertive" : "polite";

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={ariaLive}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm shadow-inner shadow-black/30 sm:flex-row sm:items-center sm:justify-between",
        config.container,
      )}
    >
      <div className="flex flex-1 items-start gap-3">
        <Icon className={`mt-0.5 size-5 ${config.accent}`} aria-hidden="true" />
        <div className="space-y-1">
          {title && (
            <p className="text-xs uppercase tracking-[0.3em]">{title}</p>
          )}
          <p className="font-medium">{message}</p>
          {description && (
            <p className="text-xs text-white/80">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

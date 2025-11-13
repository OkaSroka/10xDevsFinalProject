import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    alertVariant?: "default" | "destructive";
    className: string;
  }
> = {
  error: {
    icon: AlertTriangle,
    alertVariant: "destructive",
    className:
      "border-rose-400/50 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent text-rose-100",
  },
  success: {
    icon: CheckCircle,
    className:
      "border-emerald-400/40 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent text-emerald-100",
  },
  info: {
    icon: Info,
    className:
      "border-cyan-400/40 bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent text-cyan-100",
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

  return (
    <Alert
      variant={config.alertVariant}
      className={cn(
        "rounded-2xl shadow-inner shadow-black/30",
        config.className,
      )}
    >
      <Icon className="size-5" />
      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          {title && (
            <AlertTitle className="text-xs uppercase tracking-[0.3em]">
              {title}
            </AlertTitle>
          )}
          <AlertDescription className="font-medium">{message}</AlertDescription>
          {description && (
            <p className="text-xs text-white/80">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </Alert>
  );
}

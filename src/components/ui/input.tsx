import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-lg border border-white/10 bg-white/5 px-4 text-base text-white placeholder:text-slate-400 shadow-inner shadow-black/20 transition focus-visible:border-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive/70 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
});

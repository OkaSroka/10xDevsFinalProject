import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkSaveButtonProps {
  totalCount: number;
  acceptedCount: number;
  isSaving?: boolean;
  disabled?: boolean;
  onSaveAll: () => void;
  onSaveAccepted: () => void;
}

export function BulkSaveButton({
  totalCount,
  acceptedCount,
  isSaving,
  disabled,
  onSaveAll,
  onSaveAccepted,
}: BulkSaveButtonProps) {
  const savingContent = (
    <>
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      Zapisuje...
    </>
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-white">
          Lacznie propozycji: {totalCount}
        </p>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Do zapisu: {acceptedCount}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className={cn(
            "bg-emerald-500 hover:bg-emerald-500/90",
            acceptedCount === 0 && "opacity-70",
          )}
          disabled={disabled || isSaving || acceptedCount === 0}
          onClick={onSaveAccepted}
        >
          {isSaving ? savingContent : "Zapisz zaakceptowane"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || isSaving || totalCount === 0}
          onClick={onSaveAll}
        >
          {isSaving ? savingContent : "Zapisz wszystkie"}
        </Button>
      </div>
    </div>
  );
}

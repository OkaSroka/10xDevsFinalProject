import { CheckCircle2, Edit3, Save, Undo2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  FLASHCARD_BACK_MAX_LENGTH,
  FLASHCARD_FRONT_MAX_LENGTH,
} from "@/lib/flashcard.schema";
import { cn } from "@/lib/utils";

import type { FlashcardProposalViewModel } from "./types";

interface FlashcardListItemProps {
  index: number;
  proposal: FlashcardProposalViewModel;
  onToggleAccept: (id: string) => void;
  onReject: (id: string) => void;
  onStartEdit: (id: string) => void;
  onCancelEdit: (id: string) => void;
  onSaveEdit: (id: string) => void;
  onDraftChange: (id: string, draft: { front?: string; back?: string }) => void;
}

export function FlashcardListItem({
  index,
  proposal,
  onToggleAccept,
  onReject,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftChange,
}: FlashcardListItemProps) {
  const statusLabel =
    proposal.status === "accepted" ? "Do zapisu" : "Oczekujaca";

  const statusTone =
    proposal.status === "accepted"
      ? "text-emerald-300 border-emerald-300/30 bg-emerald-500/5"
      : "text-slate-300 border-white/10 bg-white/5";

  const editingControls = proposal.isEditing ? (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        onClick={() => onSaveEdit(proposal.id)}
        className="bg-emerald-500 hover:bg-emerald-500/90"
      >
        <Save className="size-4" />
        Zapisz
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onCancelEdit(proposal.id)}
      >
        <Undo2 className="size-4" />
        Anuluj
      </Button>
    </div>
  ) : (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={proposal.status === "accepted" ? "secondary" : "default"}
        onClick={() => onToggleAccept(proposal.id)}
        disabled={proposal.isEditing}
      >
        <CheckCircle2 className="size-4" />
        {proposal.status === "accepted" ? "Cofnij akceptacje" : "Zatwierdz"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onStartEdit(proposal.id)}
        disabled={proposal.isEditing}
      >
        <Edit3 className="size-4" />
        Edytuj
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-rose-300 hover:bg-rose-500/10"
        onClick={() => onReject(proposal.id)}
        disabled={proposal.isEditing}
      >
        <XCircle className="size-4" />
        Odrzuc
      </Button>
    </div>
  );

  const frontTextareaId = `${proposal.id}-front`;
  const backTextareaId = `${proposal.id}-back`;

  return (
    <article className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-inner shadow-black/30">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
          <span>Propozycja {index + 1}</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[0.65rem] tracking-[0.2em]">
            {proposal.source}
          </span>
        </div>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest",
            statusTone,
          )}
        >
          {statusLabel}
        </span>
      </header>

      {proposal.isEditing ? (
        <div className="space-y-4">
          <div>
            <label
              htmlFor={frontTextareaId}
              className="text-xs uppercase tracking-[0.3em] text-slate-400"
            >
              Przod fiszki
            </label>
            <textarea
              id={frontTextareaId}
              className={cn(
                "mt-2 w-full rounded-xl border bg-slate-950/40 p-3 text-sm text-white outline-none transition focus-visible:ring-2",
                proposal.errors?.front
                  ? "border-rose-400/60 focus-visible:ring-rose-300/50"
                  : "border-white/10 focus-visible:ring-cyan-300/30",
              )}
              value={proposal.draftFront}
              onChange={(event) =>
                onDraftChange(proposal.id, { front: event.target.value })
              }
              maxLength={FLASHCARD_FRONT_MAX_LENGTH}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
              <span>
                {proposal.draftFront.length}/{FLASHCARD_FRONT_MAX_LENGTH}
              </span>
              {proposal.errors?.front && (
                <span className="font-medium text-rose-200">
                  {proposal.errors.front}
                </span>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor={backTextareaId}
              className="text-xs uppercase tracking-[0.3em] text-slate-400"
            >
              Tyl fiszki
            </label>
            <textarea
              id={backTextareaId}
              className={cn(
                "mt-2 w-full rounded-xl border bg-slate-950/40 p-3 text-sm text-white outline-none transition focus-visible:ring-2",
                proposal.errors?.back
                  ? "border-rose-400/60 focus-visible:ring-rose-300/50"
                  : "border-white/10 focus-visible:ring-cyan-300/30",
              )}
              value={proposal.draftBack}
              onChange={(event) =>
                onDraftChange(proposal.id, { back: event.target.value })
              }
              maxLength={FLASHCARD_BACK_MAX_LENGTH}
              rows={4}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
              <span>
                {proposal.draftBack.length}/{FLASHCARD_BACK_MAX_LENGTH}
              </span>
              {proposal.errors?.back && (
                <span className="font-medium text-rose-200">
                  {proposal.errors.back}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-white">{proposal.front}</p>
          <p className="text-sm text-slate-200">{proposal.back}</p>
        </div>
      )}

      <footer className="border-t border-white/10 pt-4">
        {editingControls}
      </footer>
    </article>
  );
}

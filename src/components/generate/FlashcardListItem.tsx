import { CheckCircle2, Edit3, Save, Undo2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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

  const editingControls = proposal.isEditing ? (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        data-test-id={`flashcard-save-${proposal.id}`}
        onClick={() => onSaveEdit(proposal.id)}
        className="cursor-pointer bg-emerald-500 hover:bg-emerald-500/90"
      >
        <Save className="size-4" />
        Zapisz
      </Button>
      <Button
        size="sm"
        variant="secondary"
        data-test-id={`flashcard-cancel-${proposal.id}`}
        onClick={() => onCancelEdit(proposal.id)}
        className="cursor-pointer"
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
        data-test-id={`flashcard-accept-toggle-${proposal.id}`}
        onClick={() => onToggleAccept(proposal.id)}
        disabled={proposal.isEditing}
        className="cursor-pointer"
      >
        <CheckCircle2 className="size-4" />
        {proposal.status === "accepted" ? "Cofnij akceptację" : "Zatwierdź"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        data-test-id={`flashcard-edit-${proposal.id}`}
        onClick={() => onStartEdit(proposal.id)}
        disabled={proposal.isEditing}
        className="cursor-pointer"
      >
        <Edit3 className="size-4" />
        Edytuj
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="cursor-pointer text-rose-300 hover:bg-rose-400/45"
        data-test-id={`flashcard-reject-${proposal.id}`}
        onClick={() => onReject(proposal.id)}
        disabled={proposal.isEditing}
      >
        <XCircle className="size-4" />
        Odrzuć
      </Button>
    </div>
  );

  const frontTextareaId = `${proposal.id}-front`;
  const backTextareaId = `${proposal.id}-back`;

  return (
    <Card
      className="rounded-2xl border-white/10 bg-white/5 shadow-inner shadow-black/30"
      data-test-id={`flashcard-item-${proposal.id}`}
      data-status={proposal.status}
    >
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 pb-0">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
          <span>Propozycja {index + 1}</span>
          <Badge
            variant="outline"
            className="bg-white/10 text-[0.65rem] tracking-[0.2em] border-white/20 text-white"
          >
            {proposal.source}
          </Badge>
        </div>
        <Badge
          variant={proposal.status === "accepted" ? "default" : "outline"}
          className={cn(
            "text-xs font-semibold uppercase tracking-widest",
            proposal.status === "accepted"
              ? "border-emerald-300/30 bg-emerald-500/5 text-emerald-300"
              : "text-slate-300 border-white/10 bg-white/5",
          )}
        >
          {statusLabel}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {proposal.isEditing ? (
          <div className="space-y-4">
            <div>
              <label
                htmlFor={frontTextareaId}
                className="text-xs uppercase tracking-[0.3em] text-slate-400"
              >
                Przod fiszki
              </label>
              <Textarea
                id={frontTextareaId}
                data-test-id={`flashcard-front-input-${proposal.id}`}
                className={cn(
                  "mt-2 rounded-xl bg-slate-950/40 text-sm text-white",
                  proposal.errors?.front
                    ? "border-rose-400/60 focus-visible:ring-rose-300/50"
                    : "border-white/10 focus-visible:ring-cyan-300/30",
                )}
                value={proposal.draftFront}
                onChange={(event) =>
                  onDraftChange(proposal.id, { front: event.target.value })
                }
                maxLength={FLASHCARD_FRONT_MAX_LENGTH}
                aria-invalid={!!proposal.errors?.front}
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
              <Textarea
                id={backTextareaId}
                data-test-id={`flashcard-back-input-${proposal.id}`}
                className={cn(
                  "mt-2 rounded-xl bg-slate-950/40 text-sm text-white",
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
                aria-invalid={!!proposal.errors?.back}
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
      </CardContent>

      <CardFooter className="border-t border-white/10">
        {editingControls}
      </CardFooter>
    </Card>
  );
}

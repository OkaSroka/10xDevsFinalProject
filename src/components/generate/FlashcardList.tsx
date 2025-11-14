import { memo } from "react";

import { FlashcardListItem } from "./FlashcardListItem";
import type { FlashcardProposalViewModel } from "./types";

interface FlashcardListProps {
  proposals: FlashcardProposalViewModel[];
  onToggleAccept: (id: string) => void;
  onReject: (id: string) => void;
  onStartEdit: (id: string) => void;
  onCancelEdit: (id: string) => void;
  onSaveEdit: (id: string) => void;
  onDraftChange: (id: string, draft: { front?: string; back?: string }) => void;
}

function FlashcardListComponent({
  proposals,
  onToggleAccept,
  onReject,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftChange,
}: FlashcardListProps) {
  if (!proposals.length) {
    return (
      <div
        className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-center text-sm text-slate-300"
        data-test-id="flashcard-list-empty"
      >
        Po wygenerowaniu zobaczysz tutaj liste fiszek gotowych do akceptacji i
        zapisu.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-test-id="flashcard-list">
      {proposals.map((proposal, index) => (
        <FlashcardListItem
          key={proposal.id}
          index={index}
          proposal={proposal}
          onToggleAccept={onToggleAccept}
          onReject={onReject}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
          onDraftChange={onDraftChange}
        />
      ))}
    </div>
  );
}

export const FlashcardList = memo(FlashcardListComponent);

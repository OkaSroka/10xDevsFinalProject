import type { FlashcardSource } from "@/types";

export type FlashcardProposalStatus = "pending" | "accepted";

export interface FlashcardProposalViewModel {
  id: string;
  front: string;
  back: string;
  source: FlashcardSource;
  status: FlashcardProposalStatus;
  isEditing: boolean;
  draftFront: string;
  draftBack: string;
  errors?: {
    front?: string;
    back?: string;
  };
}

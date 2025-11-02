import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

// Narrowing for API-level validation of flashcard source.
export type FlashcardSource = "ai-full" | "ai-edited" | "manual";

// Reusable pagination metadata and wrapper for list endpoints.
export interface PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMetaDto;
}

// Database row/insert/update helpers for specific tables.
type FlashcardRow = Tables<"flashcards">;
type FlashcardInsert = TablesInsert<"flashcards">;
type FlashcardUpdate = TablesUpdate<"flashcards">;

type GenerationRow = Tables<"generations">;
type GenerationErrorLogRow = Tables<"generation_error_logs">;

// -------------- Flashcards DTOs & Commands --------------

// Minimal item shape used in GET /flashcards list responses
// Derived from DB row; removes private fields and narrows source.
export type FlashcardListItemDto = Pick<
  FlashcardRow,
  "id" | "front" | "back" | "source" | "created_at" | "updated_at"
> & {
  // Narrow DB string to union required by API validation
  source: FlashcardSource;
};

// Detailed flashcard used in GET /flashcards/{id}
// Includes generation linkage but excludes user_id.
export type FlashcardDetailDto = Pick<
  FlashcardRow,
  | "id"
  | "front"
  | "back"
  | "source"
  | "generation_id"
  | "created_at"
  | "updated_at"
> & {
  source: FlashcardSource;
};

// Command payload for POST /flashcards
// Built from Insert type, excluding system-managed fields and narrowing source.
export type FlashcardCreateInput = Omit<
  FlashcardInsert,
  "id" | "user_id" | "created_at" | "updated_at" | "source"
> & {
  source: FlashcardSource;
  // Explicit to highlight allowed null and make it optional in payload.
  generation_id?: number | null;
};

export interface CreateFlashcardsCommand {
  flashcards: FlashcardCreateInput[];
}

// Response shape for POST /flashcards
// Matches API example: returns created items without timestamps/user linkage.
export interface CreateFlashcardsResponseDto {
  flashcards: (Pick<
    FlashcardRow,
    "id" | "front" | "back" | "source" | "generation_id"
  > & {
    source: FlashcardSource;
  })[];
}

// Command payload for PUT /flashcards/{id}
// Based on Update type but restricts to mutable fields and narrows source.
export type FlashcardUpdateInput = Omit<
  FlashcardUpdate,
  "id" | "user_id" | "created_at" | "updated_at" | "source"
> & {
  source?: FlashcardSource;
  // Keep explicit for clarity; DB allows null
  generation_id?: number | null;
};

export type UpdateFlashcardCommand = FlashcardUpdateInput;

// GET /flashcards list response wrapper with pagination metadata.
export type FlashcardListResponseDto = Paginated<FlashcardListItemDto>;

// -------------- Generations DTOs & Commands --------------

// Command payload for POST /generations
export interface GenerationCreateCommand {
  // API validation enforces 1000..10000 character length at runtime
  source_text: string;
}

// AI proposals returned from generation initiation; do not include DB-managed fields.
export type FlashcardProposalDto = Pick<
  FlashcardCreateInput,
  "front" | "back" | "source"
>;

// Response for POST /generations
export interface CreateGenerationResponseDto {
  generation_id: GenerationRow["id"];
  flashcards_proposals: FlashcardProposalDto[];
  generated_count: GenerationRow["generated_count"];
}

// Summary for GET /generations list; excludes user_id.
export type GenerationSummaryDto = Omit<GenerationRow, "user_id">;

// Detailed view for GET /generations/{id}
export interface GenerationWithFlashcardsDto {
  generation: GenerationSummaryDto;
  flashcards: FlashcardDetailDto[];
}

// -------------- Generation Error Logs DTOs --------------

// Used in GET /generation-error-logs; excludes user_id for privacy.
export type GenerationErrorLogDto = Omit<GenerationErrorLogRow, "user_id">;

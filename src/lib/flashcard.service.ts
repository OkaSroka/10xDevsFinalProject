import { MAX_FLASHCARDS_PER_REQUEST } from "./flashcard.schema";
import type { SupabaseClient } from "../db/supabase.client";
import type {
  CreateFlashcardsCommand,
  CreateFlashcardsResponseDto,
  FlashcardCreateInput,
  FlashcardSource,
} from "../types";

export interface FlashcardServiceContext {
  userId: string;
}

export type FlashcardServiceErrorCode = "VALIDATION_FAILURE" | "DB_FAILURE";

interface FlashcardServiceErrorOptions {
  cause?: unknown;
  detail?: unknown;
}

export class FlashcardServiceError extends Error {
  public readonly code: FlashcardServiceErrorCode;
  public readonly detail?: unknown;

  constructor(
    message: string,
    code: FlashcardServiceErrorCode,
    options?: FlashcardServiceErrorOptions,
  ) {
    super(message);
    this.name = "FlashcardServiceError";
    this.code = code;
    this.detail = options?.detail;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

type NormalizedFlashcardInput = FlashcardCreateInput & {
  generation_id?: number | null;
};

/**
 * Encapsulates flashcard persistence concerns (validation, ownership, DB writes).
 */
export class FlashcardService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Persists a batch of flashcards owned by the provided user.
   * - Normalizes/sanitizes textual fields.
   * - Validates generation ownership for AI-sourced cards.
   * - Performs a single batch insert and returns created rows.
   */
  async createFlashcards(
    command: CreateFlashcardsCommand,
    context: FlashcardServiceContext,
  ): Promise<CreateFlashcardsResponseDto> {
    if (!command.flashcards.length) {
      throw new FlashcardServiceError(
        "At least one flashcard must be provided.",
        "VALIDATION_FAILURE",
      );
    }

    if (command.flashcards.length > MAX_FLASHCARDS_PER_REQUEST) {
      throw new FlashcardServiceError(
        `A maximum of ${MAX_FLASHCARDS_PER_REQUEST} flashcards can be created per request.`,
        "VALIDATION_FAILURE",
      );
    }

    const normalizedFlashcards = command.flashcards.map((flashcard) =>
      this.normalizeFlashcard(flashcard),
    );

    const generationIds = this.collectGenerationIds(normalizedFlashcards);
    await this.ensureGenerationsBelongToUser(generationIds, context.userId);

    const rowsToInsert = normalizedFlashcards.map((flashcard) => ({
      front: flashcard.front,
      back: flashcard.back,
      source: flashcard.source,
      generation_id: flashcard.generation_id ?? null,
      user_id: context.userId,
    }));

    const { data, error } = await this.supabase
      .from("flashcards")
      .insert(rowsToInsert)
      .select("id, front, back, source, generation_id");

    if (error || !data) {
      // eslint-disable-next-line no-console
      console.error("FlashcardService insert error:", error);
      throw new FlashcardServiceError(
        "Unable to store flashcards at this time.",
        "DB_FAILURE",
        { cause: error ?? new Error("Insert returned no rows.") },
      );
    }

    return {
      flashcards: data.map((row) => ({
        id: row.id,
        front: row.front,
        back: row.back,
        source: row.source as FlashcardSource,
        generation_id: row.generation_id,
      })),
    };
  }

  /**
   * Trims body text and enforces generation wiring rules at the service level.
   */
  private normalizeFlashcard(
    flashcard: FlashcardCreateInput,
  ): NormalizedFlashcardInput {
    const trimmedFront = flashcard.front.trim();
    const trimmedBack = flashcard.back.trim();

    const isManual = flashcard.source === "manual";
    if (!isManual && typeof flashcard.generation_id !== "number") {
      throw new FlashcardServiceError(
        "generation_id is required for AI-generated flashcards.",
        "VALIDATION_FAILURE",
      );
    }

    const normalizedGenerationId = isManual
      ? null
      : (flashcard.generation_id as number);

    return {
      front: trimmedFront,
      back: trimmedBack,
      source: flashcard.source,
      generation_id: normalizedGenerationId,
    };
  }

  private collectGenerationIds(
    flashcards: NormalizedFlashcardInput[],
  ): number[] {
    const uniqueIds = new Set<number>();

    for (const flashcard of flashcards) {
      if (
        (flashcard.source === "ai-full" || flashcard.source === "ai-edited") &&
        typeof flashcard.generation_id === "number"
      ) {
        uniqueIds.add(flashcard.generation_id);
      }
    }

    return [...uniqueIds];
  }

  /**
   * Fetches referenced generations to guarantee they exist and belong to the caller.
   */
  private async ensureGenerationsBelongToUser(
    generationIds: number[],
    userId: string,
  ): Promise<void> {
    if (!generationIds.length) {
      return;
    }

    const { data, error } = await this.supabase
      .from("generations")
      .select("id")
      .in("id", generationIds)
      .eq("user_id", userId);

    if (error) {
      throw new FlashcardServiceError(
        "Unable to verify generation ownership.",
        "DB_FAILURE",
        { cause: error },
      );
    }

    const rows = data ?? [];
    const foundIds = new Set(rows.map((row) => row.id));
    const missingIds = generationIds.filter((id) => !foundIds.has(id));
    if (missingIds.length) {
      throw new FlashcardServiceError(
        "One or more generations could not be found or do not belong to the user.",
        "VALIDATION_FAILURE",
        { detail: { missing_generation_ids: missingIds } },
      );
    }
  }
}

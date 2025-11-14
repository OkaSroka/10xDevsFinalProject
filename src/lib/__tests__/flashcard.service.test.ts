import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateFlashcardsCommand,
  FlashcardCreateInput,
} from "../../types";
import { FlashcardService, FlashcardServiceError } from "../flashcard.service";
import { MAX_FLASHCARDS_PER_REQUEST } from "../flashcard.schema";
import { describe, expect, it, vi } from "vitest";

interface MockSupabaseInsertResult<Row> {
  data: Row[] | null;
  error: Error | null;
}

interface MockSupabaseGenerationResult {
  data: { id: number }[] | null;
  error: Error | null;
}

type GenerationQueryResolver = (
  ids: number[],
  userId: string,
) => MockSupabaseGenerationResult;

class SupabaseStub {
  public insertedFlashcards: unknown[] = [];
  public generationQueries: { ids: number[]; userId: string }[] = [];

  private readonly insertResultOverride?: MockSupabaseInsertResult<{
    id: number;
    front: string;
    back: string;
    source: string;
    generation_id: number | null;
  }>;

  private readonly generationQueryResolver?: GenerationQueryResolver;

  constructor(
    insertResult?: MockSupabaseInsertResult<{
      id: number;
      front: string;
      back: string;
      source: string;
      generation_id: number | null;
    }>,
    generationQueryResolver?: GenerationQueryResolver,
  ) {
    this.insertResultOverride = insertResult;
    this.generationQueryResolver = generationQueryResolver;
  }

  from(table: string) {
    if (table === "flashcards") {
      return {
        insert: (payload: unknown) => {
          this.insertedFlashcards.push(payload);
          return {
            select: async () => {
              if (this.insertResultOverride) {
                return this.insertResultOverride;
              }

              const rows = Array.isArray(payload) ? payload : [payload];

              const data = rows.map((row, index) => {
                const record = row as Record<string, unknown>;
                return {
                  id: index + 1,
                  front: record.front as string,
                  back: record.back as string,
                  source: record.source as string,
                  generation_id:
                    (record.generation_id as number | null | undefined) ?? null,
                };
              });

              return {
                data,
                error: null,
              } satisfies MockSupabaseInsertResult<{
                id: number;
                front: string;
                back: string;
                source: string;
                generation_id: number | null;
              }>;
            },
          };
        },
      };
    }

    if (table === "generations") {
      return {
        select: () => ({
          in: (_column: string, ids: number[]) => ({
            eq: async (_userColumn: string, userId: string) => {
              this.generationQueries.push({ ids, userId });
              if (this.generationQueryResolver) {
                return this.generationQueryResolver(ids, userId);
              }

              return {
                data: ids.map((id) => ({ id })),
                error: null,
              } satisfies MockSupabaseGenerationResult;
            },
          }),
        }),
      };
    }

    throw new Error(`Unexpected table requested in test: ${table}`);
  }
}

describe("FlashcardService", () => {
  describe("createFlashcards", () => {
    it("should create flashcards successfully", async () => {
      const supabaseStub = new SupabaseStub();
      const service = new FlashcardService(
        supabaseStub as unknown as SupabaseClient,
      );

      const command: CreateFlashcardsCommand = {
        flashcards: [
          {
            front: "  What is React?  ",
            back: "A JavaScript library for building user interfaces.",
            source: "manual",
          },
        ],
      };

      const context = { userId: "test-user-id" };

      const result = await service.createFlashcards(command, context);

      expect(result.flashcards).toHaveLength(1);
      expect(result.flashcards[0]).toEqual({
        id: 1,
        front: "What is React?",
        back: "A JavaScript library for building user interfaces.",
        source: "manual",
        generation_id: null,
      });

      expect(supabaseStub.insertedFlashcards).toHaveLength(1);
      expect(supabaseStub.insertedFlashcards[0]).toEqual([
        {
          front: "What is React?",
          back: "A JavaScript library for building user interfaces.",
          source: "manual",
          generation_id: null,
          user_id: "test-user-id",
        },
      ]);
    });

    it("should throw error when no flashcards provided", async () => {
      const supabaseStub = new SupabaseStub();
      const service = new FlashcardService(
        supabaseStub as unknown as SupabaseClient,
      );

      const command: CreateFlashcardsCommand = {
        flashcards: [],
      };

      const context = { userId: "test-user-id" };

      await expect(service.createFlashcards(command, context)).rejects.toThrow(
        FlashcardServiceError,
      );
      await expect(service.createFlashcards(command, context)).rejects.toThrow(
        "At least one flashcard must be provided.",
      );
    });

    it("should throw error when too many flashcards provided", async () => {
      const supabaseStub = new SupabaseStub();
      const service = new FlashcardService(
        supabaseStub as unknown as SupabaseClient,
      );

      const flashcards: FlashcardCreateInput[] = Array.from(
        { length: MAX_FLASHCARDS_PER_REQUEST + 1 },
        (_, i) => ({
          front: `Front ${i}`,
          back: `Back ${i}`,
          source: "manual",
        }),
      );

      const command: CreateFlashcardsCommand = {
        flashcards,
      };

      const context = { userId: "test-user-id" };

      await expect(service.createFlashcards(command, context)).rejects.toThrow(
        FlashcardServiceError,
      );
      await expect(service.createFlashcards(command, context)).rejects.toThrow(
        `A maximum of ${MAX_FLASHCARDS_PER_REQUEST} flashcards can be created per request.`,
      );
    });

    it("should normalize flashcard fields", async () => {
      const supabaseStub = new SupabaseStub();
      const service = new FlashcardService(
        supabaseStub as unknown as SupabaseClient,
      );

      const command: CreateFlashcardsCommand = {
        flashcards: [
          {
            front: "  What is React?  ",
            back: "  A library.  ",
            source: "ai-edited",
            generation_id: 123,
          },
        ],
      };

      const context = { userId: "test-user-id" };

      await service.createFlashcards(command, context);

      expect(supabaseStub.insertedFlashcards[0]).toEqual([
        {
          front: "What is React?",
          back: "A library.",
          source: "ai-edited",
          generation_id: 123,
          user_id: "test-user-id",
        },
      ]);
    });

    it("should verify generation ownership", async () => {
      const supabaseStub = new SupabaseStub();
      const service = new FlashcardService(
        supabaseStub as unknown as SupabaseClient,
      );

      const command: CreateFlashcardsCommand = {
        flashcards: [
          {
            front: "Test",
            back: "Test",
            source: "ai-full",
            generation_id: 999,
          },
        ],
      };

      const context = { userId: "test-user-id" };

      await expect(
        service.createFlashcards(command, context),
      ).resolves.not.toThrow();

      expect(supabaseStub.generationQueries).toEqual([
        { ids: [999], userId: "test-user-id" },
      ]);
    });

    it("should throw error on database failure", async () => {
      const supabaseStub = new SupabaseStub({
        data: null,
        error: new Error("DB error"),
      });
      const service = new FlashcardService(
        supabaseStub as unknown as SupabaseClient,
      );

      const command: CreateFlashcardsCommand = {
        flashcards: [
          {
            front: "Test",
            back: "Test",
            source: "manual",
          },
        ],
      };

      const context = { userId: "test-user-id" };

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {
          /* no-op: suppress expected log in tests */
        });

      try {
        await expect(
          service.createFlashcards(command, context),
        ).rejects.toThrow(FlashcardServiceError);
        await expect(
          service.createFlashcards(command, context),
        ).rejects.toThrow("Unable to store flashcards at this time.");
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });
});

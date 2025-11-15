import { describe, it, expect, vi } from "vitest";
import {
  GenerationService,
  GenerationServiceError,
} from "../generation.service";
import type { SupabaseClient } from "../../db/supabase.client";

describe("GenerationService", () => {
  const generationTableQuery = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi
      .fn()
      .mockResolvedValue({ data: { id: 1, generated_count: 5 }, error: null }),
  };

  const errorLogTableQuery = {
    insert: vi.fn().mockResolvedValue({ error: null }),
  };

  const mockSupabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "generations") {
        return generationTableQuery;
      }

      if (table === "generation_error_logs") {
        return errorLogTableQuery;
      }

      throw new Error(`Unexpected table requested in test: ${table}`);
    }),
  } as unknown as SupabaseClient;

  const mockOpenRouter = {
    setSystemMessage: vi.fn(),
    setResponseFormat: vi.fn(),
    clearResponseFormat: vi.fn(),
    sendChatMessage: vi.fn().mockResolvedValue({
      parsed: {
        flashcards: [
          {
            front: "What is AI?",
            back: "AI stands for Artificial Intelligence.",
          },
        ],
      },
      model: "test-model",
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    }),
  };

  const service = new GenerationService(
    mockSupabase,
    undefined,
    mockOpenRouter as typeof mockOpenRouter,
  );

  describe("createGeneration", () => {
    it("should create a generation and return the response", async () => {
      const command = { source_text: "What is AI?" };
      const context = { userId: "user-123" };

      const result = await service.createGeneration(command, context);

      expect(result).toEqual({
        generation_id: 1,
        flashcards_proposals: [
          {
            front: "What is AI?",
            back: "AI stands for Artificial Intelligence.",
            source: "ai-full",
          },
        ],
        generated_count: 5,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("generations");
      expect(generationTableQuery.insert).toHaveBeenCalled();
      expect(mockOpenRouter.sendChatMessage).toHaveBeenCalled();
    });

    it("should throw an error if flashcard generation fails", async () => {
      mockOpenRouter.sendChatMessage.mockRejectedValueOnce(
        new Error("AI error"),
      );

      const command = { source_text: "What is AI?" };
      const context = { userId: "user-123" };

      await expect(service.createGeneration(command, context)).rejects.toThrow(
        GenerationServiceError,
      );
    });
  });

  describe("computeSourceTextHash", () => {
    it("should compute a SHA-256 hash of the source text", async () => {
      const hash = await service["computeSourceTextHash"]("test");
      expect(hash).toBe(
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      );
    });
  });

  describe("normalizeFlashcardCandidate", () => {
    it("should normalize a valid flashcard candidate", () => {
      const candidate = {
        front: "  What is AI?  ",
        back: "  Artificial Intelligence  ",
      };
      const result = service["normalizeFlashcardCandidate"](candidate);

      expect(result).toEqual({
        front: "What is AI?",
        back: "Artificial Intelligence",
        source: "ai-full",
      });
    });

    it("should return null for an invalid candidate", () => {
      const result = service["normalizeFlashcardCandidate"]({});
      expect(result).toBeNull();
    });
  });
});

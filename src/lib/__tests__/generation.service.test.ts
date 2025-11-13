import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "../../db/supabase.client";
import type {
  GenerationCreateCommand,
  FlashcardProposalDto,
} from "../../types";
import type {
  JsonSchema,
  ResponseFormatOptions,
  ResponseType,
} from "../openrouter.service";
import {
  GenerationService,
  type OpenRouterClient,
} from "../generation.service";

interface MockSupabaseInsertResult<Row> {
  data: Row | null;
  error: Error | null;
}

class SupabaseStub {
  public insertedGenerationPayloads: unknown[] = [];
  public errorLogs: unknown[] = [];
  private readonly generationInsertResult: MockSupabaseInsertResult<{
    id: number;
    generated_count: number;
  }>;

  constructor(
    insertResult?: MockSupabaseInsertResult<{
      id: number;
      generated_count: number;
    }>,
  ) {
    this.generationInsertResult =
      insertResult ??
      ({
        data: { id: 99, generated_count: 3 },
        error: null,
      } satisfies MockSupabaseInsertResult<{
        id: number;
        generated_count: number;
      }>);
  }

  from(table: string) {
    if (table === "generations") {
      return {
        insert: (payload: unknown) => {
          this.insertedGenerationPayloads.push(payload);
          return {
            select: () => ({
              single: async () => this.generationInsertResult,
            }),
          };
        },
      };
    }

    if (table === "generation_error_logs") {
      return {
        insert: async (payload: unknown) => {
          this.errorLogs.push(payload);
          return { error: null };
        },
      };
    }

    throw new Error(`Unexpected table requested in test: ${table}`);
  }
}

class OpenRouterClientStub implements OpenRouterClient {
  public readonly sentPrompts: string[] = [];

  constructor(
    private readonly response:
      | ResponseType<{ flashcards: FlashcardProposalDto[] }>
      | (() => Promise<ResponseType<{ flashcards: FlashcardProposalDto[] }>>),
  ) {}

  setSystemMessage(): void {
    // no-op for tests
  }

  setResponseFormat(
    _schema: JsonSchema,
    _options?: ResponseFormatOptions,
  ): void {
    // no-op for tests
  }

  clearResponseFormat(): void {
    // no-op for tests
  }

  async sendChatMessage<TParsed>(
    userMessage: string,
  ): Promise<ResponseType<TParsed>> {
    this.sentPrompts.push(userMessage);
    const resolved =
      typeof this.response === "function"
        ? await this.response()
        : this.response;
    return resolved as ResponseType<TParsed>;
  }
}

test("GenerationService returns normalized flashcards from OpenRouter", async () => {
  const supabase = new SupabaseStub();
  const openRouter = new OpenRouterClientStub({
    id: "chat_1",
    model: "openrouter/anthropic/claude-3.5-sonnet",
    content: "payload",
    parsed: {
      flashcards: [
        { front: "Question?", back: "Answer." },
        { front: "Extra", back: "Details" },
      ],
    },
    usage: {
      prompt_tokens: 120,
      completion_tokens: 60,
      total_tokens: 180,
    },
    raw: {
      id: "chat_1",
      model: "openrouter/anthropic/claude-3.5-sonnet",
      choices: [],
    },
  });

  const service = new GenerationService(
    supabase as unknown as SupabaseClient,
    { maxProposals: 2 },
    openRouter,
  );

  const command: GenerationCreateCommand = {
    source_text: "Sample text with enough length to satisfy generation.",
  };

  const result = await service.createGeneration(command, {
    userId: "user-123",
  });

  assert.equal(result.generated_count, 3);
  assert.equal(result.flashcards_proposals.length, 2);
  assert.equal(result.flashcards_proposals[0]?.source, "ai-full");

  const insertedGeneration = supabase.insertedGenerationPayloads[0] as {
    model: string;
  };
  assert.equal(
    insertedGeneration.model,
    "openrouter/anthropic/claude-3.5-sonnet",
  );

  const usageLog = supabase.errorLogs[0] as { error_code: string };
  assert.equal(usageLog.error_code, "USAGE_METRICS");
});

test("GenerationService logs OpenRouter failures and rethrows", async () => {
  const supabase = new SupabaseStub();

  const openRouter = new OpenRouterClientStub(async () => {
    throw new Error("network failed");
  });

  const service = new GenerationService(
    supabase as unknown as SupabaseClient,
    undefined,
    openRouter,
  );

  await assert.rejects(
    service.createGeneration(
      { source_text: "Still valid input" },
      { userId: "user-456" },
    ),
    (error: unknown) => {
      assert.equal(
        (error as { code?: string }).code,
        "AI_FAILURE",
        "Expected AI_FAILURE code.",
      );
      return true;
    },
  );

  const errorRow = supabase.errorLogs.find(
    (row) => (row as { error_code: string }).error_code !== "USAGE_METRICS",
  );
  assert.ok(errorRow, "Should persist an error log row for AI failure.");
});

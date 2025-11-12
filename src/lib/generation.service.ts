import { createHash } from "node:crypto";

import type { SupabaseClient } from "../db/supabase.client";
import type {
  CreateGenerationResponseDto,
  FlashcardProposalDto,
  GenerationCreateCommand,
} from "../types";

export interface GenerationServiceOptions {
  model: string;
  aiTimeoutMs: number;
  maxProposals: number;
}

const DEFAULT_OPTIONS: GenerationServiceOptions = {
  model: "openrouter/anthropic/claude-3.5-sonnet",
  aiTimeoutMs: 60_000,
  maxProposals: 10,
};

export type GenerationServiceErrorCode = "AI_FAILURE" | "DB_FAILURE";

export class GenerationServiceError extends Error {
  public readonly code: GenerationServiceErrorCode;

  constructor(
    message: string,
    code: GenerationServiceErrorCode,
    cause?: unknown,
  ) {
    super(message);
    this.name = "GenerationServiceError";
    this.code = code;
    if (cause) {
      this.cause = cause;
    }
  }
}

interface GenerationContext {
  userId: string;
}

interface PersistGenerationPayload {
  generatedCount: number;
  generationDuration: number;
  model: string;
  sourceTextHash: string;
  sourceTextLength: number;
  userId: string;
}

interface GenerationErrorLogPayload {
  errorCode: string;
  errorMessage: string;
  model: string;
  sourceTextHash: string;
  sourceTextLength: number;
  userId: string;
}

export class GenerationService {
  private readonly options: GenerationServiceOptions;

  constructor(
    private readonly supabase: SupabaseClient,
    options?: Partial<GenerationServiceOptions>,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async createGeneration(
    command: GenerationCreateCommand,
    context: GenerationContext,
  ): Promise<CreateGenerationResponseDto> {
    const startedAt = Date.now();
    const sourceTextHash = this.computeSourceTextHash(command.source_text);

    const proposals = await this.generateFlashcardProposals(
      command.source_text,
      context,
      sourceTextHash,
    );

    const generationDuration = Date.now() - startedAt;

    const generationRow = await this.persistGeneration({
      generatedCount: proposals.length,
      generationDuration,
      model: this.options.model,
      sourceTextHash,
      sourceTextLength: command.source_text.length,
      userId: context.userId,
    });

    return {
      generation_id: generationRow.id,
      flashcards_proposals: proposals,
      generated_count: generationRow.generated_count,
    };
  }

  private async generateFlashcardProposals(
    sourceText: string,
    context: GenerationContext,
    sourceTextHash: string,
  ): Promise<FlashcardProposalDto[]> {
    try {
      return await this.mockAiGeneration(sourceText);
    } catch (error) {
      await this.logGenerationError({
        errorCode: "AI_REQUEST_FAILED",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown AI generation error.",
        model: this.options.model,
        sourceTextHash,
        sourceTextLength: sourceText.length,
        userId: context.userId,
      });

      throw new GenerationServiceError(
        "Unable to generate flashcard proposals.",
        "AI_FAILURE",
        error,
      );
    }
  }

  private async persistGeneration(payload: PersistGenerationPayload) {
    const { data, error } = await this.supabase
      .from("generations")
      .insert({
        generated_count: payload.generatedCount,
        generation_duration: payload.generationDuration,
        model: payload.model,
        source_text_hash: payload.sourceTextHash,
        source_text_length: payload.sourceTextLength,
        user_id: payload.userId,
      })
      .select("id, generated_count")
      .single();

    if (error || !data) {
      // eslint-disable-next-line no-console
      console.error(
        "Database error in persistGeneration:",
        error,
        "Payload:",
        payload,
      );
      throw new GenerationServiceError(
        "Unable to persist generation metadata.",
        "DB_FAILURE",
        error ?? new Error("Missing generation record."),
      );
    }

    return data;
  }

  private async logGenerationError(payload: GenerationErrorLogPayload) {
    const { error } = await this.supabase.from("generation_error_logs").insert({
      error_code: payload.errorCode,
      error_message: payload.errorMessage,
      model: payload.model,
      source_text_hash: payload.sourceTextHash,
      source_text_length: payload.sourceTextLength,
      user_id: payload.userId,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to log generation error.", error);
    }
  }

  private computeSourceTextHash(sourceText: string): string {
    return createHash("sha256").update(sourceText, "utf8").digest("hex");
  }

  // Temporary mock to unblock development until the OpenRouter client is wired in.
  private async mockAiGeneration(
    sourceText: string,
  ): Promise<FlashcardProposalDto[]> {
    const normalized = sourceText.replace(/\s+/g, " ").trim();
    const sentences = normalized
      .split(/(?<=[.!?])\s+/u)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    if (!sentences.length) {
      return [
        {
          front: "Summary",
          back: normalized.slice(0, 320),
          source: "ai-full",
        },
      ];
    }

    const chunkSize = Math.max(
      1,
      Math.ceil(sentences.length / this.options.maxProposals),
    );

    const proposals: FlashcardProposalDto[] = [];

    for (let index = 0; index < sentences.length; index += chunkSize) {
      if (proposals.length >= this.options.maxProposals) {
        break;
      }

      const chunk = sentences.slice(index, index + chunkSize);
      if (!chunk.length) {
        continue;
      }

      proposals.push({
        front: chunk[0]?.slice(0, 160) ?? "Key concept",
        back: chunk.join(" ").slice(0, 400),
        source: "ai-full",
      });
    }

    return proposals;
  }
}

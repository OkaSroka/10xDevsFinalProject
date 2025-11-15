import type { SupabaseClient } from "../db/supabase.client";
import type {
  CreateGenerationResponseDto,
  FlashcardProposalDto,
  GenerationCreateCommand,
} from "../types";
import {
  OpenRouterService,
  type JsonSchema,
  type OpenRouterUsage,
  type ResponseFormatOptions,
  type ResponseType,
} from "./openrouter.service";

export interface GenerationServiceOptions {
  model: string;
  aiTimeoutMs: number;
  maxProposals: number;
}

export interface OpenRouterClient {
  setSystemMessage(message: string): void;
  setResponseFormat(schema: JsonSchema, options?: ResponseFormatOptions): void;
  clearResponseFormat(): void;
  sendChatMessage<TParsed = unknown>(
    userMessage: string,
  ): Promise<ResponseType<TParsed>>;
}

const DEFAULT_OPTIONS: GenerationServiceOptions = {
  model: "openrouter/anthropic/claude-3.5-sonnet",
  aiTimeoutMs: 60_000,
  maxProposals: 10,
};

const FLASHCARD_SYSTEM_PROMPT = [
  "You are an expert learning coach that converts dense study materials into atomic flashcards.",
  "Generate focused flashcards capturing the most critical information.",
  "Respond strictly with JSON matching the provided schema.",
  "Each flashcard must contain concise `front` (question/prompt) and `back` (answer/explanation) fields.",
].join(" ");

interface FlashcardGenerationParsedResponse {
  flashcards: {
    front: string;
    back: string;
  }[];
}

interface FlashcardGenerationResult {
  proposals: FlashcardProposalDto[];
  model: string;
  usage?: OpenRouterUsage;
}

interface GenerationUsageLogPayload {
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  sourceTextHash: string;
  sourceTextLength: number;
  userId: string;
}

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
  private readonly openRouter: OpenRouterClient;

  constructor(
    private readonly supabase: SupabaseClient,
    options?: Partial<GenerationServiceOptions>,
    openRouter?: OpenRouterClient,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.openRouter =
      openRouter ??
      new OpenRouterService({
        model: this.options.model,
        timeoutMs: this.options.aiTimeoutMs,
      });
  }

  async createGeneration(
    command: GenerationCreateCommand,
    context: GenerationContext,
  ): Promise<CreateGenerationResponseDto> {
    const startedAt = Date.now();
    const sourceTextHash = await this.computeSourceTextHash(command.source_text);

    const generationResult = await this.generateFlashcardProposals(
      command.source_text,
      context,
      sourceTextHash,
    );

    const generationDuration = Date.now() - startedAt;

    const generationRow = await this.persistGeneration({
      generatedCount: generationResult.proposals.length,
      generationDuration,
      model: generationResult.model,
      sourceTextHash,
      sourceTextLength: command.source_text.length,
      userId: context.userId,
    });

    await this.recordUsageMetrics({
      model: generationResult.model,
      promptTokens: generationResult.usage?.prompt_tokens,
      completionTokens: generationResult.usage?.completion_tokens,
      totalTokens: generationResult.usage?.total_tokens,
      sourceTextHash,
      sourceTextLength: command.source_text.length,
      userId: context.userId,
    });

    return {
      generation_id: generationRow.id,
      flashcards_proposals: generationResult.proposals,
      generated_count: generationRow.generated_count,
    };
  }

  private async generateFlashcardProposals(
    sourceText: string,
    context: GenerationContext,
    sourceTextHash: string,
  ): Promise<FlashcardGenerationResult> {
    try {
      this.configureOpenRouterClient();
      const prompt = this.buildFlashcardPrompt(sourceText);
      const response =
        await this.openRouter.sendChatMessage<FlashcardGenerationParsedResponse>(
          prompt,
        );
      const proposals = this.normalizeFlashcardResponse(response.parsed);
      if (!proposals.length) {
        throw new Error("OpenRouter response did not include flashcards.");
      }
      return {
        proposals: proposals.slice(0, this.options.maxProposals),
        model: response.model,
        usage: response.usage,
      };
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
      console.error("Failed to log generation error.", error);
    }
  }

  private async recordUsageMetrics(payload: GenerationUsageLogPayload) {
    if (
      payload.promptTokens == null &&
      payload.completionTokens == null &&
      payload.totalTokens == null
    ) {
      return;
    }

    const usageMessage = JSON.stringify({
      prompt_tokens: payload.promptTokens ?? null,
      completion_tokens: payload.completionTokens ?? null,
      total_tokens: payload.totalTokens ?? null,
    });

    const { error } = await this.supabase.from("generation_error_logs").insert({
      error_code: "USAGE_METRICS",
      error_message: usageMessage,
      model: payload.model,
      source_text_hash: payload.sourceTextHash,
      source_text_length: payload.sourceTextLength,
      user_id: payload.userId,
    });

    if (error) {
      console.error("Failed to persist usage metrics.", error);
    }
  }

  private async computeSourceTextHash(sourceText: string): Promise<string> {
    // Use Web Crypto API (works in Cloudflare Workers and modern browsers)
    const encoder = new TextEncoder();
    const data = encoder.encode(sourceText);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private configureOpenRouterClient(): void {
    this.openRouter.setSystemMessage(FLASHCARD_SYSTEM_PROMPT);
    this.openRouter.setResponseFormat(this.buildFlashcardSchema(), {
      name: "flashcard_generation_response",
      strict: true,
    });
  }

  private buildFlashcardPrompt(sourceText: string): string {
    return [
      "Read the following study material and propose concise flashcards.",
      `Generate up to ${this.options.maxProposals} flashcards.`,
      "Focus on key facts, definitions, or cause-effect relationships.",
      "Input text:",
      "```text",
      sourceText.trim(),
      "```",
    ].join("\n");
  }

  private buildFlashcardSchema(): JsonSchema {
    return {
      type: "object",
      required: ["flashcards"],
      additionalProperties: false,
      properties: {
        flashcards: {
          type: "array",
          minItems: 1,
          maxItems: this.options.maxProposals,
          items: {
            type: "object",
            required: ["front", "back"],
            additionalProperties: false,
            properties: {
              front: {
                type: "string",
                minLength: 5,
                maxLength: 320,
                description:
                  "Prompt/question highlighting a key idea from the text.",
              },
              back: {
                type: "string",
                minLength: 10,
                maxLength: 600,
                description:
                  "Answer/explanation containing the essential knowledge.",
              },
            },
          },
        },
      },
    };
  }

  private normalizeFlashcardResponse(
    parsed: FlashcardGenerationParsedResponse | undefined,
  ): FlashcardProposalDto[] {
    if (!parsed || !Array.isArray(parsed.flashcards)) {
      throw new Error("Flashcard payload missing or malformed.");
    }

    const proposals = parsed.flashcards
      .map((flashcard) => this.normalizeFlashcardCandidate(flashcard))
      .filter((flashcard): flashcard is FlashcardProposalDto => !!flashcard);

    if (!proposals.length) {
      throw new Error("No valid flashcards returned by OpenRouter.");
    }

    return proposals;
  }

  private normalizeFlashcardCandidate(
    candidate: { front?: string; back?: string } | undefined,
  ): FlashcardProposalDto | null {
    if (!candidate) {
      return null;
    }

    const front = candidate.front?.trim();
    const back = candidate.back?.trim();

    if (!front || !back) {
      return null;
    }

    return {
      front: front.slice(0, 320),
      back: back.slice(0, 600),
      source: "ai-full",
    };
  }
}

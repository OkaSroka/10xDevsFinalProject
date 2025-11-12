import { z } from "zod";

export const FLASHCARD_FRONT_MAX_LENGTH = 200;
export const FLASHCARD_BACK_MAX_LENGTH = 500;
export const FLASHCARD_SOURCES = ["ai-full", "ai-edited", "manual"] as const;
export const MAX_FLASHCARDS_PER_REQUEST = 50;

const flashcardSourceEnum = z.enum(FLASHCARD_SOURCES, {
  required_error: "`source` is required.",
  invalid_type_error: "`source` must be one of: ai-full, ai-edited, manual.",
});

export const flashcardPayloadSchema = z
  .object({
    front: z
      .string({
        required_error: "`front` is required.",
        invalid_type_error: "`front` must be a string.",
      })
      .trim()
      .min(1, "`front` cannot be empty.")
      .max(
        FLASHCARD_FRONT_MAX_LENGTH,
        `front must be at most ${FLASHCARD_FRONT_MAX_LENGTH} characters.`,
      ),
    back: z
      .string({
        required_error: "`back` is required.",
        invalid_type_error: "`back` must be a string.",
      })
      .trim()
      .min(1, "`back` cannot be empty.")
      .max(
        FLASHCARD_BACK_MAX_LENGTH,
        `back must be at most ${FLASHCARD_BACK_MAX_LENGTH} characters.`,
      ),
    source: flashcardSourceEnum,
    generation_id: z
      .number({
        invalid_type_error: "`generation_id` must be a number or null.",
      })
      .int("`generation_id` must be an integer.")
      .positive("`generation_id` must be positive.")
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((flashcard, ctx) => {
    const isAiSource =
      flashcard.source === "ai-full" || flashcard.source === "ai-edited";
    const hasGenerationId =
      flashcard.generation_id !== null && flashcard.generation_id !== undefined;

    if (isAiSource && !hasGenerationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "`generation_id` is required for ai-full and ai-edited flashcards.",
        path: ["generation_id"],
      });
      return;
    }

    if (!isAiSource && hasGenerationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "`generation_id` must be null for manual flashcards.",
        path: ["generation_id"],
      });
    }
  });

export const flashcardsRequestSchema = z
  .object({
    flashcards: z
      .array(flashcardPayloadSchema, {
        invalid_type_error: "`flashcards` must be an array.",
      })
      .min(1, "Provide at least one flashcard to create.")
      .max(
        MAX_FLASHCARDS_PER_REQUEST,
        `You can create up to ${MAX_FLASHCARDS_PER_REQUEST} flashcards per request.`,
      ),
  })
  .strict();

export type FlashcardPayloadInput = z.infer<typeof flashcardPayloadSchema>;
export type FlashcardsRequestInput = z.infer<typeof flashcardsRequestSchema>;

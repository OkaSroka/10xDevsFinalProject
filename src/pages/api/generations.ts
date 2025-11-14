import type { APIRoute } from "astro";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";

import {
  GenerationService,
  GenerationServiceError,
} from "../../lib/generation.service";
import { OpenRouterService } from "../../lib/openrouter.service";
import type { SupabaseClient } from "../../db/supabase.client";
import {
  SOURCE_TEXT_MIN_LENGTH,
  SOURCE_TEXT_MAX_LENGTH,
} from "../../lib/generation.constants";
import type { GenerationCreateCommand } from "../../types";

export const prerender = false;

/**
 * Expected POST payload:
 * - source_text: string, required, 1000-10000 characters
 *
 * Business flow:
 * 1. Validate payload shape and source_text length.
 * 2. Ensure the caller is authenticated with Supabase Auth.
 * 3. Trigger AI flashcard proposal generation through GenerationService.
 * 4. Persist metadata + error logs via Supabase.
 * 5. Return generated proposals and metadata.
 */
const generationRequestSchema = z.object({
  source_text: z
    .string({
      required_error: "`source_text` is required.",
      invalid_type_error: "`source_text` must be a string.",
    })
    .trim()
    .min(
      SOURCE_TEXT_MIN_LENGTH,
      `source_text must be at least ${SOURCE_TEXT_MIN_LENGTH} characters.`,
    )
    .max(
      SOURCE_TEXT_MAX_LENGTH,
      `source_text must be at most ${SOURCE_TEXT_MAX_LENGTH} characters.`,
    ),
});

class ApiError extends Error {
  public readonly status: number;
  public readonly detail?: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Parses and validates the POST payload with zod before dispatching business logic.
 */
async function parseRequestBody(
  request: Request,
): Promise<GenerationCreateCommand> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }

  const result = generationRequestSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => issue.message);
    throw new ApiError(400, "Invalid request payload.", issues);
  }

  return result.data;
}

/**
 * Ensures the request is authenticated and returns the Supabase user.
 * Throws ApiError if user is not authenticated.
 */
async function getAuthenticatedUser(locals: App.Locals): Promise<User> {
  if (!locals.user) {
    throw new ApiError(401, "Unauthorized. Please log in.");
  }

  // Return a User object with the authenticated user's data
  return {
    id: locals.user.id,
    app_metadata: {},
    user_metadata: {},
    aud: "",
    created_at: "",
    email: locals.user.email || "",
    phone: "",
    role: "",
    confirmed_at: "",
    last_sign_in_at: "",
    updated_at: "",
    identities: [],
  } as User;
}

/**
 * Translates thrown errors into HTTP responses and logs unexpected issues.
 */
function handleError(error: unknown): Response {
  // eslint-disable-next-line no-console
  console.error("API Error:", error);

  if (error instanceof ApiError) {
    return Response.json(
      {
        error: error.message,
        details: error.detail,
      },
      { status: error.status },
    );
  }

  if (error instanceof GenerationServiceError) {
    // eslint-disable-next-line no-console
    console.error(
      "GenerationServiceError:",
      error.message,
      "Code:",
      error.code,
      "Cause:",
      error.cause,
    );
    return Response.json(
      {
        error: "Unable to process generation at this time.",
        debug: error.message,
      },
      { status: 500 },
    );
  }

  // eslint-disable-next-line no-console
  console.error("Unexpected error:", error);
  return Response.json(
    { error: "Internal server error.", debug: String(error) },
    { status: 500 },
  );
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const command = await parseRequestBody(request);
    const user = await getAuthenticatedUser(locals);

    const generationService = createGenerationService(locals.supabase);
    const result = await generationService.createGeneration(command, {
      userId: user.id,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
};

function createGenerationService(supabase: SupabaseClient): GenerationService {
  const configuredModel = import.meta.env.OPENROUTER_MODEL?.trim();
  const openRouter = new OpenRouterService({
    apiKey: import.meta.env.OPENROUTER_API_KEY,
    model: configuredModel || undefined,
    logger: console,
  });

  return new GenerationService(
    supabase,
    configuredModel ? { model: configuredModel } : undefined,
    openRouter,
  );
}

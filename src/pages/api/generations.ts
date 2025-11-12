import type { APIRoute } from "astro";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";

import {
  GenerationService,
  GenerationServiceError,
} from "../../lib/generation.service";
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
 */
async function getAuthenticatedUser(locals: App.Locals): Promise<User> {
  const { data, error } = await locals.supabase.auth.getUser();
  if (error) {
    throw new ApiError(401, "Invalid authentication token.");
  }

  const user = data?.user;
  if (!user) {
    throw new ApiError(401, "Authentication required.");
  }

  return user;
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

    const generationService = new GenerationService(locals.supabase);
    const result = await generationService.createGeneration(command, {
      userId: user.id,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
};

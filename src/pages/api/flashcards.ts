import type { APIRoute } from "astro";
import type { User } from "@supabase/supabase-js";

import {
  FlashcardService,
  FlashcardServiceError,
} from "../../lib/flashcard.service";
import { flashcardsRequestSchema } from "../../lib/flashcard.schema";
import type { CreateFlashcardsCommand } from "../../types";

export const prerender = false;


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
): Promise<CreateFlashcardsCommand> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }

  const result = flashcardsRequestSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      message: issue.message,
      path: issue.path,
    }));
    throw new ApiError(400, "Invalid request payload.", issues);
  }

  return result.data;
}

/**
 * Ensures the incoming request is authenticated with Supabase Auth.
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
 * Translates thrown errors into structured HTTP responses.
 */
function handleError(error: unknown): Response {
  // eslint-disable-next-line no-console
  console.error("POST /flashcards error:", error);

  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message, details: error.detail },
      { status: error.status },
    );
  }

  if (error instanceof FlashcardServiceError) {
    const status =
      error.code === "VALIDATION_FAILURE" ? 400 : 500;
    return Response.json(
      {
        error: error.message,
        code: error.code,
        details: error.detail,
      },
      { status },
    );
  }

  return Response.json(
    { error: "Internal server error.", debug: String(error) },
    { status: 500 },
  );
}

/**
 * POST /flashcards
 *
 * Creates one or more flashcards owned by the authenticated user.
 * - Validates payload shape and field constraints.
 * - Verifies Supabase authentication.
 * - Delegates persistence to FlashcardService for batch insert + ownership checks.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const command = await parseRequestBody(request);
    const user = await getAuthenticatedUser(locals);

    const flashcardService = new FlashcardService(locals.supabase);
    const result = await flashcardService.createFlashcards(command, {
      userId: user.id,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
};

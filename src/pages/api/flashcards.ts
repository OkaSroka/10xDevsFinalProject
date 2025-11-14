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
 * Translates thrown errors into structured HTTP responses.
 */
function handleError(error: unknown): Response {
  console.error("POST /flashcards error:", error);

  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message, details: error.detail },
      { status: error.status },
    );
  }

  if (error instanceof FlashcardServiceError) {
    const status = error.code === "VALIDATION_FAILURE" ? 400 : 500;
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
 * GET /flashcards
 * Retrieves all flashcards for the authenticated user
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    const user = await getAuthenticatedUser(locals);

    if (!locals.supabase) {
      return Response.json(
        { error: "Supabase not initialized" },
        { status: 500 },
      );
    }

    const { data, error } = await locals.supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return Response.json(
        { error: error.message, details: error },
        { status: 500 },
      );
    }

    return Response.json({ flashcards: data || [], count: data?.length || 0 });
  } catch (error) {
    return handleError(error);
  }
};

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
    // eslint-disable-next-line no-console
    console.log("POST /flashcards - Starting request processing");

    // eslint-disable-next-line no-console
    console.log(
      "POST /flashcards - locals.supabase exists:",
      !!locals.supabase,
    );

    const command = await parseRequestBody(request);
    // eslint-disable-next-line no-console
    console.log(
      "POST /flashcards - Parsed request body:",
      JSON.stringify(command),
    );

    const user = await getAuthenticatedUser(locals);
    // eslint-disable-next-line no-console
    console.log("POST /flashcards - Authenticated user:", user.id);

    if (!locals.supabase) {
      console.error("POST /flashcards - locals.supabase is undefined!");
      throw new Error("Supabase client not initialized");
    }

    const flashcardService = new FlashcardService(locals.supabase);
    const result = await flashcardService.createFlashcards(command, {
      userId: user.id,
    });

    // eslint-disable-next-line no-console
    console.log("POST /flashcards - Successfully created flashcards");
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
};

import type { APIRoute } from "astro";
import type { User } from "@supabase/supabase-js";

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

async function getAuthenticatedUser(locals: App.Locals): Promise<User> {
  if (!locals.user) {
    throw new ApiError(401, "Unauthorized. Please log in.");
  }

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

function parseFlashcardId(rawId: string | undefined): number {
  if (!rawId) {
    throw new ApiError(400, "Flashcard id is required.");
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "Flashcard id must be a positive integer.");
  }

  return id;
}

function handleError(error: unknown): Response {
  console.error("DELETE /flashcards/:id error:", error);

  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message, details: error.detail },
      { status: error.status },
    );
  }

  return Response.json(
    { error: "Internal server error.", debug: String(error) },
    { status: 500 },
  );
}

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const user = await getAuthenticatedUser(locals);
    const flashcardId = parseFlashcardId(params?.flashcardId);

    if (!locals.supabase) {
      throw new ApiError(500, "Supabase client is not initialized.");
    }

    const queryBuilder = locals.supabase
      .from("flashcards")
      .delete()
      .eq("id", flashcardId)
      .eq("user_id", user.id)
      .select("id");

    const { data, error } = await queryBuilder.maybeSingle();

    if (error) {
      throw new ApiError(500, "Failed to delete flashcard.", error);
    }

    if (!data) {
      throw new ApiError(404, "Flashcard not found.");
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
};

import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, locals }) => {
  try {
    // Get runtime env from locals (undefined in local dev)
    const runtimeEnv = locals.runtime?.env;

    const supabase = createSupabaseServerInstance(runtimeEnv, {
      cookies,
      headers: request.headers,
    });

    const { error } = await supabase.auth.signOut();

    if (error) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code || "AUTH_ERROR",
        }),
        { status: 400 },
      );
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: "/auth/login",
      },
    });
  } catch (error) {
    console.error("Logout error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      }),
      { status: 500 },
    );
  }
};

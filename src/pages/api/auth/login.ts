import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const body = await request.json();

    // Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: result.error.errors[0].message,
          code: "VALIDATION_ERROR",
        }),
        { status: 400 },
      );
    }

    const { email, password } = result.data;

    // Get runtime env from locals (undefined in local dev)
    const runtimeEnv = locals.runtime?.env;

    const supabase = createSupabaseServerInstance(runtimeEnv, {
      cookies,
      headers: request.headers,
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowy adres email lub hasło",
          code: error.code || "AUTH_ERROR",
        }),
        { status: 401 },
      );
    }

    return new Response(
      JSON.stringify({
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      }),
      { status: 500 },
    );
  }
};

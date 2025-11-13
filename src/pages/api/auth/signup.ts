import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();

    // Validate input
    const result = signupSchema.safeParse(body);
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

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/login`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        return new Response(
          JSON.stringify({
            error: "An account with this email already exists",
            code: "USER_EXISTS",
          }),
          { status: 400 },
        );
      }

      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code || "AUTH_ERROR",
        }),
        { status: 400 },
      );
    }

    return new Response(
      JSON.stringify({
        message:
          "Konto utworzone pomyślnie! Sprawdź swoją skrzynkę email i potwierdź adres.",
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Signup error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      }),
      { status: 500 },
    );
  }
};

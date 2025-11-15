import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { z } from "zod";

// Helper to get site URL from env or request
function getSiteUrl(
  request: Request,
  runtimeEnv?: { SITE_URL?: string },
): string {
  // Try runtime env first (Cloudflare production)
  if (runtimeEnv?.SITE_URL) {
    return runtimeEnv.SITE_URL;
  }
  // Fallback to import.meta.env for local dev
  if (import.meta.env.SITE_URL) {
    return import.meta.env.SITE_URL;
  }
  // Final fallback to request origin
  return new URL(request.url).origin;
}

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
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

    // Get runtime env from locals (undefined in local dev)
    const runtimeEnv = locals.runtime?.env;

    const supabase = createSupabaseServerInstance(runtimeEnv, {
      cookies,
      headers: request.headers,
    });

    const siteUrl = getSiteUrl(request, runtimeEnv);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/login`,
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

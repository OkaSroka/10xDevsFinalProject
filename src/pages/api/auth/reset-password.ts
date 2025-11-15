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

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const body = await request.json();

    // Validate input
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: result.error.errors[0].message,
          code: "VALIDATION_ERROR",
        }),
        { status: 400 },
      );
    }

    const { email } = result.data;

    // Get runtime env from locals (undefined in local dev)
    const runtimeEnv = locals.runtime?.env;

    const supabase = createSupabaseServerInstance(runtimeEnv, {
      cookies,
      headers: request.headers,
    });

    const siteUrl = getSiteUrl(request, runtimeEnv);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/reset-password`,
    });

    // Always return success to prevent email enumeration
    if (error) {
      console.error("Password reset error:", error);
    }

    return new Response(
      JSON.stringify({
        message:
          "Jeśli konto istnieje z tym adresem email, link resetowania hasła został wysłany.",
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      }),
      { status: 500 },
    );
  }
};

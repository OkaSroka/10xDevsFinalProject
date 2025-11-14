import type { APIRoute } from "astro";
import { z } from "zod";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const prerender = false;

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków."),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const result = updatePasswordSchema.safeParse(body);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: result.error.errors[0]?.message || "Nieprawidłowe dane.",
        }),
        { status: 400 },
      );
    }

    const { password } = result.data;

    // Use server instance to get the current session
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Update the password (session was already created by Supabase redirect)
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      let errorMessage = error.message;

      // Translate common Supabase error messages to Polish
      if (
        error.message.includes(
          "New password should be different from the old password",
        )
      ) {
        errorMessage = "Nowe hasło musi być inne niż poprzednie.";
      }

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
      });
    }

    return new Response(
      JSON.stringify({ message: "Hasło zmienione pomyślnie!" }),
      { status: 200 },
    );
  } catch {
    return new Response(
      JSON.stringify({
        error: "Wystąpił błąd podczas przetwarzania żądania.",
      }),
      { status: 500 },
    );
  }
};

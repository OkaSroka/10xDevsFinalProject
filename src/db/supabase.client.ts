import { createClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "../db/database.types";

// Type for Cloudflare runtime env
interface RuntimeEnv {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
}

// Helper function to get env variables - supports both Cloudflare runtime and local dev
function getEnv(runtimeEnv?: RuntimeEnv) {
  // Try runtime env first (Cloudflare)
  if (runtimeEnv?.SUPABASE_URL && runtimeEnv?.SUPABASE_KEY) {
    return {
      SUPABASE_URL: runtimeEnv.SUPABASE_URL,
      SUPABASE_KEY: runtimeEnv.SUPABASE_KEY,
    };
  }

  // Fallback to import.meta.env for local development
  if (import.meta.env.SUPABASE_URL && import.meta.env.SUPABASE_KEY) {
    return {
      SUPABASE_URL: import.meta.env.SUPABASE_URL,
      SUPABASE_KEY: import.meta.env.SUPABASE_KEY,
    };
  }

  throw new Error(
    "Missing required environment variables: SUPABASE_URL and SUPABASE_KEY must be set",
  );
}

// Helper function to create a basic Supabase client with runtime env
export function createSupabaseClient(env?: RuntimeEnv) {
  const { SUPABASE_URL, SUPABASE_KEY } = getEnv(env);
  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      flowType: "pkce",
    },
  });
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;

// Cookie options for SSR
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

// Parse cookie header string into array of cookie objects
function parseCookieHeader(
  cookieHeader: string,
): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

// Create Supabase server instance for SSR with proper cookie handling
export const createSupabaseServerInstance = (
  env: RuntimeEnv | undefined,
  context: {
    headers: Headers;
    cookies: AstroCookies;
  },
) => {
  // Validate context
  if (!context || !context.headers || !context.cookies) {
    throw new Error(
      "Invalid context: headers and cookies are required for server instance",
    );
  }

  const { SUPABASE_URL, SUPABASE_KEY } = getEnv(env);

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookieOptions,
    auth: {
      flowType: "pkce",
    },
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          context.cookies.set(name, value, options),
        );
      },
    },
  });

  return supabase;
};

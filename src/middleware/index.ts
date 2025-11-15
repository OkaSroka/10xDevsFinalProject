import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";

// Auth pages - redirect to home if logged in
const AUTH_PAGES = ["/auth/login", "/auth/signup"];

// Pages that should be accessible regardless of auth state
const PUBLIC_PAGES = ["/auth/reset-password"];

// API endpoints that don't require auth check
const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/reset-password",
  "/api/auth/update-password",
  "/api/auth/logout",
];

export const onRequest = defineMiddleware(
  async ({ locals, cookies, url, request, redirect }, next) => {
    console.log(`[Middleware] ${request.method} ${url.pathname}`);
    console.log("[Middleware] Has runtime:", !!locals.runtime);

    // Get Cloudflare runtime env (undefined in local dev)
    const runtimeEnv = locals.runtime?.env;
    console.log("[Middleware] Has runtime env:", !!runtimeEnv);

    try {
      // Create server instance with proper cookie handling for SSR
      console.log("[Middleware] Creating Supabase instance...");
      const supabase = createSupabaseServerInstance(runtimeEnv, {
        cookies,
        headers: request.headers,
      });
      console.log("[Middleware] Supabase instance created");

      // Make supabase available in all routes
      locals.supabase = supabase;
    } catch (error) {
      console.error("[Middleware] Error creating Supabase instance:", error);
      throw error;
    }

    // Skip auth check for API endpoints
    if (PUBLIC_API_PATHS.includes(url.pathname)) {
      return next();
    }

    // Skip auth check for public pages
    if (PUBLIC_PAGES.includes(url.pathname)) {
      return next();
    }

    // Get user session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // User is logged in
    if (user) {
      locals.user = {
        email: user.email,
        id: user.id,
      };

      // Redirect logged-in users away from auth pages to home
      if (AUTH_PAGES.includes(url.pathname)) {
        return redirect("/");
      }
    } else {
      // User is NOT logged in
      // Redirect to login for all pages except auth pages
      if (!AUTH_PAGES.includes(url.pathname)) {
        return redirect("/auth/login");
      }
    }

    return next();
  },
);

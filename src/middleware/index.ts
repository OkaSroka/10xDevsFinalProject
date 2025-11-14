import { defineMiddleware } from "astro:middleware";
import {
  supabaseClient,
  createSupabaseServerInstance,
} from "../db/supabase.client";

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
    // Make supabase available in all routes
    locals.supabase = supabaseClient;

    // Skip auth check for API endpoints
    if (PUBLIC_API_PATHS.includes(url.pathname)) {
      return next();
    }

    // Skip auth check for public pages
    if (PUBLIC_PAGES.includes(url.pathname)) {
      return next();
    }

    // Create server instance for session verification
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

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

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const runtimeEnv = locals.runtime?.env;

  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env_check: {
      has_runtime: !!locals.runtime,
      has_runtime_env: !!runtimeEnv,
      has_supabase_url: !!runtimeEnv?.SUPABASE_URL,
      has_supabase_key: !!runtimeEnv?.SUPABASE_KEY,
      has_openrouter_key: !!runtimeEnv?.OPENROUTER_API_KEY,
      has_site_url: !!runtimeEnv?.SITE_URL,
      site_url_value: runtimeEnv?.SITE_URL || "not set",
      // Don't expose actual keys, just check if they exist
      openrouter_key_prefix: runtimeEnv?.OPENROUTER_API_KEY
        ? runtimeEnv.OPENROUTER_API_KEY.substring(0, 10) + "..."
        : "not set",
    },
    import_meta_env: {
      has_supabase_url: !!import.meta.env.SUPABASE_URL,
      has_openrouter_key: !!import.meta.env.OPENROUTER_API_KEY,
    },
  });
};

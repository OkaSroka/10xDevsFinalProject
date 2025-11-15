// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

// Cloudflare runtime environment type
interface CloudflareRuntime {
  env: {
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
    OPENROUTER_API_KEY: string;
    OPENROUTER_MODEL?: string;
    SITE_URL?: string;
  };
}

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: {
        id: string;
        email?: string;
      };
      runtime: CloudflareRuntime;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_MODEL?: string;
  readonly SITE_URL?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

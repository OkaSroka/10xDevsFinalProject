import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL and SUPABASE_KEY must be set",
  );
}

export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);

export type SupabaseClient = typeof supabaseClient;

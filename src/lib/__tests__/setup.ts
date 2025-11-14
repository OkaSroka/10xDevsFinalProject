import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock environment variables
vi.stubGlobal(
  "import.meta.env",
  Object.assign({}, import.meta.env, {
    PUBLIC_SUPABASE_URL: "http://localhost:54321",
    PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    OPENROUTER_API_KEY: "test-api-key",
  }),
);

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { APIContext } from "astro";

// Mock the Supabase client module before imports
const mockSignInWithPassword = vi.fn();
vi.mock("../../../../db/supabase.client", () => ({
  createSupabaseServerInstance: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

import { POST } from "../login";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login successfully with valid credentials", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
    };

    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    const cookies = {} as APIContext["cookies"];
    const locals = {} as APIContext["locals"];
    const response = await POST({
      request,
      cookies,
      locals,
    } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).toEqual(mockUser);
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });

  it("should return 400 for invalid email", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "invalid-email",
        password: "password123",
      }),
    });

    const cookies = {} as APIContext["cookies"];
    const locals = {} as APIContext["locals"];
    const response = await POST({
      request,
      cookies,
      locals,
    } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("Invalid email");
  });

  it("should return 400 for short password", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "short",
      }),
    });

    const cookies = {} as APIContext["cookies"];
    const locals = {} as APIContext["locals"];
    const response = await POST({
      request,
      cookies,
      locals,
    } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("at least 8 characters");
  });

  it("should return 401 for invalid credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: "invalid_credentials", message: "Invalid login" },
    });

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "wrongpassword",
      }),
    });

    const cookies = {} as APIContext["cookies"];
    const locals = {} as APIContext["locals"];
    const response = await POST({
      request,
      cookies,
      locals,
    } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Nieprawidłowy adres email lub hasło");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the Supabase client module before imports
const mockSignUp = vi.fn();
vi.mock("../../../../db/supabase.client", () => ({
  createSupabaseServerInstance: () => ({
    auth: {
      signUp: mockSignUp,
    },
  }),
}));

import { POST } from "../signup";

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should signup successfully with valid credentials", async () => {
    const mockUser = {
      id: "user-123",
      email: "newuser@example.com",
    };

    mockSignUp.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "newuser@example.com",
        password: "password123",
      }),
    });

    const cookies = {} as any;
    const response = await POST({ request, cookies } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).toEqual(mockUser);
    expect(data.message).toContain("utworzone pomyślnie");
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "newuser@example.com",
      password: "password123",
      options: {
        emailRedirectTo: "http://localhost/auth/login",
      },
    });
  });

  it("should return 400 for invalid email", async () => {
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-an-email",
        password: "password123",
      }),
    });

    const cookies = {} as any;
    const response = await POST({ request, cookies } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("Invalid email");
  });

  it("should return 400 for short password", async () => {
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "short",
      }),
    });

    const cookies = {} as any;
    const response = await POST({ request, cookies } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.error).toContain("at least 8 characters");
  });

  it("should return 400 when user already exists", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: {
        code: "user_already_exists",
        message: "User already registered",
      },
    });

    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "existing@example.com",
        password: "password123",
      }),
    });

    const cookies = {} as any;
    const response = await POST({ request, cookies } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("USER_EXISTS");
    expect(data.error).toContain("already exists");
  });

  it("should return 400 on other auth errors", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: {
        code: "some_error",
        message: "Some auth error",
      },
    });

    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    const cookies = {} as any;
    const response = await POST({ request, cookies } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("some_error");
    expect(data.error).toBe("Some auth error");
  });

});

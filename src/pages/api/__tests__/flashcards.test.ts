import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST } from "../flashcards";
import type { APIContext } from "astro";

describe("GET /api/flashcards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return flashcards for authenticated user", async () => {
    const mockFlashcards = [
      {
        id: 1,
        front: "Question 1",
        back: "Answer 1",
        user_id: "user-123",
        created_at: "2024-01-01",
      },
      {
        id: 2,
        front: "Question 2",
        back: "Answer 2",
        user_id: "user-123",
        created_at: "2024-01-02",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockFlashcards,
              error: null,
            }),
          }),
        }),
      }),
    };

    const locals: any = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: mockSupabase,
    };

    const response = await GET({ locals } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.flashcards).toEqual(mockFlashcards);
    expect(data.count).toBe(2);
    expect(mockSupabase.from).toHaveBeenCalledWith("flashcards");
  });

  it("should return 401 when user is not authenticated", async () => {
    const locals: any = {
      user: null,
      supabase: {},
    };

    const response = await GET({ locals } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain("Unauthorized");
  });

  it("should return 500 when supabase is not initialized", async () => {
    const locals: any = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: null,
    };

    const response = await GET({ locals } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Supabase not initialized");
  });

  it("should return 500 on database error", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      }),
    };

    const locals: any = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: mockSupabase,
    };

    const response = await GET({ locals } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database error");
  });

  it("should return empty array when user has no flashcards", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    };

    const locals: any = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: mockSupabase,
    };

    const response = await GET({ locals } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.flashcards).toEqual([]);
    expect(data.count).toBe(0);
  });
});

describe("POST /api/flashcards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create flashcards successfully", async () => {
    const mockFlashcards = [
      {
        id: 1,
        front: "Test question",
        back: "Test answer",
        source: "manual",
        generation_id: null,
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: mockFlashcards,
            error: null,
          }),
        }),
      }),
    };

    const request = new Request("http://localhost/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flashcards: [
          {
            front: "Test question",
            back: "Test answer",
            source: "manual",
          },
        ],
      }),
    });

    const locals: any = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: mockSupabase,
    };

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      const response = await POST({ request, locals } as APIContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.flashcards).toEqual(mockFlashcards);
    } finally {
      consoleLogSpy.mockRestore();
    }
  });

  it("should return 400 for invalid JSON", async () => {
    const request = new Request("http://localhost/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    const locals: any = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: {},
    };

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await POST({ request, locals } as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("valid JSON");
    } finally {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });

  it("should return 400 for invalid request payload", async () => {
    const request = new Request("http://localhost/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flashcards: [
          {
            front: "", // Empty front is invalid
            back: "Test",
            source: "manual",
          },
        ],
      }),
    });

    const locals: any = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: {},
    };

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await POST({ request, locals } as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid request payload");
    } finally {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });

  it("should return 401 when user is not authenticated", async () => {
    const request = new Request("http://localhost/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flashcards: [
          {
            front: "Test",
            back: "Test",
            source: "manual",
          },
        ],
      }),
    });

    const locals: any = {
      user: null,
      supabase: {},
    };

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await POST({ request, locals } as APIContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    } finally {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });

  it("should return 500 when supabase is not initialized", async () => {
    const request = new Request("http://localhost/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flashcards: [
          {
            front: "Test",
            back: "Test",
            source: "manual",
          },
        ],
      }),
    });

    const locals: any = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: null,
    };

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await POST({ request, locals } as APIContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Internal server error");
    } finally {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });
});

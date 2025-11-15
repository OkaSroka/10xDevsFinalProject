import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST } from "../flashcards";
import { DELETE } from "../flashcards/[flashcardId]";
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

    const locals = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: mockSupabase,
    } as unknown as Pick<APIContext["locals"], "user" | "supabase">;

    const response = await GET({ locals } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.flashcards).toEqual(mockFlashcards);
    expect(data.count).toBe(2);
    expect(mockSupabase.from).toHaveBeenCalledWith("flashcards");
  });

  it("should return 401 when user is not authenticated", async () => {
    const locals = {
      user: null,
      supabase: {},
    } as unknown as Pick<APIContext["locals"], "user" | "supabase">;

    const response = await GET({ locals } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain("Unauthorized");
  });

  it("should return 500 when supabase is not initialized", async () => {
    const locals = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: null,
    } as unknown as Pick<APIContext["locals"], "user" | "supabase">;

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

    const locals = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: mockSupabase,
    } as unknown as Pick<APIContext["locals"], "user" | "supabase">;

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

    const locals = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: mockSupabase,
    } as unknown as Pick<APIContext["locals"], "user" | "supabase">;

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

    const locals = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: mockSupabase,
    } as unknown as Pick<APIContext["locals"], "user" | "supabase">;

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());

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

    const locals = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: {},
    } as unknown as Pick<APIContext["locals"], "user" | "supabase">;

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(vi.fn());

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

    const locals = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: {},
    } as unknown as Pick<APIContext["locals"], "user" | "supabase">;

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(vi.fn());

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

    const locals = {
      user: null,
      supabase: {},
    } as unknown as Pick<APIContext["locals"], "user" | "supabase">;

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(vi.fn());

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

    const locals = {
      user: { id: "user-123", email: "test@example.com" },
      supabase: null,
    } as unknown as Pick<APIContext["locals"], "user" | "supabase">;

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(vi.fn());

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

describe("DELETE /api/flashcards/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete flashcard for authenticated user", async () => {
    const maybeSingleMock = vi
      .fn()
      .mockResolvedValue({ data: { id: 14 }, error: null });

    const eqMock = vi.fn();
    const selectMock = vi
      .fn()
      .mockReturnValue({ maybeSingle: maybeSingleMock });
    const queryBuilder = { eq: eqMock, select: selectMock };
    eqMock.mockReturnValue(queryBuilder);

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue(queryBuilder),
      }),
    };

    const response = await DELETE({
      params: { flashcardId: "14" },
      locals: {
        user: { id: "user-123", email: "test@example.com" },
        supabase: mockSupabase,
      },
    } as unknown as APIContext);

    expect(response.status).toBe(204);
    expect(mockSupabase.from).toHaveBeenCalledWith("flashcards");
    expect(eqMock).toHaveBeenNthCalledWith(1, "id", 14);
    expect(eqMock).toHaveBeenNthCalledWith(2, "user_id", "user-123");
    expect(selectMock).toHaveBeenCalledWith("id");
    expect(maybeSingleMock).toHaveBeenCalledTimes(1);
  });

  it("should return 404 when flashcard does not exist", async () => {
    const maybeSingleMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });

    const eqMock = vi.fn();
    const selectMock = vi
      .fn()
      .mockReturnValue({ maybeSingle: maybeSingleMock });
    const queryBuilder = { eq: eqMock, select: selectMock };
    eqMock.mockReturnValue(queryBuilder);

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue(queryBuilder),
      }),
    };

    const response = await DELETE({
      params: { flashcardId: "99" },
      locals: {
        user: { id: "user-123", email: "test@example.com" },
        supabase: mockSupabase,
      },
    } as unknown as APIContext);

    expect(response.status).toBe(404);
    const payload = await response.json();
    expect(payload.error).toBe("Flashcard not found.");
  });

  it("should return 400 for invalid flashcard id", async () => {
    const response = await DELETE({
      params: { flashcardId: "abc" },
      locals: {
        user: { id: "user-123", email: "test@example.com" },
        supabase: {},
      },
    } as unknown as APIContext);

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toContain("Flashcard id must be a positive integer.");
  });

  it("should return 401 when user is not authenticated", async () => {
    const response = await DELETE({
      params: { flashcardId: "10" },
      locals: {
        user: null,
        supabase: {},
      },
    } as unknown as APIContext);

    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.error).toContain("Unauthorized");
  });

  it("should return 500 when supabase is not initialized", async () => {
    const response = await DELETE({
      params: { flashcardId: "10" },
      locals: {
        user: { id: "user-123", email: "test@example.com" },
        supabase: null,
      },
    } as unknown as APIContext);

    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(payload.error).toContain("Supabase client is not initialized");
  });
});

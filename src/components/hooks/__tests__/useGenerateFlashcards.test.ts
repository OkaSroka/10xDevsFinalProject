import { renderHook, act } from "@testing-library/react";
import { useGenerateFlashcards } from "../useGenerateFlashcards";

describe("useGenerateFlashcards", () => {
  it("should initialize with default state", () => {
    const { result } = renderHook(() => useGenerateFlashcards());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle successful generation", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: "Generated data" }),
    });

    const { result } = renderHook(() => useGenerateFlashcards());

    await act(async () => {
      await result.current.generate({ source_text: "Test text" });
    });

    expect(result.current.data).toEqual({ data: "Generated data" });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle generation error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    const { result } = renderHook(() => useGenerateFlashcards());

    await act(async () => {
      await result.current.generate({ source_text: "Test text" });
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Server error");
    expect(result.current.isLoading).toBe(false);
  });

  it("should reset state", () => {
    const { result } = renderHook(() => useGenerateFlashcards());

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CreateGenerationResponseDto,
  GenerationCreateCommand,
} from "@/types";

interface GenerateState {
  data: CreateGenerationResponseDto | null;
  error: string | null;
  isLoading: boolean;
}

const INITIAL_STATE: GenerateState = {
  data: null,
  error: null,
  isLoading: false,
};

function parseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Wystąpił nieoczekiwany błąd podczas generowania fiszek.";
}

export function useGenerateFlashcards() {
  const [state, setState] = useState<GenerateState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (command: GenerationCreateCommand) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState((previous) => ({
      ...previous,
      error: null,
      isLoading: true,
    }));

    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = `Nie udało się rozpocząć generowania (status ${response.status}).`;
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) {
            message = payload.error;
          }
        } catch {
          // Response body is not JSON - keep default message.
        }

        throw new Error(message);
      }

      const payload = (await response.json()) as CreateGenerationResponseDto;

      setState({
        data: payload,
        error: null,
        isLoading: false,
      });

      return payload;
    } catch (error) {
      if (controller.signal.aborted) {
        return null;
      }

      setState({
        data: null,
        error: parseErrorMessage(error),
        isLoading: false,
      });

      return null;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    generate,
    reset,
  };
}

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { FlashcardSource } from "@/types";

interface SavedFlashcard {
  id: number;
  front: string;
  back: string;
  source: FlashcardSource;
  created_at: string;
  updated_at: string;
}

interface FlashcardsResponse {
  flashcards: SavedFlashcard[];
  count: number;
}

export function MyFlashcardsView() {
  const [flashcards, setFlashcards] = useState<SavedFlashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFlashcards();
  }, []);

  async function fetchFlashcards() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/flashcards");

      if (!response.ok) {
        throw new Error("Failed to fetch flashcards");
      }

      const data: FlashcardsResponse = await response.json();
      setFlashcards(data.flashcards);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Czy na pewno chcesz usunąć tę fiszkę?")) {
      return;
    }

    try {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete flashcard");
      }

      // Remove from local state
      setFlashcards((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete flashcard");
    }
  }

  const getSourceLabel = (source: FlashcardSource) => {
    switch (source) {
      case "ai-full":
        return "AI";
      case "ai-edited":
        return "AI edytowane";
      case "manual":
        return "Ręczne";
      default:
        return source;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400">Ładowanie fiszek...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-center">
        <p className="text-sm text-rose-200">{error}</p>
        <Button
          onClick={fetchFlashcards}
          variant="outline"
          size="sm"
          className="mt-4"
        >
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-12 text-center">
        <p className="text-lg text-slate-300">
          Nie masz jeszcze żadnych zapisanych fiszek.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Przejdź do{" "}
          <a
            href="/generate"
            className="font-semibold text-cyan-400 hover:underline"
          >
            generowania fiszek
          </a>
          , aby stworzyć pierwszą.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Łącznie fiszek:{" "}
          <span className="font-semibold">{flashcards.length}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {flashcards.map((flashcard) => (
          <Card
            key={flashcard.id}
            className="rounded-2xl border-white/10 bg-white/5 shadow-inner shadow-black/30"
            data-test-id={`flashcard-${flashcard.id}`}
          >
            <CardHeader className="flex flex-wrap items-center justify-between gap-3 pb-3">
              <Badge
                variant="outline"
                className="border-white/20 bg-white/10 text-[0.65rem] uppercase tracking-[0.2em] text-white"
              >
                {getSourceLabel(flashcard.source)}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-3 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Pytanie
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {flashcard.front}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Odpowiedź
                </p>
                <p className="mt-1 text-sm text-slate-200">{flashcard.back}</p>
              </div>
            </CardContent>

            <CardFooter className="border-t border-white/10 pt-4">
              <Button
                size="sm"
                variant="ghost"
                className="cursor-pointer text-rose-300 hover:bg-rose-400/45"
                onClick={() => handleDelete(flashcard.id)}
                data-test-id={`delete-flashcard-${flashcard.id}`}
              >
                <Trash2 className="size-4" />
                Usuń
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

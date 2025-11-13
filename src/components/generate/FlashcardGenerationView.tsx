import { useCallback, useEffect, useMemo, useState } from "react";

import { useGenerateFlashcards } from "@/components/hooks/useGenerateFlashcards";
import {
  FLASHCARD_BACK_MAX_LENGTH,
  FLASHCARD_FRONT_MAX_LENGTH,
  MAX_FLASHCARDS_PER_REQUEST,
} from "@/lib/flashcard.schema";
import {
  SOURCE_TEXT_MAX_LENGTH,
  SOURCE_TEXT_MIN_LENGTH,
} from "@/lib/generation.constants";
import type { CreateFlashcardsCommand, FlashcardProposalDto } from "@/types";

import { BulkSaveButton } from "./BulkSaveButton";
import { ErrorNotification } from "./ErrorNotification";
import { FlashcardList } from "./FlashcardList";
import { SkeletonLoader } from "./SkeletonLoader";
import { TextInputArea, type TextInputValidationState } from "./TextInputArea";
import type { FlashcardProposalViewModel } from "./types";
import { GenerateButton } from "./GenerateButton";

interface SaveState {
  isSaving: boolean;
  error: string | null;
  success: string | null;
}

const INITIAL_SAVE_STATE: SaveState = {
  isSaving: false,
  error: null,
  success: null,
};

const generateProposalId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `proposal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const mapProposalToViewModel = (
  proposal: FlashcardProposalDto,
): FlashcardProposalViewModel => ({
  id: generateProposalId(),
  front: proposal.front,
  back: proposal.back,
  source: proposal.source,
  status: "pending",
  isEditing: false,
  draftFront: proposal.front,
  draftBack: proposal.back,
});

function validateDraft(
  proposal: FlashcardProposalViewModel,
): FlashcardProposalViewModel["errors"] {
  const errors: FlashcardProposalViewModel["errors"] = {};
  const trimmedFront = proposal.draftFront.trim();
  const trimmedBack = proposal.draftBack.trim();

  if (!trimmedFront) {
    errors.front = "Przod fiszki nie moze byc pusty.";
  } else if (trimmedFront.length > FLASHCARD_FRONT_MAX_LENGTH) {
    errors.front = `Przod moze miec maks ${FLASHCARD_FRONT_MAX_LENGTH} znakow.`;
  }

  if (!trimmedBack) {
    errors.back = "Tyl fiszki nie moze byc pusty.";
  } else if (trimmedBack.length > FLASHCARD_BACK_MAX_LENGTH) {
    errors.back = `Tyl moze miec maks ${FLASHCARD_BACK_MAX_LENGTH} znakow.`;
  }

  return errors;
}

export function FlashcardGenerationView() {
  const [sourceText, setSourceText] = useState("");
  const [validationState, setValidationState] =
    useState<TextInputValidationState>({
      isValid: false,
      status: "idle",
      charactersCount: 0,
      charactersRemaining: SOURCE_TEXT_MAX_LENGTH,
    });
  const [proposals, setProposals] = useState<FlashcardProposalViewModel[]>([]);
  const [saveState, setSaveState] = useState<SaveState>(INITIAL_SAVE_STATE);

  const {
    data: generationData,
    error: generationError,
    isLoading,
    generate,
  } = useGenerateFlashcards();

  const canGenerate = validationState.isValid && !isLoading;
  const acceptedProposals = useMemo(
    () => proposals.filter((proposal) => proposal.status === "accepted"),
    [proposals],
  );
  const hasEditingProposal = proposals.some((proposal) => proposal.isEditing);

  useEffect(() => {
    if (!generationData) {
      setProposals([]);
      return;
    }

    setProposals(
      generationData.flashcards_proposals.map(mapProposalToViewModel),
    );
    setSaveState(INITIAL_SAVE_STATE);
  }, [generationData]);

  const handleSourceTextChange = useCallback((nextValue: string) => {
    setSourceText(nextValue);
  }, []);

  const handleValidationChange = useCallback(
    (state: TextInputValidationState) => {
      setValidationState(state);
    },
    [],
  );

  const handleGenerateClick = useCallback(async () => {
    if (!validationState.isValid) {
      return;
    }

    await generate({
      source_text: sourceText.trim(),
    });
  }, [generate, sourceText, validationState.isValid]);

  const handleToggleAccept = useCallback((id: string) => {
    setProposals((current) =>
      current.map((proposal) =>
        proposal.id === id
          ? {
              ...proposal,
              status: proposal.status === "accepted" ? "pending" : "accepted",
            }
          : proposal,
      ),
    );
  }, []);

  const handleReject = useCallback((id: string) => {
    setProposals((current) => current.filter((proposal) => proposal.id !== id));
  }, []);

  const handleStartEdit = useCallback((id: string) => {
    setProposals((current) =>
      current.map((proposal) =>
        proposal.id === id
          ? {
              ...proposal,
              isEditing: true,
              draftFront: proposal.front,
              draftBack: proposal.back,
              errors: undefined,
            }
          : proposal,
      ),
    );
  }, []);

  const handleCancelEdit = useCallback((id: string) => {
    setProposals((current) =>
      current.map((proposal) =>
        proposal.id === id
          ? {
              ...proposal,
              isEditing: false,
              draftFront: proposal.front,
              draftBack: proposal.back,
              errors: undefined,
            }
          : proposal,
      ),
    );
  }, []);

  const handleDraftChange = useCallback(
    (id: string, draft: { front?: string; back?: string }) => {
      setProposals((current) =>
        current.map((proposal) =>
          proposal.id === id
            ? {
                ...proposal,
                draftFront: draft.front ?? proposal.draftFront,
                draftBack: draft.back ?? proposal.draftBack,
                errors: {
                  front:
                    draft.front !== undefined
                      ? undefined
                      : proposal.errors?.front,
                  back:
                    draft.back !== undefined
                      ? undefined
                      : proposal.errors?.back,
                },
              }
            : proposal,
        ),
      );
    },
    [],
  );

  const handleSaveEdit = useCallback((id: string) => {
    setProposals((current) =>
      current.map((proposal) => {
        if (proposal.id !== id) {
          return proposal;
        }

        const errors = validateDraft(proposal);
        if (errors && (errors.front || errors.back)) {
          return { ...proposal, errors };
        }

        const trimmedFront = proposal.draftFront.trim();
        const trimmedBack = proposal.draftBack.trim();
        const sourceChanged =
          trimmedFront !== proposal.front || trimmedBack !== proposal.back;

        return {
          ...proposal,
          front: trimmedFront,
          back: trimmedBack,
          draftFront: trimmedFront,
          draftBack: trimmedBack,
          isEditing: false,
          errors: undefined,
          source:
            sourceChanged && proposal.source === "ai-full"
              ? "ai-edited"
              : proposal.source,
        };
      }),
    );
  }, []);

  const generationStatus = useMemo(() => {
    if (isLoading) {
      return "Trwa generowanie propozycji fiszek...";
    }

    if (proposals.length) {
      return `Otrzymano ${proposals.length} propozycji AI.`;
    }

    switch (validationState.status) {
      case "valid":
        return "Tekst spełnia wymagania, możesz rozpocząć generowanie.";
      case "too-long":
        return "Tekst przekracza dozwolony limit znaków.";
      case "too-short":
        return "Dodaj więcej treści, aby osiągnąć minimum.";
      default:
        return "Wklej fragment swoich notatek, aby rozpocząć.";
    }
  }, [isLoading, proposals.length, validationState.status]);

  const statusTone = useMemo(() => {
    if (isLoading) {
      return "text-sky-300";
    }

    if (proposals.length) {
      return "text-cyan-300";
    }

    switch (validationState.status) {
      case "valid":
        return "text-emerald-300";
      case "too-long":
        return "text-rose-300";
      case "too-short":
        return "text-amber-300";
      default:
        return "text-slate-300";
    }
  }, [isLoading, proposals.length, validationState.status]);

  const progressPercent = useMemo(() => {
    if (!validationState.charactersCount) {
      return 0;
    }

    const ratio = validationState.charactersCount / SOURCE_TEXT_MAX_LENGTH;
    return Math.min(100, Math.round(ratio * 100));
  }, [validationState.charactersCount]);

  const charactersLabel = useMemo(() => {
    const formattedCount =
      validationState.charactersCount.toLocaleString("pl-PL");
    const formattedMax = SOURCE_TEXT_MAX_LENGTH.toLocaleString("pl-PL");
    return `${formattedCount} / ${formattedMax}`;
  }, [validationState.charactersCount]);

  const saveProposals = useCallback(
    async (items: FlashcardProposalViewModel[]) => {
      if (!items.length) {
        return;
      }

      if (!generationData?.generation_id) {
        setSaveState({
          isSaving: false,
          error: "Brak aktywnej generacji do zapisu fiszek.",
          success: null,
        });
        return;
      }

      if (items.length > MAX_FLASHCARDS_PER_REQUEST) {
        setSaveState({
          isSaving: false,
          error: `Jednorazowo mozesz zapisac maks ${MAX_FLASHCARDS_PER_REQUEST} fiszek.`,
          success: null,
        });
        return;
      }

      const command: CreateFlashcardsCommand = {
        flashcards: items.map((proposal) => ({
          front: proposal.front.trim(),
          back: proposal.back.trim(),
          source: proposal.source,
          generation_id: generationData.generation_id,
        })),
      };

      setSaveState({ isSaving: true, error: null, success: null });

      try {
        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          let message = `Nie udalo sie zapisac fiszek (status ${response.status}).`;
          try {
            const payload = (await response.json()) as { error?: string };
            if (payload?.error) {
              message = payload.error;
            }
          } catch {
            // Keep default message if parsing fails.
          }

          throw new Error(message);
        }

        const savedIds = new Set(items.map((proposal) => proposal.id));
        setProposals((current) =>
          current.filter((proposal) => !savedIds.has(proposal.id)),
        );

        setSaveState({
          isSaving: false,
          error: null,
          success: `Zapisano ${items.length} fiszek.`,
        });
      } catch (error) {
        setSaveState({
          isSaving: false,
          error:
            error instanceof Error
              ? error.message
              : "Nie udalo sie zapisac fiszek.",
          success: null,
        });
      }
    },
    [generationData],
  );

  const handleSaveAccepted = useCallback(() => {
    saveProposals(acceptedProposals);
  }, [acceptedProposals, saveProposals]);

  const handleSaveAll = useCallback(() => {
    saveProposals(proposals);
  }, [proposals, saveProposals]);

  const bulkSaveDisabled =
    isLoading || hasEditingProposal || proposals.length === 0;

  return (
    <div className="space-y-10 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-6">
            <TextInputArea
              value={sourceText}
              onChange={handleSourceTextChange}
              onValidityChange={handleValidationChange}
              minCharacters={SOURCE_TEXT_MIN_LENGTH}
              maxCharacters={SOURCE_TEXT_MAX_LENGTH}
              placeholder="Wklej tutaj swoje notatki, raport lub fragment książki..."
              disabled={isLoading}
            />

            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <GenerateButton
                  onClick={handleGenerateClick}
                  disabled={!canGenerate}
                  isLoading={isLoading}
                />
                <p className="text-sm text-slate-300">
                  Generowanie dostepne dla tekstu w przedziale 1000-10000
                  znakow.
                </p>
              </div>
              {generationError ? (
                <ErrorNotification
                  title="Generowanie nie powiodlo sie"
                  message={generationError}
                />
              ) : (
                <p className="text-sm text-slate-400">
                  Przygotuj tekst i kliknij przycisk, aby otrzymac propozycje od
                  AI.
                </p>
              )}
            </div>
          </div>

          <aside className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-slate-950/40 p-5 shadow-inner shadow-black/30 lg:self-start">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Status
              </p>
              <p
                className={`mt-2 text-base font-medium leading-snug ${statusTone}`}
                aria-live="polite"
              >
                {generationStatus}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Zakres znakow</span>
                <span>
                  {SOURCE_TEXT_MIN_LENGTH.toLocaleString("pl-PL")} -{" "}
                  {SOURCE_TEXT_MAX_LENGTH.toLocaleString("pl-PL")}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-slate-300">Wklejone znaki</span>
                <span className="text-white">{charactersLabel}</span>
              </div>
            </div>

            {generationData ? (
              <div className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-slate-200">
                <p className="font-semibold text-white">
                  Ostatnia generacja #{generationData.generation_id}
                </p>
                <p className="mt-1 text-slate-300">
                  Liczba propozycji: {generationData.generated_count}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-sm text-slate-300">
                Kolejne kroki (generowanie, przegląd fiszek i zapis) pojawią się
                tutaj, gdy tekst będzie gotowy.
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-6 shadow-inner shadow-black/40">
        <header className="text-center space-y-2">
          <p className="text-lg font-semibold text-white">
            Propozycje fiszek AI
          </p>
          <p className="text-sm text-slate-300">
            Zarządzaj propozycjami, edytuj je oraz zaakceptuj przed zapisem w
            bazie.
          </p>
        </header>

        <div className="mt-6 space-y-4">
          <BulkSaveButton
            totalCount={proposals.length}
            acceptedCount={acceptedProposals.length}
            isSaving={saveState.isSaving}
            disabled={bulkSaveDisabled}
            onSaveAccepted={handleSaveAccepted}
            onSaveAll={handleSaveAll}
          />

          {hasEditingProposal && (
            <ErrorNotification
              variant="info"
              message="Zapisanie fiszek bedzie dostepne po zakonczonej edycji wszystkich propozycji."
            />
          )}

          {saveState.error && (
            <ErrorNotification
              title="Nie udalo sie zapisac fiszek"
              message={saveState.error}
            />
          )}

          {saveState.success && (
            <ErrorNotification variant="success" message={saveState.success} />
          )}

          {isLoading ? (
            <SkeletonLoader />
          ) : (
            <FlashcardList
              proposals={proposals}
              onToggleAccept={handleToggleAccept}
              onReject={handleReject}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              onDraftChange={handleDraftChange}
            />
          )}
        </div>
      </section>
    </div>
  );
}

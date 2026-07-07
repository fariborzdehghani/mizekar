"use client";

import {
  archiveLetterInFolder,
  suggestLetterArchiveFolder,
  type LetterArchiveSuggestionResult,
} from "@/src/actions/archiveActions";
import { Archive, Check, Loader2, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface LetterAiArchiveSuggestionButtonProps {
  letterId: number;
}

type Suggestion = Extract<LetterArchiveSuggestionResult, { success: true }>;
const AI_SOLID_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 border border-purple-600 bg-purple-600 text-white transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-purple-600 dark:bg-purple-600 dark:hover:bg-purple-600";
const AI_SOFT_BUTTON_CLASS =
  AI_SOLID_BUTTON_CLASS;

export default function LetterAiArchiveSuggestionButton({
  letterId,
}: LetterAiArchiveSuggestionButtonProps) {
  const router = useRouter();
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuggesting, startSuggestTransition] = useTransition();
  const [isArchiving, startArchiveTransition] = useTransition();

  const handleSuggest = () => {
    setError(null);
    setMessage(null);

    startSuggestTransition(async () => {
      const result = await suggestLetterArchiveFolder(letterId);

      if (!result.success) {
        setSuggestion(null);
        setError(result.error);
        return;
      }

      setSuggestion(result);
    });
  };

  const handleArchive = () => {
    if (!suggestion || suggestion.alreadyArchived) return;

    setError(null);
    setMessage(null);

    startArchiveTransition(async () => {
      const result = await archiveLetterInFolder({
        letterId,
        folderId: suggestion.folderId,
      });

      if (!result.success) {
        setError(result.error || "خطا در بایگانی نامه");
        return;
      }

      setSuggestion((current) =>
        current ? { ...current, alreadyArchived: true } : current
      );
      setMessage(result.message || "نامه بایگانی شد");
      router.refresh();
    });
  };

  const handleClose = () => {
    setSuggestion(null);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={handleSuggest}
        disabled={isSuggesting || isArchiving}
        className={`${AI_SOFT_BUTTON_CLASS} h-10 rounded-lg px-4 text-sm font-medium`}
      >
        {isSuggesting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isSuggesting ? "در حال پیشنهاد..." : "پیشنهاد بایگانی"}
      </button>

      {(suggestion || error || message) && (
        <div
          className="absolute right-0 top-12 z-[1000000] max-h-[calc(100dvh-8rem)] w-[min(28rem,calc(100vw-8rem))] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 pl-12 text-right shadow-lg dark:border-gray-700 dark:bg-gray-900"
          dir="rtl"
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="بستن پیشنهاد بایگانی"
          >
            <X className="h-4 w-4" />
          </button>

          {error && (
            <p className="text-sm leading-6 text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

          {suggestion && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  پوشه پیشنهادی هوش مصنوعی
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                  {suggestion.folderPath || suggestion.folderTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {suggestion.reason}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={suggestion.alreadyArchived || isArchiving}
                  className={`${AI_SOLID_BUTTON_CLASS} h-9 rounded-md px-3 text-sm font-medium`}
                >
                  {isArchiving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : suggestion.alreadyArchived ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  {suggestion.alreadyArchived
                    ? "بایگانی شده"
                    : isArchiving
                      ? "در حال بایگانی..."
                      : "بایگانی در این پوشه"}
                </button>
                <button
                  type="button"
                  onClick={handleSuggest}
                  disabled={isSuggesting || isArchiving}
                  className="h-9 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  پیشنهاد دوباره
                </button>
              </div>
            </div>
          )}

          {message && (
            <p className="mt-3 text-sm leading-6 text-green-700 dark:text-green-300">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

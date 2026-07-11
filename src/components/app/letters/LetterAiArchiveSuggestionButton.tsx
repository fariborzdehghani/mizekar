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
  "inline-flex items-center justify-center gap-2 border border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-400/40 dark:bg-brand-500 dark:hover:bg-brand-600";
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
        className={`${AI_SOFT_BUTTON_CLASS} h-10 rounded-2xl px-4 text-sm font-medium`}
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
          className="liquid-glass-surface absolute right-0 top-12 z-[1000000] max-h-[calc(100vh-8rem)] w-[min(28rem,calc(100vw-8rem))] overflow-y-auto rounded-3xl border p-4 pl-12 text-right shadow-2xl ring-1 ring-brand-500/10"
          dir="rtl"
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition hover:bg-white/45 hover:text-gray-700 dark:hover:bg-white/[0.06] dark:hover:text-white"
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
                  className={`${AI_SOLID_BUTTON_CLASS} h-9 rounded-xl px-3 text-sm font-medium`}
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
                  className="liquid-glass-control h-9 rounded-xl border px-3 text-sm font-medium text-gray-700 transition hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-300 dark:hover:text-brand-300"
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

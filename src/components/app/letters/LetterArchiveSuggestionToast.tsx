"use client";

import {
  archiveLetterInFolder,
  suggestArchiveForUnreadLetterOpen,
  type LetterOpenArchiveSuggestionResult,
} from "@/src/actions/archiveActions";
import {
  notifyAiActivityFinished,
  notifyAiActivityStarted,
} from "@/src/lib/aiActivity";
import { Archive, Check, Loader2, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { MouseEvent, useEffect, useRef, useState, useTransition } from "react";

interface LetterArchiveSuggestionToastProps {
  letterId: number;
}

type Suggestion = Extract<
  LetterOpenArchiveSuggestionResult,
  { success: true; shouldSuggest: true }
>;

export default function LetterArchiveSuggestionToast({
  letterId,
}: LetterArchiveSuggestionToastProps) {
  const router = useRouter();
  // Strict Mode reruns effects in development; reuse the in-flight request so
  // the first unread-to-read transition still drives the visible suggestion.
  const suggestionRequestRef = useRef<{
    letterId: number;
    promise: Promise<LetterOpenArchiveSuggestionResult | null>;
  } | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isArchiving, startArchiveTransition] = useTransition();

  useEffect(() => {
    if (!letterId) return;

    let isActive = true;

    const getSuggestionRequest = () => {
      if (suggestionRequestRef.current?.letterId === letterId) {
        return suggestionRequestRef.current.promise;
      }

      notifyAiActivityStarted();
      const promise = suggestArchiveForUnreadLetterOpen(letterId)
        .catch((suggestionError) => {
          console.error("Auto archive suggestion error:", suggestionError);
          return null;
        })
        .finally(() => {
          notifyAiActivityFinished();
        });

      suggestionRequestRef.current = {
        letterId,
        promise,
      };

      return promise;
    };

    const runSuggestion = async () => {
      setSuggestion(null);
      setMessage(null);
      setError(null);
      setIsVisible(false);

      const result = await getSuggestionRequest();

      if (!isActive) return;

      if (!result) {
        setError("خطا در آماده سازی پیشنهاد بایگانی");
        setMessage(null);
        setIsVisible(true);
        return;
      }

      if (!result.success) {
        setError(result.error);
        setMessage(null);
        setIsVisible(true);
        return;
      }

      if (!result.shouldSuggest) {
        return;
      }

      setSuggestion(result);
      setMessage(null);
      setError(null);
      setIsVisible(true);
    };

    void runSuggestion();

    return () => {
      isActive = false;
    };
  }, [letterId]);

  const handleClose = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    setIsVisible(false);
  };

  const handleArchive = () => {
    if (!suggestion || isArchiving || suggestion.alreadyArchived) {
      return;
    }

    startArchiveTransition(async () => {
      const result = await archiveLetterInFolder({
        letterId,
        folderId: suggestion.folderId,
      });

      if (!result.success) {
        setError(result.error || "خطا در بایگانی نامه");
        setMessage(null);
        return;
      }

      setError(null);
      setMessage(result.message || "نامه بایگانی شد");
      setSuggestion((current) =>
        current ? { ...current, alreadyArchived: true } : current,
      );
      router.refresh();

      window.setTimeout(() => {
        setIsVisible(false);
      }, 2200);
    });
  };

  if (!isVisible) return null;

  const suggestedFolderName =
    suggestion?.folderPath || suggestion?.folderTitle || "";
  const statusText =
    error ||
    message ||
    "";

  return (
    <div
      className="fixed bottom-5 left-5 z-[1000000] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-amber-200 bg-white text-right shadow-xl dark:border-amber-800 dark:bg-gray-900"
      dir="rtl"
      role="status"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
          {isArchiving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : suggestion?.alreadyArchived ? (
            <Check className="h-4 w-4" />
          ) : error ? (
            <X className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1 pe-6">
          {suggestedFolderName && !statusText ? (
            <p className="text-sm leading-6 text-gray-800 dark:text-gray-100">
              پیشنهاد می شود این نامه در پوشه{" "}
              <strong className="font-semibold text-gray-950 dark:text-white">
                {suggestedFolderName}
              </strong>{" "}
              بایگانی شود
            </p>
          ) : (
            <p className="text-sm leading-6 text-gray-700 dark:text-gray-200">
              {statusText}
            </p>
          )}
          {suggestion && !error && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isArchiving || suggestion.alreadyArchived}
              className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-default disabled:opacity-60"
            >
              {isArchiving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : suggestion.alreadyArchived ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              {suggestion.alreadyArchived
                ? "بایگانی شد"
                : isArchiving
                  ? "در حال بایگانی..."
                  : "بایگانی در این پوشه"}
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
        aria-label="بستن پیشنهاد بایگانی"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

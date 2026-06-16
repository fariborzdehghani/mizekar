"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { searchLetters } from "@/src/actions/letterActions";

export interface RelatedLetter {
  id: number;
  title: string | null;
  internal_number: string | null;
  external_number: string | null;
  contentSnippet: string;
  create_date: Date | string | null;
}

interface RelatedLettersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLetters: RelatedLetter[];
  onAddLetter: (letter: RelatedLetter) => void;
  onRemoveLetter: (letterId: number) => void;
  currentLetterId?: number;
}

export default function RelatedLettersModal({
  isOpen,
  onClose,
  selectedLetters,
  onAddLetter,
  onRemoveLetter,
  currentLetterId,
}: RelatedLettersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RelatedLetter[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const getLetterNumber = (letter: RelatedLetter) => {
    return letter.internal_number || letter.external_number || `#${letter.id}`;
  };

  const handleSearch = useCallback(
    async (query: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await searchLetters(query, currentLetterId);
          if (!result.success) throw new Error(result.error || "Search failed");

          const selectedIds = selectedLetters.map((letter) => letter.id);
          setSearchResults(
            result.letters.filter(
              (letter: RelatedLetter) => !selectedIds.includes(letter.id)
            )
          );
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [currentLetterId, selectedLetters]
  );

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
  };

  const handleAddLetter = (letter: RelatedLetter) => {
    onAddLetter(letter);
    setSearchQuery("");
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-gray-900/20 backdrop-blur-sm dark:bg-gray-950/35">
      <div className="mx-4 flex h-[82vh] max-h-180 w-full max-w-3xl flex-col rounded-lg bg-white shadow-lg dark:bg-gray-800">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            نامه های مرتبط
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 transition hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
          <div className="shrink-0">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              جستجو بر اساس شماره، عنوان یا محتوا
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="شماره، عنوان یا بخشی از متن نامه را وارد کنید..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />

              {searchQuery && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                  {isSearching ? (
                    <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                      در حال جستجو...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <ul className="py-1">
                      {searchResults.map((letter) => (
                        <li key={letter.id}>
                          <button
                            type="button"
                            onClick={() => handleAddLetter(letter)}
                            className="group flex w-full items-start justify-between gap-3 px-4 py-3 text-right transition hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-gray-900 dark:text-white">
                                {getLetterNumber(letter)} -{" "}
                                {letter.title || "(بدون عنوان)"}
                              </span>
                              {letter.contentSnippet && (
                                <span className="mt-1 line-clamp-2 block text-xs text-gray-500 dark:text-gray-300">
                                  {letter.contentSnippet}
                                </span>
                              )}
                            </span>
                            <Plus className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-blue-500" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                      نتیجه ای یافت نشد
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              نامه های انتخاب شده ({selectedLetters.length})
            </h3>

            {selectedLetters.length > 0 ? (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-600">
                {selectedLetters.map((letter) => (
                  <div
                    key={letter.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-900/30"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {getLetterNumber(letter)} -{" "}
                        {letter.title || "(بدون عنوان)"}
                      </p>
                      {letter.contentSnippet && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-300">
                          {letter.contentSnippet}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveLetter(letter.id)}
                      className="shrink-0 text-red-500 transition hover:text-red-700 dark:hover:text-red-400"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-48 flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400">
                <p className="text-sm">هنوز نامه مرتبطی انتخاب نشده</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}

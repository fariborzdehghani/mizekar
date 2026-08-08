"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { searchLetters } from "@/src/actions/letterActions";
import { Button, Dialog, IconButton, Input } from "@/src/components/ui";

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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="نامه‌های مرتبط"
      className="h-[82vh]"
      contentClassName="flex flex-col gap-6 overflow-hidden"
      footer={
        <Button type="button" onClick={onClose}>
          بستن
        </Button>
      }
    >
          <div className="shrink-0">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              جستجو بر اساس شماره، عنوان یا محتوا
            </label>
            <div className="relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="شماره، عنوان یا بخشی از متن نامه را وارد کنید..."
              />

              {searchQuery && (
                <div className="liquid-glass-surface absolute left-0 right-0 top-full z-20 mt-2 max-h-44 overflow-y-auto rounded-2xl border border-white/70 py-1 shadow-theme-lg dark:border-white/10">
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
                            className="group flex w-full items-start justify-between gap-3 rounded-xl px-4 py-3 text-right transition hover:bg-brand-500/10 dark:hover:bg-white/5"
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
                            <Plus className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-brand-500" />
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
              <div className="liquid-glass-inset min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl p-3">
                {selectedLetters.map((letter) => (
                  <div
                    key={letter.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-brand-200/70 bg-brand-500/10 px-4 py-3 dark:border-brand-400/20 dark:bg-brand-500/10"
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
                    <IconButton
                      type="button"
                      onClick={() => onRemoveLetter(letter.id)}
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      aria-label={`حذف ${letter.title || `نامه ${letter.id}`}`}
                    >
                      <X className="h-5 w-5" />
                    </IconButton>
                  </div>
                ))}
              </div>
            ) : (
              <div className="liquid-glass-inset flex min-h-48 flex-1 items-center justify-center rounded-2xl border-dashed text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">هنوز نامه مرتبطی انتخاب نشده</p>
              </div>
            )}
          </div>
    </Dialog>
  );
}

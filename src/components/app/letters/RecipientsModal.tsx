"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { searchPersons } from "@/src/actions/letterActions";

interface Person {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  user_id: number | null;
}

interface RecipientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRecipients: Person[];
  onAddRecipient: (person: Person) => void;
  onRemoveRecipient: (personId: number) => void;
  title?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  selectedLabel?: string;
  emptySelectedText?: string;
  closeLabel?: string;
  requireUser?: boolean;
}

export default function RecipientsModal({
  isOpen,
  onClose,
  selectedRecipients,
  onAddRecipient,
  onRemoveRecipient,
  title = "مدیریت گیرندگان نامه",
  searchLabel = "جستجو و اضافه کردن گیرنده",
  searchPlaceholder = "نام شخص را جستجو کنید...",
  selectedLabel = "گیرندگان انتخاب شده",
  emptySelectedText = "هنوز گیرنده‌ای انتخاب نشده",
  closeLabel = "بستن",
  requireUser = false,
}: RecipientsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const getPersonName = (person: Person) => {
    const firstName = person.first_name || "";
    const lastName = person.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim() || `(شخص #${person.id})`;
    const job = person.job?.trim();

    return job ? `${fullName} - ${job}` : fullName;
  };

  const handleSearch = useCallback(async (query: string) => {
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
        const result = await searchPersons(query);
        if (!result.success) throw new Error(result.error || "Search failed");

        const selectedIds = selectedRecipients.map((r) => r.id);
        const persons = requireUser
          ? result.persons.filter(
              (person: Person) =>
                Number.isInteger(Number(person.user_id)) &&
                Number(person.user_id) > 0
            )
          : result.persons;

        setSearchResults(
          persons.filter((person: Person) => !selectedIds.includes(person.id))
        );
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [requireUser, selectedRecipients]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
  };

  const handleAddRecipient = (person: Person) => {
    onAddRecipient(person);
    setSearchQuery("");
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-md dark:bg-slate-950/55">
      <div className="liquid-modal flex h-[82vh] max-h-[720px] w-full max-w-3xl flex-col overflow-hidden rounded-[28px]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/60 px-6 py-4 dark:border-white/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="liquid-glass-control inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-300"
            aria-label={closeLabel}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
          {/* Search Section */}
          <div className="shrink-0">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {searchLabel}
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={searchPlaceholder}
                className="liquid-glass-control w-full rounded-2xl border px-4 py-2.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:text-white"
              />

              {/* Search Results Dropdown */}
              {searchQuery && (
                <div className="liquid-glass-surface absolute left-0 right-0 top-full z-20 mt-2 max-h-44 overflow-y-auto rounded-2xl border border-white/70 py-1 shadow-theme-lg dark:border-white/10">
                  {isSearching ? (
                    <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                      در حال جستجو...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <ul className="py-1">
                      {searchResults.map((person) => (
                        <li key={person.id}>
                          <button
                            type="button"
                            onClick={() => handleAddRecipient(person)}
                            className="group flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-right transition hover:bg-brand-500/10 dark:hover:bg-white/5"
                          >
                            <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">
                              {getPersonName(person)}
                            </span>
                            <Plus className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-brand-500" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                      نتیجه‌ای یافت نشد
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selected Recipients Section */}
          <div className="flex min-h-0 flex-1 flex-col">
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedLabel} ({selectedRecipients.length})
            </h3>

            {selectedRecipients.length > 0 ? (
              <div className="liquid-glass-inset min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl p-3">
                {selectedRecipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200/70 bg-brand-500/10 px-4 py-3 dark:border-brand-400/20 dark:bg-brand-500/10"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">
                      {getPersonName(recipient)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveRecipient(recipient.id)}
                      className="shrink-0 text-red-500 transition hover:text-red-700 dark:hover:text-red-400"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="liquid-glass-inset flex min-h-48 flex-1 items-center justify-center rounded-2xl border-dashed text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">{emptySelectedText}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-white/60 px-6 py-4 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-brand-500 px-6 py-2.5 font-medium text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

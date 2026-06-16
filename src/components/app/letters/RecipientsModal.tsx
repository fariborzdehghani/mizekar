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
    <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-gray-900/20 backdrop-blur-sm dark:bg-gray-950/35">
      <div className="mx-4 flex h-[82vh] max-h-[720px] w-full max-w-3xl flex-col rounded-lg bg-white shadow-lg dark:bg-gray-800">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 transition hover:text-gray-700 dark:hover:text-gray-300"
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
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />

              {/* Search Results Dropdown */}
              {searchQuery && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
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
                            className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">
                              {getPersonName(person)}
                            </span>
                            <Plus className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-blue-500" />
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
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-600">
                {selectedRecipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-900/30"
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
              <div className="flex min-h-48 flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400">
                <p className="text-sm">{emptySelectedText}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

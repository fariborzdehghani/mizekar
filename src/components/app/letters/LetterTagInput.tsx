"use client";

import { searchLetterTags } from "@/src/actions/letterActions";
import {
  MAX_LETTER_TAGS,
  normalizeLetterTagKey,
  normalizeLetterTagName,
  type LetterKeywordTag,
} from "@/src/lib/letterTags";
import { Plus, Search, Tag, X } from "lucide-react";
import { KeyboardEvent, useEffect, useMemo, useState } from "react";

type LetterTagInputProps = {
  selectedTags: LetterKeywordTag[];
  onChange: (tags: LetterKeywordTag[]) => void;
  allowCreate?: boolean;
  disabled?: boolean;
  maxTags?: number;
  name?: string;
  placeholder?: string;
};

export default function LetterTagInput({
  selectedTags,
  onChange,
  allowCreate = true,
  disabled = false,
  maxTags = MAX_LETTER_TAGS,
  name,
  placeholder = "جستجو یا افزودن کلیدواژه",
}: LetterTagInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LetterKeywordTag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const selectedKeys = useMemo(
    () => new Set(selectedTags.map((tag) => normalizeLetterTagKey(tag.name))),
    [selectedTags]
  );
  const trimmedQuery = normalizeLetterTagName(query);
  const canAddMore = selectedTags.length < maxTags;
  const filteredSuggestions = suggestions.filter(
    (tag) => !selectedKeys.has(normalizeLetterTagKey(tag.name))
  );
  const canCreateQuery =
    allowCreate &&
    canAddMore &&
    trimmedQuery &&
    !selectedKeys.has(normalizeLetterTagKey(trimmedQuery)) &&
    !filteredSuggestions.some(
      (tag) => normalizeLetterTagKey(tag.name) === normalizeLetterTagKey(trimmedQuery)
    );

  useEffect(() => {
    if (disabled) return;

    let isCurrent = true;
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      const result = await searchLetterTags(trimmedQuery);

      if (!isCurrent) return;

      setSuggestions(result.success ? result.tags : []);
      setIsSearching(false);
    }, trimmedQuery ? 220 : 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [disabled, trimmedQuery]);

  const addTag = (tag: LetterKeywordTag) => {
    if (disabled || !canAddMore) return;

    const name = normalizeLetterTagName(tag.name);
    const key = normalizeLetterTagKey(name);
    if (!name || !key || selectedKeys.has(key)) return;

    onChange([...selectedTags, { id: tag.id, name }]);
    setQuery("");
    setIsOpen(false);
  };

  const removeTag = (tagName: string) => {
    if (disabled) return;

    const key = normalizeLetterTagKey(tagName);
    onChange(
      selectedTags.filter((tag) => normalizeLetterTagKey(tag.name) !== key)
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();

      if (filteredSuggestions[0]) {
        addTag(filteredSuggestions[0]);
        return;
      }

      if (canCreateQuery) addTag({ name: trimmedQuery });
    }

    if (event.key === "Backspace" && !query && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1].name);
    }
  };

  return (
    <div className="relative">
      {name && (
        <input
          type="hidden"
          name={name}
          value={JSON.stringify(selectedTags.map((tag) => tag.name))}
        />
      )}

      <div
        className={`flex min-h-11 w-full flex-wrap items-center gap-2 rounded-lg border border-app-border bg-white/80 px-3 py-2 text-sm transition focus-within:border-blue-light-500 focus-within:ring-4 focus-within:ring-blue-light-500/10 dark:border-gray-700 dark:bg-gray-900 ${
          disabled ? "opacity-70" : ""
        }`}
      >
        {selectedTags.map((tag) => (
          <span
            key={normalizeLetterTagKey(tag.name)}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-light-200 bg-blue-light-50 px-3 py-1 text-xs font-medium text-blue-light-800 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-200"
          >
            <Tag className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{tag.name}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag.name)}
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-blue-light-700 transition hover:bg-blue-light-100 dark:text-blue-200 dark:hover:bg-blue-500/20"
                title="حذف کلیدواژه"
                aria-label="حذف کلیدواژه"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <div className="flex min-w-40 flex-1 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
              onKeyDown={handleKeyDown}
              disabled={!canAddMore}
              placeholder={canAddMore ? placeholder : "حداکثر تعداد کلیدواژه ثبت شده"}
              className="h-7 min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed dark:text-white"
            />
          </div>
        )}
      </div>

      {isOpen && !disabled && (filteredSuggestions.length > 0 || canCreateQuery) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-lg border border-app-border bg-app-panel py-1 text-right shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
          {isSearching && (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              در حال جستجو...
            </div>
          )}

          {filteredSuggestions.map((tag) => (
            <button
              key={tag.id ?? tag.name}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addTag(tag)}
              className="flex w-full items-center gap-2 px-3 py-2 text-right text-sm text-gray-700 transition hover:bg-blue-light-50 hover:text-blue-light-800 dark:text-gray-200 dark:hover:bg-white/5"
            >
              <Tag className="h-4 w-4 text-blue-light-600" />
              <span className="truncate">{tag.name}</span>
            </button>
          ))}

          {canCreateQuery && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addTag({ name: trimmedQuery })}
              className="flex w-full items-center gap-2 px-3 py-2 text-right text-sm font-medium text-blue-light-700 transition hover:bg-blue-light-50 dark:text-blue-light-300 dark:hover:bg-white/5"
            >
              <Plus className="h-4 w-4" />
              <span className="truncate">افزودن «{trimmedQuery}»</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

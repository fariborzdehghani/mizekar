"use client";

import { ArrowDownUp, Filter, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface InboxListToolbarProps {
  searchQuery?: string;
  searchPlaceholder?: string;
  queryParam?: string;
  onSearchChange?: (value: string) => void;
}

export default function InboxListToolbar({
  searchQuery = "",
  searchPlaceholder = "جستجو در فهرست...",
  queryParam = "q",
  onSearchChange,
}: InboxListToolbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchQuery);
  const sortOrder = searchParams.get("sort") === "asc" ? "asc" : "desc";

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.delete("page");
    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  return (
    <div className="flex min-h-[68px] flex-col gap-3 border-b border-black/5 p-4 dark:border-white/5 sm:flex-row sm:items-center sm:justify-end sm:p-5">
      <div className="flex min-w-0 items-center gap-2 sm:w-auto">
        <div className="relative min-w-0 flex-1 sm:w-64">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--liquid-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              onSearchChange?.(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                updateParams({ [queryParam]: query.trim() || null });
              }
            }}
            className="liquid-glass-keyline h-9 w-full rounded-xl border bg-black/[0.025] pr-9 pl-3 text-[11px] text-[var(--liquid-ink)] outline-none placeholder:text-[var(--liquid-muted)] dark:bg-white/[0.035]"
            placeholder={searchPlaceholder}
          />
        </div>
        <button
          type="button"
          aria-label="فیلتر فهرست"
          className="liquid-glass-keyline grid h-9 w-9 shrink-0 place-items-center rounded-xl border bg-white/40 text-[var(--liquid-muted)] transition hover:text-brand-500 dark:bg-white/[0.035]"
        >
          <Filter className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => updateParams({ sort: sortOrder === "desc" ? "asc" : null })}
          aria-label={sortOrder === "desc" ? "مرتب‌سازی از قدیمی‌ترین" : "مرتب‌سازی از جدیدترین"}
          className="liquid-glass-keyline grid h-9 w-9 shrink-0 place-items-center rounded-xl border bg-white/40 text-[var(--liquid-muted)] transition hover:text-brand-500 dark:bg-white/[0.035]"
        >
          <ArrowDownUp className={`h-3.5 w-3.5 transition ${sortOrder === "asc" ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}

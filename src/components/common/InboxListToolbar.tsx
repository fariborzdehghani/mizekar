"use client";

import { ArrowDownUp, Filter, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { IconButton, Input } from "@/src/components/ui";

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
          <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--liquid-muted)]" />
          <Input
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
            className="ui-control-with-start-icon text-xs"
            placeholder={searchPlaceholder}
          />
        </div>
        <IconButton
          type="button"
          aria-label="فیلتر فهرست"
          size="md"
          variant="secondary"
        >
          <Filter className="h-4 w-4" />
        </IconButton>
        <IconButton
          type="button"
          onClick={() => updateParams({ sort: sortOrder === "desc" ? "asc" : null })}
          aria-label={sortOrder === "desc" ? "مرتب‌سازی از قدیمی‌ترین" : "مرتب‌سازی از جدیدترین"}
          size="md"
          variant="secondary"
        >
          <ArrowDownUp className={`h-4 w-4 transition ${sortOrder === "asc" ? "rotate-180" : ""}`} />
        </IconButton>
      </div>
    </div>
  );
}

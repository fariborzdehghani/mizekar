"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "./ListPagination";
import { Button } from "@/src/components/ui";

interface ClientListPaginationProps {
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
}

export default function ClientListPagination({
  currentPage,
  totalItems,
  onPageChange,
  pageSize = DEFAULT_PAGE_SIZE,
}: ClientListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = Math.min(Math.max(currentPage, 1), totalPages);
  const firstItem = totalItems === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const lastItem = Math.min(activePage * pageSize, totalItems);
  const moveTo = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-3 border-t border-black/5 px-5 py-4 text-xs font-medium text-gray-500 dark:border-white/5 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {totalItems === 0
          ? "موردی برای نمایش وجود ندارد"
          : `نمایش ${firstItem.toLocaleString("fa-IR")} تا ${lastItem.toLocaleString("fa-IR")} از ${totalItems.toLocaleString("fa-IR")} مورد`}
      </span>
      {totalPages > 1 && (
        <nav aria-label="صفحه‌بندی فهرست" className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={activePage === 1}
            onClick={() => moveTo(activePage - 1)}
            leadingIcon={<ChevronRight className="h-4 w-4" />}
          >
            قبلی
          </Button>
          <span className="min-w-24 text-center font-bold text-gray-700 dark:text-gray-200">
            صفحه {activePage.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={activePage === totalPages}
            onClick={() => moveTo(activePage + 1)}
            trailingIcon={<ChevronLeft className="h-4 w-4" />}
          >
            بعدی
          </Button>
        </nav>
      )}
    </div>
  );
}

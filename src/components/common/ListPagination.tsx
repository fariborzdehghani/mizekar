import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface ListPaginationProps {
  currentPage: number;
  totalItems: number;
  hrefForPage: (page: number) => string;
  pageSize?: number;
}

export const DEFAULT_PAGE_SIZE = 30;

export default function ListPagination({
  currentPage,
  totalItems,
  hrefForPage,
  pageSize = DEFAULT_PAGE_SIZE,
}: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = Math.min(Math.max(currentPage, 1), totalPages);
  const firstItem = totalItems === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const lastItem = Math.min(activePage * pageSize, totalItems);
  const disabledClass =
    "inline-flex h-9 items-center gap-1 rounded-xl border border-black/5 px-3 opacity-40 dark:border-white/5";
  const linkClass =
    "liquid-glass-control inline-flex h-9 items-center gap-1 rounded-xl border px-3 transition hover:text-brand-600";

  return (
    <div className="flex flex-col gap-3 border-t border-black/5 px-5 py-4 text-xs font-medium text-gray-500 dark:border-white/5 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {totalItems === 0
          ? "موردی برای نمایش وجود ندارد"
          : `نمایش ${firstItem.toLocaleString("fa-IR")} تا ${lastItem.toLocaleString("fa-IR")} از ${totalItems.toLocaleString("fa-IR")} مورد`}
      </span>
      {totalPages > 1 && (
        <nav aria-label="صفحه‌بندی فهرست" className="flex items-center gap-2">
          {activePage > 1 ? (
            <Link href={hrefForPage(activePage - 1)} scroll className={linkClass}>
              <ChevronRight className="h-4 w-4" />
              قبلی
            </Link>
          ) : (
            <span className={disabledClass}>
              <ChevronRight className="h-4 w-4" />
              قبلی
            </span>
          )}
          <span className="min-w-24 text-center font-bold text-gray-700 dark:text-gray-200">
            صفحه {activePage.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
          </span>
          {activePage < totalPages ? (
            <Link href={hrefForPage(activePage + 1)} scroll className={linkClass}>
              بعدی
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <span className={disabledClass}>
              بعدی
              <ChevronLeft className="h-4 w-4" />
            </span>
          )}
        </nav>
      )}
    </div>
  );
}

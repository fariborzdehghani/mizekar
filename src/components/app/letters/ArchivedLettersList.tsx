import Link from "next/link";
import type {
  ArchiveFolderNode,
  ArchivedItemListItem,
} from "@/src/actions/archiveActions";
import LetterArchiveSidebar from "./LetterArchiveSidebar";
import RemoveArchivedLetterButton from "./RemoveArchivedLetterButton";
import { CalendarCheck, Eye, FileText, Mail } from "lucide-react";
import ListPagination, {
  DEFAULT_PAGE_SIZE,
} from "@/src/components/common/ListPagination";
import InboxListToolbar from "@/src/components/common/InboxListToolbar";
import { Alert, EmptyState, PageTitle, buttonStyles } from "@/src/components/ui";
import { normalizeSearchValue } from "@/src/lib/text";

interface ArchivedLettersListProps {
  folders: ArchiveFolderNode[];
  selectedFolderId: number | null;
  selectedFolderTitle?: string | null;
  items: ArchivedItemListItem[];
  searchQuery?: string;
  currentPage?: number;
  error?: string;
}

function formatDate(value: Date | string | null) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getItemNumber(item: ArchivedItemListItem) {
  if (item.type === "meeting") return `#${item.meeting.id}`;
  if (item.type === "form") return `#${item.form.id}`;
  return (
    item.letter.internal_number ||
    item.letter.external_number ||
    `#${item.letter.id}`
  );
}

function getItemTitle(item: ArchivedItemListItem) {
  if (item.type === "meeting") return item.meeting.title || "(بدون عنوان)";
  return item.type === "form"
    ? item.form.title
    : item.letter.title || "(بدون عنوان)";
}

function getItemSubtitle(item: ArchivedItemListItem) {
  if (item.type === "meeting") {
    const locationType = item.meeting.locationType === 1 ? "آنلاین" : "حضوری";
    const location = item.meeting.locationTitle
      ? ` - ${item.meeting.locationTitle}`
      : "";
    const description = item.meeting.descriptionSnippet
      ? ` - ${item.meeting.descriptionSnippet}`
      : "";

    return `${locationType}${location}${description}`;
  }

  if (item.type === "form") return item.form.templateTitle;
  return item.letter.contentSnippet;
}

function archivedItemMatchesSearch(
  item: ArchivedItemListItem,
  searchQuery: string
) {
  const query = normalizeSearchValue(searchQuery.trim());
  if (!query) return true;

  const fields = [
    item.type === "meeting" ? "جلسه" : item.type === "form" ? "فرم" : "نامه",
    getItemNumber(item),
    getItemTitle(item),
    getItemSubtitle(item),
    formatDate(item.archivedAt),
  ];

  return fields.some((field) => normalizeSearchValue(field).includes(query));
}

export default function ArchivedLettersList({
  folders,
  selectedFolderId,
  selectedFolderTitle,
  items,
  searchQuery = "",
  currentPage = 1,
  error,
}: ArchivedLettersListProps) {
  const filteredItems = items.filter((item) =>
    archivedItemMatchesSearch(item, searchQuery)
  );
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / DEFAULT_PAGE_SIZE));
  const activePage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedItems = filteredItems.slice(
    (activePage - 1) * DEFAULT_PAGE_SIZE,
    activePage * DEFAULT_PAGE_SIZE,
  );
  const getPageHref = (page: number) => {
    const params = new URLSearchParams();
    if (selectedFolderId) params.set("folderId", String(selectedFolderId));
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/archive?${query}` : "/archive";
  };

  return (
    <div className="liquid-content-frame liquid-glass-page grid min-h-[calc(100vh-92px)] grid-cols-1 content-start items-start gap-4 py-4 sm:py-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <main className="contents">
        <div className="liquid-page-header flex shrink-0 flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between xl:col-span-2">
          <Link
            href="/letter"
            className={buttonStyles()}
          >
            نامه جدید
          </Link>
          <PageTitle
            title="بایگانی نامه‌ها، فرم‌ها و جلسات"
            description={selectedFolderTitle || "یک پوشه انتخاب کنید"}
          />
        </div>

        {error ? (
          <Alert tone="error">{error}</Alert>
        ) : !selectedFolderId ? (
          <EmptyState
            className="flex-1"
            title="یک پوشه انتخاب کنید"
            description="برای مشاهده موارد بایگانی‌شده، یک پوشه را از نوار کناری انتخاب کنید."
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState className="flex-1" title="این پوشه هنوز موردی ندارد" />
        ) : (
          <div className="liquid-glass-surface flex-1 overflow-hidden rounded-panel border border-white/70 bg-app-panel dark:border-white/10 dark:bg-gray-900">
            <InboxListToolbar searchQuery={searchQuery} searchPlaceholder="جستجو در بایگانی..." />
            <div className="overflow-x-auto">
            <table className="inbox-card-table inbox-card-table--archive w-full">
              <thead className="sticky top-0 z-20 border-b border-app-border bg-app-table-head shadow-[0_1px_0_rgba(16,24,40,0.08)] backdrop-blur dark:border-gray-700 dark:bg-gray-800/90">
                <tr>
                  <th className="w-28 px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    نوع
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    شماره
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    عنوان
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    تاریخ بایگانی
                  </th>
                  <th className="w-px whitespace-nowrap px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedItems.map((item) => {
                  const href =
                    item.type === "meeting"
                      ? `/meeting?id=${item.meeting.id}&viewOnly=true`
                      : item.type === "form"
                      ? `/form?id=${item.form.id}`
                      : `/letter?id=${item.letter.id}&viewOnly=true`;

                  return (
                    <tr
                      key={`${item.type}-${item.archiveItemId}`}
                      className="transition hover:bg-white/70 dark:hover:bg-white/5"
                    >
                      <td className="w-28 px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <span className="inline-flex items-center gap-2">
                          {item.type === "meeting" ? (
                            <CalendarCheck className="h-4 w-4" />
                          ) : item.type === "form" ? (
                            <FileText className="h-4 w-4" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                          {item.type === "meeting"
                            ? "جلسه"
                            : item.type === "form"
                              ? "فرم"
                              : "نامه"}
                        </span>
                      </td>
                      <td className="w-44 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {getItemNumber(item)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-md">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {getItemTitle(item)}
                          </p>
                          {getItemSubtitle(item) && (
                            <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                              {getItemSubtitle(item)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="w-52 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(item.archivedAt)}
                      </td>
                      <td className="w-px whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={href}
                            className="liquid-glass-control inline-flex h-8 w-8 items-center justify-center rounded-xl border border-app-border text-gray-600 transition hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:text-brand-300"
                            title={
                              item.type === "meeting"
                                ? "مشاهده جلسه"
                                : item.type === "form"
                                ? "مشاهده فرم"
                                : "مشاهده نامه"
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <RemoveArchivedLetterButton
                            archiveItemId={item.archiveItemId}
                            itemType={item.type}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <ListPagination
              currentPage={activePage}
              totalItems={filteredItems.length}
              hrefForPage={getPageHref}
            />
          </div>
        )}
      </main>

      <LetterArchiveSidebar
        folders={folders}
        selectedFolderId={selectedFolderId}
        defaultOpen
        compactStickyOffset
      />
    </div>
  );
}

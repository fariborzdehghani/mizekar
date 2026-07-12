import Link from "next/link";
import { Eye } from "lucide-react";
import { searchAccessibleLetters } from "@/src/actions/letterActions";
import InboxListRow from "@/src/components/app/letters/InboxListRow";
import { uniqueLetterTagNames } from "@/src/lib/letterTags";
import ListPagination, {
  DEFAULT_PAGE_SIZE,
} from "@/src/components/common/ListPagination";
import InboxListToolbar from "@/src/components/common/InboxListToolbar";

interface LetterSearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getParam(
  params: { [key: string]: string | string[] | undefined },
  key: string
) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() || "";
}

function getTagsParam(params: { [key: string]: string | string[] | undefined }) {
  return uniqueLetterTagNames(
    [getParam(params, "tags"), getParam(params, "tag")]
      .filter(Boolean)
      .join(",")
      .split(/[،,]/)
  );
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

function getLetterNumber(letter: {
  id: number;
  internal_number: string | null;
  external_number: string | null;
}) {
  return letter.internal_number || letter.external_number || `#${letter.id}`;
}

function getDirectionLabel(letter: { isIncoming: boolean; isOutgoing: boolean }) {
  if (letter.isIncoming && letter.isOutgoing) return "ورودی و خروجی";
  if (letter.isIncoming) return "ورودی";
  if (letter.isOutgoing) return "خروجی";
  return "-";
}

export default async function LetterSearchPage({
  searchParams,
}: LetterSearchPageProps) {
  const params = await searchParams;
  const title = getParam(params, "title");
  const content = getParam(params, "content");
  const createDate = getParam(params, "createDate");
  const tags = getTagsParam(params);
  const parsedPage = Number(getParam(params, "page"));
  const currentPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const result = await searchAccessibleLetters({ title, content, createDate, tags });
  const totalPages = Math.max(1, Math.ceil(result.letters.length / DEFAULT_PAGE_SIZE));
  const activePage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedLetters = result.letters.slice(
    (activePage - 1) * DEFAULT_PAGE_SIZE,
    activePage * DEFAULT_PAGE_SIZE,
  );
  const getPageHref = (page: number) => {
    const nextParams = new URLSearchParams();
    if (title) nextParams.set("title", title);
    if (content) nextParams.set("content", content);
    if (createDate) nextParams.set("createDate", createDate);
    if (tags.length > 0) nextParams.set("tags", tags.join(","));
    if (page > 1) nextParams.set("page", String(page));
    return `/letter-search?${nextParams.toString()}`;
  };

  return (
    <div className="liquid-content-frame liquid-glass-page flex min-h-[calc(100vh-92px)] flex-col py-4 sm:py-6 lg:py-8">
      <div className="liquid-page-header liquid-page-header-inset sticky top-[108px] z-40 flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/letter"
          className="rounded-2xl bg-brand-500 px-4 py-2 font-medium text-white shadow-[0_10px_24px_rgba(98,92,255,0.26)] transition hover:bg-brand-600"
        >
          نامه جدید
        </Link>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            جستجوی پیشرفته نامه‌ها
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {result.hasSearchCriteria ? `${result.letters.length} نتیجه` : "معیار جستجو را وارد کنید"}
          </p>
        </div>
      </div>

      {!result.success ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {result.error}
        </div>
      ) : !result.hasSearchCriteria ? (
        <div className="liquid-glass-panel mt-4 flex flex-1 items-center justify-center rounded-[28px] border border-white/70 bg-app-panel p-8 text-center text-gray-500 dark:border-white/10 dark:bg-gray-900 dark:text-gray-400">
          از دکمه جستجوی پیشرفته در سربرگ، عنوان، متن یا تاریخ ایجاد نامه را وارد کنید.
        </div>
      ) : result.letters.length === 0 ? (
        <div className="liquid-glass-panel mt-4 flex flex-1 items-center justify-center rounded-[28px] border border-white/70 bg-app-panel p-8 text-center text-gray-500 dark:border-white/10 dark:bg-gray-900 dark:text-gray-400">
          نامه‌ای با این معیارها پیدا نشد.
        </div>
      ) : (
        <div className="liquid-glass-surface mt-4 overflow-hidden rounded-[28px] border border-white/70 bg-app-panel dark:border-white/10 dark:bg-gray-900">
          <InboxListToolbar searchQuery={title} searchPlaceholder="جستجو در نامه‌ها..." queryParam="title" />
          <div className="overflow-x-auto">
          <table className="inbox-card-table inbox-card-table--letters w-full">
            <thead className="border-b border-app-border bg-app-table-head backdrop-blur dark:border-gray-700 dark:bg-gray-800/90">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  شماره
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عنوان
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  تاریخ ایجاد
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  مسیر
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  بایگانی
                </th>
                <th className="w-px whitespace-nowrap px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedLetters.map((letter) => (
                <InboxListRow
                  key={letter.id}
                  href={`/letter?id=${letter.id}&viewOnly=true`}
                  className="transition hover:bg-white/70 dark:hover:bg-white/5"
                >
                  <td className="w-44 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {getLetterNumber(letter)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-md">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {letter.title || "(بدون عنوان)"}
                      </p>
                    </div>
                  </td>
                  <td className="w-52 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(letter.create_date)}
                  </td>
                  <td className="w-36 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {getDirectionLabel(letter)}
                  </td>
                  <td className="w-44 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {letter.archiveFolderTitle || "-"}
                  </td>
                  <td className="w-px whitespace-nowrap px-6 py-4 text-sm">
                    <Link
                      href={`/letter?id=${letter.id}&viewOnly=true`}
                      className="liquid-glass-control inline-flex h-8 w-8 items-center justify-center rounded-xl border border-app-border text-gray-600 transition hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:text-brand-300"
                      title="مشاهده نامه"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </InboxListRow>
              ))}
            </tbody>
          </table>
          </div>
          <ListPagination
            currentPage={activePage}
            totalItems={result.letters.length}
            hrefForPage={getPageHref}
          />
        </div>
      )}
    </div>
  );
}

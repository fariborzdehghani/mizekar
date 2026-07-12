import Link from "next/link";
import { Eye } from "lucide-react";
import ListPagination, {
  DEFAULT_PAGE_SIZE,
} from "@/src/components/common/ListPagination";
import InboxListToolbar from "@/src/components/common/InboxListToolbar";

type MessageListItem = {
  id: number;
  title: string;
  contentSnippet: string;
  importance: number;
  importanceLabel: string;
  senderName: string;
  recipientNames: string[];
  create_date: Date | string | null;
  read_at: Date | string | null;
  totalRecipients: number;
  readByCount: number;
  hasUnreadReadReceipts: boolean;
};

type MessageListPerspective = "incoming" | "outgoing";

interface MessageListProps {
  title: string;
  emptyText: string;
  messages: MessageListItem[];
  perspective: MessageListPerspective;
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

function getImportanceClass(importance: number) {
  if (importance === 3) {
    return "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  }

  if (importance === 2) {
    return "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";
  }

  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
}

function getReadStatus(message: MessageListItem, perspective: MessageListPerspective) {
  if (perspective === "incoming") {
    return message.read_at ? "خوانده شده" : "خوانده نشده";
  }

  if (message.totalRecipients === 0) return "-";

  return `${message.readByCount} از ${message.totalRecipients} خوانده شده`;
}

export default function MessageList({
  title,
  emptyText,
  messages,
  perspective,
  searchQuery = "",
  currentPage = 1,
  error,
}: MessageListProps) {
  const personColumnLabel = perspective === "incoming" ? "فرستنده" : "گیرندگان";
  const totalPages = Math.max(1, Math.ceil(messages.length / DEFAULT_PAGE_SIZE));
  const activePage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedMessages = messages.slice(
    (activePage - 1) * DEFAULT_PAGE_SIZE,
    activePage * DEFAULT_PAGE_SIZE,
  );
  const basePath = perspective === "incoming" ? "/incoming-messages" : "/outgoing-messages";
  const getPageHref = (page: number) => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <main className="liquid-content-frame liquid-glass-page flex min-h-[calc(100vh-92px)] flex-col py-4 sm:py-6 lg:py-8">
      <div className="liquid-page-header liquid-page-header-inset sticky top-[108px] z-40 flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/new-message"
          className="rounded-2xl bg-brand-500 px-4 py-2 font-medium text-white shadow-[0_10px_24px_rgba(98,92,255,0.26)] transition hover:bg-brand-600"
        >
          پیام جدید
        </Link>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {messages.length} پیام
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : messages.length === 0 ? (
        <div className="liquid-glass-panel mt-4 flex flex-1 flex-col items-center justify-center rounded-[28px] border border-white/70 bg-app-panel p-8 text-center dark:border-white/10 dark:bg-gray-900">
          <p className="mb-4 text-gray-600 dark:text-gray-400">{emptyText}</p>
          <Link
            href="/new-message"
            className="inline-block rounded-2xl bg-brand-500 px-4 py-2 text-white transition hover:bg-brand-600"
          >
            ایجاد پیام
          </Link>
        </div>
      ) : (
        <div className="liquid-glass-surface mt-4 overflow-hidden rounded-[28px] border border-white/70 bg-app-panel dark:border-white/10 dark:bg-gray-900">
          <InboxListToolbar searchQuery={searchQuery} searchPlaceholder="جستجو در پیام‌ها..." />
          <div className="overflow-x-auto">
          <table className="inbox-card-table inbox-card-table--messages w-full">
            <thead className="border-b border-app-border bg-app-table-head backdrop-blur dark:border-gray-700 dark:bg-gray-800/90">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عنوان
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {personColumnLabel}
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  اهمیت
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  تاریخ
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  وضعیت مشاهده
                </th>
                <th className="w-px whitespace-nowrap px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedMessages.map((message) => {
                const personText =
                  perspective === "incoming"
                    ? message.senderName
                    : message.recipientNames.join("، ");
                const isUnreadIncoming =
                  perspective === "incoming" && !message.read_at;

                return (
                  <tr
                    key={message.id}
                    className={`cursor-pointer transition hover:bg-white/70 dark:hover:bg-white/5 ${
                      isUnreadIncoming
                        ? "inbox-card-item--unread bg-blue-100/50 dark:bg-blue-950/25"
                        : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <div className="flex items-center gap-2">
                          {isUnreadIncoming && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-blue-500"
                              title="خوانده نشده"
                            />
                          )}
                          <p
                            className={`min-w-0 truncate text-sm text-gray-900 dark:text-white ${
                              isUnreadIncoming ? "font-bold" : "font-medium"
                            }`}
                          >
                            {message.title || "(بدون عنوان)"}
                          </p>
                          {message.hasUnreadReadReceipts &&
                            perspective === "outgoing" && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                            )}
                        </div>
                        {message.contentSnippet && (
                          <p className="mt-1 whitespace-normal text-xs leading-5 text-gray-500 dark:text-gray-400">
                            {message.contentSnippet}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="w-80 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="block max-w-80 truncate">{personText}</span>
                    </td>
                    <td className="w-28 px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getImportanceClass(
                          message.importance
                        )}`}
                      >
                        {message.importanceLabel}
                      </span>
                    </td>
                    <td className="w-56 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(message.create_date)}
                    </td>
                    <td className="w-44 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {perspective === "incoming" ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            message.read_at
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {getReadStatus(message, perspective)}
                        </span>
                      ) : (
                        getReadStatus(message, perspective)
                      )}
                    </td>
                    <td className="w-px whitespace-nowrap px-6 py-4 text-sm">
                      <Link
                        href={`/message?id=${message.id}`}
                        className="liquid-glass-control inline-flex h-8 w-8 items-center justify-center rounded-xl border border-app-border text-gray-600 transition hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:text-brand-300"
                        title="مشاهده پیام"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <ListPagination
            currentPage={activePage}
            totalItems={messages.length}
            hrefForPage={getPageHref}
          />
        </div>
      )}
    </main>
  );
}

import Link from "next/link";
import { Eye } from "lucide-react";

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
  error,
}: MessageListProps) {
  const personColumnLabel = perspective === "incoming" ? "فرستنده" : "گیرندگان";

  return (
    <main className="flex min-h-[calc(100vh-65px)] w-full flex-col lg:min-h-[calc(100vh-77px)]">
      <div className="sticky top-[65px] z-30 flex items-center justify-between border-b border-gray-300 bg-white p-4 dark:bg-gray-900 lg:top-[77px]">
        <Link
          href="/new-message"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
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
        <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center bg-white p-8 text-center dark:bg-gray-800">
          <p className="mb-4 text-gray-600 dark:text-gray-400">{emptyText}</p>
          <Link
            href="/new-message"
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            ایجاد پیام
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white shadow-md dark:bg-gray-800">
          <table className="w-full min-w-[920px]">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
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
              {messages.map((message) => {
                const personText =
                  perspective === "incoming"
                    ? message.senderName
                    : message.recipientNames.join("، ");
                const isUnreadIncoming =
                  perspective === "incoming" && !message.read_at;

                return (
                  <tr
                    key={message.id}
                    className={`transition hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      isUnreadIncoming
                        ? "border-r-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
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
                          {perspective === "incoming" && message.read_at && (
                            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                              خوانده شده
                            </span>
                          )}
                          {message.hasUnreadReadReceipts &&
                            perspective === "outgoing" && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                            )}
                        </div>
                        {message.contentSnippet && (
                          <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
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
                      {getReadStatus(message, perspective)}
                    </td>
                    <td className="w-px whitespace-nowrap px-6 py-4 text-sm">
                      <Link
                        href={`/message?id=${message.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
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
      )}
    </main>
  );
}

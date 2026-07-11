import Link from "next/link";
import { CornerUpLeft, Forward, MailCheck } from "lucide-react";

type MessageViewData = {
  id: number;
  title: string;
  contents: string | null;
  importance: number;
  importanceLabel: string;
  sender_id: number | null;
  senderName: string;
  create_date: Date | string | null;
  isSender: boolean;
  recipients: Array<{
    id: number;
    user_id: number;
    name: string;
    read_at: Date | string | null;
  }>;
  parentMessage: {
    id: number;
    title: string;
    contentSnippet: string;
    create_date: Date | string | null;
  } | null;
  forwardedFromMessage: {
    id: number;
    title: string;
    contentSnippet: string;
    create_date: Date | string | null;
  } | null;
};

interface MessageViewProps {
  message: MessageViewData;
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

function RelatedMessageLink({
  label,
  message,
}: {
  label: string;
  message: NonNullable<MessageViewData["parentMessage"]>;
}) {
  return (
    <Link
      href={`/message?id=${message.id}`}
      className="liquid-glass-control block rounded-xl border p-3 transition hover:border-brand-300 dark:hover:border-brand-500/40"
    >
      <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
        {message.title || "(بدون عنوان)"}
      </span>
      {message.contentSnippet && (
        <span className="mt-1 block truncate text-xs text-gray-500 dark:text-gray-400">
          {message.contentSnippet}
        </span>
      )}
    </Link>
  );
}

export default function MessageView({ message }: MessageViewProps) {
  return (
<<<<<<< HEAD
    <main className="liquid-content-frame liquid-glass-page min-h-[calc(100vh-92px)] space-y-5 py-4 sm:py-6 lg:py-8">
      <div className="liquid-page-header sticky top-[92px] z-30 flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
=======
    <main className="min-h-full bg-white dark:bg-white">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-300 bg-white p-4 dark:bg-white">
>>>>>>> cded0e3936ca9b0b93b03023a66f720b1653c148
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={message.isSender ? "/outgoing-messages" : "/incoming-messages"}
            className="liquid-glass-control rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 dark:text-gray-300"
          >
            بازگشت
          </Link>
          <Link
            href={`/new-message?replyTo=${message.id}`}
            className="liquid-glass-control inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium text-brand-700 transition hover:border-brand-300 dark:text-brand-300"
          >
            <CornerUpLeft className="h-4 w-4" />
            پاسخ
          </Link>
          <Link
            href={`/new-message?forwardFrom=${message.id}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-medium text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600"
          >
            <Forward className="h-4 w-4" />
            ارجاع
          </Link>
        </div>

        <div className="text-right">
          <h1 className="max-w-[48vw] truncate text-2xl font-bold text-gray-900 dark:text-white">
            {message.title || "(بدون عنوان)"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formatDate(message.create_date)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="liquid-glass-panel min-w-0 rounded-3xl border p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getImportanceClass(
                message.importance
              )}`}
            >
              {message.importanceLabel}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              فرستنده: {message.senderName}
            </span>
          </div>

          {(message.parentMessage || message.forwardedFromMessage) && (
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {message.parentMessage && (
                <RelatedMessageLink
                  label="پاسخ به"
                  message={message.parentMessage}
                />
              )}
              {message.forwardedFromMessage && (
                <RelatedMessageLink
                  label="ارجاع از"
                  message={message.forwardedFromMessage}
                />
              )}
            </div>
          )}

          <div
            className="liquid-glass-inset prose min-h-96 max-w-none rounded-2xl p-5 text-gray-900 dark:prose-invert dark:text-white"
            dangerouslySetInnerHTML={{
              __html:
                message.contents ||
                "<p>متنی برای این پیام ثبت نشده است</p>",
            }}
          />
        </section>

        <aside className="min-w-0">
          <div className="liquid-glass-panel rounded-3xl border">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                گیرندگان
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {message.recipients.length} گیرنده
              </p>
            </div>

            <div className="max-h-[34rem] overflow-y-auto">
              {message.recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-gray-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {recipient.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {recipient.read_at
                        ? `مشاهده: ${formatDate(recipient.read_at)}`
                        : "هنوز مشاهده نشده"}
                    </p>
                  </div>
                  {recipient.read_at && (
                    <MailCheck className="h-5 w-5 shrink-0 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

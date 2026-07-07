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
      className="block rounded-lg border border-gray-200 p-3 transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-500/10"
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
    <main className="min-h-full bg-white dark:bg-white">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-300 bg-white p-4 dark:bg-white">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={message.isSender ? "/outgoing-messages" : "/incoming-messages"}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            بازگشت
          </Link>
          <Link
            href={`/new-message?replyTo=${message.id}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300"
          >
            <CornerUpLeft className="h-4 w-4" />
            پاسخ
          </Link>
          <Link
            href={`/new-message?forwardFrom=${message.id}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
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

      <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[1fr_22rem]">
        <section className="min-w-0">
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
            className="prose max-w-none min-h-96 text-gray-900 dark:prose-invert dark:text-white"
            dangerouslySetInnerHTML={{
              __html:
                message.contents ||
                "<p>متنی برای این پیام ثبت نشده است</p>",
            }}
          />
        </section>

        <aside className="min-w-0">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700">
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

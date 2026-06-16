import { getMessage } from "@/src/actions/messageActions";
import MessageReadMarker from "@/src/components/app/messages/MessageReadMarker";
import MessageView from "@/src/components/app/messages/MessageView";
import Link from "next/link";

interface MessagePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getMessageId(params: { [key: string]: string | string[] | undefined }) {
  const value = Array.isArray(params.id) ? params.id[0] : params.id;
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export default async function MessagePage({ searchParams }: MessagePageProps) {
  const params = await searchParams;
  const messageId = getMessageId(params);

  if (!messageId) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center gap-4 p-8 text-center dark:bg-gray-900 lg:min-h-[calc(100vh-77px)]">
        <p className="text-gray-600 dark:text-gray-300">پیام معتبر نیست</p>
        <Link
          href="/incoming-messages"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          بازگشت به پیام‌ها
        </Link>
      </div>
    );
  }

  const result = await getMessage(messageId);

  if (!result.success || !result.message) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center gap-4 p-8 text-center dark:bg-gray-900 lg:min-h-[calc(100vh-77px)]">
        <p className="text-gray-600 dark:text-gray-300">
          {result.error || "پیام یافت نشد"}
        </p>
        <Link
          href="/incoming-messages"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          بازگشت به پیام‌ها
        </Link>
      </div>
    );
  }

  return (
    <>
      <MessageReadMarker messageId={result.message.id} />
      <MessageView message={result.message} />
    </>
  );
}

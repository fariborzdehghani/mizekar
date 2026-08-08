import { getMessage } from "@/src/actions/messageActions";
import MessageReadMarker from "@/src/components/app/messages/MessageReadMarker";
import MessageView from "@/src/components/app/messages/MessageView";
import Link from "next/link";
import { EmptyState, buttonStyles } from "@/src/components/ui";

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
      <EmptyState
        className="m-4 min-h-[calc(100vh-124px)]"
        title="پیام معتبر نیست"
        action={<Link href="/incoming-messages" className={buttonStyles()}>بازگشت به پیام‌ها</Link>}
      />
    );
  }

  const result = await getMessage(messageId);

  if (!result.success || !result.message) {
    return (
      <EmptyState
        className="m-4 min-h-[calc(100vh-124px)]"
        title={result.error || "پیام یافت نشد"}
        action={<Link href="/incoming-messages" className={buttonStyles()}>بازگشت به پیام‌ها</Link>}
      />
    );
  }

  return (
    <>
      <MessageReadMarker messageId={result.message.id} />
      <MessageView message={result.message} />
    </>
  );
}

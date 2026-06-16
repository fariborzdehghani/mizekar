import { getIncomingMessages } from "@/src/actions/messageActions";
import MessageList from "@/src/components/app/messages/MessageList";

interface IncomingMessagesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getSearchQuery(params: { [key: string]: string | string[] | undefined }) {
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return query?.trim() || "";
}

export default async function IncomingMessagesPage({
  searchParams,
}: IncomingMessagesPageProps) {
  const params = await searchParams;
  const searchQuery = getSearchQuery(params);
  const result = await getIncomingMessages(searchQuery);

  return (
    <MessageList
      title="پیام‌های ورودی"
      emptyText="پیام ورودی ندارید"
      messages={result.messages}
      perspective="incoming"
      searchQuery={searchQuery}
      error={result.success ? undefined : result.error}
    />
  );
}

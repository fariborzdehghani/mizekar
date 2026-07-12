import { getOutgoingMessages } from "@/src/actions/messageActions";
import MessageList from "@/src/components/app/messages/MessageList";

interface OutgoingMessagesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getSearchQuery(params: { [key: string]: string | string[] | undefined }) {
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return query?.trim() || "";
}

export default async function OutgoingMessagesPage({
  searchParams,
}: OutgoingMessagesPageProps) {
  const params = await searchParams;
  const searchQuery = getSearchQuery(params);
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number(rawPage);
  const currentPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const result = await getOutgoingMessages(searchQuery);

  return (
    <MessageList
      title="پیام‌های خروجی"
      emptyText="هنوز پیامی ارسال نکرده‌اید"
      messages={result.messages}
      perspective="outgoing"
      searchQuery={searchQuery}
      currentPage={currentPage}
      error={result.success ? undefined : result.error}
    />
  );
}

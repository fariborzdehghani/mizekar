import {
  getMessageComposePrefill,
} from "@/src/actions/messageActions";
import MessageForm, {
  type MessageComposePrefill,
} from "@/src/components/app/messages/MessageForm";

interface NewMessagePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getSingleParam(
  params: { [key: string]: string | string[] | undefined },
  key: string
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseMessageId(value: string | undefined) {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

const emptyPrefill: MessageComposePrefill = {
  mode: "new",
  sourceMessageId: null,
  title: "",
  content: "",
  recipients: [],
  parentMessageId: null,
  forwardedFromMessageId: null,
};

export default async function NewMessagePage({
  searchParams,
}: NewMessagePageProps) {
  const params = await searchParams;
  const replyTo = parseMessageId(getSingleParam(params, "replyTo"));
  const forwardFrom = parseMessageId(getSingleParam(params, "forwardFrom"));
  let prefill: MessageComposePrefill = emptyPrefill;
  let error: string | undefined;

  if (replyTo) {
    const result = await getMessageComposePrefill(replyTo, "reply");
    if (result.success && result.prefill) {
      prefill = result.prefill;
    } else {
      error = result.error;
    }
  } else if (forwardFrom) {
    const result = await getMessageComposePrefill(forwardFrom, "forward");
    if (result.success && result.prefill) {
      prefill = result.prefill;
    } else {
      error = result.error;
    }
  }

  const pageTitle =
    prefill.mode === "reply"
      ? "پاسخ به پیام"
      : prefill.mode === "forward"
        ? "ارجاع پیام"
        : "پیام جدید";

  return (
    <div className="w-full">
      {error && (
        <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}
      <MessageForm prefill={prefill} pageTitle={pageTitle} />
    </div>
  );
}

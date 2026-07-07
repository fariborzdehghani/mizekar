"use client";

import { createMessage } from "@/src/actions/messageActions";
import Editor from "@/src/components/common/editor/editor";
import RecipientsModal from "@/src/components/app/letters/RecipientsModal";
import { FormEvent, useEffect, useState } from "react";
import { SendHorizontal, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Person = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  user_id: number | null;
};

export type MessageComposePrefill = {
  mode: "reply" | "forward" | "new";
  sourceMessageId: number | null;
  title: string;
  content: string;
  recipients: Person[];
  parentMessageId: number | null;
  forwardedFromMessageId: number | null;
};

interface MessageFormProps {
  prefill?: MessageComposePrefill | null;
  pageTitle?: string;
}

const IMPORTANCE_OPTIONS = [
  { value: 1, label: "عادی" },
  { value: 2, label: "مهم" },
  { value: 3, label: "فوری" },
];

function getPersonName(person: Person) {
  const fullName = [person.first_name, person.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const label = fullName || `شخص #${person.id}`;
  const job = person.job?.trim();

  return job ? `${label} - ${job}` : label;
}

function getModeText(mode: MessageComposePrefill["mode"] | undefined) {
  if (mode === "reply") return "پاسخ";
  if (mode === "forward") return "ارجاع";
  return "پیام جدید";
}

export default function MessageForm({
  prefill,
  pageTitle = "پیام جدید",
}: MessageFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(prefill?.title || "");
  const [importance, setImportance] = useState("1");
  const [selectedRecipients, setSelectedRecipients] = useState<Person[]>(
    prefill?.recipients || []
  );
  const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    setTitle(prefill?.title || "");
    setSelectedRecipients(prefill?.recipients || []);
    setEditorKey((currentKey) => currentKey + 1);
  }, [prefill]);

  const handleAddRecipient = (person: Person) => {
    setSelectedRecipients((currentRecipients) => {
      if (
        currentRecipients.some(
          (recipient) =>
            recipient.id === person.id || recipient.user_id === person.user_id
        )
      ) {
        return currentRecipients;
      }

      return [...currentRecipients, person];
    });
  };

  const handleRemoveRecipient = (personId: number) => {
    setSelectedRecipients((currentRecipients) =>
      currentRecipients.filter((recipient) => recipient.id !== personId)
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (selectedRecipients.length === 0) {
      setError("حداقل یک گیرنده انتخاب کنید");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("recipients", JSON.stringify(selectedRecipients));

      const result = await createMessage(formData);

      if (!result.success) {
        setError(result.error || "خطا در ارسال پیام");
        return;
      }

      router.replace(result.redirectTo || "/outgoing-messages");
    } catch (submitError) {
      console.error("Message submit error:", submitError);
      setError("خطا در ارسال پیام");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <RecipientsModal
        isOpen={isRecipientsModalOpen}
        onClose={() => setIsRecipientsModalOpen(false)}
        selectedRecipients={selectedRecipients}
        onAddRecipient={handleAddRecipient}
        onRemoveRecipient={handleRemoveRecipient}
        title="گیرندگان پیام"
        searchLabel="جستجو و اضافه کردن گیرنده"
        searchPlaceholder="نام گیرنده پیام را جستجو کنید..."
        selectedLabel="گیرندگان انتخاب شده"
        emptySelectedText="هنوز گیرنده‌ای انتخاب نشده"
        requireUser
      />

      <form
        onSubmit={handleSubmit}
        className="min-h-full bg-white dark:bg-white"
      >
        <input
          type="hidden"
          name="parentMessageId"
          value={prefill?.parentMessageId || ""}
        />
        <input
          type="hidden"
          name="forwardedFromMessageId"
          value={prefill?.forwardedFromMessageId || ""}
        />

        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-300 bg-white p-4 dark:bg-white">
          <div className="flex items-center gap-3">
            <Link
              href="/incoming-messages"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            >
              بازگشت
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SendHorizontal className="h-4 w-4" />
              {isSubmitting ? "در حال ارسال..." : "ارسال پیام"}
            </button>
          </div>

          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-900">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              {getModeText(prefill?.mode)}
            </p>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_16rem]">
            <div>
              <label
                htmlFor="message-title"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                عنوان پیام
              </label>
              <input
                id="message-title"
                name="title"
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="message-importance"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                اهمیت
              </label>
              <select
                id="message-importance"
                name="importance"
                value={importance}
                onChange={(event) => setImportance(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                {IMPORTANCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                گیرندگان پیام ({selectedRecipients.length})
              </label>
              <button
                type="button"
                onClick={() => setIsRecipientsModalOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300"
              >
                <UserPlus className="h-4 w-4" />
                انتخاب گیرندگان
              </button>
            </div>

            <div className="min-h-24 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              {selectedRecipients.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedRecipients.map((recipient) => (
                    <span
                      key={`${recipient.id}-${recipient.user_id}`}
                      className="inline-flex h-9 max-w-full items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm text-gray-900 dark:border-blue-700 dark:bg-blue-900/30 dark:text-white"
                    >
                      <span className="truncate">{getPersonName(recipient)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(recipient.id)}
                        className="shrink-0 text-gray-500 transition hover:text-red-500 dark:text-gray-300"
                        aria-label="حذف گیرنده"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-18 items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
                  هنوز گیرنده‌ای انتخاب نشده
                </div>
              )}
            </div>
          </section>

          <section>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              متن پیام
            </label>
            <Editor
              key={editorKey}
              name="content"
              height={320}
              initialValue={prefill?.content || ""}
            />
          </section>
        </div>
      </form>
    </>
  );
}

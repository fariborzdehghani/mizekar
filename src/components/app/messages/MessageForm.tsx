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
        className="liquid-content-frame liquid-glass-page min-h-[calc(100vh-92px)] space-y-5 py-4 sm:py-6 lg:py-8"
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

        <div className="liquid-page-header sticky top-[92px] z-30 flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/incoming-messages"
              className="liquid-glass-control inline-flex h-10 leading-none items-center justify-center rounded-xl border px-4 py-0 text-sm font-medium text-gray-700 transition hover:border-brand-300 dark:text-gray-300"
            >
              بازگشت
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 leading-none items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-0 text-sm font-medium text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SendHorizontal className="h-4 w-4" />
              {isSubmitting ? "در حال ارسال..." : "ارسال پیام"}
            </button>
          </div>

          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {getModeText(prefill?.mode)}
            </p>
          </div>
        </div>

        <div className="liquid-glass-panel space-y-6 rounded-3xl border p-5 sm:p-6">
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
                className="liquid-glass-control h-11 w-full rounded-xl border px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:text-white"
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
                className="liquid-glass-control h-11 w-full rounded-xl border px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:text-white"
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
                className="liquid-glass-control inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium text-brand-700 transition hover:border-brand-300 dark:text-brand-300"
              >
                <UserPlus className="h-4 w-4" />
                انتخاب گیرندگان
              </button>
            </div>

            <div className="liquid-glass-inset min-h-24 rounded-2xl p-3">
              {selectedRecipients.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedRecipients.map((recipient) => (
                    <span
                      key={`${recipient.id}-${recipient.user_id}`}
                      className="inline-flex h-9 max-w-full items-center gap-2 rounded-xl border border-brand-200/80 bg-brand-50/70 px-3 text-sm text-gray-900 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-white"
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

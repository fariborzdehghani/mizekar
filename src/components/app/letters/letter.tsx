"use client";

import { createLetter } from "@/src/actions/letterActions";
import { FormEvent, useEffect, useRef, useState } from "react";
import Editor from "@/src/components/common/editor/editor";
import RecipientsModal from "./RecipientsModal";
import FileAttachmentManager from "./FileAttachmentManager";
import RelatedLettersModal, { RelatedLetter } from "./RelatedLettersModal";
import LetterReferrals, { LetterReferral } from "./LetterReferrals";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, X } from "lucide-react";

interface Person {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  user_id: number | null;
}

interface FileAttachment {
  id: string;
  name: string;
  size: number;
  file?: File;
  fileId?: number;
}

interface LetterData {
  id: number;
  title: string | null;
  contents: string | null;
  create_date: Date | null;
  creator_id: number | null;
  internal_number: string | null;
  external_number: string | null;
  source_type: number | null;
  classification: number | null;
  attachments: Array<{
    id: number;
    fileId: number | null;
    fileName: string | null;
  }>;
  recipients: Array<{
    id: number;
    first_name: string | null;
    last_name: string | null;
    job: string | null;
    user_id: number | null;
  }>;
  relatedLetters?: RelatedLetter[];
  referrals?: LetterReferral[];
}

interface LetterFormProps {
  initialLetter?: LetterData | null;
  isViewMode?: boolean;
  pageTitle?: string;
}

const AI_RESPONSE_DRAFT_STORAGE_KEY = "mizekar:ai-response-draft";

type StoredAiResponseDraft = {
  title: string;
  content: string;
  relatedLetter?: RelatedLetter;
};

type AiStreamEvent =
  | {
      type: "meta";
      letterCount: number;
      relatedLetterCount: number;
      relationCount: number;
      truncated: boolean;
    }
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "draft";
      title: string;
      content: string;
    }
  | {
      type: "error";
      error: string;
    };

async function readAiStream(
  response: Response,
  onEvent: (event: AiStreamEvent) => void
) {
  if (!response.ok) {
    let message = `AI request failed with ${response.status}.`;

    try {
      const data = (await response.json()) as { error?: unknown };
      if (typeof data.error === "string") message = data.error;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }

    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("AI response stream is not available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processLine = (line: string) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    const event = JSON.parse(trimmedLine) as AiStreamEvent;

    if (event.type === "error") {
      throw new Error(event.error);
    }

    onEvent(event);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        processLine(line);
      }
    }

    const remaining = `${buffer}${decoder.decode()}`;
    if (remaining.trim()) processLine(remaining);
  } finally {
    reader.releaseLock();
  }
}

export default function LetterForm({
  initialLetter,
  isViewMode = false,
  pageTitle = "نامه جدید",
}: LetterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
  const [isRelatedLettersModalOpen, setIsRelatedLettersModalOpen] =
    useState(false);
  const [isAiSummaryModalOpen, setIsAiSummaryModalOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<Person[]>([]);
  const [selectedRelatedLetters, setSelectedRelatedLetters] = useState<
    RelatedLetter[]
  >([]);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [aiSummaryMeta, setAiSummaryMeta] = useState<{
    letterCount: number;
    relatedLetterCount: number;
    relationCount: number;
    truncated: boolean;
  } | null>(null);
  const summaryAbortControllerRef = useRef<AbortController | null>(null);
  const draftAbortControllerRef = useRef<AbortController | null>(null);

  // Initialize form with letter data if in edit/view mode
  useEffect(() => {
    setAiSummary(null);
    setAiSummaryError(null);
    setAiSummaryMeta(null);
    setIsAiSummaryModalOpen(false);
    setIsAiSummaryLoading(false);
    setDraftPrompt("");
    setDraftError(null);
    setIsDraftLoading(false);

    if (initialLetter) {
      setTitle(initialLetter.title || "");
      setContent(initialLetter.contents || "");

      // Load attachments
      if (initialLetter.attachments && initialLetter.attachments.length > 0) {
        const loadedAttachments = initialLetter.attachments.map((att) => ({
          id: `${att.id}`,
          name: att.fileName || `File ${att.id}`,
          size: 0,
          fileId: att.fileId || undefined,
        }));
        setAttachments(loadedAttachments);
      } else {
        setAttachments([]);
      }

      // Load recipients with person data
      if (initialLetter.recipients && initialLetter.recipients.length > 0) {
        const loadedRecipients: Person[] = initialLetter.recipients
          .filter((rec) => rec.id > 0) // Only include valid recipients
          .map((rec) => ({
            id: rec.id,
            first_name: rec.first_name,
            last_name: rec.last_name,
            job: rec.job,
            user_id: rec.user_id,
          }));
        setSelectedRecipients(loadedRecipients);
      } else {
        setSelectedRecipients([]);
      }

      if (
        initialLetter.relatedLetters &&
        initialLetter.relatedLetters.length > 0
      ) {
        setSelectedRelatedLetters(initialLetter.relatedLetters);
      } else {
        setSelectedRelatedLetters([]);
      }
    } else {
      setTitle("");
      setContent("");
      setAttachments([]);
      setSelectedRecipients([]);
      setSelectedRelatedLetters([]);
    }
  }, [initialLetter]);

  useEffect(() => {
    if (initialLetter || isViewMode || typeof window === "undefined") return;

    const storedDraft = window.sessionStorage.getItem(
      AI_RESPONSE_DRAFT_STORAGE_KEY
    );
    if (!storedDraft) return;

    try {
      const draft = JSON.parse(storedDraft) as StoredAiResponseDraft;

      setTitle(draft.title || "");
      setContent(draft.content || "");
      setAttachments([]);
      setSelectedRecipients([]);
      setSelectedRelatedLetters(draft.relatedLetter ? [draft.relatedLetter] : []);
    } catch (draftParseError) {
      console.error("AI response draft restore error:", draftParseError);
    } finally {
      window.sessionStorage.removeItem(AI_RESPONSE_DRAFT_STORAGE_KEY);
    }
  }, [initialLetter, isViewMode]);

  const handleAddFiles = (files: File[]) => {
    if (isViewMode) return;

    const newAttachments: FileAttachment[] = files.map((file, index) => ({
      id: `${Date.now()}_${index}`,
      name: file.name,
      size: file.size,
      file,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleRemoveFile = (id: string) => {
    if (isViewMode) return;
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const handleDownloadFile = (id: string, name: string) => {
    const attachment = attachments.find((att) => att.id === id);
    if (attachment?.file) {
      const url = URL.createObjectURL(attachment.file);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleViewFile = (id: string) => {
    const attachment = attachments.find((att) => att.id === id);
    if (attachment?.file) {
      const url = URL.createObjectURL(attachment.file);
      window.open(url, "_blank");
    }
  };

  const handleAddRecipient = (person: Person) => {
    if (isViewMode) return;
    setSelectedRecipients((prev) => {
      if (prev.find((r) => r.id === person.id)) {
        return prev;
      }
      return [...prev, person];
    });
  };

  const handleRemoveRecipient = (personId: number) => {
    if (isViewMode) return;
    setSelectedRecipients((prev) => prev.filter((r) => r.id !== personId));
  };

  const handleAddRelatedLetter = (letter: RelatedLetter) => {
    if (isViewMode) return;
    setSelectedRelatedLetters((prev) => {
      if (prev.find((relatedLetter) => relatedLetter.id === letter.id)) {
        return prev;
      }
      return [...prev, letter];
    });
  };

  const handleRemoveRelatedLetter = (letterId: number) => {
    if (isViewMode) return;
    setSelectedRelatedLetters((prev) =>
      prev.filter((letter) => letter.id !== letterId),
    );
  };

  const handleSummarizeRelatedLetters = async () => {
    if (!initialLetter?.id || isAiSummaryLoading) return;

    summaryAbortControllerRef.current?.abort();
    draftAbortControllerRef.current?.abort();
    setIsAiSummaryModalOpen(true);
    setIsAiSummaryLoading(true);
    setAiSummaryError(null);
    setAiSummary(null);
    setAiSummaryMeta(null);
    setDraftPrompt("");
    setDraftError(null);
    setIsDraftLoading(false);

    try {
      const controller = new AbortController();
      let streamedSummary = "";
      let streamedMeta: {
        letterCount: number;
        relatedLetterCount: number;
        relationCount: number;
        truncated: boolean;
      } | null = null;

      summaryAbortControllerRef.current = controller;
      const response = await fetch(
        `/api/ai/letters/${initialLetter.id}/summary`,
        {
          method: "POST",
          signal: controller.signal,
        }
      );

      await readAiStream(response, (event) => {
        if (event.type === "meta") {
          streamedMeta = {
            letterCount: event.letterCount,
            relatedLetterCount: event.relatedLetterCount,
            relationCount: event.relationCount,
            truncated: event.truncated,
          };
          setAiSummaryMeta(streamedMeta);
          return;
        }

        if (event.type === "delta") {
          streamedSummary += event.text;
          setAiSummary((currentSummary) => `${currentSummary || ""}${event.text}`);
        }
      });

      const finalMeta = streamedMeta as {
        letterCount: number;
        relatedLetterCount: number;
        relationCount: number;
        truncated: boolean;
      } | null;
      const result = {
        success: true,
        error: undefined as string | undefined,
        summary: streamedSummary,
        letterCount: finalMeta?.letterCount,
        relatedLetterCount: finalMeta?.relatedLetterCount,
        relationCount: finalMeta?.relationCount,
        truncated: finalMeta?.truncated,
      };

      if (!result.success) {
        setAiSummaryError(
          result.error || "خطا در تولید خلاصه هوشمند نامه‌های مرتبط."
        );
        return;
      }

      setAiSummary(result.summary || "");
      setAiSummaryMeta({
        letterCount: result.letterCount || 0,
        relatedLetterCount: result.relatedLetterCount || 0,
        relationCount: result.relationCount || 0,
        truncated: Boolean(result.truncated),
      });
    } catch (summaryError) {
      if (
        summaryError instanceof DOMException &&
        summaryError.name === "AbortError"
      ) {
        return;
      }

      console.error("Related letters summary error:", summaryError);
      if (summaryError instanceof Error) {
        setAiSummaryError(summaryError.message);
        return;
      }
      setAiSummaryError("خطا در تولید خلاصه هوشمند نامه‌های مرتبط.");
    } finally {
      summaryAbortControllerRef.current = null;
      setIsAiSummaryLoading(false);
    }
  };

  const handleCloseAiSummaryModal = () => {
    summaryAbortControllerRef.current?.abort();
    draftAbortControllerRef.current?.abort();
    setIsAiSummaryLoading(false);
    setIsDraftLoading(false);
    setIsAiSummaryModalOpen(false);
  };

  const handleGenerateResponseDraft = async () => {
    if (!initialLetter?.id || isDraftLoading) return;

    const trimmedPrompt = draftPrompt.trim();
    if (!trimmedPrompt) {
      setDraftError("درخواست خود برای پیش‌نویس پاسخ را وارد کنید.");
      return;
    }

    if (!aiSummary) {
      setDraftError("ابتدا خلاصه هوشمند نامه‌های مرتبط را تولید کنید.");
      return;
    }

    setDraftError(null);
    setIsDraftLoading(true);
    draftAbortControllerRef.current?.abort();

    try {
      const controller = new AbortController();
      let result: {
        success: boolean;
        title?: string;
        content?: string;
        error?: string;
      } | null = null;

      draftAbortControllerRef.current = controller;
      const response = await fetch(`/api/ai/letters/${initialLetter.id}/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: aiSummary,
          userInstruction: trimmedPrompt,
        }),
        signal: controller.signal,
      });

      await readAiStream(response, (event) => {
        if (event.type === "draft") {
          result = {
            success: true,
            title: event.title,
            content: event.content,
          };
        }
      });

      const draftResult = (result ?? {
        success: false,
        error: "خطا در تولید پیش‌نویس پاسخ نامه.",
      }) as
        | {
            success: true;
            title: string;
            content: string;
          }
        | {
            success: false;
            error?: string;
          };

      result = draftResult;

      if (!draftResult.success) {
        setDraftError(result.error || "خطا در تولید پیش‌نویس پاسخ نامه.");
        return;
      }

      const relatedLetter: RelatedLetter = {
        id: initialLetter.id,
        title: initialLetter.title,
        internal_number: initialLetter.internal_number,
        external_number: initialLetter.external_number,
        contentSnippet: "",
        create_date: initialLetter.create_date,
      };

      window.sessionStorage.setItem(
        AI_RESPONSE_DRAFT_STORAGE_KEY,
        JSON.stringify({
          title: draftResult.title,
          content: draftResult.content,
          relatedLetter,
        } satisfies StoredAiResponseDraft)
      );

      router.push("/letter");
    } catch (draftGenerationError) {
      if (
        draftGenerationError instanceof DOMException &&
        draftGenerationError.name === "AbortError"
      ) {
        return;
      }

      console.error("AI response draft error:", draftGenerationError);
      if (draftGenerationError instanceof Error) {
        setDraftError(draftGenerationError.message);
        return;
      }
      setDraftError("خطا در تولید پیش‌نویس پاسخ نامه.");
    } finally {
      draftAbortControllerRef.current = null;
      setIsDraftLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isViewMode) return;

    setLoading(true);
    setError(null);

    try {
      if (selectedRecipients.length === 0) {
        setError("لطفاً حداقل یک گیرنده انتخاب کنید");
        setLoading(false);
        return;
      }

      const formData = new FormData(e.currentTarget);
      // Add selected recipients as JSON
      formData.set("recipients", JSON.stringify(selectedRecipients));
      formData.set("relatedLetters", JSON.stringify(selectedRelatedLetters));

      // Add all attached files that are new (have file property)
      for (const attachment of attachments) {
        if (attachment.file) {
          formData.append("files", attachment.file);
        }
      }

      const result = await createLetter(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.success && result.redirectTo) {
        router.replace(result.redirectTo);
      }
    } catch (err) {
      setError("خطا در ارسال نامه. لطفاً دوباره تلاش کنید.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPersonName = (person: Person) => {
    const firstName = person.first_name || "";
    const lastName = person.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim() || `(شخص #${person.id})`;
    const job = person.job?.trim();

    return job ? `${fullName} - ${job}` : fullName;
  };

  const getLetterNumber = (letter: RelatedLetter) => {
    return letter.internal_number || letter.external_number || `#${letter.id}`;
  };

  const canCreateResponseDraft = Boolean(
    aiSummary && !isAiSummaryLoading && !aiSummaryError
  );

  return (
    <>
      <RecipientsModal
        isOpen={isRecipientsModalOpen && !isViewMode}
        onClose={() => setIsRecipientsModalOpen(false)}
        selectedRecipients={selectedRecipients}
        onAddRecipient={handleAddRecipient}
        onRemoveRecipient={handleRemoveRecipient}
        requireUser
      />

      <RelatedLettersModal
        isOpen={isRelatedLettersModalOpen && !isViewMode}
        onClose={() => setIsRelatedLettersModalOpen(false)}
        selectedLetters={selectedRelatedLetters}
        onAddLetter={handleAddRelatedLetter}
        onRemoveLetter={handleRemoveRelatedLetter}
        currentLetterId={initialLetter?.id}
      />

      {isViewMode && initialLetter?.id && isAiSummaryModalOpen && (
        <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-gray-900/20 px-4 backdrop-blur-sm dark:bg-gray-950/35">
          <div className="flex h-[82vh] max-h-[760px] w-full max-w-6xl flex-col rounded-lg bg-white shadow-lg dark:bg-gray-800">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  {isAiSummaryLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    خلاصه هوشمند درخت نامه‌های مرتبط
                  </h2>
                  {aiSummaryMeta && (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      بر اساس {aiSummaryMeta.letterCount} نامه،{" "}
                      {aiSummaryMeta.relatedLetterCount} نامه مرتبط و{" "}
                      {aiSummaryMeta.relationCount} ارتباط
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseAiSummaryModal}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                aria-label="بستن خلاصه هوشمند"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto p-6 [direction:ltr] md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <section
                dir="rtl"
                className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex min-h-0 flex-1 flex-col space-y-3">
                  <label
                    htmlFor="ai-draft-prompt"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    دستور شما برای پیش‌نویس پاسخ
                  </label>
                  <textarea
                    id="ai-draft-prompt"
                    value={draftPrompt}
                    onChange={(event) => setDraftPrompt(event.target.value)}
                    rows={4}
                    disabled={!canCreateResponseDraft || isDraftLoading}
                    placeholder="مثلا پاسخ رسمی تهیه کن، روی تایید موارد مالی تاکید کن و درخواست زمان‌بندی بعدی را هم اضافه کن."
                    className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:opacity-70 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-900/50 dark:disabled:text-gray-500"
                  />
                  {draftError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                      {draftError}
                    </div>
                  )}
                  {isDraftLoading && (
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-7 text-gray-800 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-100">
                      <span>
                        متن پیشنویس در حالت آماده سازی با استفاده از هوش مصنوعی
                        است...
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleGenerateResponseDraft}
                      disabled={!canCreateResponseDraft || isDraftLoading}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDraftLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {isDraftLoading
                        ? "در حال تولید پیش‌نویس..."
                        : "ایجاد نامه جدید با پیش‌نویس"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftPrompt("");
                        setDraftError(null);
                      }}
                      disabled={!canCreateResponseDraft || isDraftLoading}
                      className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              </section>

              <section dir="rtl" className="flex min-h-0 flex-col">
                {isAiSummaryLoading && !aiSummary && (
                  <div className="flex min-h-0 w-full flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                    در حال بررسی درخت ارتباطات و تولید خلاصه...
                  </div>
                )}

                {aiSummaryError && (
                  <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                    {aiSummaryError}
                  </div>
                )}

                {aiSummary && (
                  <div className="min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-7 text-gray-800 [overflow-wrap:anywhere] dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-100">
                    {aiSummary}
                  </div>
                )}

                {aiSummaryMeta?.truncated && (
                  <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                    بخشی از درخت ارتباطات به دلیل محدودیت تعداد نامه‌ها در خلاصه
                    لحاظ نشده است.
                  </p>
                )}
              </section>
            </div>

            <div className="flex shrink-0 justify-end border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
              <button
                type="button"
                onClick={handleCloseAiSummaryModal}
                className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="sticky top-16.25 lg:top-19.25 z-30 p-4 flex justify-between items-center border-b border-gray-300 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
            >
              بازگشت
            </Link>
            {!isViewMode && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                {loading
                  ? initialLetter
                    ? "در حال بروزرسانی..."
                    : "در حال ایجاد..."
                  : initialLetter
                    ? "بروزرسانی نامه"
                    : "ایجاد نامه"}
              </button>
            )}
            {isViewMode && initialLetter?.id && (
              <button
                type="button"
                onClick={handleSummarizeRelatedLetters}
                disabled={isAiSummaryLoading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAiSummaryLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isAiSummaryLoading
                  ? "در حال تولید خلاصه..."
                  : "خلاصه سوابق"}
              </button>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Title Field */}
          <div className="mb-5">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              عنوان نامه
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              disabled={isViewMode}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان نامه را وارد کنید"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Recipients Selection */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              گیرندگان نامه
            </label>

            {/* Selected Recipients Display */}
            <div className="flex flex-col">
              <div className="w-full flex flex-wrap h-30 gap-2 overflow-y-auto mb-3 p-4 space-y-2 rounded-lg border border-gray-300">
                {selectedRecipients.length > 0 ? (
                  selectedRecipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      className="flex h-10 max-w-full items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-900/30"
                    >
                      <span className="me-3 min-w-0 truncate text-gray-900 dark:text-white">
                        {getPersonName(recipient)}
                      </span>
                      {!isViewMode && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(recipient.id)}
                          className="shrink-0 text-sm font-medium text-red-500 transition hover:text-red-700 dark:hover:text-red-400"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                    هنوز گیرنده‌ای انتخاب نشده
                  </div>
                )}
              </div>

              {/* Open Modal Button */}
              {!isViewMode && (
                <button
                  type="button"
                  onClick={() => setIsRecipientsModalOpen(true)}
                  className="w-40 h-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  انتخاب گیرندگان...
                </button>
              )}
            </div>
          </div>

          {/* Related Letters Selection */}
          <div className="hidden">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              نامه های مرتبط
            </label>

            <div className="flex flex-col">
              <div className="w-full min-h-30 max-h-48 overflow-y-auto mb-3 rounded-lg border border-gray-300 p-4 dark:border-gray-600">
                {selectedRelatedLetters.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {selectedRelatedLetters.map((letter) => (
                      <div
                        key={letter.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-900/30"
                      >
                        <div className="min-w-0">
                          {isViewMode ? (
                            <Link
                              href={`/letter?id=${letter.id}&viewOnly=true`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              {getLetterNumber(letter)} -{" "}
                              {letter.title || "(بدون عنوان)"}
                            </Link>
                          ) : (
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {getLetterNumber(letter)} -{" "}
                              {letter.title || "(بدون عنوان)"}
                            </p>
                          )}
                          {/* {letter.contentSnippet && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                            {letter.contentSnippet}
                          </p>
                        )} */}
                        </div>
                        {!isViewMode && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRelatedLetter(letter.id)}
                            className="shrink-0 text-sm font-medium text-red-500 transition hover:text-red-700 dark:hover:text-red-400"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    هنوز نامه مرتبطی انتخاب نشده
                  </div>
                )}
              </div>

              {!isViewMode && (
                <button
                  type="button"
                  onClick={() => setIsRelatedLettersModalOpen(true)}
                  className="h-10 w-44 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                >
                  انتخاب نامه مرتبط...
                </button>
              )}
            </div>
          </div>

          {/* Content Field */}
          <div className="mb-5">
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              محتوای نامه
            </label>
            {isViewMode ? (
              <div
                className="prose max-w-none min-h-80 rounded-lg border border-gray-300 p-4 text-gray-900 dark:prose-invert dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                dangerouslySetInnerHTML={{
                  __html: content || "<p>محتوایی ثبت نشده است</p>",
                }}
              />
            ) : (
              <Editor
                key={content}
                name="content"
                height={320}
                initialValue={content}
              />
            )}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* File Attachments */}
            <div className="min-w-0">
              <FileAttachmentManager
                attachments={attachments}
                onAddFiles={handleAddFiles}
                onRemoveFile={handleRemoveFile}
                onDownloadFile={handleDownloadFile}
                onViewFile={handleViewFile}
                maxFiles={10}
                maxFileSize={50}
                readOnly={isViewMode}
              />
            </div>

            {/* Related Letters Selection */}
            <div className="min-w-0">
              <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                نامه های مرتبط ({selectedRelatedLetters.length})
              </label>

              <div className="mb-4 flex h-50 w-full flex-col gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-600">
                {selectedRelatedLetters.length > 0 ? (
                  selectedRelatedLetters.map((letter) => (
                    <div
                      key={letter.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 transition dark:border-blue-700 dark:bg-blue-900/30"
                    >
                      <div className="min-w-0">
                        {isViewMode ? (
                          <Link
                            href={`/letter?id=${letter.id}&viewOnly=true`}
                            className="block truncate text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {getLetterNumber(letter)} -{" "}
                            {letter.title || "(بدون عنوان)"}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {getLetterNumber(letter)} -{" "}
                            {letter.title || "(بدون عنوان)"}
                          </p>
                        )}
                      </div>
                      {!isViewMode && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRelatedLetter(letter.id)}
                          className="shrink-0 text-sm font-medium text-red-500 transition hover:text-red-700 dark:hover:text-red-400"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-400">
                    هنوز نامه مرتبطی انتخاب نشده
                  </div>
                )}
              </div>

              {!isViewMode && (
                <button
                  type="button"
                  onClick={() => setIsRelatedLettersModalOpen(true)}
                  className="h-10 w-44 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                >
                  انتخاب نامه مرتبط...
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {initialLetter?.id && (
        <LetterReferrals
          letterId={initialLetter.id}
          referrals={initialLetter.referrals || []}
        />
      )}
    </>
  );
}

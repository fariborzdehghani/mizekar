"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, SendHorizontal, UserPlus, XCircle } from "lucide-react";
import {
  approveFormInstance,
  createFormReferral,
  rejectFormInstance,
  submitFormInstance,
} from "@/src/actions/formActions";
import RecipientsModal from "@/src/components/app/letters/RecipientsModal";
import Editor from "@/src/components/common/editor/editor";
import OnlyOfficeEditor from "./OnlyOfficeEditor";

type Person = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  user_id: number | null;
};

export type FormInstance = {
  id: number;
  title: string;
  templateTitle: string;
  statusLabel: string;
  creatorName: string;
  canSubmit: boolean;
  canApprove: boolean;
  canRefer: boolean;
  canEditDocument: boolean;
  activeStep: { order: number; approverName: string } | null;
  steps: Array<{
    id: number;
    order: number;
    title: string | null;
    approverName: string;
    statusLabel: string;
    actionDate: Date | string | null;
    comments: string | null;
  }>;
  referrals: Array<{
    id: number;
    senderName: string;
    receiverName: string;
    contents: string | null;
    dateTime: Date | string | null;
  }>;
  documentServerUrl: string;
  editorConfig: Record<string, unknown> | null;
  editorError: string | null;
};

function formatDate(value: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function FormInstanceView({ form }: { form: FormInstance }) {
  const router = useRouter();
  const [comments, setComments] = useState("");
  const [selectedReceivers, setSelectedReceivers] = useState<Person[]>([]);
  const [isReceiversModalOpen, setIsReceiversModalOpen] = useState(false);
  const [selectedReferralId, setSelectedReferralId] = useState<number | null>(
    form.referrals[0]?.id ?? null
  );
  const [editorKey, setEditorKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedReferral = useMemo(
    () =>
      form.referrals.find((referral) => referral.id === selectedReferralId) ||
      form.referrals[0] ||
      null,
    [form.referrals, selectedReferralId]
  );

  const runAction = async (
    action: (formData: FormData) => Promise<{ success: boolean; error?: string; message?: string }>
  ) => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("instanceId", String(form.id));
      formData.set("comments", comments);
      const result = await action(formData);

      if (!result.success) {
        setError(result.error || "عملیات انجام نشد.");
        return;
      }

      setComments("");
      setMessage(result.message || "انجام شد.");
      router.refresh();
    } catch {
      setError("عملیات انجام نشد.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReferralSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("instanceId", String(form.id));
      formData.set("receivers", JSON.stringify(selectedReceivers));
      const result = await createFormReferral(formData);

      if (!result.success) {
        setError(result.error || "امکان ثبت ارجاع وجود ندارد.");
        return;
      }

      setSelectedReceivers([]);
      setEditorKey((current) => current + 1);
      setMessage(result.message || "ارجاع ثبت شد.");
      router.refresh();
    } catch {
      setError("امکان ثبت ارجاع وجود ندارد.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addReceiver = (person: Person) => {
    setSelectedReceivers((current) =>
      current.some((receiver) => receiver.id === person.id)
        ? current
        : [...current, person]
    );
  };

  return (
    <div className="liquid-content-frame liquid-glass-page flex flex-col gap-5 py-4 sm:py-6 lg:py-8">
      <RecipientsModal
        isOpen={isReceiversModalOpen}
        onClose={() => setIsReceiversModalOpen(false)}
        selectedRecipients={selectedReceivers}
        onAddRecipient={addReceiver}
        onRemoveRecipient={(personId) =>
          setSelectedReceivers((current) =>
            current.filter((receiver) => receiver.id !== personId)
          )
        }
        title="گیرندگان ارجاع فرم"
        searchLabel="جستجو و افزودن گیرنده"
        searchPlaceholder="نام شخص را جستجو کنید..."
        selectedLabel="گیرندگان انتخاب شده"
        emptySelectedText="هنوز گیرنده‌ای انتخاب نشده"
        closeLabel="تایید"
        requireUser
      />

<<<<<<< HEAD
      <div className="liquid-page-header sticky top-[92px] z-40 flex flex-col items-stretch gap-4 lg:flex-row lg:items-start lg:justify-between">
=======
      <div className="sticky top-0 z-40 flex flex-col gap-3 border-b border-gray-300 bg-white p-4 shadow-sm dark:bg-gray-900 lg:flex-row lg:items-start lg:justify-between">
>>>>>>> cded0e3936ca9b0b93b03023a66f720b1653c148
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {form.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {form.templateTitle} / {form.statusLabel} / ایجادکننده:{" "}
            {form.creatorName}
          </p>
          {form.activeStep && (
            <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">
              مرحله فعال {form.activeStep.order}: {form.activeStep.approverName}
            </p>
          )}
          {form.canSubmit && (
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-300">
              قبل از ارسال، سند Word را در ONLYOFFICE ذخیره کنید.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {form.canSubmit && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => runAction(submitFormInstance)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SendHorizontal className="h-4 w-4" />
              ارسال
            </button>
          )}
          {form.canApprove && (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => runAction(approveFormInstance)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                تایید
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => runAction(rejectFormInstance)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                رد
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5">
      {(error || message) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
              : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200"
          }`}
        >
          {error || message}
        </div>
      )}

      {form.canApprove && (
        <textarea
          value={comments}
          onChange={(event) => setComments(event.target.value)}
          rows={3}
          placeholder="توضیحات تایید یا رد"
          className="liquid-glass-control w-full rounded-xl border px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-brand-500 dark:text-white"
        />
      )}

      <OnlyOfficeEditor
        documentServerUrl={form.documentServerUrl}
        config={form.editorConfig}
        error={form.editorError}
      />

      <div
        className={`grid gap-5 ${
          form.canRefer
            ? "xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]"
            : "grid-cols-1"
        }`}
      >
        <section
          className={`liquid-glass-panel w-full rounded-3xl border ${
            form.canRefer ? "xl:col-span-2" : ""
          }`}
        >
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              مراحل تایید
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {form.steps.map((step) => (
              <div key={step.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {step.order}. {step.approverName}
                  </p>
                  <span className="liquid-glass-inset rounded-full px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300">
                    {step.statusLabel}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(step.actionDate)}
                </p>
                {step.comments && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {step.comments}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {form.canRefer && (
          <section className="liquid-glass-panel rounded-3xl border xl:col-span-2">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                ارجاعات فرم
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {form.referrals.length} ارجاع ثبت شده
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(300px,380px)_1fr]">
              <div className="liquid-glass-inset h-[28rem] overflow-hidden rounded-2xl">
                {form.referrals.length > 0 ? (
                  <div className="h-full overflow-y-auto">
                    {form.referrals.map((referral) => {
                      const isSelected = referral.id === selectedReferral?.id;

                      return (
                        <button
                          key={referral.id}
                          type="button"
                          onClick={() => setSelectedReferralId(referral.id)}
                          className={`flex w-full flex-col gap-1 border-b border-gray-200 px-3 py-2 text-right transition last:border-b-0 dark:border-gray-700 ${
                            isSelected
                              ? "bg-brand-50 dark:bg-brand-500/15"
                              : "bg-transparent hover:bg-white/40 dark:hover:bg-white/5"
                          }`}
                        >
                          <span className="min-w-0 truncate text-xs font-semibold text-gray-900 dark:text-white">
                            {referral.senderName} به {referral.receiverName}
                          </span>
                          <span className="text-[11px] leading-4 text-gray-500 dark:text-gray-400">
                            {formatDate(referral.dateTime)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    هنوز ارجاعی ثبت نشده است.
                  </div>
                )}
              </div>

              <div className="liquid-glass-inset h-[28rem] overflow-hidden rounded-2xl p-4">
                {selectedReferral ? (
                  <div className="flex h-full flex-col">
                    <div className="mb-4 border-b border-gray-200 pb-4 dark:border-gray-700">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {selectedReferral.senderName} به{" "}
                        {selectedReferral.receiverName}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(selectedReferral.dateTime)}
                      </p>
                    </div>
                    <div
                      className="prose max-w-none flex-1 overflow-y-auto pr-1 text-gray-900 dark:prose-invert dark:text-white"
                      dangerouslySetInnerHTML={{
                        __html:
                          selectedReferral.contents ||
                          "<p>متنی برای این ارجاع ثبت نشده است.</p>",
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
                    ارجاعی انتخاب نشده است.
                  </div>
                )}
              </div>
            </div>

            <form
              onSubmit={handleReferralSubmit}
              className="border-t border-white/50 p-5 dark:border-white/10"
            >
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    ارجاع جدید
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {selectedReceivers.length} گیرنده انتخاب شده
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReceiversModalOpen(true)}
                    className="liquid-glass-control inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium text-brand-700 transition hover:border-brand-300 dark:text-brand-300"
                  >
                    <UserPlus className="h-4 w-4" />
                    گیرندگان ارجاع
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    {isSubmitting ? "در حال ثبت..." : "ثبت ارجاع"}
                  </button>
                </div>
              </div>

              {selectedReceivers.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedReceivers.map((receiver) => (
                    <span
                      key={receiver.id}
                      className="inline-flex h-9 max-w-full items-center gap-2 rounded-xl border border-brand-200/80 bg-brand-50/70 px-3 text-sm text-gray-900 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-white"
                    >
                      <span className="truncate">
                        {[receiver.first_name, receiver.last_name]
                          .filter(Boolean)
                          .join(" ") || `کاربر #${receiver.user_id}`}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              <Editor key={editorKey} name="contents" height={220} />
            </form>
          </section>
        )}
      </div>
      </div>
    </div>
  );
}

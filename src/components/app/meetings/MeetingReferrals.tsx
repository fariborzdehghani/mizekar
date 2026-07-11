"use client";

import { createMeetingReferral } from "@/src/actions/meetingActions";
import Editor from "@/src/components/common/editor/editor";
import RecipientsModal from "@/src/components/app/letters/RecipientsModal";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SendHorizontal, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Person {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  user_id: number | null;
}

export interface MeetingReferral {
  id: number;
  meeting_id: number;
  sender_id: number | null;
  receiver_id: number | null;
  date_time: Date | string | null;
  contents: string | null;
  status: number | null;
  read_at: Date | string | null;
  senderName: string;
  receiverName: string;
  contentSnippet: string;
}

interface MeetingReferralsProps {
  meetingId: number;
  referrals: MeetingReferral[];
}

function getPersonName(person: Person) {
  const fullName = [person.first_name, person.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const label = fullName || `شخص #${person.id}`;
  const job = person.job?.trim();

  return job ? `${label} - ${job}` : label;
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

function getStatusLabel(status: number | null) {
  if (status === 1) return "انجام شده";
  if (status === 2) return "بایگانی شده";
  return "در جریان";
}

export default function MeetingReferrals({
  meetingId,
  referrals,
}: MeetingReferralsProps) {
  const router = useRouter();
  const [selectedReferralId, setSelectedReferralId] = useState<number | null>(
    referrals[0]?.id ?? null
  );
  const [selectedReceivers, setSelectedReceivers] = useState<Person[]>([]);
  const [isReceiversModalOpen, setIsReceiversModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (referrals.length === 0) {
      setSelectedReferralId(null);
      return;
    }

    if (!referrals.some((referral) => referral.id === selectedReferralId)) {
      setSelectedReferralId(referrals[0].id);
    }
  }, [referrals, selectedReferralId]);

  const selectedReferral = useMemo(
    () =>
      referrals.find((referral) => referral.id === selectedReferralId) ||
      referrals[0] ||
      null,
    [referrals, selectedReferralId]
  );

  const handleAddReceiver = (person: Person) => {
    setSelectedReceivers((prev) => {
      if (prev.some((receiver) => receiver.id === person.id)) {
        return prev;
      }

      return [...prev, person];
    });
  };

  const handleRemoveReceiver = (personId: number) => {
    setSelectedReceivers((prev) =>
      prev.filter((receiver) => receiver.id !== personId)
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (selectedReceivers.length === 0) {
      setError("حداقل یک گیرنده ارجاع انتخاب کنید");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("receivers", JSON.stringify(selectedReceivers));

      const result = await createMeetingReferral(formData);

      if (!result.success) {
        setError(result.error || "خطا در ثبت ارجاع جلسه");
        return;
      }

      setSelectedReceivers([]);
      setSuccess(result.message || "ارجاع جلسه ثبت شد");
      setEditorKey((currentKey) => currentKey + 1);
      router.refresh();
    } catch (submitError) {
      console.error("Meeting referral submit error:", submitError);
      setError("خطا در ثبت ارجاع جلسه");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <RecipientsModal
        isOpen={isReceiversModalOpen}
        onClose={() => setIsReceiversModalOpen(false)}
        selectedRecipients={selectedReceivers}
        onAddRecipient={handleAddReceiver}
        onRemoveRecipient={handleRemoveReceiver}
        title="گیرندگان ارجاع جلسه"
        searchLabel="جستجو و اضافه کردن گیرنده ارجاع"
        searchPlaceholder="نام گیرنده ارجاع را جستجو کنید..."
        selectedLabel="گیرندگان ارجاع"
        emptySelectedText="هنوز گیرنده ارجاعی انتخاب نشده"
        requireUser
      />

      <section className="liquid-glass-panel rounded-3xl border p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            ارجاعات جلسه
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {referrals.length} ارجاع ثبت شده
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <div className="liquid-glass-inset h-[30rem] overflow-hidden rounded-2xl">
          {referrals.length > 0 ? (
            <div className="h-full overflow-y-auto">
              {referrals.map((referral) => {
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
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-semibold text-gray-900 dark:text-white">
                        {referral.senderName} ← {referral.receiverName}
                      </span>
                      <span className="liquid-glass-inset shrink-0 rounded-full px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-gray-300">
                        {getStatusLabel(referral.status)}
                      </span>
                    </span>
                    <span className="text-[11px] leading-4 text-gray-500 dark:text-gray-400">
                      {formatDate(referral.date_time)}
                    </span>
                    {referral.contentSnippet && (
                      <span className="line-clamp-1 text-[11px] leading-4 text-gray-600 dark:text-gray-300">
                        {referral.contentSnippet}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500 dark:text-gray-400">
              ارجاعی برای این جلسه ثبت نشده
            </div>
          )}
        </div>

        <div className="liquid-glass-inset h-[30rem] overflow-hidden rounded-2xl p-4">
          {selectedReferral ? (
            <div className="flex h-full flex-col">
              <div className="mb-4 flex flex-col gap-2 border-b border-gray-200 pb-4 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {selectedReferral.senderName} ←{" "}
                    {selectedReferral.receiverName}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(selectedReferral.date_time)}
                  </p>
                </div>
                <span className="liquid-glass-inset w-fit rounded-full px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                  {getStatusLabel(selectedReferral.status)}
                </span>
              </div>
              <div
                className="prose max-w-none flex-1 overflow-y-auto pr-1 text-gray-900 dark:prose-invert dark:text-white"
                dangerouslySetInnerHTML={{
                  __html:
                    selectedReferral.contents ||
                    "<p>متنی برای این ارجاع ثبت نشده است</p>",
                }}
              />
            </div>
          ) : (
            <div className="flex h-full min-h-72 items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
              ارجاعی انتخاب نشده
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="liquid-glass-inset mt-6 rounded-2xl p-4"
      >
        <input type="hidden" name="meetingId" value={meetingId} />

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
                <span className="truncate">{getPersonName(receiver)}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveReceiver(receiver.id)}
                  className="shrink-0 text-gray-500 transition hover:text-red-500 dark:text-gray-300"
                  aria-label="حذف گیرنده ارجاع"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>
        )}

        <Editor key={editorKey} name="content" height={220} />

        {(error || success) && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
                : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200"
            }`}
          >
            {error || success}
          </div>
        )}
      </form>
      </section>
    </>
  );
}

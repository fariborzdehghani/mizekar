"use client";

import { createLetterReferral } from "@/src/actions/letterActions";
import Editor from "@/src/components/common/editor/editor";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  SendHorizontal,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import RecipientsModal from "./RecipientsModal";

interface Person {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  user_id: number | null;
}

export interface LetterReferral {
  id: number;
  letter_id: number | null;
  sender_id: number | null;
  receiver_id: number | null;
  date_time: Date | string | null;
  contents: string | null;
  due_date: Date | string | null;
  status: number | null;
  senderName: string;
  receiverName: string;
  contentSnippet: string;
}

interface LetterReferralsProps {
  letterId: number;
  referrals: LetterReferral[];
}

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const PERSIAN_WEEK_DAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const persianPartsFormatter = new Intl.DateTimeFormat(
  "fa-IR-u-ca-persian",
  {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }
);

const persianDisplayFormatter = new Intl.DateTimeFormat(
  "fa-IR-u-ca-persian",
  {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
);

function toLatinDigits(value: string) {
  const digitMap: Record<string, string> = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };

  return value.replace(/[۰-۹٠-٩]/g, (digit) => digitMap[digit]);
}

function getPersianDateParts(date: Date) {
  const parts = persianPartsFormatter.formatToParts(date);
  const getPart = (type: string) =>
    Number(toLatinDigits(parts.find((part) => part.type === type)?.value || ""));

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function findGregorianDateForPersian(
  persianYear: number,
  persianMonth: number,
  persianDay: number
) {
  const start = new Date(Date.UTC(persianYear + 621, 2, 1));

  for (let offset = 0; offset < 430; offset += 1) {
    const candidate = new Date(start);
    candidate.setUTCDate(start.getUTCDate() + offset);

    const localCandidate = new Date(
      candidate.getUTCFullYear(),
      candidate.getUTCMonth(),
      candidate.getUTCDate()
    );
    const parts = getPersianDateParts(localCandidate);

    if (
      parts.year === persianYear &&
      parts.month === persianMonth &&
      parts.day === persianDay
    ) {
      return localCandidate;
    }
  }

  return null;
}

function getPersianMonthDays(persianYear: number, persianMonth: number) {
  const firstDay = findGregorianDateForPersian(persianYear, persianMonth, 1);
  if (!firstDay) return [];

  const days: Array<{ day: number; date: Date; value: string }> = [];
  const cursor = new Date(firstDay);

  for (let offset = 0; offset < 32; offset += 1) {
    const parts = getPersianDateParts(cursor);
    if (parts.year !== persianYear || parts.month !== persianMonth) break;

    days.push({
      day: parts.day,
      date: new Date(cursor),
      value: toDateInputValue(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function formatPersianDate(value: Date | string | null) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return persianDisplayFormatter.format(date);
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

function ShamsiDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedDate = value ? parseDateInputValue(value) : null;
  const initialParts = getPersianDateParts(selectedDate || new Date());
  const [viewYear, setViewYear] = useState(initialParts.year);
  const [viewMonth, setViewMonth] = useState(initialParts.month);
  const [isOpen, setIsOpen] = useState(false);

  const days = useMemo(
    () => getPersianMonthDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );
  const startOffset = days[0] ? (days[0].date.getDay() + 1) % 7 : 0;
  const todayValue = toDateInputValue(new Date());

  const moveMonth = (direction: -1 | 1) => {
    setViewMonth((currentMonth) => {
      const nextMonth = currentMonth + direction;
      if (nextMonth < 1) {
        setViewYear((currentYear) => currentYear - 1);
        return 12;
      }
      if (nextMonth > 12) {
        setViewYear((currentYear) => currentYear + 1);
        return 1;
      }
      return nextMonth;
    });
  };

  return (
    <div className="relative">
      <input type="hidden" name="dueDate" value={value} />
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex h-10 w-full min-w-48 items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 sm:w-auto"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="truncate">
            {selectedDate ? formatPersianDate(selectedDate) : "مهلت ارجاع"}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-12 z-40 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="ماه بعد"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {PERSIAN_MONTHS[viewMonth - 1]} {viewYear}
            </div>
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="ماه قبل"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {PERSIAN_WEEK_DAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startOffset }).map((_, index) => (
              <span key={`empty-${index}`} className="h-8" />
            ))}
            {days.map((day) => {
              const isSelected = day.value === value;
              const isToday = day.value === todayValue;

              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
                    onChange(day.value);
                    setIsOpen(false);
                  }}
                  className={`flex h-8 items-center justify-center rounded-md text-sm transition ${
                    isSelected
                      ? "bg-brand-500 text-white"
                      : isToday
                        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {day.day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const parts = getPersianDateParts(today);
                setViewYear(parts.year);
                setViewMonth(parts.month);
                onChange(toDateInputValue(today));
                setIsOpen(false);
              }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs font-medium text-gray-500 hover:text-red-500 dark:text-gray-300"
            >
              پاک کردن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LetterReferrals({
  letterId,
  referrals,
}: LetterReferralsProps) {
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
  const [dueDate, setDueDate] = useState("");

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

      const result = await createLetterReferral(formData);

      if (!result.success) {
        setError(result.error || "خطا در ثبت ارجاع نامه");
        return;
      }

      setSelectedReceivers([]);
      setDueDate("");
      setSuccess(result.message || "ارجاع نامه ثبت شد");
      setEditorKey((currentKey) => currentKey + 1);
      router.refresh();
    } catch (submitError) {
      console.error("Referral submit error:", submitError);
      setError("خطا در ثبت ارجاع نامه");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="border-t border-gray-200 bg-white px-6 py-6 dark:border-gray-800 dark:bg-gray-900">
      <RecipientsModal
        isOpen={isReceiversModalOpen}
        onClose={() => setIsReceiversModalOpen(false)}
        selectedRecipients={selectedReceivers}
        onAddRecipient={handleAddReceiver}
        onRemoveRecipient={handleRemoveReceiver}
        title="گیرندگان ارجاع"
        searchLabel="جستجو و اضافه کردن گیرنده ارجاع"
        searchPlaceholder="نام گیرنده ارجاع را جستجو کنید..."
        selectedLabel="گیرندگان ارجاع"
        emptySelectedText="هنوز گیرنده ارجاعی انتخاب نشده"
        requireUser
      />

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            ارجاعات نامه
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {referrals.length} ارجاع ثبت شده
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <div className="h-[36rem] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
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
                        : "bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-semibold text-gray-900 dark:text-white">
                        {referral.senderName} ← {referral.receiverName}
                      </span>
                      <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {getStatusLabel(referral.status)}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-4 text-gray-500 dark:text-gray-400">
                      <span>{formatDate(referral.date_time)}</span>
                      {referral.due_date && (
                        <span>مهلت: {formatPersianDate(referral.due_date)}</span>
                      )}
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
              ارجاعی برای این نامه ثبت نشده
            </div>
          )}
        </div>

        <div className="h-[36rem] overflow-hidden rounded-lg border border-gray-200 p-4 dark:border-gray-700">
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
                  {selectedReferral.due_date && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      مهلت: {formatPersianDate(selectedReferral.due_date)}
                    </p>
                  )}
                </div>
                <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
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
        className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
      >
        <input type="hidden" name="letterId" value={letterId} />

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
            <ShamsiDatePicker value={dueDate} onChange={setDueDate} />
            <button
              type="button"
              onClick={() => setIsReceiversModalOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300"
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
                className="inline-flex h-9 max-w-full items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm text-gray-900 dark:border-blue-700 dark:bg-blue-900/30 dark:text-white"
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

        <Editor key={editorKey} name="content" height={240} />

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
  );
}

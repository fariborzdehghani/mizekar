"use client";

import {
  approveMeeting,
  createMeeting,
} from "@/src/actions/meetingActions";
import Editor from "@/src/components/common/editor/editor";
import RecipientsModal from "@/src/components/app/letters/RecipientsModal";
import PersianDatePicker, {
  formatPersianDate,
  toDateInputValue,
} from "./PersianDatePicker";
import MeetingReferrals, { MeetingReferral } from "./MeetingReferrals";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, MapPin, Save, UserPlus, Video, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Person {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  user_id: number | null;
  role?: number;
}

interface MeetingData {
  id: number;
  title: string;
  description: string | null;
  location_type: number;
  location_title: string | null;
  meeting_at: Date | string;
  minutes: string;
  creator_id: number | null;
  chair_user_id: number;
  secretary_user_id: number;
  approval_status: number;
  approved_at: Date | string | null;
  create_date: Date | string | null;
  creatorName: string;
  chairName: string;
  secretaryName: string;
  canApprove: boolean;
  attendees: Person[];
  referrals: MeetingReferral[];
}

interface MeetingFormProps {
  initialMeeting?: MeetingData | null;
  isViewMode?: boolean;
  pageTitle?: string;
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

function formatDateTime(value: Date | string | null) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTimeInputValue(value: Date | string | null) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function getApprovalLabel(status: number) {
  return status === 1 ? "تایید شده" : "در انتظار تایید رئیس جلسه";
}

function getRoleLabel(role?: number) {
  if (role === 1) return "رئیس جلسه";
  if (role === 2) return "دبیر جلسه";
  return "عضو جلسه";
}

export default function MeetingForm({
  initialMeeting,
  isViewMode = false,
  pageTitle = "جلسه جدید",
}: MeetingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);
  const [isChairModalOpen, setIsChairModalOpen] = useState(false);
  const [isSecretaryModalOpen, setIsSecretaryModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationType, setLocationType] = useState(0);
  const [locationTitle, setLocationTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [minutes, setMinutes] = useState("");
  const [attendees, setAttendees] = useState<Person[]>([]);
  const [chair, setChair] = useState<Person[]>([]);
  const [secretary, setSecretary] = useState<Person[]>([]);

  useEffect(() => {
    if (!initialMeeting) return;

    const meetingDateValue =
      initialMeeting.meeting_at instanceof Date
        ? initialMeeting.meeting_at
        : new Date(initialMeeting.meeting_at);

    setTitle(initialMeeting.title || "");
    setDescription(initialMeeting.description || "");
    setLocationType(initialMeeting.location_type || 0);
    setLocationTitle(initialMeeting.location_title || "");
    setMeetingDate(
      Number.isNaN(meetingDateValue.getTime())
        ? ""
        : toDateInputValue(meetingDateValue)
    );
    setMeetingTime(getTimeInputValue(initialMeeting.meeting_at));
    setMinutes(initialMeeting.minutes || "");
    setAttendees(initialMeeting.attendees || []);
    setChair([
      {
        id: initialMeeting.chair_user_id,
        first_name: initialMeeting.chairName,
        last_name: null,
        job: null,
        user_id: initialMeeting.chair_user_id,
      },
    ]);
    setSecretary([
      {
        id: initialMeeting.secretary_user_id,
        first_name: initialMeeting.secretaryName,
        last_name: null,
        job: null,
        user_id: initialMeeting.secretary_user_id,
      },
    ]);
  }, [initialMeeting]);

  const handleAddAttendee = (person: Person) => {
    if (isViewMode) return;
    setAttendees((prev) => {
      if (prev.some((attendee) => attendee.id === person.id)) {
        return prev;
      }

      return [...prev, person];
    });
  };

  const handleRemoveAttendee = (personId: number) => {
    if (isViewMode) return;
    setAttendees((prev) => prev.filter((attendee) => attendee.id !== personId));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isViewMode) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (attendees.length === 0) {
        setError("حداقل یک کاربر حاضر در جلسه انتخاب کنید");
        return;
      }

      if (chair.length === 0) {
        setError("رئیس جلسه را انتخاب کنید");
        return;
      }

      if (secretary.length === 0) {
        setError("دبیر جلسه را انتخاب کنید");
        return;
      }

      const formData = new FormData(event.currentTarget);
      formData.set("attendees", JSON.stringify(attendees));
      formData.set("chair", JSON.stringify(chair));
      formData.set("secretary", JSON.stringify(secretary));

      const result = await createMeeting(formData);

      if (!result.success) {
        setError(result.error || "خطا در ایجاد جلسه");
        return;
      }

      if (result.redirectTo) {
        router.replace(result.redirectTo);
      }
    } catch (submitError) {
      console.error("Meeting submit error:", submitError);
      setError("خطا در ایجاد جلسه");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!initialMeeting?.id) return;

    setApproving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await approveMeeting(initialMeeting.id);

      if (!result.success) {
        setError(result.error || "خطا در تایید جلسه");
        return;
      }

      setSuccess(result.message || "جلسه تایید شد");
      router.refresh();
    } catch (approveError) {
      console.error("Meeting approve error:", approveError);
      setError("خطا در تایید جلسه");
    } finally {
      setApproving(false);
    }
  };

  return (
    <>
      <RecipientsModal
        isOpen={isAttendeesModalOpen && !isViewMode}
        onClose={() => setIsAttendeesModalOpen(false)}
        selectedRecipients={attendees}
        onAddRecipient={handleAddAttendee}
        onRemoveRecipient={handleRemoveAttendee}
        title="کاربران حاضر در جلسه"
        searchLabel="جستجو و اضافه کردن کاربر"
        searchPlaceholder="نام کاربر را جستجو کنید..."
        selectedLabel="حاضرین جلسه"
        emptySelectedText="هنوز کاربری انتخاب نشده"
        requireUser
      />

      <RecipientsModal
        isOpen={isChairModalOpen && !isViewMode}
        onClose={() => setIsChairModalOpen(false)}
        selectedRecipients={chair}
        onAddRecipient={(person) => setChair([person])}
        onRemoveRecipient={() => setChair([])}
        title="انتخاب رئیس جلسه"
        searchLabel="جستجو و انتخاب رئیس جلسه"
        searchPlaceholder="نام رئیس جلسه را جستجو کنید..."
        selectedLabel="رئیس جلسه"
        emptySelectedText="رئیس جلسه انتخاب نشده"
        requireUser
      />

      <RecipientsModal
        isOpen={isSecretaryModalOpen && !isViewMode}
        onClose={() => setIsSecretaryModalOpen(false)}
        selectedRecipients={secretary}
        onAddRecipient={(person) => setSecretary([person])}
        onRemoveRecipient={() => setSecretary([])}
        title="انتخاب دبیر جلسه"
        searchLabel="جستجو و انتخاب دبیر جلسه"
        searchPlaceholder="نام دبیر جلسه را جستجو کنید..."
        selectedLabel="دبیر جلسه"
        emptySelectedText="دبیر جلسه انتخاب نشده"
        requireUser
      />

      <form onSubmit={handleSubmit}>
        <div className="sticky top-16.25 z-30 flex items-center justify-between border-b border-gray-300 bg-white p-4 dark:bg-gray-900 lg:top-19.25">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/incoming-letters"
              className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              بازگشت
            </Link>
            {!isViewMode && (
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {loading ? "در حال ایجاد..." : "ایجاد جلسه"}
              </button>
            )}
            {isViewMode && initialMeeting?.canApprove && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {approving ? "در حال تایید..." : "تایید جلسه"}
              </button>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {pageTitle}
            </h1>
            {initialMeeting && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {getApprovalLabel(initialMeeting.approval_status)}
              </p>
            )}
          </div>
        </div>

        <div className="p-6">
          {(error || success) && (
            <div
              className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                error
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
                  : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200"
              }`}
            >
              {error || success}
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                عنوان جلسه
              </label>
              <input
                id="title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                disabled={isViewMode}
                className="h-11 w-full rounded-lg border border-gray-300 px-4 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="عنوان جلسه را وارد کنید"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                وضعیت تایید
              </label>
              <div
                className={`flex h-11 items-center rounded-lg border px-4 text-sm font-medium ${
                  initialMeeting?.approval_status === 1
                    ? "border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-200"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
                }`}
              >
                {getApprovalLabel(initialMeeting?.approval_status ?? 0)}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                تاریخ جلسه
              </label>
              <PersianDatePicker
                name="meetingDate"
                value={meetingDate}
                onChange={setMeetingDate}
                placeholder="انتخاب تاریخ جلسه"
                disabled={isViewMode}
              />
            </div>
            <div>
              <label
                htmlFor="meetingTime"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                ساعت دقیق
              </label>
              <input
                id="meetingTime"
                name="meetingTime"
                type="time"
                value={meetingTime}
                onChange={(event) => setMeetingTime(event.target.value)}
                required
                disabled={isViewMode}
                className="h-11 w-full rounded-lg border border-gray-300 px-4 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                زمان ثبت شده
              </label>
              <div className="flex h-11 items-center rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {meetingDate
                  ? `${formatPersianDate(meetingDate)} - ${
                      meetingTime || "--:--"
                    }`
                  : formatDateTime(initialMeeting?.meeting_at || null)}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[280px_1fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                نوع جلسه
              </label>
              <input type="hidden" name="locationType" value={locationType} />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isViewMode}
                  onClick={() => setLocationType(0)}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    locationType === 0
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-200"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  حضوری
                </button>
                <button
                  type="button"
                  disabled={isViewMode}
                  onClick={() => setLocationType(1)}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    locationType === 1
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-200"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  <Video className="h-4 w-4" />
                  آنلاین
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="locationTitle"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {locationType === 1 ? "لینک یا آدرس آنلاین" : "محل برگزاری"}
              </label>
              <input
                id="locationTitle"
                name="locationTitle"
                value={locationTitle}
                onChange={(event) => setLocationTitle(event.target.value)}
                required
                disabled={isViewMode}
                className="h-11 w-full rounded-lg border border-gray-300 px-4 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={
                  locationType === 1
                    ? "لینک جلسه یا آدرس سامانه"
                    : "آدرس یا اتاق جلسه"
                }
              />
            </div>
          </div>

          <div className="mb-6">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              توضیحات
            </label>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isViewMode}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="توضیحات تکمیلی جلسه"
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <PersonPickerBox
              title="رئیس جلسه"
              people={chair}
              emptyText="رئیس جلسه انتخاب نشده"
              actionLabel="انتخاب رئیس"
              onOpen={() => setIsChairModalOpen(true)}
              onRemove={() => setChair([])}
              readOnly={isViewMode}
            />
            <PersonPickerBox
              title="دبیر جلسه"
              people={secretary}
              emptyText="دبیر جلسه انتخاب نشده"
              actionLabel="انتخاب دبیر"
              onOpen={() => setIsSecretaryModalOpen(true)}
              onRemove={() => setSecretary([])}
              readOnly={isViewMode}
            />
            <PersonPickerBox
              title={`حاضرین جلسه (${attendees.length})`}
              people={attendees}
              emptyText="حاضری انتخاب نشده"
              actionLabel="انتخاب حاضرین"
              onOpen={() => setIsAttendeesModalOpen(true)}
              onRemove={handleRemoveAttendee}
              readOnly={isViewMode}
              showRole
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              دستور جلسه
            </label>
            {isViewMode ? (
              <div
                className="prose min-h-72 max-w-none rounded-lg border border-gray-300 p-4 text-gray-900 dark:prose-invert dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                dangerouslySetInnerHTML={{
                  __html: minutes || "<p>دستور جلسه ای ثبت نشده است</p>",
                }}
              />
            ) : (
              <Editor name="minutes" height={300} initialValue={minutes} />
            )}
          </div>
        </div>
      </form>

      {initialMeeting?.id && (
        <MeetingReferrals
          meetingId={initialMeeting.id}
          referrals={initialMeeting.referrals || []}
        />
      )}
    </>
  );
}

function PersonPickerBox({
  title,
  people,
  emptyText,
  actionLabel,
  onOpen,
  onRemove,
  readOnly,
  showRole = false,
}: {
  title: string;
  people: Person[];
  emptyText: string;
  actionLabel: string;
  onOpen: () => void;
  onRemove: (personId: number) => void;
  readOnly: boolean;
  showRole?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {!readOnly && (
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300"
          >
            <UserPlus className="h-4 w-4" />
            {actionLabel}
          </button>
        )}
      </div>
      <div className="flex h-44 flex-col gap-2 overflow-y-auto rounded-lg border border-gray-100 p-2 dark:border-gray-800">
        {people.length > 0 ? (
          people.map((person) => (
            <div
              key={`${person.id}-${person.user_id}`}
              className="flex min-h-10 items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {getPersonName(person)}
                </p>
                {showRole && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {getRoleLabel(person.role)}
                  </p>
                )}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onRemove(person.id)}
                  className="shrink-0 text-gray-500 transition hover:text-red-500 dark:text-gray-300"
                  aria-label="حذف"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

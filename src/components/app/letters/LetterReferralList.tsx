import Link from "next/link";
import type { ArchiveFolderNode } from "@/src/actions/archiveActions";
import ArchiveLetterButton from "./ArchiveLetterButton";
import ArchiveSelectionProvider from "./ArchiveSelectionProvider";
import InboxListRow from "./InboxListRow";
import LetterArchiveSidebar from "./LetterArchiveSidebar";
import { CalendarDays, ClipboardList, Eye, Mail } from "lucide-react";

type ReferralListItem = {
  id: number;
  letter_id: number | null;
  sender_id: number | null;
  receiver_id: number | null;
  date_time: Date | string | null;
  contents: string | null;
  due_date: Date | string | null;
  status: number | null;
  read_at: Date | string | null;
  senderName: string;
  receiverName: string;
  contentSnippet: string;
  letter: {
    id: number;
    title: string | null;
    internal_number: string | null;
    external_number: string | null;
    create_date: Date | string | null;
    contentSnippet: string;
  } | null;
};

type FormListItem = {
  id: number;
  title: string;
  templateTitle: string;
  statusLabel: string;
  createDate: Date | string | null;
  submitDate: Date | string | null;
  referralDate?: Date | string | null;
  readAt?: Date | string | null;
  activeStepOrder: number | null;
  creatorName?: string;
  activeApproverName?: string;
};

type MeetingListItem = {
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
  meeting: {
    id: number;
    title: string;
    descriptionSnippet: string;
    minutesSnippet: string;
    location_type: number;
    location_title: string | null;
    meeting_at: Date | string;
    approval_status: number;
    approved_at: Date | string | null;
  };
};

type ReferralListPerspective = "incoming" | "outgoing";

interface LetterReferralListProps {
  title: string;
  emptyText: string;
  referrals: ReferralListItem[];
  forms?: FormListItem[];
  meetings?: MeetingListItem[];
  perspective: ReferralListPerspective;
  archiveFolders?: ArchiveFolderNode[];
  searchQuery?: string;
  error?: string;
}

const persianDatePartsFormatter = new Intl.DateTimeFormat(
  "fa-IR-u-ca-persian",
  {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  },
);

function toLatinDigits(value: string) {
  return value.replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (digit) =>
    String(digit.charCodeAt(0) & 0xf),
  );
}

function getPersianDateParts(date: Date) {
  const parts = persianDatePartsFormatter.formatToParts(date);
  const getPart = (type: string) =>
    Number(toLatinDigits(parts.find((part) => part.type === type)?.value || ""));

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const { year, month, day } = getPersianDateParts(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(
    2,
    "0",
  )} ${hours}:${minutes}`;
}

function getItemTime(value: Date | string | null | undefined) {
  if (!value) return 0;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getStatusLabel(status: number | null) {
  if (status === 1) return "انجام شده";
  if (status === 2) return "بایگانی شده";
  return "در جریان";
}

function getStatusClass(status: number | null) {
  if (status === 1) {
    return "bg-blue-light-50 text-blue-light-700 dark:bg-blue-500/15 dark:text-blue-300";
  }

  if (status === 2) {
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }

  return "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
}

function getLetterNumber(referral: ReferralListItem) {
  const letter = referral.letter;

  if (!letter) return referral.letter_id ? `#${referral.letter_id}` : "-";

  return letter.internal_number || letter.external_number || `#${letter.id}`;
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("fa-IR");
}

function referralMatchesSearch(
  referral: ReferralListItem,
  perspective: ReferralListPerspective,
  searchQuery: string,
) {
  const query = normalizeSearchValue(searchQuery.trim());
  if (!query) return true;

  const letter = referral.letter;
  const personName =
    perspective === "incoming" ? referral.senderName : referral.receiverName;
  const fields = [
    getLetterNumber(referral),
    letter?.title,
    letter?.internal_number,
    letter?.external_number,
    letter?.contentSnippet,
    referral.contentSnippet,
    personName,
    getStatusLabel(referral.status),
    formatDate(referral.date_time),
    "نامه",
  ];

  return fields.some((field) => normalizeSearchValue(field).includes(query));
}

function formMatchesSearch(
  form: FormListItem,
  perspective: ReferralListPerspective,
  searchQuery: string,
) {
  const query = normalizeSearchValue(searchQuery.trim());
  if (!query) return true;

  const personName =
    perspective === "incoming" ? form.creatorName : form.activeApproverName;
  const fields = [
    `#${form.id}`,
    form.title,
    form.templateTitle,
    personName,
    form.statusLabel,
    formatDate(form.referralDate || form.submitDate || form.createDate),
    "فرم",
  ];

  return fields.some((field) => normalizeSearchValue(field).includes(query));
}

function getMeetingApprovalLabel(status: number) {
  return status === 1 ? "تایید شده" : "در انتظار تایید";
}

function meetingMatchesSearch(
  meetingReferral: MeetingListItem,
  perspective: ReferralListPerspective,
  searchQuery: string,
) {
  const query = normalizeSearchValue(searchQuery.trim());
  if (!query) return true;

  const personName =
    perspective === "incoming"
      ? meetingReferral.senderName
      : meetingReferral.receiverName;
  const meeting = meetingReferral.meeting;
  const fields = [
    `#${meeting.id}`,
    meeting.title,
    meeting.descriptionSnippet,
    meeting.minutesSnippet,
    meeting.location_title,
    meetingReferral.contentSnippet,
    personName,
    getMeetingApprovalLabel(meeting.approval_status),
    formatDate(meeting.meeting_at),
    formatDate(meetingReferral.date_time),
    "جلسه",
  ];

  return fields.some((field) => normalizeSearchValue(field).includes(query));
}

export default function LetterReferralList({
  title,
  emptyText,
  referrals,
  forms = [],
  meetings = [],
  perspective,
  archiveFolders = [],
  searchQuery = "",
  error,
}: LetterReferralListProps) {
  const filteredReferrals = referrals.filter((referral) =>
    referralMatchesSearch(referral, perspective, searchQuery),
  );
  const filteredForms = forms.filter((form) =>
    formMatchesSearch(form, perspective, searchQuery),
  );
  const filteredMeetings = meetings.filter((meeting) =>
    meetingMatchesSearch(meeting, perspective, searchQuery),
  );
  const items = [
    ...filteredReferrals.map((referral) => ({
      type: "letter" as const,
      key: `letter-${referral.id}`,
      date: referral.date_time,
      referral,
    })),
    ...filteredMeetings.map((meeting) => ({
      type: "meeting" as const,
      key: `meeting-${meeting.id}`,
      date: meeting.date_time || meeting.meeting.meeting_at,
      meeting,
    })),
    ...filteredForms.map((form) => ({
      type: "form" as const,
      key: `form-${form.id}`,
      date: form.referralDate || form.submitDate || form.createDate,
      form,
    })),
  ].sort(
    (firstItem, secondItem) =>
      getItemTime(secondItem.date) - getItemTime(firstItem.date),
  );
  const personColumnLabel =
    perspective === "incoming" ? "فرستنده / ایجادکننده" : "گیرنده / تاییدکننده";

  return (
    <ArchiveSelectionProvider>
      <div className="flex min-h-[calc(100vh-65px)] w-full flex-col lg:min-h-[calc(100vh-77px)] lg:flex-row">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-16.25 z-30 flex items-center justify-between border-b border-app-border bg-app-header-page/95 p-4 shadow-[0_1px_0_rgba(16,24,40,0.08)] backdrop-blur dark:bg-gray-900 lg:top-19.25">
            <div>
              <Link
                href="/letter"
                className="rounded-lg bg-blue-light-600 px-4 py-2 font-medium text-white transition hover:bg-blue-light-700"
              >
                نامه جدید
              </Link>
              <Link
                href="/meeting"
                className="mr-2 rounded-lg border border-app-border bg-white/70 px-4 py-2 font-medium text-gray-700 transition hover:bg-blue-light-50 hover:text-blue-light-700 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                جلسه جدید
              </Link>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {title}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {items.length} مورد
              </p>
            </div>
          </div>

          {error ? (
            <div className="m-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/20 dark:text-gray-200">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center bg-app-panel p-8 text-center dark:bg-gray-800">
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                {emptyText}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="/letter"
                  className="inline-block rounded-lg bg-blue-light-600 px-4 py-2 text-white transition hover:bg-blue-light-700"
                >
                  ایجاد نامه
                </Link>
                <Link
                  href="/new-form"
                  className="inline-block rounded-lg border border-app-border bg-white/70 px-4 py-2 text-gray-700 transition hover:bg-blue-light-50 hover:text-blue-light-700 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  ایجاد فرم
                </Link>
                <Link
                  href="/meeting"
                  className="inline-block rounded-lg border border-app-border bg-white/70 px-4 py-2 text-gray-700 transition hover:bg-blue-light-50 hover:text-blue-light-700 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  ایجاد جلسه
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border-y border-app-border bg-app-panel shadow-md dark:border-gray-800 dark:bg-gray-800">
              <table className="w-full table-auto">
                <thead className="border-b border-app-border bg-app-table-head dark:border-gray-600 dark:bg-gray-700">
                  <tr>
                    <th className="w-10 px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white">
                      <span className="sr-only">نوع</span>
                    </th>
                    <th className="w-px whitespace-nowrap px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      شماره
                    </th>
                    <th className="w-full min-w-64 px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      عنوان
                    </th>
                    <th className="w-px whitespace-nowrap px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {personColumnLabel}
                    </th>
                    <th className="w-px whitespace-nowrap px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      تاریخ ارجاع
                    </th>
                    <th className="w-px whitespace-nowrap px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      وضعیت
                    </th>
                    <th className="w-px whitespace-nowrap px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border dark:divide-gray-700">
                  {items.map((item) => {
                    if (item.type === "meeting") {
                      const meetingReferral = item.meeting;
                      const meeting = meetingReferral.meeting;
                      const personName =
                        perspective === "incoming"
                          ? meetingReferral.senderName
                          : meetingReferral.receiverName;
                      const isUnreadIncoming =
                        perspective === "incoming" && !meetingReferral.read_at;

                      return (
                        <InboxListRow
                          key={item.key}
                          href={`/meeting?id=${meeting.id}&viewOnly=true`}
                          archiveItemType="meeting"
                          archiveItemId={meeting.id}
                          archiveFolders={archiveFolders}
                          className={`transition hover:bg-white/70 dark:hover:bg-gray-700 ${
                            isUnreadIncoming
                              ? "border-r-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                              : ""
                          }`}
                        >
                          <td className="w-10 px-3 py-2">
                            <CalendarDays
                              className="mx-auto h-4 w-4 text-blue-500"
                              aria-label="جلسه"
                            />
                          </td>
                          <td className="w-px whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                            #{meeting.id}
                          </td>
                          <td className="w-full max-w-0 px-3 py-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {isUnreadIncoming && (
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full bg-blue-500"
                                    title="خوانده نشده"
                                  />
                                )}
                                <p
                                  className={`min-w-0 truncate text-sm text-gray-900 dark:text-white ${
                                    isUnreadIncoming
                                      ? "font-bold"
                                      : "font-medium"
                                  }`}
                                >
                                  {meeting.title || "(بدون عنوان)"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="w-px whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="whitespace-nowrap">
                              {personName}
                            </span>
                          </td>
                          <td className="w-px whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(meetingReferral.date_time)}
                          </td>
                          <td className="w-px whitespace-nowrap px-3 py-2 text-sm">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                                meeting.approval_status === 1
                                  ? "bg-blue-light-50 text-blue-light-700 dark:bg-blue-500/15 dark:text-blue-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              }`}
                            >
                              {getMeetingApprovalLabel(meeting.approval_status)}
                            </span>
                          </td>
                          <td className="w-px whitespace-nowrap px-3 py-2 text-sm">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/meeting?id=${meeting.id}&viewOnly=true`}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
                                title="مشاهده جلسه"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                              <ArchiveLetterButton
                                itemType="meeting"
                                itemId={meeting.id}
                                folders={archiveFolders}
                                size="compact"
                              />
                            </div>
                          </td>
                        </InboxListRow>
                      );
                    }

                    if (item.type === "form") {
                      const form = item.form;
                      const personName =
                        perspective === "incoming"
                          ? form.creatorName || "-"
                          : form.activeApproverName || "-";
                      const isUnreadIncoming =
                        perspective === "incoming" && !form.readAt;

                      return (
                        <InboxListRow
                          key={item.key}
                          href={`/form?id=${form.id}`}
                          archiveItemType="form"
                          archiveItemId={form.id}
                          archiveFolders={archiveFolders}
                          className={`transition hover:bg-white/70 dark:hover:bg-gray-700 ${
                            isUnreadIncoming
                              ? "border-r-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                              : ""
                          }`}
                        >
                          <td className="w-10 px-3 py-2">
                            <ClipboardList
                              className="mx-auto h-4 w-4 text-blue-500"
                              aria-label="فرم"
                            />
                          </td>
                          <td className="w-px whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                            #{form.id}
                          </td>
                          <td className="w-full max-w-0 px-3 py-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {isUnreadIncoming && (
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full bg-blue-500"
                                    title="خوانده نشده"
                                  />
                                )}
                                <p
                                  className={`min-w-0 truncate text-sm text-gray-900 dark:text-white ${
                                    isUnreadIncoming
                                      ? "font-bold"
                                      : "font-medium"
                                  }`}
                                >
                                  {form.title || "(بدون عنوان)"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="w-px whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="whitespace-nowrap">
                              {personName}
                            </span>
                          </td>
                          <td className="w-px whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(item.date)}
                          </td>
                          <td className="w-px whitespace-nowrap px-3 py-2 text-sm">
                            <span className="inline-flex whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                              {form.statusLabel}
                              {form.activeStepOrder
                                ? ` / مرحله ${form.activeStepOrder}`
                                : ""}
                            </span>
                          </td>
                          <td className="w-px whitespace-nowrap px-3 py-2 text-sm">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/form?id=${form.id}`}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
                                title="مشاهده فرم"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                              <ArchiveLetterButton
                                itemType="form"
                                itemId={form.id}
                                folders={archiveFolders}
                                size="compact"
                              />
                            </div>
                          </td>
                        </InboxListRow>
                      );
                    }

                    const referral = item.referral;
                    const letter = referral.letter;
                    const personName =
                      perspective === "incoming"
                        ? referral.senderName
                        : referral.receiverName;
                    const isUnreadIncoming =
                      perspective === "incoming" && !referral.read_at;

                    return (
                      <InboxListRow
                        key={item.key}
                        href={letter ? `/letter?id=${letter.id}&viewOnly=true` : null}
                        archiveItemType="letter"
                        archiveItemId={letter?.id}
                        archiveFolders={archiveFolders}
                        markUnreadReferralId={
                          perspective === "incoming" && referral.read_at
                            ? referral.id
                            : undefined
                        }
                        className={`transition hover:bg-white/70 dark:hover:bg-gray-700 ${
                          isUnreadIncoming
                            ? "border-r-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                            : ""
                        }`}
                      >
                        <td className="w-10 px-3 py-2">
                          <Mail
                            className="mx-auto h-4 w-4 text-blue-500"
                            aria-label="نامه"
                          />
                        </td>
                        <td className="w-px whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {getLetterNumber(referral)}
                        </td>
                        <td className="w-full max-w-0 px-3 py-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {isUnreadIncoming && (
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-blue-500"
                                  title="خوانده نشده"
                                />
                              )}
                              <p
                                className={`min-w-0 truncate text-sm text-gray-900 dark:text-white ${
                                  isUnreadIncoming ? "font-bold" : "font-medium"
                                }`}
                              >
                                {letter?.title || "(بدون عنوان)"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="w-px whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="whitespace-nowrap">
                            {personName}
                          </span>
                        </td>
                        <td className="w-px whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(referral.date_time)}
                        </td>
                        <td className="w-px whitespace-nowrap px-3 py-2 text-sm">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(
                              referral.status,
                            )}`}
                          >
                            {getStatusLabel(referral.status)}
                          </span>
                        </td>
                        <td className="w-px whitespace-nowrap px-3 py-2 text-sm">
                          {letter ? (
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/letter?id=${letter.id}&viewOnly=true`}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
                                title="مشاهده نامه"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                              <ArchiveLetterButton
                                letterId={letter.id}
                                folders={archiveFolders}
                                size="compact"
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </InboxListRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
        <LetterArchiveSidebar folders={archiveFolders} />
      </div>
    </ArchiveSelectionProvider>
  );
}

import Link from "next/link";
import type { ArchiveFolderNode } from "@/src/actions/archiveActions";
import ArchiveLetterButton from "./ArchiveLetterButton";
import ArchiveSelectionProvider from "./ArchiveSelectionProvider";
import InboxListCard from "./InboxListCard";
import InboxArchiveLayout, { ArchivePanelToggleButton } from "./InboxArchiveLayout";
import {
  ArrowDownUp,
  CalendarDays,
  ClipboardList,
  Eye,
  Filter,
  Mail,
  PenLine,
  Search,
} from "lucide-react";

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
  itemType?: "all" | "letter" | "meeting" | "form";
  sortOrder?: "asc" | "desc";
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
  itemType = "all",
  sortOrder = "desc",
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
  const allItems = [
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
  ];
  const items = allItems
    .filter((item) => itemType === "all" || item.type === itemType)
    .sort((firstItem, secondItem) => {
      const difference = getItemTime(secondItem.date) - getItemTime(firstItem.date);
      return sortOrder === "desc" ? difference : -difference;
    });
  const basePath = perspective === "incoming" ? "/incoming-letters" : "/outgoing-letters";
  const getListHref = (nextType: typeof itemType, nextSort = sortOrder) => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (nextType !== "all") params.set("type", nextType);
    if (nextSort !== "desc") params.set("sort", nextSort);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  return (
    <ArchiveSelectionProvider>
<<<<<<< HEAD
      <div className="liquid-content-frame liquid-glass-page min-h-[calc(100vh-92px)] overflow-x-hidden py-4 sm:py-5 lg:py-6">
        <section className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="text-right">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-brand-500">
                <Mail className="h-4 w-4" /> مرکز مکاتبات
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-[30px]">
                {title}
              </h1>
              <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                نامه‌ها، ارجاعات و مکاتبات سازمانی شما در یک جا
              </p>
            </div>
            <Link
              href="/letter"
              className="flex h-11 items-center justify-center gap-2 rounded-[15px] bg-brand-500 px-5 text-xs font-bold text-white shadow-[0_12px_28px_rgba(98,92,255,.3)] transition hover:-translate-y-0.5 hover:bg-brand-600"
            >
              <PenLine className="h-4 w-4" /> ایجاد نامه جدید
            </Link>
          </div>
          <InboxArchiveLayout folders={archiveFolders}>
        <main className="liquid-glass-surface flex min-h-[560px] min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/70 dark:border-white/10">
          <div className="flex min-h-[68px] shrink-0 flex-col gap-4 border-b border-black/5 p-4 dark:border-white/5 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-[15px] bg-black/[0.035] p-1 dark:bg-white/[0.04]">
              {([
                ["all", "همه موارد", allItems.length],
                ["letter", "نامه‌ها", filteredReferrals.length],
                ["meeting", "جلسات", filteredMeetings.length],
                ["form", "فرم‌ها", filteredForms.length],
              ] as const).map(([type, label, count]) => (
                <Link
                  key={type}
                  href={getListHref(type)}
                  aria-current={itemType === type ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-bold transition ${
                    itemType === type
                      ? "bg-white text-brand-500 shadow-sm dark:bg-white/10"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {label}
                  <span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[9px]">{count.toLocaleString("fa-IR")}</span>
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <form className="relative min-w-0 flex-1 lg:w-56" action={basePath}>
                <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--liquid-muted)]" />
                {itemType !== "all" && <input type="hidden" name="type" value={itemType} />}
                {sortOrder !== "desc" && <input type="hidden" name="sort" value={sortOrder} />}
                <input name="q" defaultValue={searchQuery} className="h-9 w-full rounded-xl border border-black/[0.045] bg-black/[0.025] pr-9 pl-3 text-[11px] text-[var(--liquid-ink)] outline-none placeholder:text-[var(--liquid-muted)] focus:border-brand-500/25 dark:border-white/[0.06] dark:bg-white/[0.035]" placeholder="جستجو در کارتابل..." />
              </form>
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/[0.045] bg-white/40 text-[var(--liquid-muted)] dark:border-white/[0.06] dark:bg-white/[0.035]"><Filter className="h-3.5 w-3.5" /></span>
              <Link href={getListHref(itemType, sortOrder === "desc" ? "asc" : "desc")} aria-label={sortOrder === "desc" ? "مرتب‌سازی از قدیمی‌ترین" : "مرتب‌سازی از جدیدترین"} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/[0.045] bg-white/40 text-[var(--liquid-muted)] transition hover:text-brand-500 dark:border-white/[0.06] dark:bg-white/[0.035]"><ArrowDownUp className={`h-3.5 w-3.5 transition ${sortOrder === "asc" ? "rotate-180" : ""}`} /></Link>
              <ArchivePanelToggleButton />
            </div>
            <div className="hidden">
=======
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-app-border bg-app-header-page/95 p-4 shadow-[0_1px_0_rgba(16,24,40,0.08)] backdrop-blur dark:bg-gray-900">
            <div>
>>>>>>> cded0e3936ca9b0b93b03023a66f720b1653c148
              <Link
                href="/letter"
                className="rounded-2xl bg-brand-500 px-4 py-2 font-medium text-white shadow-[0_10px_24px_rgba(98,92,255,0.26)] transition hover:bg-brand-600"
              >
                نامه جدید
              </Link>
              <Link
                href="/meeting"
                className="liquid-glass-control rounded-2xl border border-app-border bg-white/70 px-4 py-2 font-medium text-gray-700 transition hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                جلسه جدید
              </Link>
            </div>
            <div className="hidden text-right">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
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
                  className="inline-block rounded-2xl bg-brand-500 px-4 py-2 text-white shadow-[0_10px_24px_rgba(98,92,255,0.24)] transition hover:bg-brand-600"
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
            <div className="flex-1 divide-y divide-black/5 overflow-auto bg-white/25 dark:divide-white/5 dark:bg-white/[0.015]">
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
                        <InboxListCard
                          key={item.key}
                          href={`/meeting?id=${meeting.id}&viewOnly=true`}
                          archiveItemType="meeting"
                          archiveItemId={meeting.id}
                          archiveFolders={archiveFolders}
                          className={`px-4 py-4 transition hover:bg-white/70 dark:hover:bg-white/[0.04] sm:px-5 ${
                            isUnreadIncoming
                              ? "bg-blue-100/50 dark:bg-blue-950/25"
                              : ""
                          }`}
                        >
                          {isUnreadIncoming && <span className="absolute inset-y-0 right-0 w-[3px] rounded-l-full bg-brand-500" />}
                          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm"><CalendarDays className="h-5 w-5" /></span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-[10px]"><span className="font-extrabold text-gray-800 dark:text-gray-100">{personName}</span><span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-gray-500 dark:bg-white/5 dark:text-gray-400">جلسه #{meeting.id}</span><span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 font-bold text-blue-600 dark:text-blue-300">{getMeetingApprovalLabel(meeting.approval_status)}</span></div>
                              <p className={`mt-1.5 truncate text-sm text-gray-900 dark:text-white ${isUnreadIncoming ? "font-extrabold" : "font-bold"}`}>{meeting.title || "(بدون عنوان)"}</p>
                              <p className="mt-1.5 truncate text-[11px] text-gray-500 dark:text-gray-400">{meetingReferral.contentSnippet || meeting.descriptionSnippet || "بدون توضیحات"}</p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2 self-stretch text-[10px] text-gray-500 dark:text-gray-400"><span>{formatDate(meetingReferral.date_time)}</span><div className="mt-auto flex items-center gap-1.5">
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
                            </div></div>
                          </div>
                        </InboxListCard>
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
                        <InboxListCard
                          key={item.key}
                          href={`/form?id=${form.id}`}
                          archiveItemType="form"
                          archiveItemId={form.id}
                          archiveFolders={archiveFolders}
                          className={`px-4 py-4 transition hover:bg-white/70 dark:hover:bg-white/[0.04] sm:px-5 ${
                            isUnreadIncoming
                              ? "bg-blue-100/50 dark:bg-blue-950/25"
                              : ""
                          }`}
                        >
                          {isUnreadIncoming && <span className="absolute inset-y-0 right-0 w-[3px] rounded-l-full bg-brand-500" />}
                          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm"><ClipboardList className="h-5 w-5" /></span>
                            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-[10px]"><span className="font-extrabold text-gray-800 dark:text-gray-100">{personName}</span><span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-gray-500 dark:bg-white/5 dark:text-gray-400">فرم #{form.id}</span><span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 font-bold text-amber-600 dark:text-amber-300">{form.statusLabel}{form.activeStepOrder ? ` · مرحله ${form.activeStepOrder}` : ""}</span></div><p className={`mt-1.5 truncate text-sm text-gray-900 dark:text-white ${isUnreadIncoming ? "font-extrabold" : "font-bold"}`}>{form.title || "(بدون عنوان)"}</p><p className="mt-1.5 truncate text-[11px] text-gray-500 dark:text-gray-400">{form.templateTitle}</p></div>
                            <div className="flex shrink-0 flex-col items-end gap-2 self-stretch text-[10px] text-gray-500 dark:text-gray-400"><span>{formatDate(item.date)}</span><div className="mt-auto flex items-center gap-1.5">
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
                            </div></div>
                          </div>
                        </InboxListCard>
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
                      <InboxListCard
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
                        className={`px-4 py-4 transition hover:bg-white/70 dark:hover:bg-white/[0.04] sm:px-5 ${
                          isUnreadIncoming
                            ? "bg-blue-100/50 dark:bg-blue-950/25"
                            : ""
                        }`}
                      >
                        {isUnreadIncoming && <span className="absolute inset-y-0 right-0 w-[3px] rounded-l-full bg-brand-500" />}
                        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-gradient-to-br from-violet-500 to-brand-600 text-white shadow-sm"><Mail className="h-5 w-5" /></span>
                          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-[10px]"><span className="font-extrabold text-gray-800 dark:text-gray-100">{personName}</span><span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-gray-500 dark:bg-white/5 dark:text-gray-400">{getLetterNumber(referral)}</span><span className={`rounded-md px-1.5 py-0.5 font-bold ${getStatusClass(referral.status)}`}>{getStatusLabel(referral.status)}</span></div><p className={`mt-1.5 truncate text-sm text-gray-900 dark:text-white ${isUnreadIncoming ? "font-extrabold" : "font-bold"}`}>{letter?.title || "(بدون عنوان)"}</p><p className="mt-1.5 truncate text-[11px] text-gray-500 dark:text-gray-400">{referral.contentSnippet || letter?.contentSnippet || "بدون توضیحات"}</p></div>
                          <div className="flex shrink-0 flex-col items-end gap-2 self-stretch text-[10px] text-gray-500 dark:text-gray-400"><span>{formatDate(referral.date_time)}</span>
                          {letter ? (
                            <div className="mt-auto flex items-center gap-1.5">
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
                          </div>
                        </div>
                      </InboxListCard>
                    );
                  })}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-black/5 px-5 py-4 text-[10px] font-medium text-gray-500 dark:border-white/5 dark:text-gray-400">
            <span>نمایش {items.length.toLocaleString("fa-IR")} مورد</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500 font-bold text-white">۱</span>
          </div>
        </main>
          </InboxArchiveLayout>
        </section>
      </div>
    </ArchiveSelectionProvider>
  );
}

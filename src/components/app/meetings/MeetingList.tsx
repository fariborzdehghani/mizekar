"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, Eye, MapPin, Plus, Video } from "lucide-react";
import type { ArchiveFolderNode } from "@/src/actions/archiveActions";
import ArchiveLetterButton from "@/src/components/app/letters/ArchiveLetterButton";
import ArchiveSelectionProvider from "@/src/components/app/letters/ArchiveSelectionProvider";
import LetterArchiveSidebar from "@/src/components/app/letters/LetterArchiveSidebar";

type CreatedMeetingListItem = {
  id: number;
  title: string;
  descriptionSnippet: string;
  location_type: number;
  location_title: string | null;
  meeting_at: Date | string;
  approval_status: number;
  approved_at: Date | string | null;
  create_date: Date | string | null;
  chairName: string;
  secretaryName: string;
  attendeesCount: number;
  referralsCount: number;
};

interface MeetingListProps {
  meetings: CreatedMeetingListItem[];
  archiveFolders?: ArchiveFolderNode[];
  searchQuery?: string;
  error?: string;
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

function getApprovalLabel(status: number) {
  return status === 1 ? "تایید شده" : "در انتظار تایید";
}

function getApprovalClass(status: number) {
  if (status === 1) {
    return "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300";
  }

  return "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
}

export default function MeetingList({
  meetings,
  archiveFolders = [],
  searchQuery = "",
  error,
}: MeetingListProps) {
  const router = useRouter();

  return (
    <ArchiveSelectionProvider>
      <div className="liquid-content-frame liquid-glass-page flex h-[calc(100vh-92px)] min-h-0 flex-col gap-6 overflow-hidden py-4 sm:py-6 lg:flex-row lg:py-8">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="liquid-page-header liquid-page-header-inset sticky top-0 z-30 flex shrink-0 flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/meeting"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-2 font-medium text-white shadow-[0_10px_24px_rgba(98,92,255,0.26)] transition hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              جلسه جدید
            </Link>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                جلسات ایجاد شده
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {meetings.length} جلسه
                {searchQuery ? ` برای «${searchQuery}»` : ""}
              </p>
            </div>
          </div>

          {error ? (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          ) : meetings.length === 0 ? (
            <div className="liquid-glass-panel m-4 flex flex-1 flex-col items-center justify-center rounded-[24px] border border-app-border bg-app-panel p-8 text-center dark:border-gray-800 dark:bg-gray-900">
              <CalendarCheck className="mb-4 h-10 w-10 text-gray-400" />
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                هنوز جلسه‌ای ایجاد نکرده‌اید
              </p>
              <Link
                href="/meeting"
                className="inline-block rounded-2xl bg-brand-500 px-4 py-2 text-white transition hover:bg-brand-600"
              >
                ایجاد جلسه
              </Link>
            </div>
          ) : (
            <div className="liquid-glass-panel m-4 flex-1 overflow-auto! rounded-[24px] border border-app-border bg-app-panel shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
              <table className="w-full min-w-[960px]">
            <thead className="sticky top-0 z-20 border-b border-app-border bg-app-table-head shadow-[0_1px_0_rgba(16,24,40,0.08)] backdrop-blur dark:border-gray-700 dark:bg-gray-800/90">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عنوان
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  زمان جلسه
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  محل
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  رئیس / دبیر
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  وضعیت
                </th>
                <th className="w-px whitespace-nowrap px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {meetings.map((meeting) => (
                <tr
                  key={meeting.id}
                  className="cursor-pointer select-none transition hover:bg-white/70 dark:hover:bg-white/5"
                  onDoubleClick={() =>
                    router.push(`/meeting?id=${meeting.id}&viewOnly=true`)
                  }
                  title="برای مشاهده دوبار کلیک کنید"
                >
                  <td className="px-6 py-4">
                    <div className="max-w-md">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {meeting.title || "(بدون عنوان)"}
                      </p>
                    </div>
                  </td>
                  <td className="w-56 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(meeting.meeting_at)}
                  </td>
                  <td className="w-72 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex max-w-72 items-center gap-2 truncate">
                      {meeting.location_type === 1 ? (
                        <Video className="h-4 w-4 shrink-0" />
                      ) : (
                        <MapPin className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate">
                        {meeting.location_type === 1 ? "آنلاین" : "حضوری"}
                      </span>
                    </span>
                  </td>
                  <td className="w-80 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="block max-w-80 truncate">
                      رئیس: {meeting.chairName}
                    </span>
                    <span className="mt-1 block max-w-80 truncate text-xs text-gray-500 dark:text-gray-400">
                      دبیر: {meeting.secretaryName}
                    </span>
                  </td>
                  <td className="w-40 px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getApprovalClass(
                        meeting.approval_status
                      )}`}
                    >
                      {getApprovalLabel(meeting.approval_status)}
                    </span>
                  </td>
                  <td className="w-px whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/meeting?id=${meeting.id}&viewOnly=true`}
                        className="liquid-glass-control inline-flex h-8 w-8 items-center justify-center rounded-xl border border-app-border text-gray-600 transition hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:text-brand-300"
                        title="مشاهده جلسه"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <ArchiveLetterButton
                        itemType="meeting"
                        itemId={meeting.id}
                        folders={archiveFolders}
                      />
                    </div>
                  </td>
                </tr>
              ))}
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

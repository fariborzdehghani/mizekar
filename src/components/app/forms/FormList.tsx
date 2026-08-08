import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import InboxListToolbar from "@/src/components/common/InboxListToolbar";
import { EmptyState, PageTitle, buttonStyles } from "@/src/components/ui";

type FormListItem = {
  id: number;
  title: string;
  templateTitle: string;
  statusLabel: string;
  createDate: Date | string | null;
  submitDate: Date | string | null;
  activeStepOrder: number | null;
  creatorName?: string;
  activeApproverName?: string;
};

type FormListProps = {
  title: string;
  emptyText: string;
  forms: FormListItem[];
  perspective: "incoming" | "outgoing";
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

export default function FormList({
  title,
  emptyText,
  forms,
  perspective,
}: FormListProps) {
  return (
    <div className="liquid-page-frame flex w-full flex-col gap-5 bg-transparent">
      <div className="liquid-page-header flex items-center justify-between">
        <Link
          href="/new-form"
          className={buttonStyles()}
        >
          فرم جدید
        </Link>
        <PageTitle title={title} description={`${forms.length} فرم`} />
      </div>

      {forms.length === 0 ? (
        <EmptyState
          className="flex-1"
          icon={<FileText className="h-6 w-6" />}
          title={emptyText}
          action={
          <Link
            href="/new-form"
            className={buttonStyles()}
          >
            ایجاد فرم
          </Link>
          }
        />
      ) : (
        <div className="liquid-table-shell overflow-hidden rounded-panel">
          <InboxListToolbar searchPlaceholder="جستجو در فرم‌ها..." />
          <div className="overflow-x-auto">
          <table className="inbox-card-table inbox-card-table--forms w-full">
            <thead className="border-b border-white/50 bg-white/25 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عنوان
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  قالب
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {perspective === "incoming" ? "ایجادکننده" : "تاییدکننده فعلی"}
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  تاریخ ارسال
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  وضعیت
                </th>
                <th className="w-px whitespace-nowrap px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/55 dark:divide-white/10">
              {forms.map((form) => (
                <tr
                  key={form.id}
                  className="transition hover:bg-white/35 dark:hover:bg-white/[0.035]"
                >
                  <td className="px-6 py-4">
                    <p className="max-w-md truncate text-sm font-medium text-gray-900 dark:text-white">
                      {form.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      ایجاد شده در {formatDate(form.createDate)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {form.templateTitle}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {perspective === "incoming"
                      ? form.creatorName || "-"
                      : form.activeApproverName || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {formatDate(form.submitDate)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      {form.statusLabel}
                    </span>
                    {form.activeStepOrder ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        مرحله {form.activeStepOrder}
                      </span>
                    ) : null}
                  </td>
                  <td className="w-px whitespace-nowrap px-6 py-4 text-sm">
                    <Link
                      href={`/form?id=${form.id}`}
                      className="liquid-glass-control inline-flex h-9 w-9 items-center justify-center rounded-xl border text-gray-600 transition hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-300"
                      title="مشاهده فرم"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

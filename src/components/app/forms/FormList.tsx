import Link from "next/link";
import { Eye, FileText } from "lucide-react";

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
      <div className="liquid-glass-surface sticky top-[92px] z-30 flex items-center justify-between rounded-3xl border p-5">
        <Link
          href="/new-form"
          className="rounded-2xl bg-brand-500 px-4 py-2 font-medium text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600"
        >
          فرم جدید
        </Link>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {forms.length} فرم
          </p>
        </div>
      </div>

      {forms.length === 0 ? (
        <div className="liquid-glass-surface flex flex-1 flex-col items-center justify-center rounded-3xl border p-8 text-center">
          <FileText className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mb-4 text-gray-600 dark:text-gray-400">{emptyText}</p>
          <Link
            href="/new-form"
            className="inline-block rounded-2xl bg-brand-500 px-4 py-2 text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600"
          >
            ایجاد فرم
          </Link>
        </div>
      ) : (
        <div className="liquid-table-shell overflow-x-auto rounded-3xl">
          <table className="w-full min-w-[860px]">
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
                      {form.activeStepOrder
                        ? ` / مرحله ${form.activeStepOrder}`
                        : ""}
                    </span>
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
      )}
    </div>
  );
}

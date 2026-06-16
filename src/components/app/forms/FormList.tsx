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
    <div className="flex min-h-[calc(100vh-65px)] w-full flex-col bg-white dark:bg-gray-900 lg:min-h-[calc(100vh-77px)]">
      <div className="sticky top-[65px] z-30 flex items-center justify-between border-b border-gray-300 bg-white p-4 dark:bg-gray-900 lg:top-[77px]">
        <Link
          href="/new-form"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
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
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <FileText className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mb-4 text-gray-600 dark:text-gray-400">{emptyText}</p>
          <Link
            href="/new-form"
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            ایجاد فرم
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
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
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {forms.map((form) => (
                <tr
                  key={form.id}
                  className="transition hover:bg-gray-50 dark:hover:bg-gray-800"
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
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
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

import Link from "next/link";
import { Eye } from "lucide-react";
import { searchAccessibleLetters } from "@/src/actions/letterActions";
import InboxListRow from "@/src/components/app/letters/InboxListRow";
import { uniqueLetterTagNames } from "@/src/lib/letterTags";

interface LetterSearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getParam(
  params: { [key: string]: string | string[] | undefined },
  key: string
) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() || "";
}

function getTagsParam(params: { [key: string]: string | string[] | undefined }) {
  return uniqueLetterTagNames(
    [getParam(params, "tags"), getParam(params, "tag")]
      .filter(Boolean)
      .join(",")
      .split(/[،,]/)
  );
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

function getLetterNumber(letter: {
  id: number;
  internal_number: string | null;
  external_number: string | null;
}) {
  return letter.internal_number || letter.external_number || `#${letter.id}`;
}

function getDirectionLabel(letter: { isIncoming: boolean; isOutgoing: boolean }) {
  if (letter.isIncoming && letter.isOutgoing) return "ورودی و خروجی";
  if (letter.isIncoming) return "ورودی";
  if (letter.isOutgoing) return "خروجی";
  return "-";
}

export default async function LetterSearchPage({
  searchParams,
}: LetterSearchPageProps) {
  const params = await searchParams;
  const title = getParam(params, "title");
  const content = getParam(params, "content");
  const createDate = getParam(params, "createDate");
  const tags = getTagsParam(params);
  const result = await searchAccessibleLetters({ title, content, createDate, tags });

  return (
    <div className="flex min-h-[calc(100vh-65px)] w-full flex-col lg:min-h-[calc(100vh-77px)]">
      <div className="sticky top-[65px] z-30 flex items-center justify-between border-b border-gray-300 bg-white p-4 dark:bg-gray-900 lg:top-[77px]">
        <Link
          href="/letter"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
        >
          نامه جدید
        </Link>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            جستجوی پیشرفته نامه‌ها
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {result.hasSearchCriteria ? `${result.letters.length} نتیجه` : "معیار جستجو را وارد کنید"}
          </p>
        </div>
      </div>

      {!result.success ? (
        <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {result.error}
        </div>
      ) : !result.hasSearchCriteria ? (
        <div className="flex flex-1 items-center justify-center bg-white p-8 text-center text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          از دکمه جستجوی پیشرفته در سربرگ، عنوان، متن یا تاریخ ایجاد نامه را وارد کنید.
        </div>
      ) : result.letters.length === 0 ? (
        <div className="flex flex-1 items-center justify-center bg-white p-8 text-center text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          نامه‌ای با این معیارها پیدا نشد.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white shadow-md dark:bg-gray-800">
          <table className="w-full min-w-[920px]">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  شماره
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عنوان
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  تاریخ ایجاد
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  مسیر
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  بایگانی
                </th>
                <th className="w-px whitespace-nowrap px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {result.letters.map((letter) => (
                <InboxListRow
                  key={letter.id}
                  href={`/letter?id=${letter.id}&viewOnly=true`}
                  className="transition hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="w-44 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {getLetterNumber(letter)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-md">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {letter.title || "(بدون عنوان)"}
                      </p>
                    </div>
                  </td>
                  <td className="w-52 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(letter.create_date)}
                  </td>
                  <td className="w-36 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {getDirectionLabel(letter)}
                  </td>
                  <td className="w-44 px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {letter.archiveFolderTitle || "-"}
                  </td>
                  <td className="w-px whitespace-nowrap px-6 py-4 text-sm">
                    <Link
                      href={`/letter?id=${letter.id}&viewOnly=true`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
                      title="مشاهده نامه"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </InboxListRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

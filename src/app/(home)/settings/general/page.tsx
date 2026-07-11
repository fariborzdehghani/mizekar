import { updateGeneralSetting } from "@/src/actions/settingsActions";
import { prisma } from "@/src/lib/prisma";
import { SlidersHorizontal } from "lucide-react";

interface GeneralSettingsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("fa-IR");
}

function getSearchQuery(params: { [key: string]: string | string[] | undefined }) {
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return query?.trim() || "";
}

export default async function GeneralSettingsPage({
  searchParams,
}: GeneralSettingsPageProps) {
  const params = await searchParams;
  const searchQuery = getSearchQuery(params);
  const settings = await prisma.general_settings.findMany({
    orderBy: { id: "asc" },
  });
  const filteredSettings = settings.filter((setting) => {
    const query = normalizeSearchValue(searchQuery);
    if (!query) return true;

    return [setting.title, setting.value, setting.code].some((field) =>
      normalizeSearchValue(field).includes(query)
    );
  });

  return (
<<<<<<< HEAD
    <div className="liquid-content-frame liquid-glass-page min-h-[calc(100vh-92px)] space-y-5 py-4 sm:py-6 lg:py-8">
      <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between">
        <button
          type="submit"
          form="general-settings-form"
          className="rounded-2xl bg-brand-500 px-4 py-2 font-medium text-white shadow-[0_10px_24px_rgba(98,92,255,0.26)] transition hover:bg-brand-600"
        >
          ذخیره
        </button>
        <div className="text-right">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold text-brand-500">
            <SlidersHorizontal className="h-4 w-4" /> مدیریت سامانه
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
=======
    <div className="min-h-full w-full">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray-300 bg-white px-4 py-3 dark:bg-gray-900">
        <button
          type="submit"
          form="general-settings-form"
          className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          ذخیره
        </button>
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
>>>>>>> cded0e3936ca9b0b93b03023a66f720b1653c148
            تعاریف
          </h1>
          <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            مدیریت مقادیر و تنظیمات پایه سامانه
          </p>
        </div>
      </div>

      <form id="general-settings-form" action={updateGeneralSetting}>
        <div className="liquid-glass-panel overflow-hidden rounded-[28px] border border-app-border bg-app-panel shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full">
            <thead className="border-b border-app-border bg-app-table-head backdrop-blur dark:border-gray-700 dark:bg-gray-800/90">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عنوان
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  مقدار
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSettings.map((setting) => (
                <tr key={setting.id} className="align-top">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {setting.title || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <input type="hidden" name="id" value={setting.id} />
                    <textarea
                      name="value"
                      defaultValue={setting.value || ""}
                      rows={2}
                      className="liquid-glass-control w-full rounded-2xl border border-app-border bg-white/70 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSettings.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              تنظیمی ثبت نشده است
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

import { updateGeneralSetting } from "@/src/actions/settingsActions";
import { prisma } from "@/src/lib/prisma";

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
            تعاریف
          </h1>
        </div>
      </div>

      <form id="general-settings-form" action={updateGeneralSetting}>
        <div className="overflow-hidden border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
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
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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

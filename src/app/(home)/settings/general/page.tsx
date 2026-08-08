import { updateGeneralSetting } from "@/src/actions/settingsActions";
import { prisma } from "@/src/lib/prisma";
import { SlidersHorizontal } from "lucide-react";
import ListPagination, {
  DEFAULT_PAGE_SIZE,
} from "@/src/components/common/ListPagination";
import InboxListToolbar from "@/src/components/common/InboxListToolbar";
import { Button, PageFrame, PageHeader, PageTitle, Surface, Textarea } from "@/src/components/ui";
import { normalizeSearchValue } from "@/src/lib/text";

interface GeneralSettingsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number(rawPage);
  const currentPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
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
  const totalPages = Math.max(1, Math.ceil(filteredSettings.length / DEFAULT_PAGE_SIZE));
  const activePage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedSettings = filteredSettings.slice(
    (activePage - 1) * DEFAULT_PAGE_SIZE,
    activePage * DEFAULT_PAGE_SIZE,
  );
  const getPageHref = (page: number) => {
    const nextParams = new URLSearchParams();
    if (searchQuery) nextParams.set("q", searchQuery);
    if (page > 1) nextParams.set("page", String(page));
    const query = nextParams.toString();
    return query ? `/settings/general?${query}` : "/settings/general";
  };

  return (
    <PageFrame className="space-y-5 py-4 sm:py-6 lg:py-8">
      <PageHeader className="flex-col-reverse items-stretch sm:flex-row sm:items-end">
        <Button
          type="submit"
          form="general-settings-form"
        >
          ذخیره
        </Button>
        <PageTitle
          eyebrow="مدیریت سامانه"
          icon={<SlidersHorizontal className="h-4 w-4" />}
          title="تعاریف"
          description="مدیریت مقادیر و تنظیمات پایه سامانه"
        />
      </PageHeader>

      <form id="general-settings-form" action={updateGeneralSetting}>
        <Surface variant="table" padded={false}>
          <InboxListToolbar searchQuery={searchQuery} searchPlaceholder="جستجو در تعاریف..." />
          <table className="inbox-card-table inbox-card-table--settings w-full">
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
              {paginatedSettings.map((setting) => (
                <tr key={setting.id} className="align-top">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {setting.title || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <input type="hidden" name="id" value={setting.id} />
                    <Textarea
                      name="value"
                      defaultValue={setting.value || ""}
                      rows={2}
                      className="min-h-20"
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
          <ListPagination
            currentPage={activePage}
            totalItems={filteredSettings.length}
            hrefForPage={getPageHref}
          />
        </Surface>
      </form>
    </PageFrame>
  );
}

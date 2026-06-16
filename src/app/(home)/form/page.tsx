import Link from "next/link";
import {
  getFormInstance,
  getRequestBaseUrl,
} from "@/src/actions/formActions";
import FormInstanceView from "@/src/components/app/forms/FormInstanceView";
import FormReadMarker from "@/src/components/app/forms/FormReadMarker";

interface FormPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FormPage({ searchParams }: FormPageProps) {
  const params = await searchParams;
  const formIdValue = Array.isArray(params.id) ? params.id[0] : params.id;
  const formId = formIdValue ? Number(formIdValue) : null;

  if (!formId || !Number.isInteger(formId)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          شناسه فرم نامعتبر است.
        </p>
        <Link
          href="/incoming-letters"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          بازگشت به فرم‌ها
        </Link>
      </div>
    );
  }

  const baseUrl = await getRequestBaseUrl();
  const result = await getFormInstance(formId, baseUrl);

  if (!result.success || !result.form) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {result.error || "فرم یافت نشد."}
        </p>
        <Link
          href="/incoming-letters"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          بازگشت به فرم‌ها
        </Link>
      </div>
    );
  }

  return (
    <>
      <FormReadMarker formId={formId} />
      <FormInstanceView form={result.form} />
    </>
  );
}

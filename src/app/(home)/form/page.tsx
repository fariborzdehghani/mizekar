import Link from "next/link";
import {
  getFormInstance,
  getRequestBaseUrl,
} from "@/src/actions/formActions";
import FormInstanceView from "@/src/components/app/forms/FormInstanceView";
import FormReadMarker from "@/src/components/app/forms/FormReadMarker";
import { EmptyState, buttonStyles } from "@/src/components/ui";

interface FormPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FormPage({ searchParams }: FormPageProps) {
  const params = await searchParams;
  const formIdValue = Array.isArray(params.id) ? params.id[0] : params.id;
  const formId = formIdValue ? Number(formIdValue) : null;

  if (!formId || !Number.isInteger(formId)) {
    return (
      <EmptyState
        className="m-4 min-h-[60vh]"
        title="شناسه فرم نامعتبر است"
        action={<Link href="/incoming-forms" className={buttonStyles()}>بازگشت به فرم‌ها</Link>}
      />
    );
  }

  const baseUrl = await getRequestBaseUrl();
  const result = await getFormInstance(formId, baseUrl);

  if (!result.success || !result.form) {
    return (
      <EmptyState
        className="m-4 min-h-[60vh]"
        title={result.error || "فرم یافت نشد"}
        action={<Link href="/incoming-forms" className={buttonStyles()}>بازگشت به فرم‌ها</Link>}
      />
    );
  }

  return (
    <>
      <FormReadMarker formId={formId} />
      <FormInstanceView form={result.form} />
    </>
  );
}

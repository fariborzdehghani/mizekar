import {
  getFormInstance,
  getFormTemplates,
  getRequestBaseUrl,
} from "@/src/actions/formActions";
import NewFormLauncher from "@/src/components/app/forms/NewFormLauncher";

interface NewFormPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewFormPage({ searchParams }: NewFormPageProps) {
  const params = await searchParams;
  const instanceIdValue = Array.isArray(params.instanceId)
    ? params.instanceId[0]
    : params.instanceId;
  const instanceId = instanceIdValue ? Number(instanceIdValue) : null;
  const templates = await getFormTemplates();
  let initialForm = null;

  if (instanceId && Number.isInteger(instanceId)) {
    const baseUrl = await getRequestBaseUrl();
    const result = await getFormInstance(instanceId, baseUrl);
    if (result.success && result.form) {
      initialForm = result.form;
    }
  }

  return <NewFormLauncher templates={templates} initialForm={initialForm} />;
}

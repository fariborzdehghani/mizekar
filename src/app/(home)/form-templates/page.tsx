import { getFormTemplates } from "@/src/actions/formActions";
import FormTemplateManager from "@/src/components/app/forms/FormTemplateManager";

export default async function FormTemplatesPage() {
  const templates = await getFormTemplates();

  return <FormTemplateManager templates={templates} />;
}

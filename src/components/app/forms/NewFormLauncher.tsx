"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  FileText,
  Layers3,
  SendHorizontal,
} from "lucide-react";
import { createFormInstance } from "@/src/actions/formActions";
import FormInstanceView, { type FormInstance } from "./FormInstanceView";

type Template = {
  id: number;
  title: string;
  description: string | null;
  isActive: boolean;
  fileName: string;
  steps: Array<{ id: number; order: number; approverName: string }>;
};

export default function NewFormLauncher({
  templates,
  initialForm,
}: {
  templates: Template[];
  initialForm?: FormInstance | null;
}) {
  const router = useRouter();
  const activeTemplates = useMemo(
    () => templates.filter((template) => template.isActive),
    [templates]
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    activeTemplates[0]?.id ? String(activeTemplates[0].id) : ""
  );
  const [formTitle, setFormTitle] = useState(activeTemplates[0]?.title || "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTemplate = activeTemplates.find(
    (template) => String(template.id) === selectedTemplateId
  );

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplateId(String(template.id));
    setFormTitle(template.title);
    setError(null);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!selectedTemplate) {
      setError("یک قالب فرم انتخاب کنید.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createFormInstance(new FormData(event.currentTarget));
      if (!result.success) {
        setError(result.error || "امکان ایجاد فرم وجود ندارد.");
        return;
      }

      router.replace(
        result.instanceId ? `/new-form?instanceId=${result.instanceId}` : "/new-form"
      );
      router.refresh();
    } catch {
      setError("امکان ایجاد فرم وجود ندارد.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (initialForm) {
    return <FormInstanceView form={initialForm} />;
  }

  return (
    <form
      onSubmit={handleCreate}
      className="liquid-content-frame liquid-glass-page flex min-h-[calc(100vh-92px)] flex-col gap-5 py-4 sm:py-6 lg:py-8"
    >
      <div className="liquid-page-header sticky top-[92px] z-30 flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={isSubmitting || !selectedTemplate}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 font-medium text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendHorizontal className="h-4 w-4" />
          {isSubmitting ? "در حال ایجاد..." : "ایجاد فرم"}
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          فرم جدید
        </h1>
      </div>

      <div className="liquid-glass-panel flex flex-1 flex-col rounded-3xl border lg:flex-row">
        {error && (
          <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200 lg:hidden">
            {error}
          </div>
        )}

        <aside className="liquid-glass-inset flex h-full min-h-[220px] border-0 border-b lg:min-h-[calc(100vh-142px)] lg:w-96 lg:shrink-0 lg:border-b-0 lg:border-l">
          <div className="flex w-full flex-col">
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    قالب‌های فرم
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {activeTemplates.length} قالب فعال
                  </p>
                </div>
              </div>
            </div>

            {activeTemplates.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                قالب فرم فعالی وجود ندارد.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                  {activeTemplates.map((template) => {
                    const isSelected = String(template.id) === selectedTemplateId;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleTemplateSelect(template)}
                        className={`group flex w-full items-center gap-3 rounded-lg border p-3 text-right transition ${
                          isSelected
                            ? "liquid-glass-control border-brand-500 shadow-sm ring-4 ring-brand-500/10 dark:border-brand-400"
                            : "border-transparent bg-transparent hover:border-brand-200 hover:bg-white/40 dark:hover:border-brand-500/20 dark:hover:bg-white/5"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            isSelected
                              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                              : "liquid-glass-inset text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {template.title}
                            </span>
                            {isSelected ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
                            ) : (
                              <ChevronLeft className="h-4 w-4 shrink-0 text-gray-400 opacity-0 transition group-hover:opacity-100" />
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                            {template.steps.length} مرحله تایید
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 lg:min-h-[calc(100vh-142px)] lg:p-6">
          <div className="mx-auto w-full space-y-5">
            {error && (
              <div className="hidden rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200 lg:block">
                {error}
              </div>
            )}

            {selectedTemplate ? (
              <>
                <input type="hidden" name="templateId" value={selectedTemplate.id} />

                <section className="liquid-glass-inset rounded-2xl p-5">
                  <div className="mb-5 flex flex-col gap-4 border-b border-gray-100 pb-5 dark:border-gray-800 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedTemplate.title}
                      </h2>
                      {selectedTemplate.description && (
                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {selectedTemplate.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        عنوان فرم
                      </label>
                      <input
                        name="title"
                        value={formTitle}
                        onChange={(event) => setFormTitle(event.target.value)}
                        className="liquid-glass-control h-11 w-full rounded-xl border px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:text-white"
                      />
                    </div>
                  </div>
                </section>

                <section className="liquid-glass-inset rounded-2xl p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        فرآیند تایید
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        فرم پس از ارسال به ترتیب این مراحل بررسی می‌شود.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedTemplate.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="liquid-glass-control flex items-center gap-3 rounded-xl border p-3"
                      >
                        <div className="liquid-glass-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200">
                          {step.order}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {step.approverName}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            مرحله {index + 1}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                یک قالب فرم از فهرست سمت راست انتخاب کنید.
              </div>
            )}
          </div>
        </main>
      </div>
    </form>
  );
}

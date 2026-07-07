"use client";

import { useActionState, useMemo, useState } from "react";
import { FileUp, Pencil, Trash2, UserPlus } from "lucide-react";
import {
  createFormTemplateAction,
  deleteFormTemplateAction,
  updateFormTemplateAction,
  type FormTemplateFormState,
} from "@/src/actions/formActions";
import RecipientsModal from "@/src/components/app/letters/RecipientsModal";

type Person = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  user_id: number | null;
};

type TemplateStep = {
  id: number;
  order: number;
  approverUserId: number;
  personId: number;
  firstName: string | null;
  lastName: string | null;
  job: string | null;
  approverName: string;
};

type FormTemplate = {
  id: number;
  title: string;
  description: string | null;
  isActive: boolean;
  fileName: string;
  createDate: Date | string | null;
  steps: TemplateStep[];
};

type ViewMode = "list" | "create" | "edit";

const initialState: FormTemplateFormState = {};

function normalizeSearchValue(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("fa-IR");
}

function templateMatchesSearch(template: FormTemplate, query: string) {
  const normalizedQuery = normalizeSearchValue(query.trim());
  if (!normalizedQuery) return true;

  const fields = [
    template.title,
    template.description,
    template.fileName,
    template.isActive ? "فعال" : "غیرفعال",
    template.steps.map((step) => step.approverName).join(" "),
  ];

  return fields.some((field) =>
    normalizeSearchValue(field).includes(normalizedQuery)
  );
}

function getPersonName(person: Person) {
  const fullName = [person.first_name, person.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const label = fullName || `کاربر #${person.user_id || person.id}`;

  return person.job ? `${label} - ${person.job}` : label;
}

function stepToPerson(step: TemplateStep): Person {
  return {
    id: step.personId || step.approverUserId,
    first_name: step.firstName,
    last_name: step.lastName,
    job: step.job,
    user_id: step.approverUserId,
  };
}

function StateMessage({ state }: { state: FormTemplateFormState }) {
  if (state.error) {
    return (
      <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-900 dark:bg-error-950 dark:text-error-200">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-900 dark:bg-success-950 dark:text-success-200">
        {state.success}
      </p>
    );
  }

  return null;
}

function FormHeader({
  title,
  pending,
  submitText,
  pendingText,
  onCancel,
}: {
  title: string;
  pending: boolean;
  submitText: string;
  pendingText: string;
  onCancel: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-300 bg-white p-4 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          بازگشت
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? pendingText : submitText}
        </button>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {title}
      </h1>
    </div>
  );
}

function TemplateFields({
  template,
  selectedApprovers,
  setSelectedApprovers,
}: {
  template?: FormTemplate;
  selectedApprovers: Person[];
  setSelectedApprovers: (value: Person[] | ((current: Person[]) => Person[])) => void;
}) {
  const [isApproverModalOpen, setIsApproverModalOpen] = useState(false);

  const handleAddApprover = (person: Person) => {
    setSelectedApprovers((current) => {
      if (current.some((approver) => approver.user_id === person.user_id)) {
        return current;
      }

      return [...current, person];
    });
  };

  const handleRemoveApprover = (userId: number | null) => {
    setSelectedApprovers((current) =>
      current.filter((approver) => approver.user_id !== userId)
    );
  };

  return (
    <div className="w-full max-w-3xl space-y-5">
      <RecipientsModal
        isOpen={isApproverModalOpen}
        onClose={() => setIsApproverModalOpen(false)}
        selectedRecipients={selectedApprovers}
        onAddRecipient={handleAddApprover}
        onRemoveRecipient={(personId) =>
          setSelectedApprovers((current) =>
            current.filter((approver) => approver.id !== personId)
          )
        }
        title="مراحل تایید"
        searchLabel="جستجو و افزودن تاییدکننده"
        searchPlaceholder="نام شخص را جستجو کنید..."
        selectedLabel="تاییدکنندگان انتخاب شده"
        emptySelectedText="هنوز تاییدکننده‌ای انتخاب نشده"
        closeLabel="تایید"
        requireUser
      />

      <input type="hidden" name="steps" value={JSON.stringify(selectedApprovers)} />

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          عنوان قالب
        </label>
        <input
          name="title"
          type="text"
          required
          defaultValue={template?.title || ""}
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          توضیحات
        </label>
        <textarea
          name="description"
          rows={4}
          defaultValue={template?.description || ""}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          فایل Word
        </label>
        {template?.fileName && (
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            فایل فعلی: {template.fileName}
          </p>
        )}
        <input
          name="templateFile"
          type="file"
          required={!template}
          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="block h-11 w-full rounded-lg border border-gray-300 bg-white text-sm text-gray-700 file:mr-3 file:h-full file:border-0 file:bg-gray-100 file:px-4 file:text-sm file:font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:file:bg-gray-700 dark:file:text-gray-100"
        />
      </div>

      {template && (
        <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={template.isActive}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          فعال باشد
        </label>
      )}

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              فرآیند تایید
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              مراحل به ترتیب نمایش داده شده اجرا می‌شوند.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsApproverModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300"
          >
            <UserPlus className="h-4 w-4" />
            افزودن
          </button>
        </div>

        {selectedApprovers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            هنوز تاییدکننده‌ای انتخاب نشده است.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedApprovers.map((approver, index) => (
              <div
                key={`${approver.user_id}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              >
                <p className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">
                  {index + 1}. {getPersonName(approver)}
                </p>
                <button
                  type="button"
                  onClick={() => handleRemoveApprover(approver.user_id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-red-500/15"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateTemplateForm({ onCancel }: { onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(
    createFormTemplateAction,
    initialState
  );
  const [selectedApprovers, setSelectedApprovers] = useState<Person[]>([]);

  return (
    <form
      action={formAction}
      className="flex min-h-full w-full flex-col"
    >
      <FormHeader
        title="قالب فرم جدید"
        pending={pending}
        submitText="ثبت قالب"
        pendingText="در حال ثبت..."
        onCancel={onCancel}
      />

      <div className="bg-white p-6 dark:bg-gray-800">
        <TemplateFields
          selectedApprovers={selectedApprovers}
          setSelectedApprovers={setSelectedApprovers}
        />
        <div className="mt-5 max-w-3xl">
          <StateMessage state={state} />
        </div>
      </div>
    </form>
  );
}

function EditTemplateForm({
  template,
  onCancel,
}: {
  template: FormTemplate;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateFormTemplateAction,
    initialState
  );
  const [selectedApprovers, setSelectedApprovers] = useState<Person[]>(
    template.steps.map(stepToPerson)
  );

  return (
    <form
      action={formAction}
      className="flex min-h-full w-full flex-col"
    >
      <FormHeader
        title="ویرایش قالب فرم"
        pending={pending}
        submitText="ذخیره تغییرات"
        pendingText="در حال ذخیره..."
        onCancel={onCancel}
      />

      <div className="bg-white p-6 dark:bg-gray-800">
        <input type="hidden" name="id" value={template.id} />
        <TemplateFields
          template={template}
          selectedApprovers={selectedApprovers}
          setSelectedApprovers={setSelectedApprovers}
        />
        <div className="mt-5 max-w-3xl">
          <StateMessage state={state} />
        </div>
      </div>
    </form>
  );
}

function TemplatesList({
  templates,
  onCreate,
  onEdit,
}: {
  templates: FormTemplate[];
  onCreate: () => void;
  onEdit: (template: FormTemplate) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredTemplates = templates.filter((template) =>
    templateMatchesSearch(template, searchQuery)
  );

  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-300 bg-white p-4 dark:bg-gray-900">
        <button
          type="button"
          onClick={onCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
        >
          قالب جدید
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          مدیریت قالب‌های فرم
        </h1>
      </div>

      <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="جستجو در قالب‌ها..."
          className="h-10 w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {filteredTemplates.length > 0 ? (
        <div className="bg-white dark:bg-gray-800">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    {"\u0639\u0646\u0648\u0627\u0646"}
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {template.title}
                      </p>
                      {template.description && (
                        <p className="mt-1 max-w-md truncate text-xs text-gray-500 dark:text-gray-400">
                          {template.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          template.isActive
                            ? "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {template.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(template)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
                          title="ویرایش قالب فرم"
                          aria-label="ویرایش قالب فرم"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <form
                          action={deleteFormTemplateAction}
                          onSubmit={(event) => {
                            if (!confirm("این قالب فرم حذف شود؟")) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="id" value={template.id} />
                          <button
                            type="submit"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-500 dark:hover:text-red-300"
                            title="حذف قالب فرم"
                            aria-label="حذف قالب فرم"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center bg-white p-8 text-center dark:bg-gray-800">
          <FileUp className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            قالب فرمی ثبت نشده است.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            ایجاد قالب
          </button>
        </div>
      )}
    </div>
  );
}

export default function FormTemplateManager({
  templates,
}: {
  templates: FormTemplate[];
}) {
  const [mode, setMode] = useState<ViewMode>("list");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId, templates]
  );

  const backToList = () => {
    setMode("list");
    setSelectedTemplateId(null);
  };

  if (mode === "create") {
    return <CreateTemplateForm onCancel={backToList} />;
  }

  if (mode === "edit" && selectedTemplate) {
    return <EditTemplateForm template={selectedTemplate} onCancel={backToList} />;
  }

  return (
    <TemplatesList
      templates={templates}
      onCreate={() => {
        setSelectedTemplateId(null);
        setMode("create");
      }}
      onEdit={(template) => {
        setSelectedTemplateId(template.id);
        setMode("edit");
      }}
    />
  );
}


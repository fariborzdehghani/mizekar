"use client";

import { useActionState } from "react";
import {
  AlertTriangle,
  Archive,
  Bot,
  Database,
  Play,
  RefreshCw,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import {
  createSampleDataAction,
  removeSampleDataAction,
  sendAiPromptAction,
  type AiPromptActionState,
  type SampleDataActionState,
} from "@/src/sample-data/actions";

type NumericFieldKey =
  | "subjectCount"
  | "lettersPerSubject"
  | "formsPerSubject"
  | "meetingsPerSubject"
  | "messageThreadsPerSubject"
  | "sampleUserCount";

type NumericDefaults = Record<NumericFieldKey, number> & {
  sampleUserPassword: string;
};

type NumericLimits = Record<NumericFieldKey, { min: number; max: number }>;

type SampleDataStats = {
  sampleUsers: number;
  letters: number;
  formTemplates: number;
  formInstances: number;
  meetings: number;
  messages: number;
  archiveFolders: number;
  files: number;
};

type Props = {
  currentUserName: string;
  defaults: NumericDefaults;
  limits: NumericLimits;
  initialStats: SampleDataStats;
};

const initialState: SampleDataActionState = {};
const initialAiState: AiPromptActionState = {};

const statLabels: Array<{ key: keyof SampleDataStats; label: string }> = [
  { key: "sampleUsers", label: "کاربران نمونه" },
  { key: "letters", label: "نامه‌ها" },
  { key: "formTemplates", label: "قالب‌های فرم" },
  { key: "formInstances", label: "فرم‌ها" },
  { key: "meetings", label: "جلسات" },
  { key: "messages", label: "پیام‌ها" },
  { key: "archiveFolders", label: "پوشه‌های بایگانی" },
  { key: "files", label: "فایل‌ها" },
];

const numericFields: Array<{
  key: NumericFieldKey;
  label: string;
}> = [
  { key: "subjectCount", label: "تعداد موضوع‌ها" },
  { key: "lettersPerSubject", label: "نامه برای هر موضوع" },
  { key: "formsPerSubject", label: "فرم برای هر موضوع" },
  { key: "meetingsPerSubject", label: "جلسه برای هر موضوع" },
  { key: "messageThreadsPerSubject", label: "گفتگوی پیام برای هر موضوع" },
  { key: "sampleUserCount", label: "تعداد کاربران نمونه" },
];

function formatDeletedStats(stats: SampleDataStats | undefined) {
  if (!stats) return null;

  return [
    `کاربر: ${stats.sampleUsers}`,
    `نامه: ${stats.letters}`,
    `فرم: ${stats.formInstances}`,
    `جلسه: ${stats.meetings}`,
    `پیام: ${stats.messages}`,
    `فایل: ${stats.files}`,
  ].join("، ");
}

export default function SampleDataCreator({
  currentUserName,
  defaults,
  limits,
  initialStats,
}: Props) {
  const [createState, createFormAction, createPending] = useActionState(
    createSampleDataAction,
    initialState
  );
  const [removeState, removeFormAction, removePending] = useActionState(
    removeSampleDataAction,
    initialState
  );
  const [aiState, aiFormAction, aiPending] = useActionState(
    sendAiPromptAction,
    initialAiState
  );
  const summary = createState.summary;
  const deletedSummary = formatDeletedStats(removeState.deleted);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200">
            <Database className="h-4 w-4" />
            /sample-data
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            سازنده داده نمونه برای آزمون هوش مصنوعی
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            شما با حساب {currentUserName} وارد شده‌اید. همه رکوردهای ساخته‌شده با
            برچسب <span className="font-mono">[AI_SAMPLE]</span> مشخص می‌شوند.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          <Users className="h-4 w-4" />
          کاربران نمونه پس از ایجاد داده قابل ورود هستند.
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statLabels.map((stat) => (
          <div
            key={stat.key}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {initialStats[stat.key]}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-brand-600 dark:text-brand-300" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            AI model prompt
          </h2>
        </div>

        <form action={aiFormAction} className="mt-4 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Prompt
            </span>
            <textarea
              name="prompt"
              rows={5}
              dir="auto"
              defaultValue={aiState.prompt || ""}
              placeholder="Ask the model something..."
              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
          </label>

          <button
            type="submit"
            disabled={aiPending}
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Send className="h-4 w-4" />
            {aiPending ? "Sending..." : "Send prompt"}
          </button>
        </form>

        {aiState.error ? (
          <p className="mt-4 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-900 dark:bg-error-950 dark:text-error-200">
            {aiState.error}
          </p>
        ) : null}

        {aiState.response ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Response
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800 dark:text-gray-100">
              {aiState.response}
            </p>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          action={createFormAction}
          className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            تنظیمات ایجاد داده
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {numericFields.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {field.label}
                </span>
                <input
                  name={field.key}
                  type="number"
                  min={limits[field.key].min}
                  max={limits[field.key].max}
                  defaultValue={defaults[field.key]}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </label>
            ))}

            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                رمز عبور کاربران نمونه
              </span>
              <input
                name="sampleUserPassword"
                type="text"
                dir="ltr"
                defaultValue={defaults.sampleUserPassword}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-left font-mono text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <input
                name="resetExisting"
                type="checkbox"
                defaultChecked
                className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span>
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <RefreshCw className="h-4 w-4" />
                  جایگزینی داده نمونه قبلی
                </span>
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  داده‌های ماژول‌ها را حذف و دوباره می‌سازد، اما کاربران نمونه
                  را نگه می‌دارد.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <input
                name="archiveSamples"
                type="checkbox"
                defaultChecked
                className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span>
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <Archive className="h-4 w-4" />
                  ساخت بایگانی نمونه
                </span>
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  چند رکورد تکمیل‌شده را داخل پوشه‌های موضوعی بایگانی می‌کند.
                </span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={createPending}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Play className="h-4 w-4" />
            {createPending ? "در حال ایجاد داده..." : "ایجاد داده نمونه"}
          </button>
        </form>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              نتیجه عملیات
            </h2>

            {createState.error ? (
              <p className="mt-4 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-900 dark:bg-error-950 dark:text-error-200">
                {createState.error}
              </p>
            ) : null}

            {createState.success && summary ? (
              <div className="mt-4 rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-800 dark:border-success-900 dark:bg-success-950 dark:text-success-100">
                <p className="font-medium">{createState.success}</p>
                <p className="mt-2 text-xs">
                  منبع محتوا: {summary.contentSource}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-success-700 dark:text-success-200">
                      نامه
                    </dt>
                    <dd className="font-semibold">{summary.created.letters}</dd>
                  </div>
                  <div>
                    <dt className="text-success-700 dark:text-success-200">
                      فرم
                    </dt>
                    <dd className="font-semibold">
                      {summary.created.formInstances}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-success-700 dark:text-success-200">
                      جلسه
                    </dt>
                    <dd className="font-semibold">{summary.created.meetings}</dd>
                  </div>
                  <div>
                    <dt className="text-success-700 dark:text-success-200">
                      پیام
                    </dt>
                    <dd className="font-semibold">{summary.created.messages}</dd>
                  </div>
                </dl>
                <p className="mt-3 break-words text-left font-mono text-xs" dir="ltr">
                  {summary.sampleUserIds.join(", ")}
                </p>
                <p className="mt-1 text-left font-mono text-xs" dir="ltr">
                  {summary.sampleUserPassword}
                </p>
              </div>
            ) : null}

            {removeState.success ? (
              <div className="mt-4 rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-800 dark:border-success-900 dark:bg-success-950 dark:text-success-100">
                <p className="font-medium">{removeState.success}</p>
                {deletedSummary ? (
                  <p className="mt-2 text-xs">{deletedSummary}</p>
                ) : null}
              </div>
            ) : null}

            {removeState.error ? (
              <p className="mt-4 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-900 dark:bg-error-950 dark:text-error-200">
                {removeState.error}
              </p>
            ) : null}
          </section>

          <form
            action={removeFormAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "همه داده‌های نمونه شامل کاربران نمونه، نامه‌ها، فرم‌ها، جلسات، پیام‌ها، فایل‌ها و پوشه‌های ساخته‌شده حذف شوند؟"
                )
              ) {
                event.preventDefault();
              }
            }}
            className="rounded-lg border border-error-200 bg-error-50 p-5 dark:border-error-900 dark:bg-error-950"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-error-600 dark:text-error-300" />
              <div>
                <h2 className="text-base font-semibold text-error-800 dark:text-error-100">
                  حذف کامل داده نمونه
                </h2>
                <p className="mt-2 text-sm text-error-700 dark:text-error-200">
                  این عملیات فقط رکوردهای دارای برچسب نمونه و کاربران
                  <span className="mx-1 font-mono">ai_sample_*</span>
                  را هدف می‌گیرد.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={removePending}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-error-600 px-4 text-sm font-medium text-white transition hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Trash2 className="h-4 w-4" />
              {removePending
                ? "در حال حذف داده نمونه..."
                : "حذف همه داده‌های نمونه"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

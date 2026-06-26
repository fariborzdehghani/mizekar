"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import {
  createTodayInboxBrief,
  type InboxBriefActionResult,
} from "@/src/actions/inboxBriefActions";
import type { InboxBrief } from "@/src/ai/features/todayInboxBrief";

type InboxBriefProviderProps = {
  initialBrief: InboxBrief | null;
  children: ReactNode;
};

type CreateBriefOptions = {
  openWhileCreating?: boolean;
  openOnSuccess?: boolean;
  notifyOnSuccess?: boolean;
};

type InboxBriefContextValue = {
  brief: InboxBrief | null;
  error: string | null;
  isCreating: boolean;
  createBrief: (options?: CreateBriefOptions) => Promise<void>;
  openBrief: () => void;
  closeBrief: () => void;
};
const AI_SOLID_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 border border-purple-600 bg-purple-600 text-white transition hover:bg-purple-600 dark:border-purple-600 dark:bg-purple-600 dark:hover:bg-purple-600";
const AI_SOFT_BUTTON_CLASS =
  AI_SOLID_BUTTON_CLASS;
const AI_ICON_CLASS =
  "bg-purple-600 text-white dark:bg-purple-600";

const InboxBriefContext = createContext<InboxBriefContextValue | null>(null);

function formatDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function useInboxBrief() {
  const context = useContext(InboxBriefContext);

  if (!context) {
    throw new Error("useInboxBrief must be used inside InboxBriefProvider.");
  }

  return context;
}

export function InboxBriefProvider({
  initialBrief,
  children,
}: InboxBriefProviderProps) {
  const [brief, setBrief] = useState(initialBrief);
  const [isOpen, setIsOpen] = useState(false);
  const [isReadyNotificationOpen, setIsReadyNotificationOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAutoStarted = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const clearLoginBriefParam = useCallback(() => {
    if (searchParams.get("brief") !== "login") return;

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.delete("brief");
    const nextQuery = nextParams.toString();

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams, searchParamsString]);

  const applyCreateResult = useCallback(
    (
      result: InboxBriefActionResult,
      openOnSuccess: boolean,
      notifyOnSuccess: boolean
    ) => {
      if (!result.success) {
        setError(result.error);
        setIsOpen(true);
        setIsReadyNotificationOpen(false);
        return;
      }

      setBrief(result.brief);
      setError(null);
      setIsOpen(openOnSuccess);
      setIsReadyNotificationOpen(notifyOnSuccess);
      router.refresh();
    },
    [router]
  );

  const createBrief = useCallback(
    async (options: CreateBriefOptions = {}) => {
      const {
        openWhileCreating = true,
        openOnSuccess = true,
        notifyOnSuccess = false,
      } = options;

      if (openWhileCreating) {
        setIsOpen(true);
      }

      setIsReadyNotificationOpen(false);
      setIsCreating(true);
      setError(null);

      try {
        applyCreateResult(
          await createTodayInboxBrief(),
          openOnSuccess,
          notifyOnSuccess
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "اقدامات پیشنهادی هوش مصنوعی ایجاد نشد."
        );
        setIsOpen(true);
      } finally {
        setIsCreating(false);
        clearLoginBriefParam();
      }
    },
    [applyCreateResult, clearLoginBriefParam]
  );

  const openBrief = useCallback(() => {
    setError(null);
    setIsReadyNotificationOpen(false);
    setIsOpen(true);
  }, []);

  const closeBrief = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (searchParams.get("brief") !== "login" || hasAutoStarted.current) return;

    hasAutoStarted.current = true;
    void createBrief({
      openWhileCreating: false,
      openOnSuccess: false,
      notifyOnSuccess: true,
    });
  }, [createBrief, searchParams]);

  const contextValue = useMemo(
    () => ({
      brief,
      error,
      isCreating,
      createBrief,
      openBrief,
      closeBrief,
    }),
    [brief, closeBrief, createBrief, error, isCreating, openBrief]
  );

  return (
    <InboxBriefContext.Provider value={contextValue}>
      {children}

      {isReadyNotificationOpen && brief && !isOpen && (
        <div
          className="fixed bottom-4 left-4 z-[1000000] w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-purple-600 bg-app-panel p-3 text-right shadow-2xl dark:border-purple-600 dark:bg-gray-900"
          dir="rtl"
          role="status"
        >
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={openBrief}
              className="flex min-w-0 flex-1 items-start gap-3 text-right"
            >
              <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${AI_ICON_CLASS}`}>
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                  اقدامات پیشنهادی آماده است
                </span>
                <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                  برای مشاهده پیشنهادهای هوش مصنوعی کلیک کنید.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsReadyNotificationOpen(false)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="بستن اعلان اقدامات پیشنهادی"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/50 p-4 font-iransans">
          <section
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-app-border bg-app-panel shadow-2xl dark:border-gray-800 dark:bg-gray-900"
            dir="rtl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-app-border bg-app-header-page/80 px-5 py-4 dark:border-gray-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-600" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    اقدامات پیشنهادی هوش مصنوعی
                  </h2>
                </div>
                {brief?.createdAt && !error && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    ایجاد شده در {formatDateTime(brief.createdAt)}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeBrief}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                aria-label="بستن اقدامات پیشنهادی هوش مصنوعی"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-56 overflow-y-auto p-5">
              {isCreating ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-sm text-gray-600 dark:text-gray-300">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-600" />
                  در حال آماده‌سازی اقدامات پیشنهادی هوش مصنوعی...
                </div>
              ) : error ? (
                <div className="space-y-4">
                  <div className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-200">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void createBrief()}
                    className={`${AI_SOLID_BUTTON_CLASS} h-9 rounded-md px-3 text-sm font-medium`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    تلاش دوباره
                  </button>
                </div>
              ) : brief?.summary ? (
                <div className="space-y-4 text-right font-iransans" dir="rtl">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-200">
                    {brief.summary}
                  </p>

                  {brief.items.length > 0 && (
                    <div className="space-y-3">
                      {brief.items.map((item, index) => (
                        <article
                          key={item.id}
                          className="rounded-lg border border-app-border bg-white/65 p-4 dark:border-gray-800 dark:bg-gray-950/40"
                        >
                          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                              {index + 1}. {item.title}
                            </h3>
                            <Link
                              href={item.actionHref}
                              onClick={closeBrief}
                              className={`${AI_SOLID_BUTTON_CLASS} h-9 shrink-0 rounded-md px-3 text-sm font-medium`}
                            >
                              {item.actionLabel}
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-200">
                            {item.text}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void createBrief()}
                    className={`${AI_SOFT_BUTTON_CLASS} h-9 rounded-md px-3 text-sm font-medium`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    ایجاد اقدامات جدید
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    هنوز اقدامات پیشنهادی ایجاد نشده است.
                  </p>
                  <button
                    type="button"
                    onClick={() => void createBrief()}
                    className={`${AI_SOLID_BUTTON_CLASS} h-9 rounded-md px-3 text-sm font-medium`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    ایجاد اقدامات پیشنهادی
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </InboxBriefContext.Provider>
  );
}

export default InboxBriefProvider;

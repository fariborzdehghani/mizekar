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
  CalendarDays,
  ChevronLeft,
  Clock3,
  FileText,
  ListChecks,
  Loader2,
  Mail,
  MessageSquare,
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
  "inline-flex items-center justify-center gap-2 border border-brand-500 bg-brand-500 text-white shadow-[0_10px_24px_rgba(98,92,255,.22)] transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 dark:border-brand-400/40 dark:bg-brand-500 dark:hover:bg-brand-600";
const AI_SOFT_BUTTON_CLASS =
  "liquid-glass-keyline inline-flex items-center justify-center gap-2 border bg-white/55 text-gray-700 transition hover:border-brand-500/25 hover:bg-brand-500/[0.08] hover:text-brand-700 focus-visible:outline-none dark:bg-white/[0.055] dark:text-gray-200 dark:hover:text-brand-300";
const AI_ICON_CLASS =
  "bg-gradient-to-br from-[#766dff] via-brand-500 to-[#38b9bd] text-white shadow-[0_10px_24px_rgba(98,92,255,.22)]";

function getBriefSourceMeta(
  sourceType: InboxBrief["items"][number]["sourceType"]
) {
  switch (sourceType) {
    case "form":
      return {
        label: "فرم",
        icon: FileText,
        className:
          "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
      };
    case "meeting":
      return {
        label: "جلسه",
        icon: CalendarDays,
        className:
          "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300",
      };
    case "message":
      return {
        label: "پیام",
        icon: MessageSquare,
        className:
          "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
      };
    default:
      return {
        label: "نامه",
        icon: Mail,
        className:
          "bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300",
      };
  }
}

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
  const dialogRef = useRef<HTMLElement>(null);
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
    if (!isOpen) return;

    const previouslyFocusedElement = document.activeElement as HTMLElement | null;
    const previousBodyOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeBrief();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [closeBrief, isOpen]);

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
          className="liquid-glass-surface fixed bottom-4 left-4 z-[1000000] w-[min(22rem,calc(100vw-2rem))] rounded-3xl border p-4 text-right shadow-2xl ring-1 ring-brand-500/15"
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
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-white/45 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-white"
              aria-label="بستن اعلان اقدامات پیشنهادی"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="liquid-modal-backdrop fixed inset-0 z-[1000000] flex items-center justify-center p-3 font-iransans sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeBrief();
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-brief-dialog-title"
            aria-busy={isCreating}
            tabIndex={-1}
            className="liquid-modal liquid-modal-dialog flex max-h-[88dvh] w-full max-w-[860px] flex-col overflow-hidden rounded-[30px] outline-none"
            dir="rtl"
          >
            <header className="liquid-modal-header flex shrink-0 items-start justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3.5">
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-[16px] ${AI_ICON_CLASS}`}
                >
                  <Sparkles className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[10px] font-extrabold tracking-[0.08em] text-brand-600 dark:text-brand-300">
                    دستیار هوشمند میزکار
                  </p>
                  <h2
                    id="ai-brief-dialog-title"
                    className="mt-1 text-lg font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-xl"
                  >
                    اقدامات پیشنهادی امروز
                  </h2>
                  {!error && brief && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      {brief.createdAt && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.035] px-2.5 py-1 dark:bg-white/[0.055]">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDateTime(brief.createdAt)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/[0.08] px-2.5 py-1 font-bold text-brand-700 dark:text-brand-300">
                        <ListChecks className="h-3.5 w-3.5" />
                        {brief.items.length.toLocaleString("fa-IR")} پیشنهاد
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={closeBrief}
                className="liquid-glass-control inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border text-gray-500 transition hover:text-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15 dark:text-gray-400 dark:hover:text-white"
                aria-label="بستن اقدامات پیشنهادی هوش مصنوعی"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              {isCreating ? (
                <div
                  className="mx-auto flex min-h-64 max-w-2xl flex-col items-center justify-center text-center"
                  role="status"
                  aria-live="polite"
                >
                  <span className={`grid h-14 w-14 place-items-center rounded-[18px] ${AI_ICON_CLASS}`}>
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
                    در حال تحلیل کارتابل شما
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    پیشنهادهای اولویت‌دار تا چند لحظه دیگر آماده می‌شوند.
                  </p>
                  <div className="mt-6 grid w-full gap-3" aria-hidden="true">
                    {[0, 1, 2].map((item) => (
                      <span
                        key={item}
                        className="h-[72px] animate-pulse rounded-[18px] border border-black/[0.045] bg-white/35 dark:border-white/[0.06] dark:bg-white/[0.035]"
                      />
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center text-center">
                  <div
                    className="w-full rounded-[22px] border border-red-500/15 bg-red-500/[0.07] p-5 text-right dark:bg-red-400/[0.07]"
                    role="alert"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-red-500/10 text-red-600 dark:text-red-300">
                        <AlertCircle className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          ایجاد پیشنهادها انجام نشد
                        </h3>
                        <p className="mt-1.5 text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void createBrief()}
                    className={`${AI_SOLID_BUTTON_CLASS} mt-4 h-10 rounded-[13px] px-4 text-sm font-bold`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    تلاش دوباره
                  </button>
                </div>
              ) : brief?.summary ? (
                <div className="space-y-5 text-right font-iransans" dir="rtl">
                  <section className="liquid-glass-inset rounded-[22px] border border-black/[0.045] p-4 sm:p-5 dark:border-white/[0.07]">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-brand-500/10 text-brand-700 dark:text-brand-300">
                        <ListChecks className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                          خلاصه وضعیت امروز
                        </h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-600 dark:text-gray-300">
                          {brief.summary}
                        </p>
                      </div>
                    </div>
                  </section>

                  {brief.items.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3 px-1">
                        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                          پیشنهادهای اولویت‌دار
                        </h3>
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          بر اساس وضعیت فعلی کارتابل
                        </span>
                      </div>
                      <div className="grid gap-3">
                        {brief.items.map((item, index) => {
                          const sourceMeta = getBriefSourceMeta(item.sourceType);
                          const SourceIcon = sourceMeta.icon;

                          return (
                            <article
                              key={item.id}
                              className="group rounded-[20px] border border-black/[0.055] bg-white/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.62)] transition duration-200 hover:border-brand-500/20 hover:bg-white/58 dark:border-white/[0.075] dark:bg-white/[0.035] dark:shadow-none dark:hover:bg-white/[0.055]"
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-[13px] ${sourceMeta.className}`}
                                >
                                  <SourceIcon className="h-[18px] w-[18px]" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400">
                                      {sourceMeta.label}
                                    </span>
                                    <span className="rounded-full bg-brand-500/[0.08] px-2 py-0.5 text-[9px] font-extrabold text-brand-700 dark:text-brand-300">
                                      اولویت {(index + 1).toLocaleString("fa-IR")}
                                    </span>
                                  </div>
                                  <h4 className="mt-1.5 text-sm font-extrabold leading-6 text-gray-900 dark:text-white">
                                    {item.title}
                                  </h4>
                                </div>
                              </div>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600 dark:text-gray-300">
                                {item.text}
                              </p>
                              <div className="mt-3 flex justify-end">
                                <Link
                                  href={item.actionHref}
                                  onClick={closeBrief}
                                  className="liquid-glass-keyline inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[12px] border bg-brand-500/[0.08] px-3 text-xs font-extrabold text-brand-700 transition hover:border-brand-500/25 hover:bg-brand-500/[0.13] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15 dark:text-brand-300 sm:w-auto"
                                >
                                  {item.actionLabel}
                                  <ChevronLeft className="h-4 w-4" />
                                </Link>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mx-auto flex min-h-64 max-w-lg flex-col items-center justify-center text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-[18px] bg-brand-500/10 text-brand-700 dark:text-brand-300">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
                    هنوز پیشنهادی آماده نشده است
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    کارتابل بررسی می‌شود تا اقدامات مهم و قابل انجام پیشنهاد شوند.
                  </p>
                  <button
                    type="button"
                    onClick={() => void createBrief()}
                    className={`${AI_SOLID_BUTTON_CLASS} mt-4 h-10 rounded-[13px] px-4 text-sm font-bold`}
                  >
                    <Sparkles className="h-4 w-4" />
                    ایجاد اقدامات پیشنهادی
                  </button>
                </div>
              )}
            </div>

            {!isCreating && !error && brief?.summary && (
              <footer className="liquid-modal-footer flex shrink-0 flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="hidden text-[11px] text-gray-500 dark:text-gray-400 sm:block">
                  پیشنهادها با تغییر وضعیت کارتابل قابل به‌روزرسانی هستند.
                </p>
                <button
                  type="button"
                  onClick={() => void createBrief()}
                  className={`${AI_SOFT_BUTTON_CLASS} h-10 w-full rounded-[13px] px-4 text-sm font-bold sm:w-auto`}
                >
                  <RefreshCw className="h-4 w-4" />
                  ایجاد پیشنهادهای جدید
                </button>
              </footer>
            )}
          </section>
        </div>
      )}
    </InboxBriefContext.Provider>
  );
}

export default InboxBriefProvider;

"use client";
import { ThemeToggleButton } from "@/src/components/common/ThemeToggleButton";
import LetterTagInput from "@/src/components/app/letters/LetterTagInput";
import NotificationDropdown from "@/src/components/header/NotificationDropdown";
import UserDropdown from "@/src/components/header/UserDropdown";
import { useInboxBrief } from "@/src/components/app/inbox-brief/InboxBriefPanel";
import { useSidebar } from "@/src/context/SidebarContext";
import {
  uniqueLetterTagNames,
  type LetterKeywordTag,
} from "@/src/lib/letterTags";
import type { CurrentUser } from "@/src/lib/auth-types";
import { toLatinDigits } from "@/src/lib/text";
import Link from "next/link";
import { Dropdown } from "@/src/components/ui/dropdown/Dropdown";
import { Button, Field, Input, buttonStyles } from "@/src/components/ui";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Menu,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useMemo, useRef } from "react";

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const PERSIAN_WEEK_DAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const AI_HEADER_BUTTON_CLASS =
  "liquid-glass-keyline bg-white/50 text-[var(--liquid-muted)] hover:text-brand-600 dark:bg-white/[0.045] dark:hover:text-brand-300";

const persianPartsFormatter = new Intl.DateTimeFormat(
  "fa-IR-u-ca-persian",
  {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }
);

const persianDisplayFormatter = new Intl.DateTimeFormat(
  "fa-IR-u-ca-persian",
  {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
);

function getPersianDateParts(date: Date) {
  const parts = persianPartsFormatter.formatToParts(date);
  const getPart = (type: string) =>
    Number(toLatinDigits(parts.find((part) => part.type === type)?.value || ""));

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLetterTagsFromParam(value: string): LetterKeywordTag[] {
  return uniqueLetterTagNames(value.split(/[،,]/)).map((name) => ({ name }));
}

function parseDateInputValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function findGregorianDateForPersian(
  persianYear: number,
  persianMonth: number,
  persianDay: number
) {
  const start = new Date(Date.UTC(persianYear + 621, 2, 1));

  for (let offset = 0; offset < 430; offset += 1) {
    const candidate = new Date(start);
    candidate.setUTCDate(start.getUTCDate() + offset);

    const localCandidate = new Date(
      candidate.getUTCFullYear(),
      candidate.getUTCMonth(),
      candidate.getUTCDate()
    );
    const parts = getPersianDateParts(localCandidate);

    if (
      parts.year === persianYear &&
      parts.month === persianMonth &&
      parts.day === persianDay
    ) {
      return localCandidate;
    }
  }

  return null;
}

function getPersianMonthDays(persianYear: number, persianMonth: number) {
  const firstDay = findGregorianDateForPersian(persianYear, persianMonth, 1);
  if (!firstDay) return [];

  const days: Array<{ day: number; date: Date; value: string }> = [];
  const cursor = new Date(firstDay);

  for (let offset = 0; offset < 32; offset += 1) {
    const parts = getPersianDateParts(cursor);
    if (parts.year !== persianYear || parts.month !== persianMonth) break;

    days.push({
      day: parts.day,
      date: new Date(cursor),
      value: toDateInputValue(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function formatPersianDate(value: string) {
  const date = parseDateInputValue(value);
  return date ? persianDisplayFormatter.format(date) : "";
}

function ShamsiDatePicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedDate = value ? parseDateInputValue(value) : null;
  const initialParts = getPersianDateParts(selectedDate || new Date());
  const [viewYear, setViewYear] = useState(initialParts.year);
  const [viewMonth, setViewMonth] = useState(initialParts.month);
  const [isOpen, setIsOpen] = useState(false);

  const days = useMemo(
    () => getPersianMonthDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );
  const startOffset = days[0] ? (days[0].date.getDay() + 1) % 7 : 0;
  const todayValue = toDateInputValue(new Date());

  const moveMonth = (direction: -1 | 1) => {
    setViewMonth((currentMonth) => {
      const nextMonth = currentMonth + direction;
      if (nextMonth < 1) {
        setViewYear((currentYear) => currentYear - 1);
        return 12;
      }
      if (nextMonth > 12) {
        setViewYear((currentYear) => currentYear + 1);
        return 1;
      }
      return nextMonth;
    });
  };

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={buttonStyles({ variant: "secondary", size: "lg", block: true, className: "justify-between" })}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="truncate">
            {value ? formatPersianDate(value) : "انتخاب تاریخ"}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="liquid-glass-surface absolute left-0 top-12 z-[60] w-72 rounded-card border border-app-border bg-app-panel p-3 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="ماه بعد"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {PERSIAN_MONTHS[viewMonth - 1]} {viewYear}
            </div>
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="ماه قبل"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {PERSIAN_WEEK_DAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startOffset }).map((_, index) => (
              <span key={`empty-${index}`} className="h-8" />
            ))}
            {days.map((day) => {
              const isSelected = day.value === value;
              const isToday = day.value === todayValue;

              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
                    onChange(day.value);
                    setIsOpen(false);
                  }}
                  className={`flex h-8 items-center justify-center rounded-md text-sm transition ${
                    isSelected
                      ? "bg-brand-500 text-white"
                      : isToday
                        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {day.day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-app-border pt-3 dark:border-gray-800">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const parts = getPersianDateParts(today);
                setViewYear(parts.year);
                setViewMonth(parts.month);
                onChange(toDateInputValue(today));
                setIsOpen(false);
              }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="text-xs font-medium text-gray-500 hover:text-blue-light-700 dark:text-gray-300"
            >
              پاک کردن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const AppHeader: React.FC<{ user: CurrentUser }> = ({ user }) => {
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchValue = searchParams.get("q") || "";
  const advancedTitle = searchParams.get("title") || "";
  const advancedContent = searchParams.get("content") || "";
  const advancedCreateDate = searchParams.get("createDate") || "";
  const advancedTags = searchParams.get("tags") || searchParams.get("tag") || "";
  const [advancedSearchDate, setAdvancedSearchDate] =
    useState(advancedCreateDate);
  const [advancedSearchTags, setAdvancedSearchTags] = useState<
    LetterKeywordTag[]
  >(() => getLetterTagsFromParam(advancedTags));

  const {
    isExpanded,
    isMobileOpen,
    toggleSidebar,
    toggleMobileSidebar,
  } = useSidebar();
  const { brief, isCreating, openBrief } = useInboxBrief();
  const aiButtonLabel = isCreating
    ? "هوش مصنوعی در حال آماده‌سازی اقدامات پیشنهادی است"
    : brief
      ? "مشاهده اقدامات پیشنهادی هوش مصنوعی"
      : "اقدامات پیشنهادی هوش مصنوعی";

  const handleToggle = () => {
    toggleMobileSidebar();
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const advancedSearchRef = useRef<HTMLDivElement>(null);

  const handleFastSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const value = String(formData.get("q") || "");
    const params = new URLSearchParams(searchParams.toString());
    const trimmedValue = value.trim();

    if (trimmedValue) {
      params.set("q", trimmedValue);
    } else {
      params.delete("q");
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const handleAdvancedSearchSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const title = String(formData.get("title") || "").trim();
    const content = String(formData.get("content") || "").trim();
    const createDate = advancedSearchDate.trim();
    const tags = advancedSearchTags.map((tag) => tag.name.trim()).filter(Boolean);

    if (title) params.set("title", title);
    if (content) params.set("content", content);
    if (createDate) params.set("createDate", createDate);
    if (tags.length > 0) params.set("tags", tags.join(","));

    const queryString = params.toString();
    setIsAdvancedSearchOpen(false);
    router.push(queryString ? `/letter-search?${queryString}` : "/letter-search");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setAdvancedSearchTags(getLetterTagsFromParam(advancedTags));
  }, [advancedTags]);

  return (
    <header className="sticky top-0 z-[99999] h-[92px] w-full bg-transparent px-4 pt-4 sm:px-6 lg:px-8">
      <div className="liquid-glass-header relative mx-auto flex h-[76px] max-w-[1540px] items-center gap-3 rounded-card border border-white/60 px-3 dark:border-white/10 sm:px-5">
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gray-500 transition hover:bg-black/5 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-white/5 lg:hidden"
            onClick={handleToggle}
            aria-label="باز کردن منو"
            aria-expanded={isMobileOpen}
            type="button"
          >
            {isMobileOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                width="16"
                height="12"
                viewBox="0 0 16 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {/* Cross Icon */}
          </button>

          <button
            type="button"
            onClick={toggleSidebar}
            className="liquid-glass-keyline hidden h-10 w-10 shrink-0 place-items-center rounded-control border bg-white/50 text-[var(--liquid-muted)] transition hover:text-brand-600 dark:bg-white/[0.045] dark:hover:text-brand-300 lg:grid"
            title={isExpanded ? "جمع کردن نوار کناری" : "باز کردن نوار کناری"}
            aria-label={
              isExpanded ? "جمع کردن نوار کناری" : "باز کردن نوار کناری"
            }
            aria-controls="app-sidebar"
            aria-expanded={isExpanded}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div
            ref={advancedSearchRef}
            className="relative mr-0 min-w-0 flex-1 md:mr-4 md:max-w-xl"
          >
            <div className="flex items-center gap-2">
            <form className="min-w-0 flex-1" onSubmit={handleFastSearchSubmit}>
              <div className="relative">
                <Search className="pointer-events-none absolute start-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--liquid-muted)]" />
                <Input
                  key={`${pathname}-${searchValue}`}
                  ref={inputRef}
                  name="q"
                  type="search"
                  defaultValue={searchValue}
                  aria-label="جستجو در سامانه"
                  placeholder="جستجوی نامه، همکار یا واحد..."
                  className="ui-control-with-start-icon font-medium"
                />
              </div>
            </form>
            <button
              type="button"
              onClick={() => setIsAdvancedSearchOpen((current) => !current)}
              className={`dropdown-toggle hidden h-10 w-10 shrink-0 place-items-center rounded-control border transition sm:grid ${
                isAdvancedSearchOpen
                  ? "border-brand-500/25 bg-brand-500/10 text-brand-600 dark:text-brand-300"
                  : "liquid-glass-keyline bg-white/50 text-[var(--liquid-muted)] hover:text-brand-600 dark:bg-white/[0.045]"
              }`}
              title="جستجوی پیشرفته نامه‌ها"
              aria-label="جستجوی پیشرفته نامه‌ها"
              aria-expanded={isAdvancedSearchOpen}
            >
              <SlidersHorizontal className="h-[18px] w-[18px]" />
            </button>
            </div>

            {isAdvancedSearchOpen && (
              <Dropdown
                isOpen={isAdvancedSearchOpen}
                onClose={() => setIsAdvancedSearchOpen(false)}
                glassVariant="surface"
                portal
                anchorRef={advancedSearchRef}
                className="w-[min(24rem,calc(100vw-2rem))] rounded-card p-4 text-right"
              >
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-app-border pb-3 dark:border-gray-800">
                  <Button
                    type="button"
                    onClick={() => setIsAdvancedSearchOpen(false)}
                    variant="ghost"
                    size="sm"
                  >
                    بستن
                  </Button>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    جستجوی پیشرفته نامه‌ها
                  </h2>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={handleAdvancedSearchSubmit}
                >
                  <Field label="عنوان نامه" htmlFor="advanced-letter-title">
                    <Input
                      id="advanced-letter-title"
                      name="title"
                      type="text"
                      defaultValue={advancedTitle}
                    />
                  </Field>

                  <Field label="متن نامه" htmlFor="advanced-letter-content">
                    <Input
                      id="advanced-letter-content"
                      name="content"
                      type="text"
                      defaultValue={advancedContent}
                    />
                  </Field>

                  <div>
                    <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      کلیدواژه‌ها
                    </span>
                    <LetterTagInput
                      name="tags"
                      selectedTags={advancedSearchTags}
                      onChange={setAdvancedSearchTags}
                      allowCreate={false}
                      placeholder="جستجوی کلیدواژه"
                    />
                  </div>

                  <div>
                    <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      تاریخ ایجاد از
                    </span>
                    <ShamsiDatePicker
                      name="createDate"
                      value={advancedSearchDate}
                      onChange={setAdvancedSearchDate}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setAdvancedSearchDate("");
                        setAdvancedSearchTags([]);
                        setIsAdvancedSearchOpen(false);
                        router.push("/letter-search");
                      }}
                      variant="secondary"
                    >
                      پاک کردن
                    </Button>
                    <Button
                      type="submit"
                    >
                      جستجو
                    </Button>
                  </div>
                </form>
              </Dropdown>
            )}
        </div>
        <div className="mr-auto flex self-stretch shrink-0 items-center gap-2">
          <Link
            href="/incoming-letters"
            title="کارتابل ورودی"
            aria-label="کارتابل ورودی"
            aria-current={pathname === "/" || pathname === "/incoming-letters" ? "page" : undefined}
            className={`hidden h-10 w-10 shrink-0 place-items-center rounded-control border transition sm:grid ${
              pathname === "/" || pathname === "/incoming-letters"
                ? "border-brand-500/25 bg-brand-500/10 text-brand-600 dark:text-brand-300"
                : "liquid-glass-keyline bg-white/50 text-[var(--liquid-muted)] hover:text-brand-600 dark:bg-white/[0.045] dark:hover:text-brand-300"
            }`}
          >
            <Inbox className="h-[18px] w-[18px]" />
          </Link>
          <Link
            href="/incoming-messages"
            title="پیام‌های ورودی"
            aria-label="پیام‌های ورودی"
            aria-current={pathname === "/incoming-messages" ? "page" : undefined}
            className={`hidden h-10 w-10 shrink-0 place-items-center rounded-control border transition sm:grid ${
              pathname === "/incoming-messages"
                ? "border-brand-500/25 bg-brand-500/10 text-brand-600 dark:text-brand-300"
                : "liquid-glass-keyline bg-white/50 text-[var(--liquid-muted)] hover:text-brand-600 dark:bg-white/[0.045] dark:hover:text-brand-300"
            }`}
          >
            <MessageSquare className="h-[18px] w-[18px]" />
          </Link>
          <button
            type="button"
            onClick={openBrief}
            title={aiButtonLabel}
            aria-label={aiButtonLabel}
            className={`hidden h-10 w-10 shrink-0 place-items-center rounded-control border transition sm:grid ${AI_HEADER_BUTTON_CLASS}`}
          >
            {isCreating ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <Sparkles className="h-[18px] w-[18px]" />
            )}
          </button>
          <ThemeToggleButton />
          <NotificationDropdown />
          <UserDropdown user={user} />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

"use client";
import { ThemeToggleButton } from "@/src/components/common/ThemeToggleButton";
import NotificationDropdown from "@/src/components/header/NotificationDropdown";
import UserDropdown from "@/src/components/header/UserDropdown";
import { useInboxBrief } from "@/src/components/app/inbox-brief/InboxBriefPanel";
import { useSidebar } from "@/src/context/SidebarContext";
import type { CurrentUser } from "@/src/lib/auth-types";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  MessageSquareText,
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

function toLatinDigits(value: string) {
  const digitMap: Record<string, string> = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };

  return value.replace(/[۰-۹٠-٩]/g, (digit) => digitMap[digit]);
}

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
        className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-app-border bg-white/80 px-4 text-sm text-gray-700 transition hover:bg-blue-light-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/5"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="truncate">
            {value ? formatPersianDate(value) : "انتخاب تاریخ"}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-12 z-[60] w-72 rounded-lg border border-app-border bg-app-panel p-3 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
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
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchValue = searchParams.get("q") || "";
  const advancedTitle = searchParams.get("title") || "";
  const advancedContent = searchParams.get("content") || "";
  const advancedCreateDate = searchParams.get("createDate") || "";
  const [advancedSearchDate, setAdvancedSearchDate] =
    useState(advancedCreateDate);

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { brief, isCreating, openBrief } = useInboxBrief();
  const aiButtonLabel = isCreating
    ? "هوش مصنوعی در حال آماده‌سازی اقدامات پیشنهادی است"
    : brief
      ? "مشاهده اقدامات پیشنهادی هوش مصنوعی"
      : "اقدامات پیشنهادی هوش مصنوعی";

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
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

  const submitFastSearch = () => {
    inputRef.current?.form?.requestSubmit();
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

    if (title) params.set("title", title);
    if (content) params.set("content", content);
    if (createDate) params.set("createDate", createDate);

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
    if (!isAdvancedSearchOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        advancedSearchRef.current &&
        !advancedSearchRef.current.contains(event.target as Node)
      ) {
        setIsAdvancedSearchOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAdvancedSearchOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAdvancedSearchOpen]);

  return (
    <header className={`sticky top-0 z-99999 flex w-full border-app-border bg-app-header-main/95 shadow-[0_1px_0_rgba(37,83,126,0.08)] backdrop-blur dark:border-gray-800 dark:bg-gray-900 lg:border-b`}>
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-app-border dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            className="z-99999 flex h-10 w-10 items-center justify-center rounded-lg border border-app-border bg-white/70 text-gray-600 shadow-theme-xs transition hover:bg-blue-light-50 hover:text-blue-light-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 lg:h-11 lg:w-11"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
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

          <Link href="/" className="lg:hidden">
            <Image
              width={154}
              height={32}
              className="dark:hidden"
              src="./images/logo/logo.svg"
              alt="Logo"
              loading="eager"
              style={{ width: "auto", height: "auto" }}
            />
            <Image
              width={154}
              height={32}
              className="hidden dark:block"
              src="./images/logo/logo-dark.svg"
              alt="Logo"
              style={{ width: "auto", height: "auto" }}
            />
          </Link>

          <button
            onClick={toggleApplicationMenu}
            className="z-99999 flex h-10 w-10 items-center justify-center rounded-lg bg-white/60 text-gray-700 transition hover:bg-blue-light-50 hover:text-blue-light-700 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
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
                d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <div
            ref={advancedSearchRef}
            className="relative hidden items-center gap-2 lg:flex"
          >
            <form onSubmit={handleFastSearchSubmit}>
              <div className="relative">
                <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                  <svg
                    className="fill-gray-500 dark:fill-gray-400"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                      fill=""
                    />
                  </svg>
                </span>
                <input
                  key={`${pathname}-${searchValue}`}
                  ref={inputRef}
                  name="q"
                  type="text"
                  defaultValue={searchValue}
                  placeholder="Search lists..."
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-app-border bg-white/80 py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-blue-light-300 focus:outline-hidden focus:ring-3 focus:ring-blue-light-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
                />

                <button
                  type="button"
                  onClick={submitFastSearch}
                  className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-app-border bg-app-surface-strong px-[7px] py-[4.5px] text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
                >
                  <span> ⌘ </span>
                  <span> K </span>
                </button>
              </div>
            </form>
            <button
              type="button"
              onClick={() => setIsAdvancedSearchOpen((current) => !current)}
              className={`inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium text-gray-500 transition dark:hover:bg-gray-800 dark:hover:text-white ${
                isAdvancedSearchOpen
                  ? "border-blue-light-200 bg-blue-light-50 text-blue-light-800 hover:bg-blue-light-100 dark:border-blue-800 dark:bg-blue-500/15 dark:text-blue-300"
                  : "border-app-border bg-white/70 text-gray-600 hover:bg-blue-light-50 hover:text-blue-light-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
              }`}
              title="جستجوی پیشرفته نامه‌ها"
              aria-label="جستجوی پیشرفته نامه‌ها"
              aria-expanded={isAdvancedSearchOpen}
            >
              <SlidersHorizontal className="h-5 w-5" />
              <span>جستجوی پیشرفته</span>
            </button>

            {isAdvancedSearchOpen && (
              <div className="absolute left-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-app-border bg-app-panel p-4 text-right shadow-xl dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-app-border pb-3 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsAdvancedSearchOpen(false)}
                    className="rounded-md px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    بستن
                  </button>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    جستجوی پیشرفته نامه‌ها
                  </h2>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={handleAdvancedSearchSubmit}
                >
                  <div>
                    <label
                      htmlFor="advanced-letter-title"
                      className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      عنوان نامه
                    </label>
                    <input
                      id="advanced-letter-title"
                      name="title"
                      type="text"
                      defaultValue={advancedTitle}
                      className="h-11 w-full rounded-lg border border-app-border bg-white/80 px-4 text-sm text-gray-900 outline-none transition focus:border-blue-light-500 focus:ring-4 focus:ring-blue-light-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="advanced-letter-content"
                      className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      متن نامه
                    </label>
                    <input
                      id="advanced-letter-content"
                      name="content"
                      type="text"
                      defaultValue={advancedContent}
                      className="h-11 w-full rounded-lg border border-app-border bg-white/80 px-4 text-sm text-gray-900 outline-none transition focus:border-blue-light-500 focus:ring-4 focus:ring-blue-light-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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
                    <button
                      type="button"
                      onClick={() => {
                        setAdvancedSearchDate("");
                        setIsAdvancedSearchOpen(false);
                        router.push("/letter-search");
                      }}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      پاک کردن
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-light-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-light-700"
                    >
                      جستجو
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } items-center justify-between w-full gap-4 bg-app-header-main/95 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:bg-transparent lg:px-0 lg:shadow-none`}
        >
          <div className="flex flex-wrap items-center gap-2 2xsm:gap-3">
            <Link
              href="/incoming-letters"
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-app-border bg-white/75 px-4 text-sm font-medium text-gray-600 shadow-theme-xs transition-colors hover:bg-blue-light-50 hover:text-blue-light-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <Mail className="h-4 w-4" />
              <span>کارتابل ورودی</span>
            </Link>
            <Link
              href="/incoming-messages"
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-app-border bg-white/75 px-4 text-sm font-medium text-gray-600 shadow-theme-xs transition-colors hover:bg-blue-light-50 hover:text-blue-light-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <MessageSquareText className="h-4 w-4" />
              <span>پیام‌های ورودی</span>
            </Link>
            <button
              type="button"
              onClick={openBrief}
              title={aiButtonLabel}
              aria-label={aiButtonLabel}
              className={`inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${
                isCreating
                  ? "border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300"
                  : "border-app-border bg-white/75 text-gray-600 shadow-theme-xs hover:bg-blue-light-50 hover:text-blue-light-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                اقدامات پیشنهادی هوش مصنوعی
              </span>
              <span className="sm:hidden">AI</span>
            </button>
            {/* <!-- Dark Mode Toggler --> */}
            <ThemeToggleButton />
            {/* <!-- Dark Mode Toggler --> */}

           <NotificationDropdown /> 
            {/* <!-- Notification Menu Area --> */}
          </div>
          {/* <!-- User Area --> */}
          <UserDropdown user={user} /> 
    
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

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

function formatPersianDate(value: Date | string | null) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return persianDisplayFormatter.format(date);
}

interface PersianDatePickerProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export default function PersianDatePicker({
  name,
  value,
  onChange,
  placeholder,
  disabled = false,
}: PersianDatePickerProps) {
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
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className="liquid-glass-control inline-flex h-11 w-full items-center justify-between gap-2 rounded-2xl border px-3 text-sm text-gray-700 transition hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200 dark:hover:text-brand-300"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="truncate">
            {selectedDate ? formatPersianDate(selectedDate) : placeholder}
          </span>
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="liquid-modal absolute left-0 top-12 z-40 w-72 rounded-3xl p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="liquid-glass-control flex h-8 w-8 items-center justify-center rounded-xl border text-gray-500 transition hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-300"
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
              className="liquid-glass-control flex h-8 w-8 items-center justify-center rounded-xl border text-gray-500 transition hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-300"
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
                  className={`flex h-8 items-center justify-center rounded-xl text-sm transition ${
                    isSelected
                      ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                      : isToday
                        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                        : "text-gray-700 hover:bg-white/50 dark:text-gray-200 dark:hover:bg-white/[0.07]"
                  }`}
                >
                  {day.day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/55 pt-3 dark:border-white/10">
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
              onClick={() => onChange("")}
              className="text-xs font-medium text-gray-500 hover:text-red-500 dark:text-gray-300"
            >
              پاک کردن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { formatPersianDate, toDateInputValue };

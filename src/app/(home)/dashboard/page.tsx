import Link from "next/link";
import type { ComponentType } from "react";
import {
  Archive,
  BarChart3,
  CalendarDays,
  FileText,
  Inbox,
  Mail,
  MessageSquare,
  Send,
} from "lucide-react";
import { getDashboardStats } from "@/src/actions/dashboardActions";

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accentClass,
}: {
  title: string;
  value: number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accentClass: string;
}) {
  return (
    <div className="liquid-glass-panel rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
            {formatNumber(value)}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accentClass}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {label}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {formatNumber(value)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

type ChartDatum = {
  label: string;
  value: number;
  color: string;
};

function TrendChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const width = 640;
  const height = 220;
  const paddingX = 34;
  const paddingY = 28;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const points = data.map((item, index) => {
    const x =
      data.length === 1
        ? width / 2
        : paddingX +
          (index * (width - paddingX * 2)) / Math.max(data.length - 1, 1);
    const y =
      height -
      paddingY -
      (item.value / maxValue) * (height - paddingY * 2);

    return { ...item, x, y };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="liquid-glass-panel rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
        <div className="text-right">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            روند فعالیت
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            اقلام ایجادشده در شش ماه اخیر
          </p>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-64 w-full overflow-visible"
        role="img"
        aria-label="نمودار روند فعالیت"
      >
        {[0, 1, 2].map((line) => {
          const y = paddingY + (line * (height - paddingY * 2)) / 2;

          return (
            <line
              key={line}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              className="stroke-gray-100 dark:stroke-gray-800"
              strokeWidth="1"
            />
          );
        })}
        <path
          d={linePath}
          fill="none"
          stroke="#2563eb"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5" fill="#2563eb" />
            <text
              x={point.x}
              y={height - 5}
              textAnchor="middle"
              className="fill-gray-500 text-[13px] dark:fill-gray-400"
            >
              {point.label}
            </text>
            <text
              x={point.x}
              y={Math.max(point.y - 12, 12)}
              textAnchor="middle"
              className="fill-gray-800 text-[13px] font-semibold dark:fill-gray-100"
            >
              {formatNumber(point.value)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function PieChart({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let current = 0;
  const gradient =
    total > 0
      ? data
          .map((item) => {
            const start = current;
            current += (item.value / total) * 100;
            return `${item.color} ${start}% ${current}%`;
          })
          .join(", ")
      : "#e5e7eb 0% 100%";

  return (
    <div className="liquid-glass-panel rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Archive className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        <div className="text-right">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            سهم فعالیت‌ها
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            توزیع کل رکوردهای حساب
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-5 sm:flex-row-reverse sm:items-center sm:justify-between">
        <div
          className="grid h-44 w-44 place-items-center rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
          role="img"
          aria-label="نمودار دایره‌ای سهم فعالیت‌ها"
        >
          <div className="liquid-glass-inset grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-sm dark:bg-gray-900">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {formatNumber(total)}
            </span>
          </div>
        </div>
        <div className="w-full space-y-3">
          {data.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {formatNumber(item.value)}
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {item.label}
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ColumnChart({
  groups,
}: {
  groups: Array<{
    label: string;
    incoming: number;
    outgoing: number;
    archived: number;
  }>;
}) {
  const chartHeight = 224;
  const maxValue = Math.max(
    ...groups.flatMap((group) => [group.incoming, group.outgoing, group.archived]),
    1
  );
  const series = [
    { key: "incoming", label: "ورودی", colorClass: "bg-blue-600" },
    { key: "outgoing", label: "خروجی", colorClass: "bg-emerald-600" },
    { key: "archived", label: "بایگانی", colorClass: "bg-slate-500" },
  ] as const;

  return (
    <div className="liquid-glass-panel rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
        <div className="text-right">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            مقایسه ورودی، خروجی و بایگانی
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            مقایسه دسته‌های اصلی کاری
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-4 pb-4 text-xs text-gray-500 dark:text-gray-400">
        {series.map((item) => (
          <span key={item.key} className="flex items-center gap-2">
            {item.label}
            <span className={`h-2.5 w-2.5 rounded-full ${item.colorClass}`} />
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[680px] grid-cols-4 items-end gap-6 border-b border-gray-200 pb-4 dark:border-gray-800">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col justify-end gap-3">
              <div
                className="flex items-end justify-center gap-3 border-b border-gray-100 px-2 dark:border-gray-800"
                style={{ height: chartHeight }}
              >
                {series.map((item) => {
                  const value = group[item.key];
                  const barHeight =
                    value > 0
                      ? Math.max(Math.round((value / maxValue) * chartHeight), 10)
                      : 2;

                  return (
                    <div
                      key={item.key}
                      className="flex w-10 flex-col items-center justify-end gap-2"
                    >
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {formatNumber(value)}
                      </span>
                      <div
                        className={`w-full rounded-t-md ${item.colorClass}`}
                        style={{ height: barHeight }}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-sm font-medium text-gray-700 dark:text-gray-200">
                {group.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const totalWork =
    stats.letters.total +
    stats.forms.total +
    stats.messages.total +
    stats.meetings.total;
  const pieData = [
    { label: "نامه‌ها", value: stats.letters.total, color: "#2563eb" },
    { label: "فرم‌ها", value: stats.forms.total, color: "#16a34a" },
    { label: "پیام‌ها", value: stats.messages.total, color: "#f59e0b" },
    { label: "جلسات", value: stats.meetings.total, color: "#64748b" },
  ];
  const columnGroups = [
    {
      label: "نامه",
      incoming: stats.letters.incoming,
      outgoing: stats.letters.outgoing,
      archived: stats.letters.archived,
    },
    {
      label: "فرم",
      incoming: stats.forms.incoming,
      outgoing: stats.forms.outgoing,
      archived: stats.forms.archived,
    },
    {
      label: "پیام",
      incoming: stats.messages.received,
      outgoing: stats.messages.sent,
      archived: 0,
    },
    {
      label: "جلسه",
      incoming: stats.meetings.incoming,
      outgoing: stats.meetings.outgoing,
      archived: stats.meetings.archived,
    },
  ];

  return (
    <main className="min-h-[calc(100vh-65px)] bg-app-canvas dark:bg-gray-950 lg:min-h-[calc(100vh-77px)]">
      <div className="liquid-content-frame flex w-full flex-col gap-6 py-4 lg:pb-6">
        <div className="liquid-page-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              داشبورد
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              نمای کلی آمار حساب کاربری شما
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Link
              href="/letter"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
            >
              <FileText className="h-4 w-4" />
              نامه جدید
            </Link>
            <Link
              href="/new-message"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
              پیام جدید
            </Link>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="کارهای باز"
            value={stats.workload.openInbox}
            description="نامه، فرم و جلسه در کارتابل ورودی"
            icon={Inbox}
            accentClass="bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
          />
          <StatCard
            title="پیام‌های خوانده‌نشده"
            value={stats.workload.unreadMessages}
            description="پیام‌هایی که هنوز مشاهده نشده‌اند"
            icon={Mail}
            accentClass="bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          />
          <StatCard
            title="ارسالی‌ها"
            value={stats.workload.sentItems}
            description="کل اقلامی که از حساب شما ارسال شده‌اند"
            icon={Send}
            accentClass="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
          />
          <StatCard
            title="بایگانی"
            value={stats.archive.items}
            description={`${formatNumber(stats.archive.folders)} پوشه بایگانی`}
            icon={Archive}
            accentClass="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <TrendChart data={stats.trends.createdActivity} />
          <PieChart data={pieData} />
        </section>

        <ColumnChart groups={columnGroups} />

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="liquid-glass-panel rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between gap-3">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              <div className="text-right">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  توزیع فعالیت‌ها
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  مجموع {formatNumber(totalWork)} رکورد مرتبط با حساب
                </p>
              </div>
            </div>
            <div className="space-y-5">
              <MetricRow label="نامه‌ها" value={stats.letters.total} total={totalWork} />
              <MetricRow label="فرم‌ها" value={stats.forms.total} total={totalWork} />
              <MetricRow
                label="پیام‌ها"
                value={stats.messages.total}
                total={totalWork}
              />
              <MetricRow
                label="جلسات"
                value={stats.meetings.total}
                total={totalWork}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="liquid-glass-panel rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  نامه‌ها و فرم‌ها
                </h2>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3 text-right dark:bg-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">نامه ورودی</dt>
                  <dd className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(stats.letters.incoming)}
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-right dark:bg-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">فرم ورودی</dt>
                  <dd className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(stats.forms.incoming)}
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-right dark:bg-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">نامه ایجادشده</dt>
                  <dd className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(stats.letters.created)}
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-right dark:bg-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">فرم ایجادشده</dt>
                  <dd className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(stats.forms.created)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="liquid-glass-panel rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  پیام‌ها و جلسات
                </h2>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3 text-right dark:bg-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">پیام دریافتی</dt>
                  <dd className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(stats.messages.received)}
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-right dark:bg-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">پیام ارسالی</dt>
                  <dd className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(stats.messages.sent)}
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-right dark:bg-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">جلسه ورودی</dt>
                  <dd className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(stats.meetings.incoming)}
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-right dark:bg-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">جلسه ایجادشده</dt>
                  <dd className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(stats.meetings.created)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="نامه‌های بایگانی‌شده"
            value={stats.archive.letters}
            description="نامه‌های ذخیره‌شده در بایگانی شما"
            icon={Archive}
            accentClass="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
          <StatCard
            title="فرم‌های بایگانی‌شده"
            value={stats.archive.forms}
            description="فرم‌های ذخیره‌شده در بایگانی شما"
            icon={FileText}
            accentClass="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
          <StatCard
            title="جلسات بایگانی‌شده"
            value={stats.archive.meetings}
            description="جلسات ذخیره‌شده در بایگانی شما"
            icon={MessageSquare}
            accentClass="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
        </section>
      </div>
    </main>
  );
}

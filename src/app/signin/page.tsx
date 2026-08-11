import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Feather,
  FileText,
  MessageSquare,
} from "lucide-react";
import LoginForm from "@/src/components/auth/LoginForm";
import { ThemeToggleButton } from "@/src/components/common/ThemeToggleButton";
import { PageTitle } from "@/src/components/ui";
import { getCurrentUser } from "@/src/lib/auth";
import { getSafeInternalPath } from "@/src/lib/navigation";

export const metadata: Metadata = {
  title: "ورود به میزکار",
  description: "ورود به سامانه سازمانی میزکار",
};

const workspaceAreas = [
  { label: "نامه‌ها", icon: FileText },
  { label: "پیام‌ها", icon: MessageSquare },
  { label: "جلسات", icon: CalendarDays },
];

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const redirectTo = getSafeInternalPath(
    Array.isArray(params.next) ? params.next[0] : params.next,
  );
  const user = await getCurrentUser();

  if (user) {
    redirect(redirectTo);
  }

  return (
    <main className="liquid-auth-page grid min-h-dvh overflow-x-clip lg:grid-cols-[420px_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)]">
      <section className="liquid-glass-sidebar relative z-10 flex min-h-dvh border-l border-app-border px-4 py-8 text-gray-900 dark:border-gray-800 dark:text-white sm:px-6 sm:py-10 lg:px-8 lg:py-8">
        <div className="mx-auto flex w-full max-w-[380px] flex-col">
          <header className="flex items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-control-lg bg-gradient-to-br from-[#7168ff] via-[#625cff] to-[#45b9c9] text-white">
                <span className="absolute inset-px rounded-control border border-white/25" />
                <Feather className="relative h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-xl font-bold text-gray-900 dark:text-white">
                  میزکار
                </span>
                <span className="block whitespace-nowrap text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  اتوماسیون هوشمند سازمانی
                </span>
              </span>
            </div>
            <ThemeToggleButton className="shrink-0" />
          </header>

          <div className="my-auto py-8 sm:py-10 lg:py-8">
            <PageTitle
              title="ورود به میزکار"
              description="برای ادامه، اطلاعات حساب سازمانی خود را وارد کنید."
              className="mb-8"
            />
            <LoginForm redirectTo={redirectTo} />
          </div>

          <p className="border-t border-black/5 pt-4 text-center text-xs leading-5 text-gray-400 dark:border-white/5 dark:text-gray-500">
            دسترسی ویژه کاربران سازمان
          </p>
        </div>
      </section>

      <aside
        aria-hidden="true"
        className="relative hidden min-h-dvh overflow-hidden lg:flex"
      >
        <Image
          src="/images/bg.jpg"
          alt=""
          fill
          fetchPriority="high"
          sizes="(min-width: 1280px) calc(100vw - 440px), (min-width: 1024px) calc(100vw - 420px), 100vw"
          className="scale-110 object-cover object-[center_64%]"
        />
        <div className="absolute inset-0 bg-gray-950/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/85 via-gray-950/10 to-gray-950/10" />

        <div className="relative z-10 mt-auto w-full p-8 text-white xl:p-10">
          <div className="max-w-[560px]">
            <p className="text-xs leading-5 font-bold text-white/70">
              میزکار سازمانی
            </p>
            <h2 className="mt-2 text-2xl leading-10 font-bold">
              فضای یکپارچه کارهای روزانه سازمان
            </h2>
            <p className="mt-2 max-w-[500px] text-sm leading-7 text-white/80">
              دسترسی منظم به مکاتبات، پیام‌ها و جلسات در یک محیط کاری متمرکز.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/20 pt-4">
              {workspaceAreas.map((area) => {
                const Icon = area.icon;

                return (
                  <span
                    key={area.label}
                    className="inline-flex items-center gap-2 text-xs font-bold text-white/90"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                    {area.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

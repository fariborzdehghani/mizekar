import Image from "next/image";
import { redirect } from "next/navigation";
import LoginForm from "@/src/components/auth/LoginForm";
import { getCurrentUser } from "@/src/lib/auth";

export default async function SignInPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="liquid-auth-page flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950 lg:flex-row">
      <section className="liquid-auth-side flex w-full items-center justify-center border-gray-200 bg-white px-5 py-10 dark:border-gray-800 dark:bg-gray-950 sm:px-8 lg:min-h-screen lg:w-[430px] lg:shrink-0 lg:border-l xl:w-[460px]">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex justify-center">
            <Image
              src="/images/logo/logo.png"
              alt="Mizekar"
              width={170}
              height={45}
              priority
              className="dark:hidden"
              style={{ width: "auto", height: "auto" }}
            />
            <Image
              src="/images/logo/logo-dark.png"
              alt="Mizekar"
              width={170}
              height={45}
              priority
              className="hidden dark:block"
              style={{ width: "auto", height: "auto" }}
            />
          </div>

          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              ورود به میزکار
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              برای ادامه نام کاربری و رمز عبور خود را وارد کنید.
            </p>
          </div>

          <LoginForm />
        </div>
      </section>

      <section className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden lg:min-h-screen">
        <Image
          src="/images/bg.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) calc(100vw - 460px), (min-width: 1024px) calc(100vw - 430px), 100vw"
          className="scale-105 object-cover blur-xs"
        />
        <div className="absolute inset-0 bg-gray-950/35" />

        <div className="liquid-glass-panel relative mx-5 flex w-full max-w-[680px] flex-col items-center rounded-[28px] border border-white/25 bg-white/45 px-8 py-12 text-center shadow-theme-xl backdrop-blur-sm dark:border-white/15 dark:bg-gray-950/35 sm:px-16 sm:py-16">
          <Image
            src="/images/logo/logo-icon.png"
            alt="Mizekar"
            width={128}
            height={128}
            priority
            className="mb-5"
          />
          <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white sm:text-title-sm">
            خوش آمدید
          </h2>
          <p className="mt-4 max-w-[420px] text-sm leading-7 text-gray-700 dark:text-gray-200">
            به سامانه میزکار خوش آمدید. برای مدیریت نامه‌ها، پیام‌ها و کارهای
            روزانه خود وارد حساب کاربری شوید.
          </p>
        </div>
      </section>
    </main>
  );
}

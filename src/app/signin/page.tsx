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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <section className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/logo/logo.svg"
            alt="Mizekar"
            width={170}
            height={45}
            priority
            className="dark:hidden"
            style={{ width: "auto", height: "auto" }}
          />
          <Image
            src="/images/logo/logo-dark.svg"
            alt="Mizekar"
            width={170}
            height={45}
            priority
            className="hidden dark:block"
            style={{ width: "auto", height: "auto" }}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
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
    </main>
  );
}

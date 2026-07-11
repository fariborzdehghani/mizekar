import ProfileForm from "@/src/components/profile/ProfileForm";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export default async function ProfilePage() {
  const user = await requireUser();
  const person = await prisma.persons.findFirst({
    where: { user_id: user.id },
    select: {
      first_name: true,
      last_name: true,
    },
  });

  return (
    <div className="liquid-content-frame liquid-glass-page min-h-[calc(100vh-92px)] py-4 sm:py-6 lg:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="liquid-page-header mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ویرایش پروفایل
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            اطلاعات حساب، تصویر پروفایل و رمز عبور خود را مدیریت کنید.
          </p>
        </div>

        <section className="liquid-glass-panel rounded-[24px] border border-app-border bg-app-panel p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <ProfileForm
            profile={{
              userId: user.userId,
              displayName: user.displayName,
              firstName: person?.first_name || "",
              lastName: person?.last_name || "",
              photo: user.photo,
            }}
          />
        </section>
      </div>
    </div>
  );
}

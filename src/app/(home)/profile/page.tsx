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
    <div className="min-h-[calc(100vh-65px)] bg-gray-50 p-4 dark:bg-gray-950 lg:min-h-[calc(100vh-77px)] lg:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ویرایش پروفایل
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            اطلاعات حساب، تصویر پروفایل و رمز عبور خود را مدیریت کنید.
          </p>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
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

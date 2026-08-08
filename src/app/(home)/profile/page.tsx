import ProfileForm from "@/src/components/profile/ProfileForm";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { PageFrame, PageHeader, PageTitle, Surface } from "@/src/components/ui";

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
    <PageFrame className="py-4 sm:py-6 lg:py-8">
      <PageHeader className="mb-6">
        <PageTitle
          title="ویرایش پروفایل"
          description="اطلاعات حساب، تصویر پروفایل و رمز عبور خود را مدیریت کنید."
        />
      </PageHeader>

      <Surface>
        <ProfileForm
          profile={{
            userId: user.userId,
            displayName: user.displayName,
            firstName: person?.first_name || "",
            lastName: person?.last_name || "",
            photo: user.photo,
          }}
        />
      </Surface>
    </PageFrame>
  );
}

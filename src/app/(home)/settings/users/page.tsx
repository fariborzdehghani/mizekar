import UserManagement from "@/src/components/settings/UserManagement";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

interface UsersSettingsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getSearchQuery(params: { [key: string]: string | string[] | undefined }) {
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return query?.trim() || "";
}

export default async function UsersSettingsPage({
  searchParams,
}: UsersSettingsPageProps) {
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number(rawPage);
  const currentPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const currentUser = await requireUser();

  const [users, roles, permissions] = await Promise.all([
    prisma.users.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        user_id: true,
        role_id: true,
        roles: {
          select: { title: true },
        },
        users_permissions: {
          select: { permission_id: true },
        },
        persons_persons_user_idTousers: {
          select: {
            first_name: true,
            last_name: true,
            job: true,
          },
          take: 1,
        },
      },
    }),
    prisma.roles.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
      },
    }),
    prisma.permissions_defination.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        code: true,
        title: true,
      },
    }),
  ]);

  return (
    <UserManagement
      roles={roles.map((role) => ({
        id: role.id,
        title: role.title || `نقش ${role.id}`,
      }))}
      permissions={permissions.map((permission) => ({
        id: permission.id,
        code: permission.code || String(permission.id),
        title: permission.title || permission.code || `دسترسی ${permission.id}`,
      }))}
      users={users.map((user) => {
        const person = user.persons_persons_user_idTousers[0];

        return {
          id: user.id,
          userId: user.user_id || String(user.id),
          firstName: person?.first_name || "",
          lastName: person?.last_name || "",
          job: person?.job || "",
          roleId: user.role_id,
          roleTitle: user.roles?.title || "",
          permissionIds: user.users_permissions
            .map((permission) => permission.permission_id)
            .filter((permissionId): permissionId is number => permissionId !== null),
          isCurrentUser: user.id === currentUser.id,
        };
      })}
      searchQuery={getSearchQuery(params)}
      currentPage={currentPage}
    />
  );
}

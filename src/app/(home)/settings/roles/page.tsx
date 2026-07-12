import RoleManagement from "@/src/components/settings/RoleManagement";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

interface RolesSettingsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getSearchQuery(params: { [key: string]: string | string[] | undefined }) {
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return query?.trim() || "";
}

export default async function RolesSettingsPage({
  searchParams,
}: RolesSettingsPageProps) {
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number(rawPage);
  const currentPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  await requireUser();

  const [roles, permissions] = await Promise.all([
    prisma.roles.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        roles_permissions: {
          select: { permission_id: true },
        },
        _count: {
          select: { users: true },
        },
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
    <RoleManagement
      roles={roles.map((role) => ({
        id: role.id,
        title: role.title || `نقش ${role.id}`,
        permissionIds: role.roles_permissions
          .map((permission) => permission.permission_id)
          .filter(
            (permissionId): permissionId is number => permissionId !== null
          ),
        userCount: role._count.users,
      }))}
      permissions={permissions.map((permission) => ({
        id: permission.id,
        code: permission.code || String(permission.id),
        title: permission.title || permission.code || `دسترسی ${permission.id}`,
      }))}
      searchQuery={getSearchQuery(params)}
      currentPage={currentPage}
    />
  );
}

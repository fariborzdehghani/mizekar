"use client";

import { useActionState, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  createRoleAction,
  deleteRoleAction,
  updateRoleAction,
  type RoleFormState,
} from "@/src/actions/settingsActions";

type PermissionOption = {
  id: number;
  code: string;
  title: string;
};

type ManagedRole = {
  id: number;
  title: string;
  permissionIds: number[];
  userCount: number;
};

type RoleManagementProps = {
  roles: ManagedRole[];
  permissions: PermissionOption[];
  searchQuery?: string;
};

type ViewMode = "list" | "create" | "edit";

const initialState: RoleFormState = {};

function getPermissionSummary(
  permissionIds: number[],
  permissions: PermissionOption[]
) {
  if (permissionIds.length === 0) return "-";

  const permissionById = new Map(
    permissions.map((permission) => [permission.id, permission.title])
  );

  return permissionIds
    .map((permissionId) => permissionById.get(permissionId))
    .filter(Boolean)
    .join("، ");
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("fa-IR");
}

function roleMatchesSearch(
  role: ManagedRole,
  permissions: PermissionOption[],
  searchQuery: string
) {
  const query = normalizeSearchValue(searchQuery.trim());
  if (!query) return true;

  const fields = [
    role.title,
    role.userCount,
    getPermissionSummary(role.permissionIds, permissions),
  ];

  return fields.some((field) => normalizeSearchValue(field).includes(query));
}

function StateMessage({ state }: { state: RoleFormState }) {
  if (state.error) {
    return (
      <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-900 dark:bg-error-950 dark:text-error-200">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-900 dark:bg-success-950 dark:text-success-200">
        {state.success}
      </p>
    );
  }

  return null;
}

function PermissionChecklist({
  permissions,
  defaultPermissionIds = [],
}: {
  permissions: PermissionOption[];
  defaultPermissionIds?: number[];
}) {
  const selectedPermissions = new Set(defaultPermissionIds);

  if (permissions.length === 0) {
    return (
      <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        هیچ دسترسی‌ای برای انتخاب تعریف نشده است.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {permissions.map((permission) => (
        <label
          key={permission.id}
          className="flex min-h-12 items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <input
            name="permissionIds"
            type="checkbox"
            value={permission.id}
            defaultChecked={selectedPermissions.has(permission.id)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="min-w-0">
            <span className="block font-medium text-gray-900 dark:text-white">
              {permission.title}
            </span>
            <span className="block break-words text-xs text-gray-500 dark:text-gray-400">
              {permission.code}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function RoleFields({
  permissions,
  role,
}: {
  permissions: PermissionOption[];
  role?: ManagedRole;
}) {
  return (
    <div className="grid gap-5">
      <div>
        <label
          htmlFor={role ? `roleTitle-${role.id}` : "newRoleTitle"}
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          عنوان نقش
        </label>
        <input
          id={role ? `roleTitle-${role.id}` : "newRoleTitle"}
          name="title"
          type="text"
          required
          defaultValue={role?.title || ""}
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            دسترسی‌های نقش
          </h2>
        </div>
        <PermissionChecklist
          permissions={permissions}
          defaultPermissionIds={role?.permissionIds}
        />
      </div>
    </div>
  );
}

function FormHeader({
  title,
  pending,
  submitText,
  pendingText,
  onCancel,
}: {
  title: string;
  pending: boolean;
  submitText: string;
  pendingText: string;
  onCancel: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-300 bg-white p-4 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          بازگشت
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? pendingText : submitText}
        </button>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {title}
      </h1>
    </div>
  );
}

function CreateRoleForm({
  permissions,
  onCancel,
}: {
  permissions: PermissionOption[];
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createRoleAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="flex min-h-full w-full flex-col"
    >
      <FormHeader
        title="نقش جدید"
        pending={pending}
        submitText="ثبت نقش"
        pendingText="در حال ثبت..."
        onCancel={onCancel}
      />

      <div className="bg-white p-6 dark:bg-gray-800">
        <div className="w-full max-w-3xl space-y-5">
          <RoleFields permissions={permissions} />
          <StateMessage state={state} />
        </div>
      </div>
    </form>
  );
}

function EditRoleForm({
  permissions,
  role,
  onCancel,
}: {
  permissions: PermissionOption[];
  role: ManagedRole;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateRoleAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="flex min-h-full w-full flex-col"
    >
      <FormHeader
        title="ویرایش نقش"
        pending={pending}
        submitText="ذخیره تغییرات"
        pendingText="در حال ذخیره..."
        onCancel={onCancel}
      />

      <div className="bg-white p-6 dark:bg-gray-800">
        <div className="w-full max-w-3xl space-y-5">
          <input type="hidden" name="id" value={role.id} />
          <RoleFields permissions={permissions} role={role} />
          <StateMessage state={state} />
        </div>
      </div>
    </form>
  );
}

function RolesList({
  roles,
  permissions,
  onCreate,
  onEdit,
  searchQuery = "",
}: {
  roles: ManagedRole[];
  permissions: PermissionOption[];
  onCreate: () => void;
  onEdit: (role: ManagedRole) => void;
  searchQuery?: string;
}) {
  const filteredRoles = roles.filter((role) =>
    roleMatchesSearch(role, permissions, searchQuery)
  );

  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-300 bg-white p-4 dark:bg-gray-900">
        <button
          type="button"
          onClick={onCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
        >
          نقش جدید
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          مدیریت نقش‌ها
        </h1>
      </div>

      {filteredRoles.length > 0 ? (
        <div className="bg-white dark:bg-gray-800">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    عنوان نقش
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    تعداد کاربران
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRoles.map((role) => (
                  <tr
                    key={role.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {role.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {role.userCount}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(role)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
                          title="ویرایش نقش"
                          aria-label="ویرایش نقش"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <form
                          action={deleteRoleAction}
                          onSubmit={(event) => {
                            if (!confirm("این نقش حذف شود؟")) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="id" value={role.id} />
                          <button
                            type="submit"
                            disabled={role.userCount > 0}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-500 dark:hover:text-red-300"
                            title={
                              role.userCount > 0
                                ? "این نقش دارای کاربر است"
                                : "حذف نقش"
                            }
                            aria-label={
                              role.userCount > 0
                                ? "این نقش دارای کاربر است"
                                : "حذف نقش"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center bg-white p-8 text-center dark:bg-gray-800">
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            هیچ نقشی ثبت نشده است.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            ایجاد نقش
          </button>
        </div>
      )}
    </div>
  );
}

export default function RoleManagement({
  roles,
  permissions,
  searchQuery = "",
}: RoleManagementProps) {
  const [mode, setMode] = useState<ViewMode>("list");
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId),
    [selectedRoleId, roles]
  );

  const backToList = () => {
    setMode("list");
    setSelectedRoleId(null);
  };

  if (mode === "create") {
    return <CreateRoleForm permissions={permissions} onCancel={backToList} />;
  }

  if (mode === "edit" && selectedRole) {
    return (
      <EditRoleForm
        permissions={permissions}
        role={selectedRole}
        onCancel={backToList}
      />
    );
  }

  return (
    <RolesList
      roles={roles}
      permissions={permissions}
      searchQuery={searchQuery}
      onCreate={() => {
        setMode("create");
        setSelectedRoleId(null);
      }}
      onEdit={(role) => {
        setSelectedRoleId(role.id);
        setMode("edit");
      }}
    />
  );
}


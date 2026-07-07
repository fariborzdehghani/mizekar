"use client";

import { useActionState, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  createUserAction,
  deleteUserAction,
  updateUserAction,
  type UserFormState,
} from "@/src/actions/settingsActions";

type PermissionOption = {
  id: number;
  code: string;
  title: string;
};

type RoleOption = {
  id: number;
  title: string;
};

type ManagedUser = {
  id: number;
  userId: string;
  firstName: string;
  lastName: string;
  job: string;
  roleId: number | null;
  roleTitle: string;
  permissionIds: number[];
  isCurrentUser: boolean;
};

type UserManagementProps = {
  users: ManagedUser[];
  roles: RoleOption[];
  permissions: PermissionOption[];
  searchQuery?: string;
};

type ViewMode = "list" | "create" | "edit";

const initialState: UserFormState = {};

function getDisplayName(user: ManagedUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "-";
}

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

function userMatchesSearch(
  user: ManagedUser,
  permissions: PermissionOption[],
  searchQuery: string
) {
  const query = normalizeSearchValue(searchQuery.trim());
  if (!query) return true;

  const fields = [
    getDisplayName(user),
    user.firstName,
    user.lastName,
    user.job,
    user.userId,
    user.roleTitle,
    getPermissionSummary(user.permissionIds, permissions),
  ];

  return fields.some((field) => normalizeSearchValue(field).includes(query));
}

function StateMessage({ state }: { state: UserFormState }) {
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

function RoleSelect({
  defaultValue,
  roles,
}: {
  defaultValue?: number | null;
  roles: RoleOption[];
}) {
  return (
    <select
      name="roleId"
      defaultValue={defaultValue ?? ""}
      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
    >
      <option value="">بدون نقش</option>
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.title}
        </option>
      ))}
    </select>
  );
}

function UserFields({
  roles,
  permissions,
  user,
  passwordRequired,
  layout = "two-column",
}: {
  roles: RoleOption[];
  permissions: PermissionOption[];
  user?: ManagedUser;
  passwordRequired: boolean;
  layout?: "single-column" | "two-column";
}) {
  const isSingleColumn = layout === "single-column";

  return (
    <div className={`grid gap-5 ${isSingleColumn ? "" : "md:grid-cols-2"}`}>
      <div>
        <label
          htmlFor={user ? `firstName-${user.id}` : "newFirstName"}
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          نام
        </label>
        <input
          id={user ? `firstName-${user.id}` : "newFirstName"}
          name="firstName"
          type="text"
          defaultValue={user?.firstName || ""}
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor={user ? `lastName-${user.id}` : "newLastName"}
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          نام خانوادگی
        </label>
        <input
          id={user ? `lastName-${user.id}` : "newLastName"}
          name="lastName"
          type="text"
          defaultValue={user?.lastName || ""}
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor={user ? `userId-${user.id}` : "newUserId"}
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          نام کاربری
        </label>
        <input
          id={user ? `userId-${user.id}` : "newUserId"}
          name="userId"
          type="text"
          required
          defaultValue={user?.userId || ""}
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor={user ? `job-${user.id}` : "newJob"}
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          شغل
        </label>
        <input
          id={user ? `job-${user.id}` : "newJob"}
          name="job"
          type="text"
          defaultValue={user?.job || ""}
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor={user ? `roleId-${user.id}` : "newRoleId"}
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          نقش
        </label>
        <RoleSelect defaultValue={user?.roleId} roles={roles} />
      </div>

      <div className={isSingleColumn ? "" : "md:col-span-2"}>
        <label
          htmlFor={user ? `password-${user.id}` : "newPassword"}
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {passwordRequired ? "رمز عبور" : "رمز عبور جدید"}
        </label>
        <input
          id={user ? `password-${user.id}` : "newPassword"}
          name="password"
          type="password"
          required={passwordRequired}
          minLength={8}
          placeholder={passwordRequired ? "" : "برای عدم تغییر خالی بگذارید"}
          autoComplete="new-password"
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div className={isSingleColumn ? "" : "md:col-span-2"}>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            دسترسی‌های اختصاصی کاربر
          </h2>
        </div>
        <PermissionChecklist
          permissions={permissions}
          defaultPermissionIds={user?.permissionIds}
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

function CreateUserForm({
  roles,
  permissions,
  onCancel,
}: {
  roles: RoleOption[];
  permissions: PermissionOption[];
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="flex min-h-full w-full flex-col"
    >
      <FormHeader
        title="کاربر جدید"
        pending={pending}
        submitText="ثبت کاربر"
        pendingText="در حال ثبت..."
        onCancel={onCancel}
      />

      <div className="bg-white p-6 dark:bg-gray-800">
        <div className="w-full max-w-3xl space-y-5">
          <UserFields
            roles={roles}
            permissions={permissions}
            passwordRequired
            layout="single-column"
          />
          <StateMessage state={state} />
        </div>
      </div>
    </form>
  );
}

function EditUserForm({
  roles,
  permissions,
  user,
  onCancel,
}: {
  roles: RoleOption[];
  permissions: PermissionOption[];
  user: ManagedUser;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateUserAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="flex min-h-full w-full flex-col"
    >
      <FormHeader
        title="ویرایش کاربر"
        pending={pending}
        submitText="ذخیره تغییرات"
        pendingText="در حال ذخیره..."
        onCancel={onCancel}
      />

      <div className="bg-white p-6 dark:bg-gray-800">
        <div className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          {[getDisplayName(user), user.job, user.userId]
            .filter(Boolean)
            .join(" - ")}
        </div>
        <div className="space-y-5">
          <input type="hidden" name="id" value={user.id} />
          <UserFields
            roles={roles}
            permissions={permissions}
            user={user}
            passwordRequired={false}
          />
          <StateMessage state={state} />
        </div>
      </div>
    </form>
  );
}

function UsersList({
  users,
  permissions,
  onCreate,
  onEdit,
  searchQuery = "",
}: {
  users: ManagedUser[];
  permissions: PermissionOption[];
  onCreate: () => void;
  onEdit: (user: ManagedUser) => void;
  searchQuery?: string;
}) {
  const filteredUsers = users.filter((user) =>
    userMatchesSearch(user, permissions, searchQuery)
  );

  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-300 bg-white p-4 dark:bg-gray-900">
        <button
          type="button"
          onClick={onCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
        >
          کاربر جدید
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          مدیریت کاربران
        </h1>
      </div>

      {filteredUsers.length > 0 ? (
        <div className="bg-white dark:bg-gray-800">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    نام
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    شغل
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    نام کاربری
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    نقش
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {getDisplayName(user)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {user.job || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {user.userId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {user.roleTitle || "بدون نقش"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(user)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
                          title="ویرایش کاربر"
                          aria-label="ویرایش کاربر"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <form
                          action={deleteUserAction}
                          onSubmit={(event) => {
                            if (!confirm("این کاربر حذف شود؟")) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="id" value={user.id} />
                          <button
                            type="submit"
                            disabled={user.isCurrentUser}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-500 dark:hover:text-red-300"
                            title={
                              user.isCurrentUser
                                ? "کاربر فعلی قابل حذف نیست"
                                : "حذف کاربر"
                            }
                            aria-label={
                              user.isCurrentUser
                                ? "کاربر فعلی قابل حذف نیست"
                                : "حذف کاربر"
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
            هیچ کاربری ثبت نشده است.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            ایجاد کاربر
          </button>
        </div>
      )}
    </div>
  );
}

export default function UserManagement({
  users,
  roles,
  permissions,
  searchQuery = "",
}: UserManagementProps) {
  const [mode, setMode] = useState<ViewMode>("list");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId),
    [selectedUserId, users]
  );

  const backToList = () => {
    setMode("list");
    setSelectedUserId(null);
  };

  if (mode === "create") {
    return (
      <CreateUserForm
        roles={roles}
        permissions={permissions}
        onCancel={backToList}
      />
    );
  }

  if (mode === "edit" && selectedUser) {
    return (
      <EditUserForm
        roles={roles}
        permissions={permissions}
        user={selectedUser}
        onCancel={backToList}
      />
    );
  }

  return (
    <UsersList
      users={users}
      permissions={permissions}
      searchQuery={searchQuery}
      onCreate={() => {
        setMode("create");
        setSelectedUserId(null);
      }}
      onEdit={(user) => {
        setSelectedUserId(user.id);
        setMode("edit");
      }}
    />
  );
}


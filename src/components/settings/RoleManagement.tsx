"use client";

import { useActionState, useMemo, useState } from "react";
import { Pencil, ShieldCheck, Trash2 } from "lucide-react";
import {
  createRoleAction,
  deleteRoleAction,
  updateRoleAction,
  type RoleFormState,
} from "@/src/actions/settingsActions";
import ListPagination, {
  DEFAULT_PAGE_SIZE,
} from "@/src/components/common/ListPagination";
import InboxListToolbar from "@/src/components/common/InboxListToolbar";

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
  currentPage?: number;
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
      <p className="liquid-glass-inset rounded-2xl border border-app-border px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
        هیچ دسترسی‌ای برای انتخاب تعریف نشده است.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {permissions.map((permission) => (
        <label
          key={permission.id}
          className="liquid-glass-inset flex min-h-12 items-start gap-3 rounded-2xl border border-app-border bg-white/55 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          <input
            name="permissionIds"
            type="checkbox"
            value={permission.id}
            defaultChecked={selectedPermissions.has(permission.id)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
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
          className="liquid-glass-control h-11 w-full rounded-2xl border border-app-border bg-white/70 px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white"
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
    <div className="liquid-page-header flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="liquid-glass-control rounded-2xl border border-app-border bg-white/70 px-4 py-2 font-medium text-gray-700 transition hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:text-brand-300"
        >
          بازگشت
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl bg-brand-500 px-4 py-2 font-medium text-white shadow-[0_10px_24px_rgba(98,92,255,0.26)] transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? pendingText : submitText}
        </button>
      </div>
      <div className="text-right">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold text-brand-500">
          <ShieldCheck className="h-4 w-4" /> مدیریت سامانه
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h1>
      </div>
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
      className="liquid-content-frame liquid-glass-page flex min-h-[calc(100vh-92px)] flex-col gap-5 py-4 sm:py-6 lg:py-8"
    >
      <FormHeader
        title="نقش جدید"
        pending={pending}
        submitText="ثبت نقش"
        pendingText="در حال ثبت..."
        onCancel={onCancel}
      />

      <div className="liquid-glass-panel rounded-[28px] border border-app-border bg-app-panel p-6 dark:border-gray-800 dark:bg-gray-900">
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
      className="liquid-content-frame liquid-glass-page flex min-h-[calc(100vh-92px)] flex-col gap-5 py-4 sm:py-6 lg:py-8"
    >
      <FormHeader
        title="ویرایش نقش"
        pending={pending}
        submitText="ذخیره تغییرات"
        pendingText="در حال ذخیره..."
        onCancel={onCancel}
      />

      <div className="liquid-glass-panel rounded-[28px] border border-app-border bg-app-panel p-6 dark:border-gray-800 dark:bg-gray-900">
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
  currentPage = 1,
}: {
  roles: ManagedRole[];
  permissions: PermissionOption[];
  onCreate: () => void;
  onEdit: (role: ManagedRole) => void;
  searchQuery?: string;
  currentPage?: number;
}) {
  const filteredRoles = roles.filter((role) =>
    roleMatchesSearch(role, permissions, searchQuery)
  );
  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / DEFAULT_PAGE_SIZE));
  const activePage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedRoles = filteredRoles.slice(
    (activePage - 1) * DEFAULT_PAGE_SIZE,
    activePage * DEFAULT_PAGE_SIZE,
  );
  const getPageHref = (page: number) => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/settings/roles?${query}` : "/settings/roles";
  };

  return (
    <div className="liquid-content-frame liquid-glass-page flex min-h-[calc(100vh-92px)] flex-col gap-5 py-4 sm:py-6 lg:py-8">
      <div className="liquid-page-header flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between">
        <button
          type="button"
          onClick={onCreate}
          className="rounded-2xl bg-brand-500 px-4 py-2 font-medium text-white shadow-[0_10px_24px_rgba(98,92,255,0.26)] transition hover:bg-brand-600"
        >
          نقش جدید
        </button>
        <div className="text-right">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold text-brand-500">
            <ShieldCheck className="h-4 w-4" /> مدیریت سامانه
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            مدیریت نقش‌ها
          </h1>
          <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            تعریف نقش‌ها و کنترل دسترسی‌های سازمانی
          </p>
        </div>
      </div>

      {filteredRoles.length > 0 ? (
        <div className="liquid-glass-panel overflow-hidden rounded-[28px] border border-app-border bg-app-panel shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <InboxListToolbar searchQuery={searchQuery} searchPlaceholder="جستجو در نقش‌ها..." />
          <div className="w-full overflow-x-auto">
            <table className="inbox-card-table inbox-card-table--roles w-full">
              <thead className="border-b border-app-border bg-app-table-head backdrop-blur dark:border-gray-700 dark:bg-gray-800/90">
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
                {paginatedRoles.map((role) => (
                  <tr
                    key={role.id}
                    className="transition hover:bg-white/70 dark:hover:bg-white/5"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{role.title}</span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            role.userCount > 0
                              ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                              : "bg-gray-500/10 text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {role.userCount > 0 ? "در حال استفاده" : "بدون کاربر"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {role.userCount.toLocaleString("fa-IR")} کاربر
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(role)}
                          className="liquid-glass-control inline-flex h-8 w-8 items-center justify-center rounded-xl border border-app-border text-gray-600 transition hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:text-brand-300"
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
                            className="liquid-glass-control inline-flex h-8 w-8 items-center justify-center rounded-xl border border-app-border text-gray-600 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:text-red-300"
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
          <ListPagination
            currentPage={activePage}
            totalItems={filteredRoles.length}
            hrefForPage={getPageHref}
          />
        </div>
      ) : (
        <div className="liquid-glass-panel flex min-h-72 flex-1 flex-col items-center justify-center rounded-[28px] border border-app-border bg-app-panel p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            هیچ نقشی ثبت نشده است.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="inline-block rounded-2xl bg-brand-500 px-4 py-2 text-white transition hover:bg-brand-600"
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
  currentPage = 1,
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
      currentPage={currentPage}
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


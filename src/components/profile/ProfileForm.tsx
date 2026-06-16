"use client";

import { useActionState, useMemo, useState } from "react";
import { updateProfileAction, type ProfileFormState } from "@/src/actions/profileActions";

type ProfileFormProps = {
  profile: {
    userId: string;
    displayName: string;
    firstName: string;
    lastName: string;
    photo: string | null;
  };
};

const initialState: ProfileFormState = {};

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState
  );
  const [selectedPhotoName, setSelectedPhotoName] = useState("");

  const photoSrc = useMemo(() => {
    if (profile.photo?.startsWith("/")) {
      return profile.photo;
    }

    return "/images/user/owner.jpg";
  }, [profile.photo]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex flex-col gap-5 border-b border-gray-200 pb-6 dark:border-gray-800 sm:flex-row sm:items-center">
        <div className="h-24 w-24 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc}
            alt={profile.displayName}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {profile.displayName}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {profile.userId}
          </p>
          <label className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5">
            انتخاب تصویر
            <input
              name="photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                setSelectedPhotoName(event.target.files?.[0]?.name || "");
              }}
            />
          </label>
          {selectedPhotoName ? (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {selectedPhotoName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            نام
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            defaultValue={profile.firstName}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            نام خانوادگی
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            defaultValue={profile.lastName}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          تغییر رمز عبور
        </h3>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div>
            <label
              htmlFor="currentPassword"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              رمز فعلی
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              رمز جدید
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              تکرار رمز جدید
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-900 dark:bg-error-950 dark:text-error-200">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-900 dark:bg-success-950 dark:text-success-200">
          {state.success}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 min-w-32 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}

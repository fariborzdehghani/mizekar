"use client";

import { useActionState, useMemo, useState } from "react";
import { updateProfileAction, type ProfileFormState } from "@/src/actions/profileActions";
import { Alert, Button, Field, Input } from "@/src/components/ui";
import Image from "next/image";

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
      <div className="liquid-glass-inset flex flex-col gap-5 rounded-3xl p-5 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/70 bg-white/35 shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
          <Image
            src={photoSrc}
            alt={profile.displayName}
            fill
            sizes="96px"
            unoptimized
            className="absolute inset-0 block h-full w-full object-cover object-top"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {profile.displayName}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {profile.userId}
          </p>
          <label className="liquid-glass-control mt-4 inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-sm font-medium text-gray-700 transition hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-300">
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
        <Field label="نام" htmlFor="firstName">
          <Input
            id="firstName"
            name="firstName"
            type="text"
            defaultValue={profile.firstName}
          />
        </Field>

        <Field label="نام خانوادگی" htmlFor="lastName">
          <Input
            id="lastName"
            name="lastName"
            type="text"
            defaultValue={profile.lastName}
          />
        </Field>
      </div>

      <div className="liquid-glass-inset rounded-3xl p-5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          تغییر رمز عبور
        </h3>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Field label="رمز فعلی" htmlFor="currentPassword">
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
            />
          </Field>

          <Field label="رمز جدید" htmlFor="newPassword" hint="حداقل ۸ نویسه">
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
            />
          </Field>

          <Field label="تکرار رمز جدید" htmlFor="confirmPassword">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
            />
          </Field>
        </div>
      </div>

      {state.error ? (
        <Alert tone="error">{state.error}</Alert>
      ) : null}

      {state.success ? (
        <Alert tone="success">{state.success}</Alert>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          loading={pending}
          loadingLabel="در حال ذخیره..."
          className="min-w-32"
        >
          ذخیره تغییرات
        </Button>
      </div>
    </form>
  );
}

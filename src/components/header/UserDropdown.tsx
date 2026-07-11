"use client";

import { logoutAction } from "@/src/actions/authActions";
import { Dropdown } from "@/src/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/src/components/ui/dropdown/DropdownItem";
import type { CurrentUser } from "@/src/lib/auth-types";
import { UserRound } from "lucide-react";
import React, { useMemo, useState } from "react";

export default function UserDropdown({ user }: { user: CurrentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [failedAvatarSrc, setFailedAvatarSrc] = useState<string | null>(null);

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const userImage = useMemo(
    () => (user.photo?.startsWith("/") ? user.photo : null),
    [user.photo]
  );
  const avatarSrc = failedAvatarSrc === userImage ? null : userImage;

  const handleAvatarError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.style.display = "none";
    if (avatarSrc) setFailedAvatarSrc(avatarSrc);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        aria-label="منوی پروفایل"
        aria-expanded={isOpen}
        className="dropdown-toggle flex shrink-0 items-center gap-2 rounded-[16px] border border-black/[0.045] bg-white/55 p-1.5 pl-2.5 text-right text-[var(--liquid-ink)] transition hover:bg-white/80 dark:border-white/[0.07] dark:bg-white/[0.045] dark:hover:bg-white/[0.08]"
      >
        <span className="relative h-[34px] w-[34px] overflow-hidden rounded-xl">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt="User"
              className="h-full w-full object-cover"
              onError={handleAvatarError}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-400 to-cyan-500 text-white shadow-sm">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
        </span>

        <span className="hidden xl:block">
          <span className="block text-[11px] font-bold text-[var(--liquid-ink)]">
            {user.displayName}
          </span>
          <span className="block text-[9px] text-[var(--liquid-muted)]">
            {user.userId}
          </span>
        </span>

        <svg
          className={`hidden stroke-gray-500 transition-transform duration-200 dark:stroke-gray-400 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="mt-[17px] flex w-[260px] flex-col rounded-2xl border border-app-border bg-app-panel p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div>
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {user.displayName}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {user.userId}
          </span>
        </div>

        <ul className="flex flex-col gap-1 border-b border-gray-200 pb-3 pt-4 dark:border-gray-800">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 group text-theme-sm hover:bg-blue-light-50 hover:text-blue-light-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              ویرایش پروفایل
            </DropdownItem>
          </li>
        </ul>

        <form action={logoutAction}>
          <button
            type="submit"
            className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 group text-theme-sm hover:bg-blue-light-50 hover:text-blue-light-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            خروج
          </button>
        </form>
      </Dropdown>
    </div>
  );
}

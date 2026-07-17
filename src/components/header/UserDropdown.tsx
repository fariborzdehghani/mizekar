"use client";

import { logoutAction } from "@/src/actions/authActions";
import { Dropdown } from "@/src/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/src/components/ui/dropdown/DropdownItem";
import type { CurrentUser } from "@/src/lib/auth-types";
import { ChevronLeft, LogOut, UserPen, UserRound } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";

export default function UserDropdown({ user }: { user: CurrentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [failedAvatarSrc, setFailedAvatarSrc] = useState<string | null>(null);
  const dropdownAnchorRef = useRef<HTMLDivElement>(null);

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
    <div ref={dropdownAnchorRef} className="relative flex self-stretch items-center">
      <button
        onClick={toggleDropdown}
        aria-label="منوی پروفایل"
        aria-expanded={isOpen}
        className="dropdown-toggle liquid-glass-keyline flex shrink-0 items-center gap-2 rounded-[16px] border bg-white/55 p-1.5 pl-2.5 text-right text-[var(--liquid-ink)] transition hover:bg-white/80 dark:bg-white/[0.045] dark:hover:bg-white/[0.08]"
      >
        <span className="relative isolate block h-[34px] w-[34px] shrink-0 overflow-hidden rounded-xl">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt={user.displayName}
              className="absolute inset-0 block h-full w-full object-cover object-top"
              onError={handleAvatarError}
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-400 to-cyan-500 text-white shadow-sm">
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
        glassVariant="surface"
        portal
        anchorRef={dropdownAnchorRef}
        className="flex w-[280px] flex-col rounded-[20px] p-2.5"
      >
        <div className="flex items-center gap-3 rounded-[15px] border border-white/70 bg-white/45 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.7)] dark:border-white/10 dark:bg-white/[0.055] dark:shadow-none">
          <span className="relative isolate block h-11 w-11 shrink-0 overflow-hidden rounded-[13px] shadow-sm">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={user.displayName}
                className="absolute inset-0 block h-full w-full object-cover object-top"
                onError={handleAvatarError}
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-400 to-cyan-500 text-white">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-gray-800 dark:text-white">
              {user.displayName}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-gray-500 dark:text-gray-400">
              {user.userId}
            </span>
          </span>
        </div>

        <ul className="mt-2 flex flex-col gap-1.5">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/profile"
              baseClassName=""
              className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2 py-2 text-right text-sm font-semibold text-gray-700 transition hover:border-white/70 hover:bg-white/55 hover:text-brand-600 dark:text-gray-300 dark:hover:border-white/10 dark:hover:bg-white/[0.07] dark:hover:text-brand-300"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-brand-500/10 text-brand-600 transition group-hover:bg-brand-500/15 dark:text-brand-300">
                <UserPen className="h-[17px] w-[17px]" aria-hidden="true" />
              </span>
              <span>ویرایش پروفایل</span>
              <ChevronLeft
                className="ms-auto h-4 w-4 text-gray-400 transition-transform group-hover:-translate-x-0.5 group-hover:text-brand-500"
                aria-hidden="true"
              />
            </DropdownItem>
          </li>
        </ul>

        <form
          action={logoutAction}
          className="mt-2 border-t border-black/[0.06] pt-2 dark:border-white/[0.08]"
        >
          <button
            type="submit"
            className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2 py-2 text-right text-sm font-semibold text-gray-600 transition hover:border-red-500/10 hover:bg-red-500/[0.08] hover:text-red-600 dark:text-gray-300 dark:hover:border-red-400/10 dark:hover:bg-red-400/[0.08] dark:hover:text-red-300"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-red-500/[0.08] text-red-500 transition group-hover:bg-red-500/[0.12]">
              <LogOut className="h-[17px] w-[17px]" aria-hidden="true" />
            </span>
            <span>خروج</span>
          </button>
        </form>
      </Dropdown>
    </div>
  );
}

"use client";

import { logoutAction } from "@/src/actions/authActions";
import { Dropdown } from "@/src/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/src/components/ui/dropdown/DropdownItem";
import type { CurrentUser } from "@/src/lib/auth-types";
import Image from "next/image";
import React, { useState } from "react";

export default function UserDropdown({ user }: { user: CurrentUser }) {
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const userImage = user.photo?.startsWith("/")
    ? user.photo
    : "/images/user/owner.jpg";

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="dropdown-toggle flex items-center rounded-full border border-app-border bg-white/65 py-1 pr-1 pl-3 text-gray-700 shadow-theme-xs transition hover:bg-blue-light-50 hover:text-blue-light-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <span className="relative ml-3 h-11 w-11 overflow-hidden rounded-full">
          <Image
            fill
            sizes="44px"
            src={userImage}
            alt="User"
            className="object-cover"
          />
        </span>

        <span className="block ml-1 font-medium text-theme-sm">
          {user.displayName}
        </span>

        <svg
          className={`stroke-gray-500 transition-transform duration-200 dark:stroke-gray-400 ${
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

"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  CalenderIcon,
  ChevronDownIcon,
  TableIcon,
  MailIcon,
  ChatIcon,
} from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

type OpenSubmenu = {
  type: "main" | "others";
  index: number;
} | null;

const navItems: NavItem[] = [
  {
    icon: <MailIcon />,
    name: "کارتابل",
    subItems: [
      { name: "نامه جدید", path: "/letter" },
      { name: "فرم جدید", path: "/new-form" },
      { name: "فرم های ورودی", path: "/incoming-forms" },
      { name: "فرم های خروجی", path: "/outgoing-forms" },
      { name: "نامه های ورودی", path: "/incoming-letters" },
      { name: "نامه های خروجی", path: "/outgoing-letters" },
      { name: "بایگانی نامه‌ها", path: "/archive" },
    ],
  },
  {
    icon: <ChatIcon />,
    name: "پیام ها",
    subItems: [
      { name: "پیام جدید", path: "/new-message" },
      { name: "پیام های ورودی", path: "/incoming-messages" },
      { name: "پیام های خروجی", path: "/outgoing-messages" },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "جلسات",
    subItems: [
      { name: "ثبت جلسه", path: "/meeting" },
      { name: "لیست جلسات", path: "/meetings" },
    ],
  },
  {
    icon: <TableIcon />,
    name: "تنظیمات",
    subItems: [
      { name: "تعاریف", path: "/settings/general" },
      { name: "مدیریت فرم‌ها", path: "/form-templates" },
      { name: "مدیریت کاربران", path: "/settings/users" },
      { name: "مدیریت نقش‌ها", path: "/settings/roles" },
    ],
  },
];

const othersItems: NavItem[] = [];

function getActiveSubmenu(pathname: string | null): OpenSubmenu {
  for (const menuType of ["main", "others"] as const) {
    const items = menuType === "main" ? navItems : othersItems;
    const index = items.findIndex((nav) =>
      nav.subItems?.some((subItem) => subItem.path === pathname),
    );

    if (index >= 0) {
      return {
        type: menuType,
        index,
      };
    }
  }

  return null;
}

function isHiddenSubItem(path: string) {
  return path === "/incoming-forms" || path === "/outgoing-forms";
}

function getSubItemName(subItem: { name: string; path: string }) {
  if (subItem.path === "/incoming-letters") return "کارتابل ورودی";
  if (subItem.path === "/outgoing-letters") return "کارتابل خروجی";
  if (subItem.path === "/archive") return "بایگانی";
  return subItem.name;
}

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const isSidebarWide = isExpanded || isHovered || isMobileOpen;

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others",
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {isSidebarWide && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {isSidebarWide && (
                <ChevronDownIcon
                  className={`mr-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {isSidebarWide && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && isSidebarWide && (
            <div
              className="overflow-hidden transition-[max-height] duration-300"
              style={{
                maxHeight:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "32rem"
                    : "0",
              }}
            >
              <ul className="mt-2 space-y-1 mr-9">
                {nav.subItems
                  .filter((subItem) => !isHiddenSubItem(subItem.path))
                  .map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        href={subItem.path}
                        onClick={() => setManualOpenSubmenu(undefined)}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        {getSubItemName(subItem)}
                        <span className="flex items-center gap-1 mr-auto">
                          {subItem.new && (
                            <span
                              className={`mr-auto ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                            >
                              جدید
                            </span>
                          )}
                          {subItem.pro && (
                            <span
                              className={`mr-auto ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                            >
                              پرو
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [manualOpenSubmenu, setManualOpenSubmenu] = useState<
    OpenSubmenu | undefined
  >(undefined);
  const isActive = (path: string) => path === pathname;
  const activeSubmenu = getActiveSubmenu(pathname);

  const openSubmenu =
    manualOpenSubmenu === undefined ? activeSubmenu : manualOpenSubmenu;

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setManualOpenSubmenu(() => {
      if (openSubmenu?.type === menuType && openSubmenu.index === index) {
        return null;
      }

      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 right-0 bg-app-sidebar text-white shadow-[0_20px_45px_rgba(0,20,51,0.22)] dark:bg-gray-900 dark:border-gray-800 h-screen z-[999999] border-l border-digital-blue-800 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
              ? "w-[290px]"
              : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-center border-b border-white/10 py-7 dark:border-gray-800">
        <Link href="/" className="inline-flex rounded-lg bg-white px-3 py-2 shadow-theme-xs">
          {isSidebarWide ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
                loading="eager"
                style={{ width: "auto", height: "auto" }}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
                style={{ width: "auto", height: "auto" }}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
              style={{ width: "auto", height: "auto" }}
            />
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto pt-5 duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>{renderMenuItems(navItems, "main")}</div>

            <div className="">{renderMenuItems(othersItems, "others")}</div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;

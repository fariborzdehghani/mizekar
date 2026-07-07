"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { subscribeToAiActivity } from "@/src/lib/aiActivity";
import { Settings, Sparkles } from "lucide-react";
import {
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
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
    icon: <GridIcon />,
    name: "داشبورد",
    path: "/dashboard",
  },
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
    icon: <Settings className="h-5 w-5" />,
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
  const [activeAiTaskCount, setActiveAiTaskCount] = useState(0);

  useEffect(() => {
    return subscribeToAiActivity(({ delta }) => {
      setActiveAiTaskCount((currentCount) =>
        Math.max(0, currentCount + delta),
      );
    });
  }, []);

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
      className={`fixed mt-16 flex h-[calc(100dvh-4rem)] flex-col lg:mt-0 lg:h-dvh top-0 px-5 right-0 bg-app-sidebar text-gray-900 shadow-[0_20px_45px_rgba(16,24,40,0.08)] dark:bg-gray-900 dark:border-gray-800 dark:text-white z-[999999] border-l border-app-border
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
      <div className="flex justify-center border-b border-app-border py-7 dark:border-gray-800">
        <Link
          href="/"
          className={`inline-flex h-14 items-center rounded-lg bg-white dark:ring-0 ${
            isSidebarWide ? "px-3" : "px-0"
          }`}
        >
          {isSidebarWide ? (
            <>
              <Image
                className="h-14 w-auto dark:hidden"
                src="/images/logo/logo.png"
                alt="Logo"
                width={175}
                height={56}
                loading="eager"
              />
              <Image
                className="hidden h-14 w-auto dark:block"
                src="/images/logo/logo-dark.png"
                alt="Logo"
                width={175}
                height={56}
              />
            </>
          ) : (
            <Image
              className="h-14 w-14"
              src="/images/logo/logo-icon.png"
              alt="Logo"
              width={56}
              height={56}
            />
          )}
        </Link>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto pt-5 duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>{renderMenuItems(navItems, "main")}</div>

            <div className="">{renderMenuItems(othersItems, "others")}</div>
          </div>
        </nav>
      </div>

      {activeAiTaskCount > 0 && (
        <div className="mt-auto flex shrink-0 justify-center border-t border-app-border py-4 dark:border-gray-800">
          <div
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-purple-600 bg-purple-600 text-white shadow-theme-xs dark:border-purple-600 dark:bg-purple-600 dark:text-white"
            title="هوش مصنوعی در حال کار است"
            role="status"
            aria-label="هوش مصنوعی در حال کار است"
          >
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;

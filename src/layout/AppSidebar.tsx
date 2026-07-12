"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { subscribeToAiActivity } from "@/src/lib/aiActivity";
import { logoutAction } from "@/src/actions/authActions";
import { Feather, LogOut, Settings, Sparkles, X } from "lucide-react";
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
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } =
    useSidebar();
  const pathname = usePathname();
  const isSidebarWide = isExpanded || isMobileOpen;
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
    <ul className="flex flex-col gap-1.5">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              type="button"
              onClick={() => {
                if (!isSidebarWide) {
                  toggleSidebar();
                  setManualOpenSubmenu({ type: menuType, index });
                  return;
                }
                handleSubmenuToggle(index, menuType);
              }}
              aria-label={nav.name}
              title={isSidebarWide ? undefined : nav.name}
              aria-expanded={
                openSubmenu?.type === menuType && openSubmenu?.index === index
              }
              aria-controls={`sidebar-${menuType}-submenu-${index}`}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                isSidebarWide ? "justify-start" : "sidebar-menu-item-collapsed"
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
                <span className="menu-item-text min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
                  {nav.name}
                </span>
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
                aria-label={nav.name}
                title={isSidebarWide ? undefined : nav.name}
                onClick={() => {
                  if (isMobileOpen) toggleMobileSidebar();
                }}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                } ${
                  isSidebarWide
                    ? "justify-start"
                    : "sidebar-menu-item-collapsed"
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
                  <span className="menu-item-text min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
                    {nav.name}
                  </span>
                )}
              </Link>
            )
          )}
          {nav.subItems && isSidebarWide && (
            <div
              id={`sidebar-${menuType}-submenu-${index}`}
              aria-hidden={
                !(
                  openSubmenu?.type === menuType &&
                  openSubmenu?.index === index
                )
              }
              inert={
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? undefined
                  : true
              }
              className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
              style={{
                maxHeight:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "32rem"
                    : "0",
              }}
            >
              <ul className="sidebar-submenu mt-2 w-full space-y-1">
                {nav.subItems
                  .filter((subItem) => !isHiddenSubItem(subItem.path))
                  .map((subItem) => (
                    <li key={subItem.name} className="w-full">
                      <Link
                        href={subItem.path}
                        onNavigate={() => {
                          setManualOpenSubmenu({ type: menuType, index });
                          if (isMobileOpen) toggleMobileSidebar();
                        }}
                        aria-current={
                          isActive(subItem.path) ? "page" : undefined
                        }
                        className={`sidebar-submenu-item menu-dropdown-item group w-full ${
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

  useEffect(() => {
    setManualOpenSubmenu(undefined);
  }, [pathname]);

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
      id="app-sidebar"
      aria-label="نوار کناری برنامه"
      className={`liquid-glass-sidebar fixed right-0 top-0 z-[999999] flex h-screen w-[280px] flex-col border-l border-app-border bg-app-sidebar px-5 text-gray-900 shadow-[0_20px_45px_rgba(16,24,40,0.08)] transition-[width,transform,padding] duration-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white
        ${isMobileOpen ? "translate-x-0" : "translate-x-full"}
        ${isExpanded ? "lg:w-[280px] lg:px-5" : "lg:w-[88px] lg:px-3"}
        lg:translate-x-0`}
    >
      <div
        className={`mb-5 flex items-center pt-6 ${
          isSidebarWide ? "justify-between px-2" : "justify-center px-0"
        }`}
      >
        <Link
          href="/"
          onClick={() => {
            if (isMobileOpen) toggleMobileSidebar();
          }}
          className={`flex items-center overflow-hidden ${
            isSidebarWide
              ? "gap-3 justify-start"
              : "gap-0 justify-center"
          }`}
        >
          <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[16px] bg-gradient-to-br from-[#7168ff] via-[#625cff] to-[#45b9c9] text-white">
            <span className="absolute inset-px rounded-[15px] border border-white/25" />
            <Feather className="relative h-5 w-5" strokeWidth={2.2} />
          </span>
          <span
            aria-hidden={!isSidebarWide}
            className={`min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-200 motion-reduce:transition-none ${
              isSidebarWide
                ? "max-w-[180px] translate-x-0 opacity-100 delay-150"
                : "pointer-events-none max-w-0 translate-x-2 opacity-0 delay-0"
            }`}
          >
            <span className="block whitespace-nowrap text-xl font-extrabold tracking-tight">میزکار</span>
            <span className="block whitespace-nowrap text-[10px] font-medium text-gray-500 dark:text-gray-400">اتوماسیون هوشمند سازمانی</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="grid h-9 w-9 place-items-center rounded-xl text-gray-500 transition hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white lg:hidden"
          aria-label="بستن منو"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto pt-2 duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-3">
            <div>{renderMenuItems(navItems, "main")}</div>

            <div className="">{renderMenuItems(othersItems, "others")}</div>
          </div>
        </nav>
      </div>

      <div className="mt-auto shrink-0 pb-5">
        <div
          className={`flex items-center border-t border-black/5 px-2 pt-4 dark:border-white/5 ${
            isSidebarWide ? "justify-end" : "justify-center"
          }`}
        >
          <form action={logoutAction}>
            <button
              aria-label="خروج"
              title="خروج"
              className="grid h-9 w-9 place-items-center rounded-xl text-gray-500 transition hover:bg-red-500/10 hover:text-red-500 dark:text-gray-400"
              type="submit"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {activeAiTaskCount > 0 && (
        <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 shrink-0 justify-center">
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

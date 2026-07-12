"use client";

import {
  getHeaderNotifications,
  markHeaderNotificationClicked,
  markHeaderReadReceiptNotificationsSeen,
  type HeaderNotificationItem,
} from "@/src/actions/notificationActions";
import { Dropdown } from "@/src/components/ui/dropdown/Dropdown";
import {
  Bell,
  CalendarCheck,
  FileText,
  MailCheck,
  MessageSquareText,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getNotificationIcon(type: HeaderNotificationItem["type"]) {
  if (type === "letter") {
    return {
      icon: <FileText className="h-5 w-5" />,
      className:
        "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    };
  }

  if (type === "message") {
    return {
      icon: <MessageSquareText className="h-5 w-5" />,
      className:
        "bg-blue-light-50 text-blue-light-700 dark:bg-blue-500/15 dark:text-blue-300",
    };
  }

  if (type === "form") {
    return {
      icon: <ScrollText className="h-5 w-5" />,
      className:
        "bg-blue-light-50 text-blue-light-700 dark:bg-blue-500/15 dark:text-blue-300",
    };
  }

  if (type === "meeting") {
    return {
      icon: <CalendarCheck className="h-5 w-5" />,
      className:
        "bg-blue-light-50 text-blue-light-700 dark:bg-blue-500/15 dark:text-blue-300",
    };
  }

  return {
    icon: <MailCheck className="h-5 w-5" />,
    className:
      "bg-blue-light-50 text-blue-light-700 dark:bg-blue-500/15 dark:text-blue-300",
  };
}

function getNotificationLabel(type: HeaderNotificationItem["type"]) {
  if (type === "form") return "فرم";
  if (type === "letter") return "نامه";
  if (type === "meeting") return "جلسه";
  if (type === "message") return "پیام";
  return "مشاهده پیام";
}

export default function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotificationItem[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getHeaderNotifications();
      if (!result.success) {
        setError(result.error || "خطا در دریافت اعلان‌ها");
        setNotifications([]);
        setUnreadCount(0);
        return [];
      }

      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);

      return result.notifications;
    } catch (loadError) {
      console.error("Notification load error:", loadError);
      setError("خطا در دریافت اعلان‌ها");
      setNotifications([]);
      setUnreadCount(0);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function toggleDropdown() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (!nextOpen) return;

    const currentNotifications = await loadNotifications();
    const readReceiptIds = currentNotifications
      .filter((notification) => notification.type === "message-read")
      .map((notification) => notification.sourceId);

    if (readReceiptIds.length > 0) {
      await markHeaderReadReceiptNotificationsSeen(readReceiptIds);
      setUnreadCount(
        currentNotifications.filter(
          (notification) => notification.type !== "message-read"
        ).length
      );
    }
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  async function handleNotificationClick(notification: HeaderNotificationItem) {
    setNotifications((currentNotifications) =>
      currentNotifications.filter((item) => item.id !== notification.id)
    );
    if (notification.type !== "message-read") {
      setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
    }
    setIsOpen(false);

    const result = await markHeaderNotificationClicked({
      type: notification.type,
      sourceId: notification.sourceId,
    });
    if (!result.success) {
      await loadNotifications();
    }

    router.push(notification.href);
    router.refresh();
  }

  return (
    <div className="relative hidden sm:block">
      <button
        className="dropdown-toggle liquid-glass-keyline relative grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border bg-white/50 text-[var(--liquid-muted)] transition hover:text-brand-600 dark:bg-white/[0.045] dark:hover:text-brand-300"
        onClick={toggleDropdown}
        aria-label="اعلان‌ها"
        aria-expanded={isOpen}
        type="button"
      >
        {unreadCount > 0 && (
          <span className="absolute -left-1 -top-1 z-10 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-light-600 px-1.5 text-[10px] font-semibold leading-5 text-white">
            {unreadCount > 9 ? "+9" : unreadCount}
          </span>
        )}
        <Bell className="h-[18px] w-[18px]" />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="mt-[17px] flex h-[430px] w-[350px] flex-col rounded-lg border border-app-border bg-app-panel p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[380px]"
      >
        <div className="mb-3 flex items-center justify-between border-b border-app-border pb-3 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            اعلان‌ها
          </h5>
          <button
            onClick={toggleDropdown}
            className="dropdown-toggle rounded-md px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
            type="button"
          >
            بستن
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              در حال دریافت اعلان‌ها...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/20 dark:text-gray-200">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
              اعلان جدیدی ندارید
            </div>
          ) : (
            <ul className="flex flex-col">
              {notifications.map((notification) => {
                const icon = getNotificationIcon(notification.type);

                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(notification)}
                      className="flex w-full gap-3 rounded-lg border-b border-app-border px-4 py-3 text-right hover:bg-blue-light-50 dark:border-gray-800 dark:hover:bg-white/5"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${icon.className}`}
                      >
                        {icon.icon}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{getNotificationLabel(notification.type)}</span>
                          <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                          <span>{formatDate(notification.createdAt)}</span>
                        </span>
                        <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </span>
                        <span className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          {notification.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/incoming-letters"
            onClick={closeDropdown}
            className="rounded-lg border border-app-border bg-white/80 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-blue-light-50 hover:text-blue-light-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            نامه‌های ورودی
          </Link>
          <Link
            href="/incoming-messages"
            onClick={closeDropdown}
            className="rounded-lg border border-app-border bg-white/80 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-blue-light-50 hover:text-blue-light-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            پیام‌های ورودی
          </Link>
        </div>
      </Dropdown>
    </div>
  );
}

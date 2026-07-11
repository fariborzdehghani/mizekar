"use client";

import { markLetterUnread } from "@/src/actions/notificationActions";
import type { ArchiveFolderNode, ArchiveItemType } from "@/src/actions/archiveActions";
import { Archive, Eye, MailOpen, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useArchiveSelection } from "./ArchiveSelectionProvider";

interface InboxListCardProps {
  href: string | null;
  className?: string;
  children: ReactNode;
  markUnreadReferralId?: number;
  archiveItemId?: number;
  archiveItemType?: ArchiveItemType;
  archiveFolders?: ArchiveFolderNode[];
}

export default function InboxListCard({
  href,
  className,
  children,
  markUnreadReferralId,
  archiveItemId,
  archiveItemType = "letter",
  archiveFolders = [],
}: InboxListCardProps) {
  const router = useRouter();
  const archiveSelection = useArchiveSelection();
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const itemLabel = archiveItemType === "meeting" ? "جلسه" : archiveItemType === "form" ? "فرم" : "نامه";

  useEffect(() => {
    if (!menuPosition) return;
    const closeMenu = () => setMenuPosition(null);
    const handleKeyDown = (event: KeyboardEvent) => event.key === "Escape" && closeMenu();
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuPosition]);

  const isInteractiveTarget = (target: EventTarget) =>
    target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, [role='button']"));

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (href && !isInteractiveTarget(event.target)) router.push(href);
  };

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if ((!href && !markUnreadReferralId && !archiveItemId) || isInteractiveTarget(event.target)) return;
    event.preventDefault();
    setMenuError(null);
    setMenuPosition({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 220)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 210)),
    });
  };

  const archiveItem = () => {
    if (!archiveItemId || !archiveSelection || archiveFolders.length === 0 || archiveSelection.isArchiving) return;
    archiveSelection.startArchiveSelection({ itemType: archiveItemType, itemId: archiveItemId });
    setMenuPosition(null);
  };

  const markUnread = () => {
    if (!markUnreadReferralId || isPending) return;
    startTransition(async () => {
      const result = await markLetterUnread(markUnreadReferralId);
      if (!result.success) {
        setMenuError(result.error || "خطا در ثبت نامه به عنوان خوانده نشده");
        return;
      }
      setMenuPosition(null);
      router.refresh();
    });
  };

  return (
    <>
      <div
        className={["group relative select-none", href ? "cursor-pointer" : "", className].filter(Boolean).join(" ")}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title={href ? `برای مشاهده ${itemLabel} کلیک کنید` : undefined}
      >
        {children}
      </div>
      {menuPosition && (
        <div
          className="liquid-glass-surface fixed z-[1000001] min-w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1 text-right shadow-lg dark:border-gray-700 dark:bg-gray-900"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          dir="rtl"
          onClick={(event) => event.stopPropagation()}
        >
          {href && <button type="button" onClick={() => router.push(href)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><Eye className="h-4 w-4 text-brand-500" />مشاهده {itemLabel}</button>}
          {archiveItemId && <button type="button" onClick={archiveItem} disabled={!archiveSelection || archiveFolders.length === 0 || archiveSelection.isArchiving} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:text-gray-200 dark:hover:bg-gray-800"><Archive className="h-4 w-4 text-brand-500" />بایگانی {itemLabel}</button>}
          {markUnreadReferralId && <button type="button" onClick={markUnread} disabled={isPending} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:text-gray-200 dark:hover:bg-gray-800"><MailOpen className="h-4 w-4 text-brand-500" />{isPending ? "در حال ثبت..." : "علامت‌گذاری به‌عنوان خوانده‌نشده"}</button>}
          {menuError && <div className="border-t border-gray-100 px-3 py-2 text-xs text-red-600 dark:border-gray-800 dark:text-red-300">{menuError}</div>}
          <button type="button" onClick={() => setMenuPosition(null)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"><X className="h-4 w-4" />بستن</button>
        </div>
      )}
    </>
  );
}

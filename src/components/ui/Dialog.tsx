"use client";

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/src/lib/cn";
import { IconButton } from "./Button";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const subscribeToClient = () => () => undefined;

export function Dialog({
  isOpen,
  onClose,
  title,
  closeLabel = "بستن",
  children,
  footer,
  className,
  contentClassName,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  closeLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const isMounted = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable || panelRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !isMounted) return null;

  return createPortal(
    <div
      className="liquid-modal-backdrop fixed inset-0 z-[1000001] flex items-center justify-center p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "liquid-modal liquid-modal-dialog flex max-h-[min(82vh,720px)] w-full max-w-3xl flex-col overflow-hidden",
          className,
        )}
      >
        <div className="liquid-modal-header flex shrink-0 items-center justify-between px-5 py-4 sm:px-6">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <IconButton type="button" variant="ghost" onClick={onClose} aria-label={closeLabel}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto p-5 sm:p-6", contentClassName)}>
          {children}
        </div>

        {footer && (
          <div className="liquid-modal-footer flex shrink-0 justify-end gap-3 px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

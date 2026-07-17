"use client";
import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  glassVariant?: "panel" | "surface";
  portal?: boolean;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  glassVariant = "panel",
  portal = false,
  anchorRef,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [portalPosition, setPortalPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(".dropdown-toggle")
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    if (!isOpen || !portal || !anchorRef?.current) {
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const dropdown = dropdownRef.current;
      if (!anchor || !dropdown) return;

      const anchorRect = anchor.getBoundingClientRect();
      const popupWidth = dropdown.offsetWidth;
      const popupHeight = dropdown.offsetHeight;
      const viewportPadding = 8;
      const gap = 8;
      const maxLeft = Math.max(
        viewportPadding,
        window.innerWidth - popupWidth - viewportPadding,
      );
      const left = Math.min(Math.max(viewportPadding, anchorRect.left), maxLeft);
      const spaceBelow = window.innerHeight - anchorRect.bottom - gap;
      const top =
        spaceBelow >= popupHeight
          ? anchorRect.bottom + gap
          : Math.max(viewportPadding, anchorRect.top - popupHeight - gap);

      setPortalPosition({ left, top });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, isOpen, portal]);

  if (!isOpen) return null;

  const glassClassName =
    glassVariant === "surface" ? "liquid-glass-surface" : "liquid-glass-panel";
  const appearanceClassName =
    glassVariant === "surface"
      ? "border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
      : "border-app-border bg-app-panel shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark";
  const isPortaled = portal;
  const positionClassName = isPortaled
    ? "fixed z-[1000001]"
    : "absolute left-0 z-40 mt-2";

  const dropdown = (
    <div
      ref={dropdownRef}
      className={`${glassClassName} ${isPortaled ? "liquid-glass-popup" : ""} liquid-glass-dropdown ${positionClassName} rounded-2xl border ${appearanceClassName} ${className}`}
      style={
        isPortaled
          ? {
              left: portalPosition?.left ?? 0,
              top: portalPosition?.top ?? 0,
              visibility: portalPosition ? "visible" : "hidden",
            }
          : undefined
      }
    >
      {children}
    </div>
  );

  return isPortaled ? createPortal(dropdown, document.body) : dropdown;
};

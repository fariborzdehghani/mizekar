"use client";

import { Moon, Sun } from "lucide-react";
import { IconButton, type ButtonSize } from "@/src/components/ui";
import { useTheme } from "@/src/context/ThemeContext";

export function ThemeToggleButton({
  size = "md",
  className,
}: {
  size?: ButtonSize;
  className?: string;
}) {
  const { toggleTheme } = useTheme();

  return (
    <IconButton
      type="button"
      onClick={toggleTheme}
      aria-label="تغییر حالت نمایش"
      title="تغییر حالت نمایش"
      variant="secondary"
      size={size}
      className={className}
    >
      <Sun className="hidden h-5 w-5 dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
    </IconButton>
  );
}

import type { ElementType, ReactNode } from "react";
import { cn } from "@/src/lib/cn";

export type SurfaceVariant = "panel" | "card" | "inset" | "table";

export function Surface({
  as: Component = "section",
  variant = "panel",
  padded = true,
  className,
  children,
}: {
  as?: ElementType;
  variant?: SurfaceVariant;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Component
      className={cn(
        variant === "inset" ? "liquid-glass-inset" : "liquid-glass-panel",
        `ui-surface-${variant}`,
        padded && "ui-surface-padded",
        className,
      )}
    >
      {children}
    </Component>
  );
}

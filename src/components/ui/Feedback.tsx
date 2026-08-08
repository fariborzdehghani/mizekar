import type { ReactNode } from "react";
import { cn } from "@/src/lib/cn";

export type AlertTone = "info" | "success" | "warning" | "error";

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("ui-alert", `ui-alert-${tone}`, className)}
      role={tone === "error" ? "alert" : "status"}
    >
      {title && <p className="ui-alert-title">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("liquid-glass-panel ui-empty-state", className)}>
      {icon && <div className="ui-empty-state-icon">{icon}</div>}
      <h2 className="ui-empty-state-title">{title}</h2>
      {description && <p className="ui-empty-state-description">{description}</p>}
      {action && <div className="ui-empty-state-action">{action}</div>}
    </div>
  );
}

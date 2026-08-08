import type { ElementType, ReactNode } from "react";
import { cn } from "@/src/lib/cn";

export function PageFrame({
  as: Component = "main",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Component className={cn("liquid-content-frame liquid-glass-page ui-page-frame", className)}>
      {children}
    </Component>
  );
}

export function PageHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <header className={cn("liquid-page-header ui-page-header", className)}>{children}</header>;
}

export function PageTitle({
  eyebrow,
  title,
  description,
  icon,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ui-page-title-block", className)}>
      {eyebrow && (
        <p className="ui-page-eyebrow">
          {icon}
          {eyebrow}
        </p>
      )}
      <h1 className="ui-page-title">{title}</h1>
      {description && <p className="ui-page-description">{description}</p>}
    </div>
  );
}

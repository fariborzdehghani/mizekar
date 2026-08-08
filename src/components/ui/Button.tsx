import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/src/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success";

export type ButtonSize = "sm" | "md" | "lg";

export function buttonStyles({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
} = {}) {
  return cn(
    "ui-button",
    `ui-button-${variant}`,
    `ui-button-${size}`,
    block && "ui-button-block",
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  loadingLabel = "در حال پردازش",
  leadingIcon,
  trailingIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="ui-spinner" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          {leadingIcon}
          {children}
          {trailingIcon}
        </>
      )}
    </button>
  );
}

export interface IconButtonProps
  extends Omit<ButtonProps, "block" | "children" | "leadingIcon" | "trailingIcon"> {
  "aria-label": string;
  children: ReactNode;
}

export function IconButton({
  size = "md",
  variant = "ghost",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Button
      size={size}
      variant={variant}
      className={cn("ui-icon-button", className)}
      {...props}
    >
      <span aria-hidden="true">{children}</span>
    </Button>
  );
}

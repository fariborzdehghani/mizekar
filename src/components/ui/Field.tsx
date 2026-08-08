import type {
  ComponentProps,
  ReactElement,
  ReactNode,
} from "react";
import { cloneElement, isValidElement } from "react";
import { cn } from "@/src/lib/cn";

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactElement<ComponentProps<"input"> | ComponentProps<"textarea"> | ComponentProps<"select">>;
}) {
  const messageId = `${htmlFor}-${error ? "error" : "hint"}`;
  const hasMessage = Boolean(error || hint);
  const control = isValidElement(children)
    ? cloneElement(children, {
        "aria-describedby": hasMessage ? messageId : children.props["aria-describedby"],
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })
    : children;

  return (
    <div className={cn("ui-field", className)}>
      <label className="ui-field-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="ui-field-required" aria-hidden="true">*</span>}
      </label>
      {control}
      {hasMessage && (
        <p
          id={messageId}
          className={cn("ui-field-message", Boolean(error) && "ui-field-message-error")}
          role={error ? "alert" : undefined}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("liquid-glass-control ui-control", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn("liquid-glass-control ui-control ui-textarea", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <select className={cn("liquid-glass-control ui-control ui-select", className)} {...props}>
      {children}
    </select>
  );
}

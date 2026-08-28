import React from "react";

export type CcSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  wrapperClassName?: string;
};

export function CcSelect({
  children,
  className,
  invalid = false,
  wrapperClassName,
  ...props
}: CcSelectProps) {
  return (
    <span className={["cc-select-shell relative block w-full min-w-0", wrapperClassName].filter(Boolean).join(" ")}>
      <select
        aria-invalid={invalid || undefined}
        className={["select select-bordered w-full appearance-none pr-10", invalid ? "select-error" : "", className].filter(Boolean).join(" ")}
        {...props}
      >
        {children}
      </select>
      <i className="ph-bold ph-caret-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-company-muted" aria-hidden="true"></i>
    </span>
  );
}

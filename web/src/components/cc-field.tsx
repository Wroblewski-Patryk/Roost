import React, { useId } from "react";

export function CcField({
  label,
  hint,
  error,
  required = false,
  children
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (field: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="form-control">
      <label className="label" htmlFor={id}>
        <span className="label-text font-bold">
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </span>
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint ? <p className="mt-1 text-xs text-company-muted" id={hintId}>{hint}</p> : null}
      {error ? <p className="mt-1 text-sm font-semibold text-error" id={errorId}>{error}</p> : null}
    </div>
  );
}

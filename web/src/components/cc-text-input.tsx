import React from "react";

export type CcTextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function CcTextInput({ className, invalid = false, ...props }: CcTextInputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={["input input-bordered", invalid ? "input-error" : "", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

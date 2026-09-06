import React from "react";

type CcButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "ghost"
  | "outline"
  | "neutral"
  | "success"
  | "warning"
  | "danger";

type CcButtonSize = "xs" | "sm" | "md" | "lg";

type CcButtonCommonProps = {
  children: React.ReactNode;
  variant?: CcButtonVariant;
  size?: CcButtonSize;
  iconLeft?: string;
  iconRight?: string;
  loading?: boolean;
  disabledReason?: string;
  className?: string;
  ariaLabel?: string;
};

type CcButtonAnchorProps = CcButtonCommonProps
  & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "aria-label">
  & {
    href: string;
  };

type CcButtonButtonProps = CcButtonCommonProps
  & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "aria-label">
  & {
    href?: undefined;
  };

export type CcButtonProps = CcButtonAnchorProps | CcButtonButtonProps;

const variantClass: Record<CcButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  accent: "btn-accent",
  ghost: "btn-ghost",
  outline: "btn-outline",
  neutral: "btn-neutral",
  success: "btn-success",
  warning: "btn-warning",
  danger: "btn-error"
};

const sizeClass: Record<CcButtonSize, string> = {
  xs: "btn-xs",
  sm: "btn-sm",
  md: "",
  lg: "btn-lg"
};

function iconClass(icon: string) {
  return `ph-bold ${icon}`;
}

export function CcButton(props: CcButtonProps) {
  const {
    children,
    variant = "neutral",
    size = "md",
    iconLeft,
    iconRight,
    loading = false,
    disabledReason,
    className,
    ariaLabel
  } = props;
  const disabled = "disabled" in props && Boolean(props.disabled);
  const isDisabled = disabled || Boolean(disabledReason) || loading;
  const buttonClass = [
    "btn",
    variantClass[variant],
    sizeClass[size],
    className
  ].filter(Boolean).join(" ");
  const title = disabledReason || props.title;
  const content = (
    <>
      {loading ? <span className="loading loading-spinner loading-xs" aria-hidden="true"></span> : null}
      {!loading && iconLeft ? <i className={iconClass(iconLeft)} aria-hidden="true"></i> : null}
      <span>{children}</span>
      {!loading && iconRight ? <i className={iconClass(iconRight)} aria-hidden="true"></i> : null}
    </>
  );

  if ("href" in props && props.href) {
    const { href, target, rel, onClick } = props;
    return (
      <a
        aria-disabled={isDisabled || undefined}
        aria-label={ariaLabel}
        className={buttonClass}
        href={isDisabled ? undefined : href}
        onClick={isDisabled ? undefined : onClick}
        rel={rel}
        role={isDisabled ? "link" : undefined}
        target={target}
        title={title}
      >
        {content}
      </a>
    );
  }

  const { type = "button", onClick, name, value } = props as CcButtonButtonProps;
  return (
    <button
      aria-label={ariaLabel}
      className={buttonClass}
      disabled={isDisabled}
      name={name}
      value={value}
      onClick={onClick}
      title={title}
      type={type}
    >
      {content}
    </button>
  );
}

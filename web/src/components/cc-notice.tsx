import React from "react";

type CcNoticeTone = "info" | "success" | "warning" | "error" | "loading";

const toneClasses: Record<CcNoticeTone, string> = {
  info: "border-info/30 bg-info/10",
  success: "border-success/30 bg-success/10",
  warning: "border-warning/35 bg-warning/10",
  error: "border-error/35 bg-error/10",
  loading: "border-base-300 bg-base-200/55"
};

const toneIcons: Record<CcNoticeTone, string> = {
  info: "ph-info",
  success: "ph-check-circle",
  warning: "ph-warning",
  error: "ph-warning-diamond",
  loading: "ph-circle-notch"
};

export function CcNotice({
  tone = "info",
  title,
  detail,
  children,
  live = false,
  action
}: {
  tone?: CcNoticeTone;
  title: string;
  detail?: string;
  children?: React.ReactNode;
  live?: boolean;
  action?: React.ReactNode;
}) {
  const role = tone === "error" ? "alert" : "status";

  return (
    <div
      aria-live={live ? (tone === "error" ? "assertive" : "polite") : undefined}
      className={`grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-company border p-4 ${toneClasses[tone]}`}
      role={role}
    >
      <i className={`ph-bold ${toneIcons[tone]} mt-0.5 text-xl ${tone === "loading" ? "animate-spin" : ""}`} aria-hidden="true"></i>
      <div className="min-w-0">
        <strong className="block">{title}</strong>
        {detail ? <p className="text-sm leading-6">{detail}</p> : null}
        {children}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

export function CcCompactList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cc-compact-list ${className}`.trim()} role="list">{children}</div>;
}

export function CcCompactListItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cc-compact-list-item ${className}`.trim()} role="listitem">{children}</div>;
}

export function CcListStatus({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "active" | "attention" }) {
  return <span className={`cc-list-status cc-list-status-${tone}`}>{children}</span>;
}

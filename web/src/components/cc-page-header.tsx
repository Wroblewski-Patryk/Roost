import type { ReactNode } from "react";

type CcPageHeaderProps = {
  actions?: ReactNode;
  description: ReactNode;
  eyebrow: ReactNode;
  title: ReactNode;
};

export function CcPageHeader({ actions, description, eyebrow, title }: CcPageHeaderProps) {
  return (
    <header className="grid min-w-0 gap-3 border-b border-base-300 pb-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-primary">{eyebrow}</p>
        <h1 className="mt-1 text-xl font-black text-company-ink">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-company-muted">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
    </header>
  );
}

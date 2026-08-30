import React, { FormEventHandler, ReactNode, useEffect, useRef } from "react";

type CcRecordEditorModalProps = {
  titleId: string;
  eyebrow: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  children: ReactNode;
  actions: ReactNode;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  maxWidthClassName?: string;
};

export function CcRecordEditorModal({
  titleId,
  eyebrow,
  title,
  description,
  meta,
  children,
  actions,
  onClose,
  onSubmit,
  maxWidthClassName = "max-w-4xl"
}: CcRecordEditorModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function focusableElements() {
      if (!dialogRef.current) return [];
      return Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
    }

    const focusFrame = window.requestAnimationFrame(() => {
      const firstField = dialogRef.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      (firstField || focusableElements()[0])?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = focusableElements();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return (
    <div
      aria-describedby={description ? `${titleId}-description` : undefined}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-neutral/60 p-3 sm:p-4"
      role="dialog"
      ref={dialogRef}
    >
      <form
        className={`roost-record-editor roost-work-surface grid max-h-[92vh] w-full ${maxWidthClassName} grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-company shadow-2xl`}
        onSubmit={onSubmit}
      >
        <header className="flex items-start justify-between gap-4 border-b border-base-300 bg-base-100/45 p-4 sm:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-xs font-black uppercase tracking-wide text-primary">{eyebrow}</p>
              {meta ? (
                <div className="flex items-center gap-2 text-xs font-bold text-company-muted">
                  <span className="h-3 w-px bg-base-300" aria-hidden="true"></span>
                  {meta}
                </div>
              ) : null}
            </div>
            <h2 className="mt-1 text-2xl font-black text-company-ink" id={titleId}>{title}</h2>
            {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-company-muted" id={`${titleId}-description`}>{description}</p> : null}
          </div>
          <button className="btn btn-ghost btn-circle h-11 min-h-11 w-11 min-w-11 shrink-0" aria-label="Close editor" onClick={onClose} type="button">
            <i className="ph-bold ph-x" aria-hidden="true"></i>
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="grid gap-4">{children}</div>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-base-300 bg-base-100/35 p-4 sm:px-5">
          {actions}
        </footer>
      </form>
    </div>
  );
}

export function CcRecordEditorSection({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="roost-work-panel rounded-company p-4">
      <div>
        <h3 className="font-black text-company-ink">{title}</h3>
        {description ? <p className="mt-1 text-sm leading-6 text-company-muted">{description}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

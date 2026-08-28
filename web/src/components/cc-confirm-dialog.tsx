import React, { ReactNode } from "react";
import { CcButton } from "./cc-button";

export function CcConfirmDialog({
  eyebrow,
  title,
  description,
  detail,
  confirmLabel,
  confirmIcon,
  confirmTone = "warning",
  busy = false,
  onCancel,
  onConfirm
}: {
  eyebrow: string;
  title: string;
  description: string;
  detail?: ReactNode;
  confirmLabel: string;
  confirmIcon?: string;
  confirmTone?: "warning" | "danger";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <dialog className="modal modal-open" open>
      <div className="modal-box max-w-xl border border-base-300 bg-base-100">
        <button aria-label="Close" className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3" onClick={onCancel} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button>
        <p className={`text-xs font-black uppercase tracking-wide ${confirmTone === "danger" ? "text-error" : "text-warning"}`}>{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black text-company-ink">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-company-muted">{description}</p>
        {detail ? <div className="mt-4 rounded-company border border-base-300 bg-base-200/50 p-3 text-sm">{detail}</div> : null}
        <div className="modal-action">
          <CcButton onClick={onCancel} variant="ghost">Cancel</CcButton>
          <CcButton iconLeft={confirmIcon} loading={busy} onClick={onConfirm} variant={confirmTone}>{confirmLabel}</CcButton>
        </div>
      </div>
      <form className="modal-backdrop" method="dialog"><button onClick={onCancel}>close</button></form>
    </dialog>
  );
}

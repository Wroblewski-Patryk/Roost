import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type CcToastTone = "info" | "success" | "warning" | "error";

const toneIcons: Record<CcToastTone, string> = {
  info: "ph-info",
  success: "ph-check-circle",
  warning: "ph-warning",
  error: "ph-warning-diamond"
};

export function CcToast({
  tone = "info",
  title,
  detail,
  dismissLabel,
  onDismiss,
  duration
}: {
  tone?: CcToastTone;
  title: string;
  detail?: string;
  dismissLabel: string;
  onDismiss: () => void;
  duration?: number;
}) {
  const [paused, setPaused] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const timeout = duration ?? (tone === "error" ? 8000 : 5000);

  useEffect(() => {
    if (paused || timeout <= 0) return;
    const timer = window.setTimeout(() => onDismissRef.current(), timeout);
    return () => window.clearTimeout(timer);
  }, [paused, timeout, title, detail, tone]);

  if (typeof document === "undefined") return null;
  const portalHost = document.querySelector<HTMLElement>(".roost-liquid-shell, [data-theme]") || document.body;
  const role = tone === "error" ? "alert" : "status";

  return createPortal(
    <div aria-atomic="true" className="cc-toast-viewport">
      <div
        className={`cc-toast cc-toast-${tone}`}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
        }}
        onFocus={() => setPaused(true)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        role={role}
      >
        <span className="cc-toast-icon"><i className={`ph-bold ${toneIcons[tone]}`} aria-hidden="true"></i></span>
        <div className="cc-toast-copy">
          <strong>{title}</strong>
          {detail ? <p>{detail}</p> : null}
        </div>
        <button aria-label={dismissLabel} className="cc-toast-dismiss" onClick={onDismiss} type="button">
          <i className="ph-bold ph-x" aria-hidden="true"></i>
        </button>
      </div>
    </div>,
    portalHost
  );
}

import { CSSProperties, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CcButton } from "./cc-button";

export type CcMultiSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type FloatingPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function CcMultiSelect({
  id,
  name,
  options,
  value,
  onChange,
  placeholder = "Select values",
  searchPlaceholder = "Search available values...",
  emptyLabel = "No matching values"
}: {
  id?: string;
  name: string;
  options: CcMultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const panelId = useId();
  const selected = useMemo(() => options.filter((option) => value.includes(option.value)), [options, value]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => `${option.label} ${option.value} ${option.description || ""}`.toLowerCase().includes(normalized));
  }, [options, query]);

  function toggle(option: CcMultiSelectOption) {
    if (option.disabled) return;
    onChange(value.includes(option.value) ? value.filter((item) => item !== option.value) : [...value, option.value]);
  }

  function close() {
    setOpen(false);
    setQuery("");
    setPosition(null);
  }

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 12;
      const gap = 8;
      const availableBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
      const availableAbove = rect.top - gap - viewportPadding;
      const openAbove = availableBelow < 260 && availableAbove > availableBelow;
      const availableHeight = openAbove ? availableAbove : availableBelow;
      const width = Math.min(rect.width, window.innerWidth - (viewportPadding * 2));
      const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - viewportPadding - width);
      const next: FloatingPosition = {
        left,
        width,
        maxHeight: Math.max(180, Math.min(360, availableHeight))
      };
      if (openAbove) next.bottom = window.innerHeight - rect.top + gap;
      else next.top = rect.bottom + gap;
      setPosition(next);
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      close();
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && position) searchRef.current?.focus();
  }, [open, position]);

  const panelStyle = position ? ({
    top: position.top,
    bottom: position.bottom,
    left: position.left,
    width: position.width,
    maxHeight: position.maxHeight
  } satisfies CSSProperties) : undefined;

  const panel = open && position ? (
    <div
      className="cc-multi-select-popover roost-work-panel fixed z-[110] flex flex-col gap-2 rounded-company p-2 shadow-2xl"
      id={panelId}
      ref={panelRef}
      style={panelStyle}
    >
      <label className="input input-bordered input-sm flex w-full min-w-0 items-center gap-2 bg-base-100/75">
        <i className="ph-bold ph-magnifying-glass shrink-0 text-company-muted" aria-hidden="true"></i>
        <input
          aria-label={searchPlaceholder}
          className="w-full min-w-0 flex-1 bg-transparent outline-none"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          ref={searchRef}
          type="search"
          value={query}
        />
      </label>
      <div aria-multiselectable="true" className="min-h-0 flex-1 overflow-y-auto" role="listbox">
        {filtered.length ? filtered.map((option) => {
          const checked = value.includes(option.value);
          return (
            <label className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 hover:bg-base-200/70 ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`} key={option.value}>
              <input checked={checked} className="checkbox checkbox-primary checkbox-sm mt-0.5" disabled={option.disabled} onChange={() => toggle(option)} type="checkbox" />
              <span className="min-w-0">
                <strong className="block text-sm text-company-ink">{option.label}</strong>
                <span className="block break-all text-xs text-company-muted">{option.value}{option.description ? ` · ${option.description}` : ""}</span>
              </span>
            </label>
          );
        }) : <p className="px-2 py-4 text-center text-sm text-company-muted">{emptyLabel}</p>}
      </div>
      <div className="flex items-center justify-between border-t border-base-300 px-1 pt-2">
        <span className="text-xs font-bold text-company-muted">{value.length} selected</span>
        <div className="flex gap-1">
          <CcButton disabled={!value.length} onClick={() => onChange([])} size="xs" variant="ghost">Clear</CcButton>
          <CcButton onClick={() => { close(); triggerRef.current?.focus(); }} size="xs" variant="outline">Done</CcButton>
        </div>
      </div>
    </div>
  ) : null;
  const portalHost = triggerRef.current?.closest<HTMLElement>(".roost-liquid-shell, [data-theme]") || document.body;

  return (
    <div className="grid w-full gap-2">
      {value.map((item) => <input key={item} name={name} type="hidden" value={item} />)}
      <button
        aria-controls={open ? panelId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="select select-bordered flex h-auto min-h-12 w-full items-center justify-between gap-3 py-2 text-left"
        id={id}
        onClick={() => open ? close() : setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {selected.length ? selected.map((option) => (
            <span className="rounded-md border border-base-300 bg-base-200/70 px-2 py-1 text-xs font-bold text-company-ink" key={option.value}>{option.label}</span>
          )) : <span className="text-company-muted">{placeholder}</span>}
        </span>
        <i className={`ph-bold ${open ? "ph-caret-up" : "ph-caret-down"} shrink-0 text-company-muted`} aria-hidden="true"></i>
      </button>
      {panel ? createPortal(panel, portalHost) : null}
    </div>
  );
}

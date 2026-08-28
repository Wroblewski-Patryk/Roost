import { CSSProperties, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type CcIconOption = {
  value: string;
  label: string;
  keywords?: string;
};

export const departmentIconOptions: CcIconOption[] = [
  { value: "ph-map-trifold", label: "Map", keywords: "general overview navigation" },
  { value: "ph-target", label: "Target", keywords: "strategy goals" },
  { value: "ph-package", label: "Package", keywords: "product delivery" },
  { value: "ph-handshake", label: "Handshake", keywords: "sales partners" },
  { value: "ph-list-checks", label: "Checklist", keywords: "operations tasks" },
  { value: "ph-address-book", label: "Contacts", keywords: "relationships customers" },
  { value: "ph-users-three", label: "People", keywords: "team agents hr" },
  { value: "ph-bank", label: "Finance", keywords: "money accounting" },
  { value: "ph-folder-open", label: "Folder", keywords: "assets resources files" },
  { value: "ph-cpu", label: "Technology", keywords: "systems infrastructure" },
  { value: "ph-scales", label: "Legal", keywords: "law compliance" },
  { value: "ph-lightbulb", label: "Idea", keywords: "innovation" },
  { value: "ph-chart-line-up", label: "Growth", keywords: "management analytics" },
  { value: "ph-buildings", label: "Company", keywords: "business department" },
  { value: "ph-briefcase", label: "Work", keywords: "business services" },
  { value: "ph-rocket-launch", label: "Launch", keywords: "startup delivery" },
  { value: "ph-globe", label: "Global", keywords: "international web" },
  { value: "ph-storefront", label: "Commerce", keywords: "store retail" },
  { value: "ph-megaphone", label: "Marketing", keywords: "communication campaign" },
  { value: "ph-wrench", label: "Tools", keywords: "maintenance support" },
  { value: "ph-shield-check", label: "Safety", keywords: "security quality" },
  { value: "ph-headset", label: "Support", keywords: "customer service" },
  { value: "ph-code", label: "Code", keywords: "software engineering" },
  { value: "ph-database", label: "Data", keywords: "storage analytics" },
  { value: "ph-calendar-check", label: "Schedule", keywords: "calendar planning" },
  { value: "ph-clipboard-text", label: "Records", keywords: "documents procedures" },
  { value: "ph-network", label: "Network", keywords: "connections systems" },
  { value: "ph-cube", label: "Module", keywords: "component product" },
  { value: "ph-heart", label: "Care", keywords: "culture wellbeing" },
  { value: "ph-compass", label: "Direction", keywords: "leadership strategy" }
];

type FloatingPosition = { top?: number; bottom?: number; left: number; width: number; maxHeight: number };

export function CcIconPicker({
  id,
  name,
  value,
  onChange,
  options = departmentIconOptions,
  searchPlaceholder = "Search icons..."
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options?: CcIconOption[];
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const panelId = useId();
  const completeOptions = useMemo(() => options.some((option) => option.value === value)
    ? options
    : [{ value, label: "Current icon", keywords: "" }, ...options], [options, value]);
  const selected = completeOptions.find((option) => option.value === value) || completeOptions[0];
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return completeOptions;
    return completeOptions.filter((option) => `${option.label} ${option.keywords || ""}`.toLowerCase().includes(normalized));
  }, [completeOptions, query]);

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
      const below = window.innerHeight - rect.bottom - gap - viewportPadding;
      const above = rect.top - gap - viewportPadding;
      const openAbove = below < 320 && above > below;
      const available = openAbove ? above : below;
      const width = Math.min(Math.max(rect.width, 360), window.innerWidth - (viewportPadding * 2));
      const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - viewportPadding - width);
      const next: FloatingPosition = { left, width, maxHeight: Math.max(220, Math.min(430, available)) };
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

  const panelStyle = position ? ({ top: position.top, bottom: position.bottom, left: position.left, width: position.width, maxHeight: position.maxHeight } satisfies CSSProperties) : undefined;
  const portalHost = triggerRef.current?.closest<HTMLElement>(".roost-liquid-shell, [data-theme]") || document.body;
  const panel = open && position ? (
    <div className="roost-work-panel fixed z-[110] flex flex-col gap-2 rounded-company p-2 shadow-2xl" id={panelId} ref={panelRef} style={panelStyle}>
      <label className="input input-bordered input-sm flex w-full min-w-0 items-center gap-2 bg-base-100/75">
        <i className="ph-bold ph-magnifying-glass shrink-0 text-company-muted" aria-hidden="true"></i>
        <input aria-label={searchPlaceholder} className="w-full min-w-0 flex-1 bg-transparent outline-none" onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} ref={searchRef} type="search" value={query} />
      </label>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4" role="listbox" aria-label="Available icons">
        {filtered.map((option) => {
          const active = option.value === value;
          return (
            <button
              aria-selected={active}
              className={`grid min-h-20 place-items-center gap-1 rounded-company border px-2 py-2 text-center transition-colors ${active ? "border-primary/55 bg-primary/12 text-primary" : "border-base-300 bg-base-100/20 text-company-muted hover:bg-base-200/70 hover:text-company-ink"}`}
              key={option.value}
              onClick={() => { onChange(option.value); close(); triggerRef.current?.focus(); }}
              role="option"
              type="button"
            >
              <i className={`ph-bold ${option.value} text-xl`} aria-hidden="true"></i>
              <span className="text-[0.68rem] font-bold leading-tight">{option.label}</span>
            </button>
          );
        })}
      </div>
      {!filtered.length ? <p className="px-2 py-5 text-center text-sm text-company-muted">No matching icons</p> : null}
    </div>
  ) : null;

  return (
    <div className="w-full">
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <button aria-controls={open ? panelId : undefined} aria-expanded={open} aria-haspopup="listbox" className="select select-bordered flex h-12 w-full items-center gap-3 px-3 text-left" id={id} onClick={() => open ? close() : setOpen(true)} ref={triggerRef} type="button">
        <span className="grid size-8 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/8 text-primary"><i className={`ph-bold ${selected.value} text-lg`} aria-hidden="true"></i></span>
        <span className="min-w-0 flex-1 truncate font-bold text-company-ink">{selected.label}</span>
        <i className={`ph-bold ${open ? "ph-caret-up" : "ph-caret-down"} shrink-0 text-xs text-company-muted`} aria-hidden="true"></i>
      </button>
      {panel ? createPortal(panel, portalHost) : null}
    </div>
  );
}

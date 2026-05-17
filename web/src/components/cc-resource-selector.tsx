import { ReactNode, useEffect, useMemo, useState } from "react";
import { CcButton } from "./cc-button";

export type CcResourceSelectorItem = {
  id: string;
  title: string;
  detail?: string | null;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
};

export type CcResourceSelectorGroup = {
  id: string;
  title: string;
  items: CcResourceSelectorItem[];
};

export function CcResourceSelector({
  title,
  createLabel,
  createIcon = "ph-plus",
  allLabel,
  allDetail,
  clearLabel,
  searchLabel = "Search",
  searchPlaceholder = "Search...",
  emptyLabel = "No matching resources",
  selectedIds,
  groups,
  ungroupedTitle,
  ungroupedItems = [],
  onSelectedIdsChange,
  onCreate,
  footer
}: {
  title: string;
  createLabel?: string;
  createIcon?: string;
  allLabel: string;
  allDetail: string;
  clearLabel: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  selectedIds: string[];
  groups: CcResourceSelectorGroup[];
  ungroupedTitle?: string;
  ungroupedItems?: CcResourceSelectorItem[];
  onSelectedIdsChange: (ids: string[]) => void;
  onCreate?: () => void;
  footer?: ReactNode;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const selectableIds = [...groups.flatMap((group) => group.items.map((item) => item.id)), ...ungroupedItems.map((item) => item.id)];
  const selectedSet = new Set(selectedIds);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedSet.has(id));
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => [item.title, item.detail || ""].join(" ").toLowerCase().includes(normalizedQuery))
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, normalizedQuery]);
  const visibleUngroupedItems = useMemo(() => {
    if (!normalizedQuery) return ungroupedItems;
    return ungroupedItems.filter((item) => [item.title, item.detail || ""].join(" ").toLowerCase().includes(normalizedQuery));
  }, [ungroupedItems, normalizedQuery]);
  const hasVisibleItems = visibleGroups.some((group) => group.items.length > 0) || visibleUngroupedItems.length > 0;

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      groups.forEach((group) => {
        if (next[group.id] === undefined) next[group.id] = true;
      });
      if (ungroupedTitle && next.__ungrouped === undefined) next.__ungrouped = true;
      return next;
    });
  }, [groups.map((group) => group.id).join("|"), ungroupedTitle]);

  function toggleAll(checked: boolean) {
    onSelectedIdsChange(checked ? selectableIds : []);
  }

  function toggleItem(itemId: string, checked: boolean) {
    const next = new Set(selectedSet);
    if (checked) next.add(itemId);
    else next.delete(itemId);
    onSelectedIdsChange(Array.from(next));
  }

  function renderItem(item: CcResourceSelectorItem) {
    const checked = selectedSet.has(item.id);
    return (
      <div className={`grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-stretch rounded-company ${checked ? "bg-primary/10" : "hover:bg-base-200/70"}`} key={item.id}>
        <label className="grid place-items-center">
          <input className="checkbox checkbox-primary checkbox-xs" checked={checked} onChange={(event) => toggleItem(item.id, event.target.checked)} type="checkbox" />
        </label>
        <button className="grid min-w-0 gap-0.5 px-1 py-2 text-left" onClick={() => toggleItem(item.id, !checked)} type="button">
          <strong className="truncate text-sm">{item.title}</strong>
          {item.detail ? <span className="truncate text-xs text-company-muted">{item.detail}</span> : null}
        </button>
        {item.onAction ? (
          <button className="text-company-muted hover:text-company-ink" aria-label={item.actionLabel || item.title} onClick={item.onAction} type="button">
            <i className={`ph-bold ${item.actionIcon || "ph-gear-six"}`} aria-hidden="true"></i>
          </button>
        ) : <span aria-hidden="true"></span>}
      </div>
    );
  }

  return (
    <aside className="roost-work-surface grid max-h-[28rem] min-h-0 content-start gap-3 overflow-y-auto rounded-company p-3 xl:max-h-none">
      <div className="roost-work-panel sticky top-0 z-10 grid gap-2 rounded-company p-2.5 shadow-sm backdrop-blur" data-resource-selector>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black uppercase text-company-muted">{title}</span>
          {onCreate && createLabel ? <CcButton ariaLabel={createLabel} iconLeft={createIcon} onClick={onCreate} size="xs" variant="primary">{createLabel}</CcButton> : null}
        </div>
        <label className="input input-bordered input-sm flex items-center gap-2 bg-base-200/40">
          <i className="ph-bold ph-magnifying-glass text-company-muted" aria-hidden="true"></i>
          <span className="sr-only">{searchLabel}</span>
          <input className="grow" onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} type="search" value={query} />
        </label>
        <label className={`grid cursor-pointer grid-cols-[2rem_minmax(0,1fr)_auto] items-center rounded-company border py-1.5 pr-1.5 transition ${allSelected ? "border-primary/40 bg-primary/10" : "border-base-300/80 bg-base-200/45 hover:bg-base-200/70"}`}>
          <span className="grid place-items-center">
            <input className="checkbox checkbox-primary checkbox-xs" checked={allSelected} onChange={(event) => toggleAll(event.target.checked)} type="checkbox" />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-sm text-company-ink">{allLabel}</strong>
            <small className="block truncate text-xs text-company-muted">{allDetail}</small>
          </span>
          <button
            className="btn btn-ghost btn-xs"
            disabled={selectedIds.length === 0}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleAll(false);
            }}
            type="button"
          >
            {clearLabel}
          </button>
        </label>
      </div>

      {hasVisibleItems ? null : (
        <div className="roost-empty-state rounded-company p-4 text-center text-sm text-company-muted">
          <i className="ph-bold ph-magnifying-glass text-xl" aria-hidden="true"></i>
          <p className="mt-2">{emptyLabel}</p>
        </div>
      )}

      {visibleGroups.map((group) => (
        <section className="grid gap-1" key={group.id}>
          <button className="flex items-center justify-between rounded-company px-2 py-1 text-left text-xs font-black uppercase text-company-muted hover:bg-base-200" onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !current[group.id] }))} type="button">
            {group.title}
            <i className={`ph-bold ${openGroups[group.id] ? "ph-caret-up" : "ph-caret-down"}`} aria-hidden="true"></i>
          </button>
          {openGroups[group.id] ? <div className="grid gap-1">{group.items.map(renderItem)}</div> : null}
        </section>
      ))}

      {ungroupedTitle && visibleUngroupedItems.length ? (
        <section className="grid gap-1 border-t border-base-300 pt-2">
          <button className="flex items-center justify-between rounded-company px-2 py-1 text-left text-xs font-black uppercase text-company-muted hover:bg-base-200" onClick={() => setOpenGroups((current) => ({ ...current, __ungrouped: !current.__ungrouped }))} type="button">
            {ungroupedTitle}
            <i className={`ph-bold ${openGroups.__ungrouped ? "ph-caret-up" : "ph-caret-down"}`} aria-hidden="true"></i>
          </button>
          {openGroups.__ungrouped ? <div className="grid gap-1">{visibleUngroupedItems.map(renderItem)}</div> : null}
        </section>
      ) : null}

      {footer}
    </aside>
  );
}

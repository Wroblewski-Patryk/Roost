import React, { useEffect, useMemo, useRef, useState } from "react";
import { CcButton } from "./cc-button";
import { CcNotice } from "./cc-notice";

type SortDirection = "asc" | "desc";

export type CcTableFilterOption = {
  label: string;
  value: string;
};

export type CcTableColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => React.ReactNode;
  className?: string;
  mobileLabel?: string;
  required?: boolean;
  hideable?: boolean;
  visibleByDefault?: boolean;
  sortable?: boolean;
  sortValue?: (row: Row) => string | number | Date | null | undefined;
  filterable?: boolean;
  filterLabel?: string;
  filterValue?: (row: Row) => string | null | undefined;
  filterOptions?: CcTableFilterOption[];
  searchValue?: (row: Row) => string | null | undefined;
};

export type CcTableQuickFilter<Row> = {
  key: string;
  label: string;
  predicate: (row: Row) => boolean;
};

export type CcTablePagination = {
  page: number;
  pageSize: number;
  totalRows: number;
  onPrevious?: () => void;
  onNext?: () => void;
};

export type CcTableRowAction<Row> = {
  key: string;
  label: string;
  icon?: string;
  tone?: "neutral" | "primary" | "outline" | "warning" | "danger" | "ghost";
  onClick: (row: Row) => void;
  disabled?: (row: Row) => boolean;
  disabledLabel?: (row: Row) => string;
  hidden?: (row: Row) => boolean;
};

export type CcTableBulkAction<Row> = {
  key: string;
  label: string;
  icon?: string;
  tone?: "neutral" | "primary" | "outline" | "warning" | "danger" | "ghost";
  onClick: (rows: Row[]) => void;
  disabled?: (rows: Row[]) => boolean;
};

export type CcDataTableProps<Row extends { id: string }> = {
  columns: Array<CcTableColumn<Row>>;
  rows: Row[];
  emptyTitle: string;
  emptyDetail: string;
  labels?: {
    loadingTitle: string;
    loadingDetail: string;
    errorTitle: string;
    actions: string;
    previous: string;
    next: string;
    pagination: (state: { start: number; end: number; total: number }) => string;
    search?: string;
    filters?: string;
    columns?: string;
    rowsPerPage?: string;
    selected?: (count: number) => string;
    page?: string;
    clear?: string;
  };
  loading?: boolean;
  error?: string | null;
  errorAction?: React.ReactNode;
  density?: "compact" | "comfortable";
  mobileMode?: "scroll" | "cards";
  pagination?: CcTablePagination;
  rowActions?: (row: Row) => React.ReactNode;
  rowActionItems?: Array<CcTableRowAction<Row>>;
  bulkActions?: Array<CcTableBulkAction<Row>>;
  quickFilters?: Array<CcTableQuickFilter<Row>>;
  getRowLabel?: (row: Row) => string;
  getRowClassName?: (row: Row) => string;
  tableMinWidthClassName?: string;
  searchPlaceholder?: string;
  enableSearch?: boolean;
  enableColumnVisibility?: boolean;
  enableSelection?: boolean;
  enablePagination?: boolean;
  initialPageSize?: number;
  initialSort?: { key: string; direction: SortDirection };
  initialColumnFilters?: Record<string, string>;
  initialQuickFilter?: string;
};

const pageSizeOptions = [10, 25, 50, 100, 250, 500];

const defaultLabels: NonNullable<CcDataTableProps<{ id: string }>["labels"]> = {
  loadingTitle: "Loading records",
  loadingDetail: "CompanyCore is preparing this table view.",
  errorTitle: "Table could not load",
  actions: "Actions",
  previous: "Previous",
  next: "Next",
  pagination: ({ start, end, total }) => `${start}-${end} of ${total}`,
  search: "Search",
  filters: "Filters",
  columns: "Columns",
  rowsPerPage: "Rows",
  selected: (count) => `${count} selected`,
  page: "Page",
  clear: "Clear"
};

function paginationState(pagination: CcTablePagination) {
  const start = pagination.totalRows === 0 ? 0 : ((pagination.page - 1) * pagination.pageSize) + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.totalRows);
  return { start, end, total: pagination.totalRows };
}

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function sortPrimitive(value: string | number | Date | null | undefined) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return normalized(value);
}

function actionToneClass(tone: CcTableRowAction<never>["tone"] | CcTableBulkAction<never>["tone"]) {
  if (tone === "primary") return "btn-primary";
  if (tone === "outline") return "btn-outline";
  if (tone === "warning") return "btn-warning";
  if (tone === "danger") return "btn-error";
  if (tone === "ghost") return "btn-ghost";
  return "btn-neutral";
}

function uniqueOptions<Row>(rows: Row[], column: CcTableColumn<Row>) {
  if (column.filterOptions) return column.filterOptions;
  const values = new Map<string, string>();
  rows.forEach((row) => {
    const value = column.filterValue?.(row);
    if (!value) return;
    values.set(value, value);
  });
  return Array.from(values.entries())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));
}

function defaultSearchValue<Row>(row: Row, columns: Array<CcTableColumn<Row>>) {
  return columns
    .map((column) => column.searchValue?.(row) ?? column.filterValue?.(row))
    .filter(Boolean)
    .join(" ");
}

function useVisibleColumns<Row>(columns: Array<CcTableColumn<Row>>) {
  const initial = useMemo(() => {
    const visible: Record<string, boolean> = {};
    columns.forEach((column, index) => {
      visible[column.key] = column.required || column.visibleByDefault !== false || index === 0;
    });
    return visible;
  }, [columns]);
  const [visibleColumns, setVisibleColumns] = useState(initial);

  useEffect(() => {
    setVisibleColumns((current) => {
      const next = { ...current };
      columns.forEach((column, index) => {
        if (!(column.key in next)) {
          next[column.key] = column.required || column.visibleByDefault !== false || index === 0;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!columns.some((column) => column.key === key)) delete next[key];
      });
      return next;
    });
  }, [columns]);

  return [visibleColumns, setVisibleColumns] as const;
}

export function CcDataTable<Row extends { id: string }>({
  columns,
  rows,
  emptyTitle,
  emptyDetail,
  labels,
  loading = false,
  error = null,
  errorAction,
  density = "comfortable",
  mobileMode = "scroll",
  pagination,
  rowActions,
  rowActionItems = [],
  bulkActions = [],
  quickFilters = [],
  getRowLabel,
  getRowClassName,
  tableMinWidthClassName = "min-w-full",
  searchPlaceholder,
  enableSearch = true,
  enableColumnVisibility = true,
  enableSelection = true,
  enablePagination = true,
  initialPageSize = 25,
  initialSort,
  initialColumnFilters,
  initialQuickFilter = "all"
}: CcDataTableProps<Row>) {
  const tableDensityClass = density === "compact" ? "table-sm" : "";
  const tableLabels = { ...defaultLabels, ...labels };
  const actionColumnClass = "sticky right-0 z-10 bg-base-100 shadow-[-14px_0_18px_-18px_rgba(15,23,42,0.72)]";
  const selectColumnClass = "sticky left-0 z-10 w-12 bg-base-100";
  const [query, setQuery] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState(initialQuickFilter);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(initialColumnFilters || {});
  const [sort, setSort] = useState(initialSort || null);
  const [pageSize, setPageSize] = useState(pageSizeOptions.includes(initialPageSize) ? initialPageSize : 25);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useVisibleColumns(columns);
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  const filterableColumns = useMemo(() => columns.filter((column) => column.filterable && column.filterValue), [columns]);
  const renderedColumns = useMemo(
    () => columns.filter((column, index) => column.required || visibleColumns[column.key] || index === 0),
    [columns, visibleColumns]
  );

  const filteredRows = useMemo(() => {
    const quickFilter = quickFilters.find((filter) => filter.key === activeQuickFilter);
    return rows.filter((row) => {
      if (quickFilter && !quickFilter.predicate(row)) return false;
      const hasColumnMismatch = filterableColumns.some((column) => {
        const activeValue = columnFilters[column.key];
        if (!activeValue || activeValue === "all") return false;
        return String(column.filterValue?.(row) || "") !== activeValue;
      });
      if (hasColumnMismatch) return false;
      if (!query.trim()) return true;
      const haystack = normalized([
        getRowLabel?.(row),
        defaultSearchValue(row, columns)
      ].join(" "));
      return haystack.includes(normalized(query));
    });
  }, [activeQuickFilter, columnFilters, columns, filterableColumns, getRowLabel, query, quickFilters, rows]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const column = columns.find((candidate) => candidate.key === sort.key);
    if (!column) return filteredRows;
    const sortValue = column.sortValue || column.filterValue || ((row: Row) => getRowLabel?.(row) || row.id);
    return [...filteredRows].sort((a, b) => {
      const left = sortPrimitive(sortValue(a));
      const right = sortPrimitive(sortValue(b));
      const result = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right));
      return sort.direction === "asc" ? result : -result;
    });
  }, [columns, filteredRows, getRowLabel, sort]);

  const internalTotalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, internalTotalPages);
  const pageRows = enablePagination
    ? sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize)
    : sortedRows;
  const displayedRows = pagination ? rows : pageRows;
  const allVisibleSelected = displayedRows.length > 0 && displayedRows.every((row) => selectedIds.has(row.id));
  const someVisibleSelected = displayedRows.some((row) => selectedIds.has(row.id)) && !allVisibleSelected;
  const selectedRows = rows.filter((row) => selectedIds.has(row.id));
  const hasFilters = query.trim().length > 0
    || activeQuickFilter !== initialQuickFilter
    || Object.values(columnFilters).some((value) => value && value !== "all");

  useEffect(() => {
    setPage(1);
  }, [activeQuickFilter, columnFilters, pageSize, query, sort]);

  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    headerCheckboxRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  function toggleSort(column: CcTableColumn<Row>) {
    if (!column.sortable && !column.sortValue && !column.filterValue) return;
    setSort((current) => {
      if (current?.key !== column.key) return { key: column.key, direction: "asc" };
      return { key: column.key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  }

  function toggleVisiblePage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        displayedRows.forEach((row) => next.delete(row.id));
      } else {
        displayedRows.forEach((row) => next.add(row.id));
      }
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setActiveQuickFilter(initialQuickFilter);
    setColumnFilters({});
  }

  function updatePage(value: number) {
    if (Number.isNaN(value)) return;
    setPage(Math.min(Math.max(1, value), internalTotalPages));
  }

  const filterBar = (
    <div className="roost-work-panel grid gap-3 rounded-company p-3">
      {quickFilters.length ? (
        <div className="flex flex-wrap gap-2" aria-label="Quick filters">
          {quickFilters.map((filter) => (
            <button
              className={`btn btn-sm whitespace-nowrap ${activeQuickFilter === filter.key ? "btn-primary" : "btn-outline"}`}
              key={filter.key}
              onClick={() => setActiveQuickFilter(filter.key)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2 md:grid-cols-[minmax(14rem,1fr)_auto] md:items-start">
        <div className="grid gap-2 md:grid-cols-[minmax(12rem,1fr)_repeat(auto-fit,minmax(10rem,12rem))]">
          {enableSearch ? (
            <label className="form-control min-w-0">
              <span className="label py-0 pb-1">
                <span className="label-text text-xs font-black uppercase tracking-wide text-company-muted">{tableLabels.search}</span>
              </span>
              <span className="input input-bordered flex min-w-0 items-center gap-2 bg-base-100/65">
                <i className="ph-bold ph-magnifying-glass text-company-muted" aria-hidden="true"></i>
                <input
                  className="grow"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder || `${tableLabels.search}...`}
                  type="search"
                  value={query}
                />
              </span>
            </label>
          ) : null}
          {filterableColumns.map((column) => {
            const options = uniqueOptions(rows, column);
            if (!options.length) return null;
            const label = column.filterLabel || column.header;
            return (
              <label className="form-control min-w-0" key={column.key}>
                <span className="label py-0 pb-1">
                  <span className="label-text text-xs font-black uppercase tracking-wide text-company-muted">{label}</span>
                </span>
                <select
                  aria-label={label}
                  className="select select-bordered bg-base-100/65"
                  onChange={(event) => setColumnFilters((current) => ({ ...current, [column.key]: event.target.value }))}
                  value={columnFilters[column.key] || "all"}
                >
                  <option value="all">All {label.toLowerCase()}</option>
                  {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {enableColumnVisibility ? (
            <div className="dropdown dropdown-end">
              <button className="btn btn-sm btn-outline" tabIndex={0} type="button">
                <i className="ph-bold ph-columns" aria-hidden="true"></i>
                <span>{tableLabels.columns}</span>
              </button>
              <div className="dropdown-content z-30 mt-2 w-64 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl">
                <div className="max-h-72 overflow-y-auto">
                  {columns.map((column, index) => {
                    const locked = column.required || column.hideable === false || index === 0;
                    return (
                      <label className="flex cursor-pointer items-center gap-2 rounded-btn px-2 py-2 text-sm hover:bg-base-200" key={column.key}>
                        <input
                          checked={Boolean(visibleColumns[column.key] || locked)}
                          className="checkbox checkbox-sm checkbox-primary"
                          disabled={locked}
                          onChange={(event) => setVisibleColumns((current) => ({ ...current, [column.key]: event.target.checked }))}
                          type="checkbox"
                        />
                        <span className={locked ? "font-bold text-company-muted" : "font-bold text-company-ink"}>{column.header}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
          <CcButton disabled={!hasFilters} iconLeft="ph-x-circle" onClick={clearFilters} size="sm" variant="ghost">
            {tableLabels.clear}
          </CcButton>
        </div>
      </div>

      {selectedRows.length ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-company border border-primary/25 bg-primary/10 px-3 py-2 text-sm">
          <strong>{tableLabels.selected?.(selectedRows.length)}</strong>
          {bulkActions.length ? (
            <div className="flex flex-wrap gap-2">
              {bulkActions.map((action) => (
                <button
                  className={`btn btn-xs ${actionToneClass(action.tone)}`}
                  disabled={action.disabled?.(selectedRows)}
                  key={action.key}
                  onClick={() => action.onClick(selectedRows)}
                  type="button"
                >
                  {action.icon ? <i className={`ph-bold ${action.icon}`} aria-hidden="true"></i> : null}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (loading) {
    return (
      <div className="grid gap-3">
        {filterBar}
        <div className="rounded-company border border-base-300 bg-base-100 p-4">
          <CcNotice tone="loading" title={tableLabels.loadingTitle} detail={tableLabels.loadingDetail} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-3">
        {filterBar}
        <div className="rounded-company border border-base-300 bg-base-100 p-4">
          <CcNotice tone="error" title={tableLabels.errorTitle} detail={error} action={errorAction} live />
        </div>
      </div>
    );
  }

  const table = (
    <div className="react-table-shell max-w-full overflow-x-auto rounded-company border border-base-300 bg-base-100">
      <table className={["table table-zebra table-pin-rows min-w-full", tableDensityClass, tableMinWidthClassName].filter(Boolean).join(" ")}>
        <thead>
          <tr>
            {enableSelection ? (
              <th className={selectColumnClass}>
                <input
                  aria-label={allVisibleSelected ? "Deselect all visible rows" : "Select all visible rows"}
                  checked={allVisibleSelected}
                  className="checkbox checkbox-sm checkbox-primary"
                  disabled={!displayedRows.length}
                  onChange={toggleVisiblePage}
                  ref={headerCheckboxRef}
                  type="checkbox"
                />
              </th>
            ) : null}
            {renderedColumns.map((column) => {
              const sortable = column.sortable || column.sortValue || column.filterValue;
              const active = sort?.key === column.key;
              return (
                <th className={column.className} key={column.key}>
                  <button
                    className={`inline-flex items-center gap-1 text-left font-black uppercase ${sortable ? "cursor-pointer hover:text-primary" : "cursor-default"}`}
                    disabled={!sortable}
                    onClick={() => toggleSort(column)}
                    type="button"
                  >
                    <span>{column.header}</span>
                    {sortable ? <i className={`ph-bold ${active && sort.direction === "desc" ? "ph-sort-descending" : "ph-sort-ascending"} text-xs`} aria-hidden="true"></i> : null}
                  </button>
                </th>
              );
            })}
            {(rowActions || rowActionItems.length) ? <th className={actionColumnClass}>{tableLabels.actions}</th> : null}
          </tr>
        </thead>
        <tbody>
          {displayedRows.length ? displayedRows.map((row) => (
            <tr className={getRowClassName?.(row)} key={row.id}>
              {enableSelection ? (
                <td className={selectColumnClass}>
                  <input
                    aria-label={`Select ${getRowLabel?.(row) || row.id}`}
                    checked={selectedIds.has(row.id)}
                    className="checkbox checkbox-sm checkbox-primary"
                    onChange={(event) => setSelectedIds((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(row.id);
                      else next.delete(row.id);
                      return next;
                    })}
                    type="checkbox"
                  />
                </td>
              ) : null}
              {renderedColumns.map((column) => (
                <td className={column.className} key={column.key}>{column.cell(row)}</td>
              ))}
              {(rowActions || rowActionItems.length) ? (
                <td className={actionColumnClass}>
                  <div className="flex items-center gap-1">
                    {rowActionItems.filter((action) => !action.hidden?.(row)).map((action) => {
                      const disabled = action.disabled?.(row);
                      const label = disabled ? action.disabledLabel?.(row) || action.label : action.label;
                      return (
                        <button
                          aria-label={label}
                          className={`btn btn-xs btn-square ${actionToneClass(action.tone)}`}
                          disabled={disabled}
                          key={action.key}
                          onClick={() => action.onClick(row)}
                          title={label}
                          type="button"
                        >
                          {action.icon ? <i className={`ph-bold ${action.icon}`} aria-hidden="true"></i> : <span className="text-[0.62rem]">{action.label.slice(0, 2)}</span>}
                        </button>
                      );
                    })}
                    {rowActions ? rowActions(row) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          )) : (
            <tr>
              <td className="p-5" colSpan={renderedColumns.length + (enableSelection ? 1 : 0) + ((rowActions || rowActionItems.length) ? 1 : 0)}>
                <CcNotice tone="info" title={emptyTitle} detail={emptyDetail} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const effectivePagination = pagination ? paginationState(pagination) : {
    start: sortedRows.length === 0 ? 0 : ((safePage - 1) * pageSize) + 1,
    end: Math.min(safePage * pageSize, sortedRows.length),
    total: sortedRows.length
  };

  return (
    <div className="grid gap-3">
      {filterBar}
      {mobileMode === "cards" ? (
        <>
          <div className="sm:hidden">
            <div className="grid gap-3">
              {displayedRows.map((row) => (
                <article className={["rounded-company border border-base-300 bg-base-100 p-4", getRowClassName?.(row)].filter(Boolean).join(" ")} key={row.id}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <label className="flex min-w-0 items-center gap-2">
                      {enableSelection ? (
                        <input
                          checked={selectedIds.has(row.id)}
                          className="checkbox checkbox-sm checkbox-primary"
                          onChange={(event) => setSelectedIds((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(row.id);
                            else next.delete(row.id);
                            return next;
                          })}
                          type="checkbox"
                        />
                      ) : null}
                      <strong className="break-words text-sm">{getRowLabel?.(row) ?? row.id}</strong>
                    </label>
                    {(rowActions || rowActionItems.length) ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        {rowActionItems.filter((action) => !action.hidden?.(row)).map((action) => (
                          <button
                            aria-label={action.label}
                            className={`btn btn-xs btn-square ${actionToneClass(action.tone)}`}
                            disabled={action.disabled?.(row)}
                            key={action.key}
                            onClick={() => action.onClick(row)}
                            title={action.label}
                            type="button"
                          >
                            {action.icon ? <i className={`ph-bold ${action.icon}`} aria-hidden="true"></i> : null}
                          </button>
                        ))}
                        {rowActions ? rowActions(row) : null}
                      </div>
                    ) : null}
                  </div>
                  <dl className="grid gap-3">
                    {renderedColumns.map((column) => (
                      <div className="grid gap-1" key={column.key}>
                        <dt className="text-[0.68rem] font-black uppercase text-company-muted">{column.mobileLabel ?? column.header}</dt>
                        <dd className="min-w-0 text-sm">{column.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
              {!displayedRows.length ? (
                <div className="rounded-company border border-dashed border-base-300 bg-base-200/45 p-5">
                  <CcNotice tone="info" title={emptyTitle} detail={emptyDetail} />
                </div>
              ) : null}
            </div>
          </div>
          <div className="hidden sm:block">{table}</div>
        </>
      ) : table}
      {enablePagination || pagination ? (
        <div className="grid gap-2 rounded-company border border-base-300 bg-base-100 px-3 py-2 text-sm md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
          <span className="font-black text-company-muted">{tableLabels.pagination(effectivePagination)}</span>
          {!pagination ? (
            <label className="flex items-center gap-2">
              <span className="text-company-muted">{tableLabels.rowsPerPage}</span>
              <select className="select select-bordered select-sm w-24" onChange={(event) => setPageSize(Number(event.target.value))} value={pageSize}>
                {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          ) : null}
          <div className="join">
            <button
              className="btn join-item btn-sm"
              disabled={pagination ? !pagination.onPrevious || pagination.page <= 1 : safePage <= 1}
              onClick={pagination ? pagination.onPrevious : () => updatePage(safePage - 1)}
              type="button"
            >
              {tableLabels.previous}
            </button>
            {!pagination ? (
              <label className="join-item input input-sm input-bordered flex w-32 items-center gap-1 rounded-none">
                <span className="sr-only">{tableLabels.page}</span>
                <input
                  className="w-10 text-center"
                  disabled={internalTotalPages <= 1}
                  max={internalTotalPages}
                  min={1}
                  onChange={(event) => updatePage(Number(event.target.value))}
                  type="number"
                  value={safePage}
                />
                <span className="text-company-muted">/ {internalTotalPages}</span>
              </label>
            ) : (
              <span className="btn join-item btn-sm pointer-events-none">{pagination.page}</span>
            )}
            <button
              className="btn join-item btn-sm"
              disabled={pagination ? !pagination.onNext || pagination.page * pagination.pageSize >= pagination.totalRows : safePage >= internalTotalPages}
              onClick={pagination ? pagination.onNext : () => updatePage(safePage + 1)}
              type="button"
            >
              {tableLabels.next}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

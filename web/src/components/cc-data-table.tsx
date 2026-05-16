import React from "react";
import { CcButton } from "./cc-button";
import { CcNotice } from "./cc-notice";

export type CcTableColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => React.ReactNode;
  className?: string;
  mobileLabel?: string;
};

export type CcTablePagination = {
  page: number;
  pageSize: number;
  totalRows: number;
  onPrevious?: () => void;
  onNext?: () => void;
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
  };
  loading?: boolean;
  error?: string | null;
  errorAction?: React.ReactNode;
  density?: "compact" | "comfortable";
  mobileMode?: "scroll" | "cards";
  pagination?: CcTablePagination;
  rowActions?: (row: Row) => React.ReactNode;
  getRowLabel?: (row: Row) => string;
  tableMinWidthClassName?: string;
};

const defaultLabels: NonNullable<CcDataTableProps<{ id: string }>["labels"]> = {
  loadingTitle: "Loading records",
  loadingDetail: "CompanyCore is preparing this table view.",
  errorTitle: "Table could not load",
  actions: "Actions",
  previous: "Previous",
  next: "Next",
  pagination: ({ start, end, total }) => `${start}-${end} of ${total}`
};

function paginationState(pagination: CcTablePagination) {
  const start = pagination.totalRows === 0 ? 0 : ((pagination.page - 1) * pagination.pageSize) + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.totalRows);
  return { start, end, total: pagination.totalRows };
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
  getRowLabel,
  tableMinWidthClassName = "min-w-[640px]"
}: CcDataTableProps<Row>) {
  const tableDensityClass = density === "compact" ? "table-sm" : "";
  const tableLabels = { ...defaultLabels, ...labels };

  if (loading) {
    return (
      <div className="rounded-company border border-base-300 bg-base-100 p-4">
        <CcNotice tone="loading" title={tableLabels.loadingTitle} detail={tableLabels.loadingDetail} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-company border border-base-300 bg-base-100 p-4">
        <CcNotice tone="error" title={tableLabels.errorTitle} detail={error} action={errorAction} live />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-company border border-dashed border-base-300 bg-base-200/45 p-5">
        <CcNotice tone="info" title={emptyTitle} detail={emptyDetail} />
      </div>
    );
  }

  const table = (
    <div className="react-table-shell max-w-full overflow-x-auto rounded-company border border-base-300 bg-base-100">
      <table className={["table table-zebra table-pin-rows", tableDensityClass, tableMinWidthClassName].filter(Boolean).join(" ")}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.key}>{column.header}</th>
            ))}
            {rowActions ? <th>{tableLabels.actions}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td className={column.className} key={column.key}>{column.cell(row)}</td>
              ))}
              {rowActions ? <td>{rowActions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="grid gap-3">
      {mobileMode === "cards" ? (
        <>
          <div className="sm:hidden">
            <div className="grid gap-3">
              {rows.map((row) => (
                <article className="rounded-company border border-base-300 bg-base-100 p-4" key={row.id}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <strong className="break-words text-sm">{getRowLabel?.(row) ?? row.id}</strong>
                    {rowActions ? <div className="flex flex-wrap justify-end gap-2">{rowActions(row)}</div> : null}
                  </div>
                  <dl className="grid gap-3">
                    {columns.map((column) => (
                      <div className="grid gap-1" key={column.key}>
                        <dt className="text-[0.68rem] font-black uppercase text-company-muted">{column.mobileLabel ?? column.header}</dt>
                        <dd className="min-w-0 text-sm">{column.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          </div>
          <div className="hidden sm:block">{table}</div>
        </>
      ) : table}
      {pagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-company border border-base-300 bg-base-100 px-3 py-2 text-sm">
          <span className="font-black text-company-muted">{tableLabels.pagination(paginationState(pagination))}</span>
          <div className="flex gap-2">
            <CcButton
              disabled={!pagination.onPrevious || pagination.page <= 1}
              onClick={pagination.onPrevious}
              size="sm"
              variant="ghost"
            >
              {tableLabels.previous}
            </CcButton>
            <CcButton
              disabled={!pagination.onNext || pagination.page * pagination.pageSize >= pagination.totalRows}
              onClick={pagination.onNext}
              size="sm"
              variant="ghost"
            >
              {tableLabels.next}
            </CcButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

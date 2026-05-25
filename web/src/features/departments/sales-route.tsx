import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { Shell } from "../../layout/shell";
import { SalesPacket } from "../../types";
import { BlockedActions, SummaryGrid, useTranslatedTableLabels } from "./shared";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export function SalesRoute() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<SalesPacket>("/v1/sales/context?limit=80", true, t);
  const rows = packet.data?.deals || [];
  const tableLabels = useTranslatedTableLabels();
  const columns: Array<CcTableColumn<(typeof rows)[number]>> = [
    {
      key: "deal",
      header: "Deal",
      sortable: true,
      searchValue: (row) => `${row.title} ${row.clientName || ""}`,
      cell: (row) => (
        <div className="grid">
          <strong>{row.title}</strong>
          <span className="text-xs text-company-muted">{row.clientName || "Unassigned client"}</span>
        </div>
      )
    },
    {
      key: "stage",
      header: "Stage",
      sortable: true,
      cell: (row) => <span>{row.pipelineStageName || "-"}</span>
    },
    {
      key: "value",
      header: "Value",
      sortValue: (row) => row.value || 0,
      cell: (row) => <span>{row.value != null ? `${row.value} ${row.currency || ""}` : "-"}</span>
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterValue: (row) => row.status || "unknown",
      cell: (row) => <span className="badge badge-outline">{row.status || "unknown"}</span>
    }
  ];

  return (
    <Shell activeArea="03-sprzedaz">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <p className="text-sm font-black uppercase text-primary">03 Sales</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">{packet.data?.department?.name || "Sales Management System"}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">
          {packet.data?.department?.purpose || "Manage clients, deals, pipeline, follow-up, and commercial exception evidence before owner-approved commitments."}
        </p>
      </section>

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Sales context could not load."} live /> : null}

      <SummaryGrid summary={packet.data?.summary} />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Current client work</h2>
          <div className="mt-3 grid gap-2">
            {(packet.data?.currentClientWork || []).slice(0, 8).map((item) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{item.title}</strong>
                  <span className="badge badge-outline">{item.invoiceReadiness || "blocked"}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">{item.clientName || "Unassigned client"} • {item.pipelineStageName || "No stage"}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Follow-up tasks</h2>
          <div className="mt-3 grid gap-2">
            {(packet.data?.followUpTasks || []).slice(0, 8).map((task) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={task.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{task.title}</strong>
                  <span className="badge badge-outline">{task.status || "todo"}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">{task.priority || "normal"} • due {formatDate(task.dueDate)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle="No deals in sales context"
        emptyDetail="Add clients, deals, or pipeline records to populate this board."
        error={packet.status === "error" ? packet.error || "Sales context could not load." : null}
        getRowLabel={(row) => row.title}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
      />

      <BlockedActions actions={packet.data?.blockedActions || packet.data?.agentPacket?.blockedActions} />
    </Shell>
  );
}

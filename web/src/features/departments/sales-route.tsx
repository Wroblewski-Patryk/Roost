import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { formatAppDate } from "../../i18n/date-format";
import { SalesPacket } from "../../types";
import { BlockedActions, humanizeBusinessValue, useTranslatedTableLabels } from "./shared";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return formatAppDate(value, { month: "short", day: "numeric" });
}

export function SalesRoute() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<SalesPacket>("/v1/sales/context?limit=80", true, t);
  const rows = packet.data?.deals || [];
  const clientWork = packet.data?.currentClientWork || [];
  const followUpTasks = packet.data?.followUpTasks || [];
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
      cell: (row) => <span className="badge badge-outline">{humanizeBusinessValue(row.status)}</span>
    }
  ];

  return (
    <>
      <CcPageHeader eyebrow="03 Sales" title={packet.data?.department?.name || "Sales Management System"} description={packet.data?.department?.purpose || "Manage clients, deals, pipeline, follow-up, and commercial exception evidence before owner-approved commitments."} />

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Sales context could not load."} live /> : null}

      {clientWork.length || followUpTasks.length ? <section className="grid gap-4 lg:grid-cols-2">
        {clientWork.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Current client work</h2>
          <div className="roost-compact-list mt-3 grid gap-2">
            {clientWork.slice(0, 8).map((item) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{item.title}</strong>
                  <span className="badge badge-outline">{humanizeBusinessValue(item.invoiceReadiness, "Blocked")}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">{item.clientName || "Unassigned client"} • {item.pipelineStageName || "No stage"}</p>
              </div>
            ))}
          </div>
        </article> : null}

        {followUpTasks.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Follow-up tasks</h2>
          <div className="roost-compact-list mt-3 grid gap-2">
            {followUpTasks.slice(0, 8).map((task) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={task.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{task.title}</strong>
                  <span className="badge badge-outline">{humanizeBusinessValue(task.status, "To do")}</span>
                </div>
                <p className="mt-1 text-xs text-company-muted">{task.priority || "normal"} • due {formatDate(task.dueDate)}</p>
              </div>
            ))}
          </div>
        </article> : null}
      </section> : null}

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
    </>
  );
}

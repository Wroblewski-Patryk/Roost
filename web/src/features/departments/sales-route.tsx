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
  const realRows = packet.data?.deals || [];
  const exampleRows: NonNullable<SalesPacket["deals"]> = [
    { id: "example-discovery", title: t("sales.example.deal.redesign"), clientName: "Northstar Labs", pipelineStageName: t("sales.example.stage.discovery"), value: 18000, currency: "CHF", status: "qualified" },
    { id: "example-proposal", title: t("sales.example.deal.audit"), clientName: "Alpine Office", pipelineStageName: t("sales.example.stage.proposal"), value: 6500, currency: "CHF", status: "proposal" },
    { id: "example-negotiation", title: t("sales.example.deal.support"), clientName: t("sales.example.client"), pipelineStageName: t("sales.example.stage.negotiation"), value: 2400, currency: "CHF", status: "negotiation" }
  ];
  const showingExample = packet.status === "ready" && realRows.length === 0;
  const rows = showingExample ? exampleRows : realRows;
  const clientWork = packet.data?.currentClientWork || [];
  const followUpTasks = packet.data?.followUpTasks || [];
  const tableLabels = useTranslatedTableLabels();
  const columns: Array<CcTableColumn<(typeof rows)[number]>> = [
    {
      key: "deal",
      header: t("sales.deal"),
      sortable: true,
      searchValue: (row) => `${row.title} ${row.clientName || ""}`,
      cell: (row) => (
        <div className="grid">
          <strong>{row.title}</strong>
          <span className="text-xs text-company-muted">{row.clientName || t("sales.unassignedClient")}</span>
        </div>
      )
    },
    {
      key: "stage",
      header: t("sales.stage"),
      sortable: true,
      cell: (row) => <span>{row.pipelineStageName || "-"}</span>
    },
    {
      key: "value",
      header: t("sales.value"),
      sortValue: (row) => row.value || 0,
      cell: (row) => <span>{row.value != null ? `${row.value} ${row.currency || ""}` : "-"}</span>
    },
    {
      key: "status",
      header: t("table.status"),
      sortable: true,
      filterable: true,
      filterValue: (row) => row.status || "unknown",
      cell: (row) => <span className="badge badge-outline">{humanizeBusinessValue(row.status)}</span>
    }
  ];

  return (
    <>
      <CcPageHeader eyebrow={t("sales.eyebrow")} title={t("sales.title")} description={t("sales.description")} />

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Sales context could not load."} live /> : null}

      {showingExample ? <div className="roost-example-note"><i className="ph-bold ph-eye" aria-hidden="true"></i><div><strong>{t("sales.example.title")}</strong><span>{t("sales.example.detail")}</span></div></div> : null}

      {clientWork.length || followUpTasks.length ? <section className={`grid gap-4 ${clientWork.length && followUpTasks.length ? "lg:grid-cols-2" : ""}`}>
        {clientWork.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">{t("sales.currentWork")}</h2>
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
          <h2 className="text-lg font-black text-company-ink">{t("sales.followUpTasks")}</h2>
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
        emptyTitle={t("sales.empty.title")}
        emptyDetail={t("sales.empty.detail")}
        error={packet.status === "error" ? packet.error || "Sales context could not load." : null}
        getRowLabel={(row) => row.title}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
      />

      {!showingExample ? <BlockedActions actions={packet.data?.blockedActions || packet.data?.agentPacket?.blockedActions} /> : null}
    </>
  );
}

import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { Shell } from "../../layout/shell";
import { RelationshipsPacket } from "../../types";
import { BlockedActions, SummaryGrid, useTranslatedTableLabels } from "./shared";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export function RelationshipsRoute() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<RelationshipsPacket>("/v1/relationships/context", true, t);
  const rows = packet.data?.clients || [];
  const tableLabels = useTranslatedTableLabels();
  const columns: Array<CcTableColumn<(typeof rows)[number]>> = [
    {
      key: "client",
      header: "Client",
      sortable: true,
      searchValue: (row) => `${row.name} ${row.companyName || ""} ${row.email || ""}`,
      cell: (row) => (
        <div className="grid">
          <strong>{row.name}</strong>
          <span className="text-xs text-company-muted">{row.companyName || row.email || "-"}</span>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterValue: (row) => row.status || "unknown",
      cell: (row) => <span className="badge badge-outline">{row.status || "unknown"}</span>
    },
    {
      key: "signals",
      header: "Signals",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          <span className="badge badge-ghost badge-sm">{row.interactions?.length || 0} interactions</span>
          <span className="badge badge-ghost badge-sm">{row.stakeholders?.length || 0} stakeholders</span>
          <span className="badge badge-ghost badge-sm">{row.deals?.length || 0} deals</span>
        </div>
      )
    },
    {
      key: "lastInteraction",
      header: "Last interaction",
      sortValue: (row) => row.interactions?.[0]?.occurredAt || "",
      cell: (row) => <span>{formatDate(row.interactions?.[0]?.occurredAt)}</span>
    }
  ];

  return (
    <Shell activeArea="05-relacje">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <p className="text-sm font-black uppercase text-primary">05 Relationships</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">{packet.data?.department?.name || "Relationships Management"}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">
          {packet.data?.department?.purpose || "Track client trust, support continuity, and relationship risk across clients, stakeholders, interactions, and follow-up evidence."}
        </p>
      </section>

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Relationships context could not load."} live /> : null}

      <SummaryGrid summary={packet.data?.summary} />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Recent interactions</h2>
          <div className="mt-3 grid gap-2">
            {(packet.data?.interactions || []).slice(0, 8).map((interaction) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={interaction.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{interaction.type}</strong>
                  <span className="badge badge-outline">{interaction.status || "active"}</span>
                </div>
                <p className="mt-1 text-sm text-company-muted">{interaction.summary || "No summary"}</p>
                <p className="mt-1 text-xs text-company-muted">{interaction.client?.name || "Unassigned client"} • {formatDate(interaction.occurredAt)}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">Relationship tasks</h2>
          <div className="mt-3 grid gap-2">
            {(packet.data?.tasks || []).slice(0, 8).map((task) => (
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
        emptyTitle="No clients in relationships context"
        emptyDetail="Add client, interaction, or stakeholder records to build this board."
        error={packet.status === "error" ? packet.error || "Relationships context could not load." : null}
        getRowLabel={(row) => row.name}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
      />

      <BlockedActions actions={packet.data?.blockedActions || packet.data?.agentPacket?.blockedActions} />
    </Shell>
  );
}

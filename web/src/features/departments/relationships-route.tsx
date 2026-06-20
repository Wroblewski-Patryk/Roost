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

function EmptyEvidence({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-company border border-dashed border-base-300 bg-base-200/30 p-4 text-sm">
      <strong className="block text-company-ink">{title}</strong>
      <span className="mt-1 block text-company-muted">{detail}</span>
    </div>
  );
}

export function RelationshipsRoute() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<RelationshipsPacket>("/v1/relationships/context", true, t);
  const rows = packet.data?.clients || [];
  const notes = packet.data?.notes || [];
  const driveFiles = packet.data?.driveFiles || [];
  const decisions = packet.data?.decisions || [];
  const tableLabels = useTranslatedTableLabels();
  const provenanceSignals = [
    { label: "Client records", value: rows.length, detail: "Direct workspace data" },
    { label: "Relationship notes", value: notes.length, detail: "Client-linked note evidence" },
    { label: "Drive evidence", value: driveFiles.length, detail: "Scoped provider file evidence" },
    { label: "Decision context", value: decisions.length, detail: "Relationship decision provenance" }
  ];
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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.65fr)]">
        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-primary">Evidence visibility</p>
              <h2 className="mt-1 text-lg font-black text-company-ink">Relationship notes</h2>
            </div>
            <span className="badge badge-outline">{notes.length} notes</span>
          </div>
          <div className="mt-3 grid gap-2">
            {notes.length ? notes.slice(0, 6).map((note) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={note.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong className="text-sm text-company-ink">{note.client?.name || "Unassigned client note"}</strong>
                  <span className="badge badge-ghost badge-sm">{note.status || "active"}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-company-muted">{note.content}</p>
                <p className="mt-2 text-xs text-company-muted">Source {note.source || "CompanyCore"} - updated {formatDate(note.updatedAt)}</p>
              </div>
            )) : (
              <EmptyEvidence title="No relationship notes visible" detail="Client-linked notes will appear here when the context packet includes them." />
            )}
          </div>
        </article>

        <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-primary">Provider evidence</p>
              <h2 className="mt-1 text-lg font-black text-company-ink">Relationship Drive files</h2>
            </div>
            <span className="badge badge-outline">{driveFiles.length} files</span>
          </div>
          <div className="mt-3 grid gap-2">
            {driveFiles.length ? driveFiles.slice(0, 6).map((file) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={file.id}>
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-company border border-base-300 bg-base-100">
                    <i className="ph-bold ph-file-text text-primary" aria-hidden="true"></i>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      {file.webViewLink ? (
                        <a className="break-words font-black text-company-ink underline-offset-4 hover:underline" href={file.webViewLink} rel="noreferrer" target="_blank">{file.name}</a>
                      ) : (
                        <strong className="break-words text-company-ink">{file.name}</strong>
                      )}
                      <span className="badge badge-ghost badge-sm">{file.operatingAreaKey || "unscoped"}</span>
                    </div>
                    {file.description ? <p className="mt-1 text-sm leading-6 text-company-muted">{file.description}</p> : null}
                    <p className="mt-2 text-xs text-company-muted">{file.mimeType || "file"} - modified {formatDate(file.modifiedTime)}</p>
                  </div>
                </div>
              </div>
            )) : (
              <EmptyEvidence title="No Relationship Drive evidence visible" detail="Drive files assigned to Relationships or matching relationship terms will appear here." />
            )}
          </div>
        </article>
      </section>

      <section className="rounded-company border border-base-300 bg-base-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-primary">Graph / provenance</p>
            <h2 className="mt-1 text-lg font-black text-company-ink">Relationship provenance evidence</h2>
          </div>
          <span className="badge badge-outline">{packet.data?.agentPacket?.mode || "read_only"}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {provenanceSignals.map((signal) => (
            <article className="rounded-company border border-base-300 bg-base-200/40 p-3" key={signal.label}>
              <p className="text-xs font-black uppercase text-company-muted">{signal.label}</p>
              <strong className="mt-2 block text-2xl font-black text-company-ink">{signal.value}</strong>
              <p className="mt-1 text-xs text-company-muted">{signal.detail}</p>
            </article>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {decisions.slice(0, 4).map((decision) => (
            <article className="rounded-company border border-base-300 bg-base-200/40 p-3" key={decision.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <strong className="text-company-ink">{decision.title}</strong>
                <span className="badge badge-ghost badge-sm">{decision.status || "active"}</span>
              </div>
              <p className="mt-1 text-sm text-company-muted">{decision.outcome || decision.rationale || "Decision evidence without outcome text."}</p>
            </article>
          ))}
          {!decisions.length ? (
            <EmptyEvidence title="No relationship decisions visible" detail="Relationship-specific decisions will appear here as provenance evidence." />
          ) : null}
        </div>
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

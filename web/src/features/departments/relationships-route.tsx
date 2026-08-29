import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { formatAppDate } from "../../i18n/date-format";
import { RelationshipsPacket } from "../../types";
import { BlockedActions, humanizeBusinessValue, useTranslatedTableLabels } from "./shared";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return formatAppDate(value, { month: "short", day: "numeric" });
}

export function RelationshipsRoute() {
  const { t } = useLanguage();
  const packet = useOwnerPacket<RelationshipsPacket>("/v1/relationships/context", true, t);
  const rows = packet.data?.clients || [];
  const notes = packet.data?.notes || [];
  const driveFiles = packet.data?.driveFiles || [];
  const decisions = packet.data?.decisions || [];
  const interactions = packet.data?.interactions || [];
  const tasks = packet.data?.tasks || [];
  const hasRelationshipData = Boolean(rows.length || notes.length || driveFiles.length || decisions.length || interactions.length || tasks.length);
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
      cell: (row) => <span className="badge badge-outline">{humanizeBusinessValue(row.status)}</span>
    },
    {
      key: "signals",
      header: "Signals",
      cell: (row) => <span className="text-sm text-company-muted">{[
        row.interactions?.length ? `${row.interactions.length} interactions` : "",
        row.stakeholders?.length ? `${row.stakeholders.length} stakeholders` : "",
        row.deals?.length ? `${row.deals.length} deals` : ""
      ].filter(Boolean).join(" · ") || "-"}</span>
    },
    {
      key: "lastInteraction",
      header: "Last interaction",
      sortValue: (row) => row.interactions?.[0]?.occurredAt || "",
      cell: (row) => <span>{formatDate(row.interactions?.[0]?.occurredAt)}</span>
    }
  ];

  return (
    <>
      <CcPageHeader eyebrow={t("relationships.eyebrow")} title={t("relationships.title")} description={t("relationships.description")} />

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Relationships context could not load."} live /> : null}

      {interactions.length || tasks.length ? <section className={`grid gap-4 ${interactions.length && tasks.length ? "lg:grid-cols-2" : ""}`}>
        {interactions.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">{t("relationships.interactions")}</h2>
          <div className="roost-compact-list mt-3 grid gap-2">
            {interactions.slice(0, 8).map((interaction) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={interaction.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{interaction.type}</strong>
                  <span className="badge badge-outline">{humanizeBusinessValue(interaction.status, "Active")}</span>
                </div>
                <p className="mt-1 text-sm text-company-muted">{interaction.summary || "No summary"}</p>
                <p className="mt-1 text-xs text-company-muted">{interaction.client?.name || "Unassigned client"} • {formatDate(interaction.occurredAt)}</p>
              </div>
            ))}
          </div>
        </article> : null}

        {tasks.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">{t("relationships.tasks")}</h2>
          <div className="roost-compact-list mt-3 grid gap-2">
            {tasks.slice(0, 8).map((task) => (
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

      {notes.length || driveFiles.length ? <section className={`grid gap-4 ${notes.length && driveFiles.length ? "xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.65fr)]" : ""}`}>
        {notes.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-primary">{t("relationships.evidence")}</p>
              <h2 className="mt-1 text-lg font-black text-company-ink">{t("relationships.notes")}</h2>
            </div>
          </div>
          <div className="roost-compact-list mt-3 grid gap-2">
            {notes.slice(0, 6).map((note) => (
              <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={note.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong className="text-sm text-company-ink">{note.client?.name || "Unassigned client note"}</strong>
                  <span className="badge badge-ghost badge-sm">{humanizeBusinessValue(note.status, "Active")}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-company-muted">{note.content}</p>
                <p className="mt-2 text-xs text-company-muted">Source {note.source || "CompanyCore"} - updated {formatDate(note.updatedAt)}</p>
              </div>
            ))}
          </div>
        </article> : null}

        {driveFiles.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-primary">{t("relationships.providerEvidence")}</p>
              <h2 className="mt-1 text-lg font-black text-company-ink">{t("relationships.files")}</h2>
            </div>
          </div>
          <div className="roost-compact-list mt-3 grid gap-2">
            {driveFiles.slice(0, 6).map((file) => (
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
            ))}
          </div>
        </article> : null}
      </section> : null}

      {decisions.length ? <section className="rounded-company border border-base-300 bg-base-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-primary">{t("relationships.decisionContext")}</p>
            <h2 className="mt-1 text-lg font-black text-company-ink">{t("relationships.decisions")}</h2>
          </div>
        </div>
        <div className="roost-compact-list mt-3 grid gap-2 sm:grid-cols-2">
          {decisions.slice(0, 4).map((decision) => (
            <article className="rounded-company border border-base-300 bg-base-200/40 p-3" key={decision.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <strong className="text-company-ink">{decision.title}</strong>
                <span className="badge badge-ghost badge-sm">{humanizeBusinessValue(decision.status, "Active")}</span>
              </div>
              <p className="mt-1 text-sm text-company-muted">{decision.outcome || decision.rationale || "Decision evidence without outcome text."}</p>
            </article>
          ))}
        </div>
      </section> : null}

      <CcDataTable
        columns={columns}
        rows={rows}
        emptyTitle={t("relationships.empty.title")}
        emptyDetail={t("relationships.empty.detail")}
        error={packet.status === "error" ? packet.error || "Relationships context could not load." : null}
        getRowLabel={(row) => row.name}
        labels={tableLabels}
        loading={packet.status === "loading"}
        mobileMode="cards"
      />

      {hasRelationshipData ? <BlockedActions actions={packet.data?.blockedActions || packet.data?.agentPacket?.blockedActions} /> : null}
    </>
  );
}

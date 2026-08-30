import { FormEvent, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcConfirmDialog } from "../../components/cc-confirm-dialog";
import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcField } from "../../components/cc-field";
import { CcCompactList, CcCompactListItem, CcListStatus } from "../../components/cc-compact-list";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
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
  const { locale, t } = useLanguage();
  const polish = locale === "pl";
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<NonNullable<RelationshipsPacket["clients"]>[number] | null | undefined>();
  const [archiving, setArchiving] = useState<NonNullable<RelationshipsPacket["clients"]>[number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const packet = useOwnerPacket<RelationshipsPacket>("/v1/relationships/context", true, t, refreshKey);
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
      key: "actions",
      header: t("table.actions"),
      cell: (row) => <div className="flex justify-end gap-1"><CcButton ariaLabel={polish ? "Edytuj klienta" : "Edit client"} iconLeft="ph-pencil-simple" onClick={() => setEditing(row)} size="xs" variant="ghost"><span className="sr-only">{polish ? "Edytuj" : "Edit"}</span></CcButton><CcButton ariaLabel={polish ? "Archiwizuj klienta" : "Archive client"} iconLeft="ph-archive" onClick={() => setArchiving(row)} size="xs" variant="ghost"><span className="sr-only">{polish ? "Archiwizuj" : "Archive"}</span></CcButton></div>
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
      <CcPageHeader actions={<CcButton iconLeft="ph-plus" onClick={() => setEditing(null)} size="sm" variant="primary">{polish ? "Dodaj klienta" : "Add client"}</CcButton>} eyebrow={t("relationships.eyebrow")} title={t("relationships.title")} description={t("relationships.description")} />

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || "Relationships context could not load."} live /> : null}

      {interactions.length || tasks.length ? <section className={`grid gap-4 ${interactions.length && tasks.length ? "lg:grid-cols-2" : ""}`}>
        {interactions.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">{t("relationships.interactions")}</h2>
          <CcCompactList className="mt-3">
            {interactions.slice(0, 8).map((interaction) => (
              <CcCompactListItem key={interaction.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{interaction.type}</strong>
                  <CcListStatus tone={interaction.status === "active" ? "active" : "neutral"}>{humanizeBusinessValue(interaction.status, "Active")}</CcListStatus>
                </div>
                <p className="mt-1 text-sm text-company-muted">{interaction.summary || "No summary"}</p>
                <p className="mt-1 text-xs text-company-muted">{interaction.client?.name || "Unassigned client"} • {formatDate(interaction.occurredAt)}</p>
              </CcCompactListItem>
            ))}
          </CcCompactList>
        </article> : null}

        {tasks.length ? <article className="rounded-company border border-base-300 bg-base-100 p-4">
          <h2 className="text-lg font-black text-company-ink">{t("relationships.tasks")}</h2>
          <CcCompactList className="mt-3">
            {tasks.slice(0, 8).map((task) => (
              <CcCompactListItem key={task.id}>
                <div className="flex items-start justify-between gap-2">
                  <strong>{task.title}</strong>
                  <CcListStatus>{humanizeBusinessValue(task.status, "To do")}</CcListStatus>
                </div>
                <p className="mt-1 text-xs text-company-muted">{task.priority || "normal"} • due {formatDate(task.dueDate)}</p>
              </CcCompactListItem>
            ))}
          </CcCompactList>
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

      {editing !== undefined ? <ClientEditor client={editing} error={error} onClose={() => { setEditing(undefined); setError(null); }} onSaved={() => { setEditing(undefined); setError(null); setRefreshKey((value) => value + 1); }} polish={polish} setError={setError} /> : null}
      {archiving ? <CcConfirmDialog busy={busy} confirmIcon="ph-archive" confirmLabel={polish ? "Archiwizuj" : "Archive"} description={polish ? "Klient pozostanie w historii i zniknie z aktywnego widoku." : "The client remains in history and leaves the active view."} detail={<strong>{archiving.name}</strong>} eyebrow={polish ? "Relacje" : "Relationships"} onCancel={() => setArchiving(null)} onConfirm={async () => { setBusy(true); try { await api(`/v1/clients/${archiving.id}`, { method: "DELETE" }); setArchiving(null); setRefreshKey((value) => value + 1); } finally { setBusy(false); } }} title={polish ? "Zarchiwizować klienta?" : "Archive client?"} /> : null}
    </>
  );
}

function ClientEditor({ client, error, onClose, onSaved, polish, setError }: { client: NonNullable<RelationshipsPacket["clients"]>[number] | null; error: string | null; onClose: () => void; onSaved: () => void; polish: boolean; setError: (value: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(["name", "companyName", "email", "phone", "status"].map((key) => [key, String(form.get(key) || "").trim()]).filter(([, value]) => value));
    try { await api(client ? `/v1/clients/${client.id}` : "/v1/clients", { method: client ? "PATCH" : "POST", body: JSON.stringify(body) }); onSaved(); }
    catch (caught) { setError(caught instanceof AppApiError ? caught.code : "request_failed"); }
    finally { setBusy(false); }
  }
  return <CcRecordEditorModal actions={<><CcButton onClick={onClose} variant="ghost">{polish ? "Anuluj" : "Cancel"}</CcButton><CcButton loading={busy} type="submit" variant="primary">{polish ? "Zapisz" : "Save"}</CcButton></>} description={polish ? "Podstawowe dane klienta będą wspólnym źródłem dla relacji, sprzedaży i realizacji." : "Core client data becomes shared context for relationships, sales and delivery."} eyebrow={polish ? "Relacje" : "Relationships"} onClose={onClose} onSubmit={submit} title={client ? polish ? "Edytuj klienta" : "Edit client" : polish ? "Dodaj klienta" : "Add client"} titleId="client-editor-title">
    {error ? <CcNotice live tone="error" title={humanizeBusinessValue(error)} /> : null}
    <CcRecordEditorSection title={polish ? "Dane klienta" : "Client details"}><div className="grid gap-4 md:grid-cols-2">
      <CcField label={polish ? "Nazwa" : "Name"} required>{({ id }) => <input className="input input-bordered w-full" defaultValue={client?.name || ""} id={id} name="name" required />}</CcField>
      <CcField label={polish ? "Firma" : "Company"}>{({ id }) => <input className="input input-bordered w-full" defaultValue={client?.companyName || ""} id={id} name="companyName" />}</CcField>
      <CcField label="E-mail">{({ id }) => <input className="input input-bordered w-full" defaultValue={client?.email || ""} id={id} name="email" type="email" />}</CcField>
      <CcField label={polish ? "Telefon" : "Phone"}>{({ id }) => <input className="input input-bordered w-full" defaultValue={client?.phone || ""} id={id} name="phone" />}</CcField>
      <CcField label="Status">{({ id }) => <select className="select select-bordered w-full" defaultValue={client?.status || "active"} id={id} name="status"><option value="active">Active</option><option value="lead">Lead</option><option value="qualified">Qualified</option><option value="inactive">Inactive</option></select>}</CcField>
    </div></CcRecordEditorSection>
  </CcRecordEditorModal>;
}

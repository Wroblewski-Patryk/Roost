import { FormEvent, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcConfirmDialog } from "../../components/cc-confirm-dialog";
import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
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
  const { locale, t } = useLanguage();
  const polish = locale === "pl";
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<NonNullable<SalesPacket["deals"]>[number] | null | undefined>();
  const [archiving, setArchiving] = useState<NonNullable<SalesPacket["deals"]>[number] | null>(null);
  const [busy, setBusy] = useState(false);
  const packet = useOwnerPacket<SalesPacket>("/v1/sales/context?limit=80", true, t, refreshKey);
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
    },
    {
      key: "actions",
      header: t("table.actions"),
      cell: (row) => showingExample ? <span className="text-xs text-company-muted">{polish ? "Przykład" : "Example"}</span> : <div className="flex justify-end gap-1"><CcButton ariaLabel={polish ? "Edytuj szansę" : "Edit deal"} iconLeft="ph-pencil-simple" onClick={() => setEditing(row)} size="xs" variant="ghost"><span className="sr-only">{polish ? "Edytuj" : "Edit"}</span></CcButton><CcButton ariaLabel={polish ? "Archiwizuj szansę" : "Archive deal"} iconLeft="ph-archive" onClick={() => setArchiving(row)} size="xs" variant="ghost"><span className="sr-only">{polish ? "Archiwizuj" : "Archive"}</span></CcButton></div>
    }
  ];

  return (
    <>
      <CcPageHeader actions={<CcButton iconLeft="ph-plus" onClick={() => setEditing(null)} size="sm" variant="primary">{polish ? "Dodaj szansę" : "Add deal"}</CcButton>} eyebrow={t("sales.eyebrow")} title={t("sales.title")} description={t("sales.description")} />

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
      {editing !== undefined ? <DealEditor clients={packet.data?.clients || []} deal={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); setRefreshKey((value) => value + 1); }} polish={polish} /> : null}
      {archiving ? <CcConfirmDialog busy={busy} confirmIcon="ph-archive" confirmLabel={polish ? "Archiwizuj" : "Archive"} description={polish ? "Szansa pozostanie w historii, ale zniknie z aktywnego lejka." : "The deal remains in history but leaves the active pipeline."} detail={<strong>{archiving.title}</strong>} eyebrow={polish ? "Sprzedaż" : "Sales"} onCancel={() => setArchiving(null)} onConfirm={async () => { setBusy(true); try { await api(`/v1/deals/${archiving.id}`, { method: "DELETE" }); setArchiving(null); setRefreshKey((value) => value + 1); } finally { setBusy(false); } }} title={polish ? "Zarchiwizować szansę?" : "Archive deal?"} /> : null}
    </>
  );
}

function DealEditor({ clients, deal, onClose, onSaved, polish }: { clients: NonNullable<SalesPacket["clients"]>; deal: NonNullable<SalesPacket["deals"]>[number] | null; onClose: () => void; onSaved: () => void; polish: boolean }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); const form = new FormData(event.currentTarget);
    const rawValue = String(form.get("value") || "").trim(); const clientId = String(form.get("clientId") || "").trim();
    const body: Record<string, unknown> = { title: String(form.get("title") || "").trim(), currency: String(form.get("currency") || "CHF").trim(), status: String(form.get("status") || "lead") };
    if (rawValue) body.value = Number(rawValue); if (!deal && clientId) body.clientId = clientId;
    try { await api(deal ? `/v1/deals/${deal.id}` : "/v1/deals", { method: deal ? "PATCH" : "POST", body: JSON.stringify(body) }); onSaved(); }
    catch (caught) { setError(caught instanceof AppApiError ? caught.code : "request_failed"); }
    finally { setBusy(false); }
  }
  return <CcRecordEditorModal actions={<><CcButton onClick={onClose} variant="ghost">{polish ? "Anuluj" : "Cancel"}</CcButton><CcButton loading={busy} type="submit" variant="primary">{polish ? "Zapisz" : "Save"}</CcButton></>} description={polish ? "Szansa łączy klienta, wartość i etap pracy w jednym lejku." : "A deal connects the client, value and work stage in one pipeline."} eyebrow={polish ? "Sprzedaż" : "Sales"} onClose={onClose} onSubmit={submit} title={deal ? polish ? "Edytuj szansę" : "Edit deal" : polish ? "Dodaj szansę" : "Add deal"} titleId="deal-editor-title">
    {error ? <CcNotice live tone="error" title={humanizeBusinessValue(error)} /> : null}
    <CcRecordEditorSection title={polish ? "Dane szansy" : "Deal details"}><div className="grid gap-4 md:grid-cols-2">
      <CcField label={polish ? "Nazwa szansy" : "Deal title"} required>{({ id }) => <input className="input input-bordered w-full" defaultValue={deal?.title || ""} id={id} name="title" required />}</CcField>
      {!deal ? <CcField label={polish ? "Klient" : "Client"}>{({ id }) => <select className="select select-bordered w-full" id={id} name="clientId"><option value="">{polish ? "Bez przypisania" : "Unassigned"}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>}</CcField> : null}
      <CcField label={polish ? "Wartość" : "Value"}>{({ id }) => <input className="input input-bordered w-full" defaultValue={deal?.value ?? ""} id={id} min="0" name="value" step="0.01" type="number" />}</CcField>
      <CcField label={polish ? "Waluta" : "Currency"}>{({ id }) => <input className="input input-bordered w-full" defaultValue={deal?.currency || "CHF"} id={id} maxLength={3} name="currency" />}</CcField>
      <CcField label="Status">{({ id }) => <select className="select select-bordered w-full" defaultValue={deal?.status || "lead"} id={id} name="status"><option value="lead">Lead</option><option value="qualified">Qualified</option><option value="proposal">Proposal</option><option value="negotiation">Negotiation</option><option value="won">Won</option><option value="lost">Lost</option></select>}</CcField>
    </div></CcRecordEditorSection>
  </CcRecordEditorModal>;
}

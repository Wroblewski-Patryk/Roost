import { FormEvent, useMemo, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcConfirmDialog } from "../../components/cc-confirm-dialog";
import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcField } from "../../components/cc-field";
import { CcMultiSelect } from "../../components/cc-multi-select";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import type { CoreAreaKey } from "../../types";
import { departmentLabel } from "./department-labels";
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";

type Department = { id: string; key: CoreAreaKey; name: string; status: string };
type CompanyRecord = {
  id: string; recordType: string; key: string; title: string; description?: string | null; businessPurpose?: string | null;
  currentState?: string | null; desiredState?: string | null; expectedBehavior?: string | null; rationale?: string | null;
  acceptanceCriteria?: Array<string | Record<string, unknown>>; priority: string; status: string; functionalState: string; verificationState: string;
  implementationCoverage?: number | null; dueDate?: string | null; evidenceCount: number;
  organizationalContext?: { ownerDepartment?: Department | null; relatedDepartments?: Department[]; scopes?: Array<{ type: string }> };
};
type Draft = {
  title: string; description: string; businessPurpose: string; currentState: string; desiredState: string; expectedBehavior: string; rationale: string;
  acceptanceCriteria: string; priority: string; status: string; functionalState: string; verificationState: string; implementationCoverage: string; dueDate: string;
  ownerDepartmentKey: string; relatedDepartmentKeys: string[]; companyWide: boolean;
};

function label(value: string) { return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function localizedRecordType(recordType: string, polish: boolean) {
  if (!polish) return label(recordType);
  return ({ company_update: "Aktualizacje firmy", initiative: "Inicjatywy", requirement: "Wymagania", deliverable: "Rezultaty", commercial_offer: "Oferty handlowe", operational_issue: "Problemy operacyjne", operational_event: "Zdarzenia operacyjne", feedback: "Feedback i relacje", competency: "Kompetencje", budget: "Budżety", invoice: "Faktury", knowledge_record: "Baza wiedzy", technical_incident: "Incydenty techniczne", environment: "Środowiska", contract: "Umowy", compliance_item: "Rejestr zgodności", experiment: "Eksperymenty", portfolio_item: "Portfolio firmy", escalation: "Eskalacje", management_review: "Przeglądy zarządcze" } as Record<string, string>)[recordType] || label(recordType);
}
function draftFor(record: CompanyRecord | null, departmentKey: CoreAreaKey): Draft {
  return {
    title: record?.title || "", description: record?.description || "", businessPurpose: record?.businessPurpose || "", currentState: record?.currentState || "",
    desiredState: record?.desiredState || "", expectedBehavior: record?.expectedBehavior || "", rationale: record?.rationale || "",
    acceptanceCriteria: (record?.acceptanceCriteria || []).map((item) => typeof item === "string" ? item : JSON.stringify(item)).join("\n"),
    priority: record?.priority || "normal", status: record?.status || "active", functionalState: record?.functionalState || "unknown",
    verificationState: record?.verificationState || "not_started", implementationCoverage: record?.implementationCoverage?.toString() || "", dueDate: record?.dueDate?.slice(0, 10) || "",
    ownerDepartmentKey: record?.organizationalContext?.ownerDepartment?.key || departmentKey,
    relatedDepartmentKeys: record?.organizationalContext?.relatedDepartments?.map((department) => department.key) || [],
    companyWide: Boolean(record?.organizationalContext?.scopes?.some((scope) => scope.type === "company"))
  };
}

function RecordEditor({ record, recordType, departmentKey, departments, onClose, onSaved }: { record: CompanyRecord | null; recordType: string; departmentKey: CoreAreaKey; departments: Department[]; onClose: () => void; onSaved: () => void }) {
  const { locale, t } = useLanguage(); const polish = locale === "pl"; const recordName = localizedRecordType(recordType, polish); const [draft, setDraft] = useState(() => draftFor(record, departmentKey)); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const options = departments.map((department) => ({ value: department.key, label: departmentLabel(department.key, t) }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      await api(record ? `/v1/company-records/${record.id}` : "/v1/company-records", { method: record ? "PATCH" : "POST", body: JSON.stringify({
        ...(!record ? { recordType } : {}), title: draft.title, description: draft.description || null, businessPurpose: draft.businessPurpose || null,
        currentState: draft.currentState || null, desiredState: draft.desiredState || null, expectedBehavior: draft.expectedBehavior || null, rationale: draft.rationale || null,
        acceptanceCriteria: draft.acceptanceCriteria.split("\n").map((item) => item.trim()).filter(Boolean), priority: draft.priority, status: draft.status,
        functionalState: draft.functionalState, verificationState: draft.verificationState, implementationCoverage: draft.implementationCoverage ? Number(draft.implementationCoverage) : null,
        dueDate: draft.dueDate ? new Date(`${draft.dueDate}T12:00:00.000Z`).toISOString() : null,
        organizationalContext: { ownerDepartmentKey: draft.ownerDepartmentKey, relatedDepartmentKeys: draft.relatedDepartmentKeys.filter((key) => key !== draft.ownerDepartmentKey), applicableDepartmentKeys: [], scopes: draft.companyWide ? [{ type: "company" }] : [{ type: "department", entityId: draft.ownerDepartmentKey }] }
      }) }); onSaved();
    } catch (caught) { setError(caught instanceof AppApiError ? caught.code : "request_failed"); } finally { setBusy(false); }
  }
  return <CcRecordEditorModal actions={<><CcButton onClick={onClose} variant="ghost">{t("common.cancel")}</CcButton><CcButton loading={busy} type="submit" variant="primary">{t("common.save")}</CcButton></>} description={polish ? "Jeden wspólny rekord firmy, dostępny w każdym właściwym kontekście działowym." : "One shared company record, available in every relevant department context."} eyebrow={recordName} onClose={onClose} onSubmit={submit} title={`${record ? polish ? "Edytuj" : "Edit" : polish ? "Utwórz" : "Create"} ${recordName.toLowerCase()}`} titleId="company-record-editor-title">
    {error ? <CcNotice live tone="error" title={humanizeBusinessValue(error)} /> : null}
    <CcRecordEditorSection title={polish ? "Definicja" : "Definition"}><div className="grid gap-4 md:grid-cols-2">
      <CcField label={polish ? "Tytuł" : "Title"} required>{({ id, describedBy }) => <input aria-describedby={describedBy} className="input input-bordered w-full" id={id} maxLength={240} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required value={draft.title} />}</CcField>
      <CcField label={polish ? "Cel biznesowy" : "Business purpose"}>{({ id, describedBy }) => <input aria-describedby={describedBy} className="input input-bordered w-full" id={id} onChange={(event) => setDraft({ ...draft, businessPurpose: event.target.value })} value={draft.businessPurpose} />}</CcField>
      <CcField label={polish ? "Opis" : "Description"}>{({ id, describedBy }) => <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" id={id} onChange={(event) => setDraft({ ...draft, description: event.target.value })} value={draft.description} />}</CcField>
      <CcField label={polish ? "Uzasadnienie" : "Rationale"}>{({ id, describedBy }) => <textarea aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" id={id} onChange={(event) => setDraft({ ...draft, rationale: event.target.value })} value={draft.rationale} />}</CcField>
    </div></CcRecordEditorSection>
    <CcRecordEditorSection description={polish ? "Oddziel deklaracje od zaobserwowanego stanu wdrożenia." : "Separate declarations from observed implementation state."} title={polish ? "Stan oczekiwany i obserwowany" : "Expected and observed state"}><div className="grid gap-4 md:grid-cols-3">
      <CcField label={polish ? "Stan obecny" : "Current state"}>{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" id={id} onChange={(event) => setDraft({ ...draft, currentState: event.target.value })} value={draft.currentState} />}</CcField>
      <CcField label={polish ? "Stan docelowy" : "Desired state"}>{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" id={id} onChange={(event) => setDraft({ ...draft, desiredState: event.target.value })} value={draft.desiredState} />}</CcField>
      <CcField label={polish ? "Oczekiwane zachowanie" : "Expected behavior"}>{({ id }) => <textarea className="textarea textarea-bordered min-h-24 w-full" id={id} onChange={(event) => setDraft({ ...draft, expectedBehavior: event.target.value })} value={draft.expectedBehavior} />}</CcField>
      <CcField label={polish ? "Kryteria akceptacji (jedno na linię)" : "Acceptance criteria (one per line)"}>{({ id }) => <textarea className="textarea textarea-bordered min-h-28 w-full" id={id} onChange={(event) => setDraft({ ...draft, acceptanceCriteria: event.target.value })} value={draft.acceptanceCriteria} />}</CcField>
      <div className="grid content-start gap-4"><CcField label={polish ? "Stan funkcjonalny" : "Functional state"}>{({ id }) => <CcSelect id={id} onChange={(event) => setDraft({ ...draft, functionalState: event.target.value })} value={draft.functionalState}>{["discovered", "expected", "missing", "implemented", "partially_implemented", "broken", "verified_working", "unknown", "deprecated"].map((value) => <option key={value} value={value}>{humanizeBusinessValue(value, undefined, locale)}</option>)}</CcSelect>}</CcField><CcField label={polish ? "Weryfikacja" : "Verification"}>{({ id }) => <CcSelect id={id} onChange={(event) => setDraft({ ...draft, verificationState: event.target.value })} value={draft.verificationState}>{["not_started", "pending", "passed", "failed", "waived"].map((value) => <option key={value} value={value}>{humanizeBusinessValue(value, undefined, locale)}</option>)}</CcSelect>}</CcField></div>
      <div className="grid content-start gap-4"><CcField label={polish ? "Pokrycie wdrożenia %" : "Implementation coverage %"}>{({ id }) => <input className="input input-bordered w-full" id={id} max="100" min="0" onChange={(event) => setDraft({ ...draft, implementationCoverage: event.target.value })} type="number" value={draft.implementationCoverage} />}</CcField><CcField label={polish ? "Termin" : "Due date"}>{({ id }) => <input className="input input-bordered w-full" id={id} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} type="date" value={draft.dueDate} />}</CcField></div>
    </div></CcRecordEditorSection>
    <CcRecordEditorSection title={polish ? "Kontrola i kontekst organizacyjny" : "Control and organizational context"}><div className="grid gap-4 md:grid-cols-2">
      <div className="grid grid-cols-2 gap-3"><CcField label="Status">{({ id }) => <CcSelect id={id} onChange={(event) => setDraft({ ...draft, status: event.target.value })} value={draft.status}>{["active", "planned", "blocked", "completed"].map((value) => <option key={value}>{humanizeBusinessValue(value, undefined, locale)}</option>)}</CcSelect>}</CcField><CcField label={polish ? "Priorytet" : "Priority"}>{({ id }) => <CcSelect id={id} onChange={(event) => setDraft({ ...draft, priority: event.target.value })} value={draft.priority}>{["critical", "high", "normal", "low"].map((value) => <option key={value}>{humanizeBusinessValue(value, undefined, locale)}</option>)}</CcSelect>}</CcField></div>
      <CcField label={polish ? "Dział właścicielski" : "Owner department"}>{({ id }) => <CcSelect id={id} onChange={(event) => setDraft({ ...draft, ownerDepartmentKey: event.target.value })} value={draft.ownerDepartmentKey}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</CcSelect>}</CcField>
      <CcField label={polish ? "Powiązane działy" : "Related departments"}>{({ id }) => <CcMultiSelect id={id} name="relatedDepartmentKeys" onChange={(value) => setDraft({ ...draft, relatedDepartmentKeys: value })} options={options.filter((option) => option.value !== draft.ownerDepartmentKey)} value={draft.relatedDepartmentKeys} />}</CcField>
      <label className="flex min-h-11 items-center gap-3 rounded-company border border-base-300 px-3 py-2 text-sm font-bold"><input checked={draft.companyWide} className="checkbox checkbox-primary checkbox-sm" onChange={(event) => setDraft({ ...draft, companyWide: event.target.checked })} type="checkbox" />{polish ? "Zakres całej firmy" : "Company-wide scope"}</label>
    </div></CcRecordEditorSection>
  </CcRecordEditorModal>;
}

export function CompanyRecordsWorkbench({ departmentKey, recordType, title }: { departmentKey: CoreAreaKey; recordType: string; title?: string }) {
  const { locale, t } = useLanguage(); const polish = locale === "pl"; const recordName = localizedRecordType(recordType, polish); const [refreshKey, setRefreshKey] = useState(0); const [editing, setEditing] = useState<CompanyRecord | null | undefined>(undefined); const [archiveRecord, setArchiveRecord] = useState<CompanyRecord | null>(null); const [archiveBusy, setArchiveBusy] = useState(false);
  const packet = useOwnerPacket<CompanyRecord[]>(`/v1/company-records?recordType=${encodeURIComponent(recordType)}&departmentKey=${departmentKey}&includeCompanyWide=true&refresh=${refreshKey}`, true, t);
  const departmentPacket = useOwnerPacket<{ departments: Department[] }>(`/v1/departments?refresh=${refreshKey}`, true, t); const rows = packet.data || []; const tableLabels = useTranslatedTableLabels();
  const columns = useMemo<Array<CcTableColumn<CompanyRecord>>>(() => [
    { key: "record", header: recordName, sortable: true, searchValue: (row) => `${row.title} ${row.description || ""} ${row.businessPurpose || ""}`, cell: (row) => <button className="grid text-left" onClick={() => setEditing(row)} type="button"><strong>{row.title}</strong><span className="text-xs text-company-muted">{row.businessPurpose || row.description || row.key}</span></button> },
    { key: "owner", header: polish ? "Właściciel" : "Owner", filterable: true, filterValue: (row) => row.organizationalContext?.ownerDepartment?.key || "unassigned", cell: (row) => <span className="text-sm text-company-muted">{row.organizationalContext?.ownerDepartment ? departmentLabel(row.organizationalContext.ownerDepartment.key, t) : polish ? "Nieprzypisane" : "Unassigned"}</span> },
    { key: "state", header: polish ? "Stan funkcjonalny" : "Functional state", filterable: true, filterValue: (row) => row.functionalState, cell: (row) => <span className="badge badge-outline">{humanizeBusinessValue(row.functionalState, undefined, locale)}</span> },
    { key: "coverage", header: polish ? "Pokrycie" : "Coverage", sortValue: (row) => row.implementationCoverage ?? -1, cell: (row) => <span className="text-sm text-company-muted">{row.implementationCoverage == null ? "—" : `${row.implementationCoverage}%`}</span> },
    { key: "evidence", header: polish ? "Dowody" : "Evidence", sortValue: (row) => row.evidenceCount, cell: (row) => <span className="text-sm text-company-muted">{row.evidenceCount}</span> },
    { key: "status", header: t("table.status"), filterable: true, filterValue: (row) => row.status, cell: (row) => <span className="badge badge-outline">{label(row.status)}</span> },
    { key: "actions", header: t("table.actions"), cell: (row) => <div className="flex justify-end gap-1"><CcButton ariaLabel="Edit" iconLeft="ph-pencil-simple" onClick={() => setEditing(row)} size="xs" variant="ghost"><span className="sr-only">Edit</span></CcButton>{row.status !== "archived" ? <CcButton ariaLabel="Archive" iconLeft="ph-archive" onClick={() => setArchiveRecord(row)} size="xs" variant="ghost"><span className="sr-only">Archive</span></CcButton> : null}</div> }
  ], [locale, polish, recordName, t]);
  function refresh() { setEditing(undefined); setRefreshKey((value) => value + 1); }
  async function confirmArchive() { if (!archiveRecord) return; setArchiveBusy(true); try { await api(`/v1/company-records/${archiveRecord.id}`, { method: "DELETE" }); setArchiveRecord(null); refresh(); } finally { setArchiveBusy(false); } }
  return <><CcPageHeader actions={<CcButton iconLeft="ph-plus" onClick={() => setEditing(null)} size="sm" variant="primary">{polish ? "Utwórz" : "Create"}</CcButton>} description={polish ? `Wspólne rekordy „${recordName.toLowerCase()}” widoczne w tym dziale przez kontekst organizacyjny. Rekord kanoniczny nigdy nie jest kopiowany.` : `Shared ${label(recordType).toLowerCase()} records visible here through organizational context. The canonical object is never copied.`} eyebrow={departmentLabel(departmentKey, t)} title={polish ? recordName : title || recordName} />
    {packet.status === "error" ? <CcNotice live tone="error" title={packet.error || "Records could not load."} /> : null}
    <CcDataTable columns={columns} rows={rows} emptyDetail={polish ? "Utwórz pierwszy rekord i przypisz jego zakres organizacyjny." : `Create the first ${label(recordType).toLowerCase()} record and assign its scope.`} emptyTitle={polish ? `Brak rekordów: ${recordName.toLowerCase()}` : `No ${label(recordType).toLowerCase()} records`} error={packet.status === "error" ? packet.error || "Records could not load." : null} getRowLabel={(row) => row.title} labels={tableLabels} loading={packet.status === "loading"} mobileMode="cards" />
    {editing !== undefined ? <RecordEditor departmentKey={departmentKey} departments={departmentPacket.data?.departments || []} onClose={() => setEditing(undefined)} onSaved={refresh} record={editing} recordType={recordType} /> : null}
    {archiveRecord ? <CcConfirmDialog busy={archiveBusy} confirmIcon="ph-archive" confirmLabel="Archive" confirmTone="warning" description="The record remains auditable and can be queried with archived status." detail={<strong>{archiveRecord.title}</strong>} eyebrow={label(recordType)} onCancel={() => setArchiveRecord(null)} onConfirm={confirmArchive} title="Archive record?" /> : null}</>;
}

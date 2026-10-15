import { CapabilitySuspensionModal } from "./capability-suspension";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { AuthMe, CoreAreaKey } from "../../types";
import { departmentLabel } from "./department-labels";
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";
import { RuntimeRedactionNotice, type RedactionIncident } from "./runtime-redaction-notice";
import { recordIdFromQuery } from "../../owner-record-navigation";
import { navigateApp } from "../../app-navigation";
import { CompanySourcePanel } from "./company-source-panel";

type Department = { id: string; key: CoreAreaKey; name: string; status: string };
type CompanyRecord = {
  activeSuspensionCount?: number; source?: string; metadata?: RedactionIncident;
  id: string; recordType: string; key: string; title: string; description?: string | null; businessPurpose?: string | null;
  currentState?: string | null; desiredState?: string | null; expectedBehavior?: string | null; rationale?: string | null;
  acceptanceCriteria?: Array<string | Record<string, unknown>>; priority: string; status: string; functionalState: string; verificationState: string;
  implementationCoverage?: number | null; dueDate?: string | null; evidenceCount: number;
  organizationalContext?: { ownerDepartment?: Department | null; relatedDepartments?: Department[]; scopes?: Array<{ type: string }> };
};
type RegistryRecord = {
  id: string; title: string; key: string; recordType: string; status: string; priority: string; functionalState: string;
  verificationState: string; source: string; metadata?: { sourceKind?: string | null; sourceSystem?: string | null; sourceId?: string | null; filePath?: string | null } | null;
  updatedAt: string; createdAt: string; evidenceCount: number; activeSuspensionCount?: number;
  organizationalContext?: { ownerDepartment?: Pick<Department, "id" | "key" | "name"> | null };
};
type RegistryPage = { items: RegistryRecord[]; total: number; page: number; pageSize: number };
type RecordRef = { id: string; title: string; status: string };
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
function verificationLabel(value: string, polish: boolean) {
  const labels: Record<string, [string, string]> = {
    not_started: ["Brak weryfikacji", "Not verified"], pending: ["Weryfikacja w toku", "Verification pending"],
    passed: ["Zweryfikowany", "Verified"], failed: ["Weryfikacja nieudana", "Verification failed"],
    waived: ["Odstąpiono od weryfikacji", "Verification waived"]
  };
  return labels[value]?.[polish ? 0 : 1] || humanizeBusinessValue(value, undefined, polish ? "pl" : "en");
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

function RecordEditor({ record, recordType, departmentKey, departments, onClose, onSaved, onArchive }: { record: CompanyRecord | null; recordType: string; departmentKey: CoreAreaKey; departments: Department[]; onClose: () => void; onSaved: () => void; onArchive: (record: CompanyRecord) => void }) {
  const { locale, t } = useLanguage(); const polish = locale === "pl"; const recordName = localizedRecordType(recordType, polish); const [draft, setDraft] = useState(() => draftFor(record, departmentKey)); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [showSuspensions,setShowSuspensions]=useState(false);
  const options = departments.map((department) => ({ value: department.key, label: departmentLabel(department.key, t) }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      if (record?.source === "runtime_redaction_v1") { await api(`/v1/company-records/${record.id}`, { method: "PATCH", body: JSON.stringify({ status: draft.status, priority: draft.priority }) }); onSaved(); return; }
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
  if(showSuspensions&&record)return <CapabilitySuspensionModal incidentId={record.id} onClose={()=>setShowSuspensions(false)}/>;
  const suspensionButton=record&&recordType==="technical_incident"?<CcButton variant="outline" disabled={busy||JSON.stringify(draft)!==JSON.stringify(draftFor(record,departmentKey))} onClick={()=>setShowSuspensions(true)}>{polish?"Zawieszenie uprawnień":"Capability suspension"}</CcButton>:null;
  if (record?.source === "runtime_redaction_v1") return <CcRecordEditorModal actions={<><CcButton onClick={onClose} variant="ghost">{t("common.cancel")}</CcButton><CcButton loading={busy} type="submit" variant="primary">{t("common.save")}</CcButton></>} eyebrow={recordName} onClose={onClose} onSubmit={submit} title={polish ? "Incydent ochrony treści" : "Content protection incident"} titleId="company-record-editor-title">
    {error ? <CcNotice tone="error" title={humanizeBusinessValue(error)} /> : null}
    {suspensionButton}
    <RuntimeRedactionNotice incidents={[record.metadata || {}]} />
    <CcField label="Status">{({ id }) => <CcSelect id={id} value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}>{["active", "blocked", "completed"].map(value => <option key={value} value={value}>{humanizeBusinessValue(value, undefined, locale)}</option>)}</CcSelect>}</CcField>
  </CcRecordEditorModal>;
  return <CcRecordEditorModal actions={<>{record && record.status !== "archived" ? <CcButton disabled={busy} onClick={() => onArchive(record)} variant="outline">{polish ? "Archiwizuj" : "Archive"}</CcButton> : null}<CcButton onClick={onClose} variant="ghost">{t("common.cancel")}</CcButton><CcButton loading={busy} type="submit" variant="primary">{t("common.save")}</CcButton></>} description={polish ? "Jeden wspólny rekord firmy, dostępny w każdym właściwym kontekście działowym." : "One shared company record, available in every relevant department context."} eyebrow={recordName} onClose={onClose} onSubmit={submit} title={`${record ? polish ? "Edytuj" : "Edit" : polish ? "Utwórz" : "Create"} ${recordName.toLowerCase()}`} titleId="company-record-editor-title">
    {suspensionButton}
    {error ? <CcNotice live tone="error" title={humanizeBusinessValue(error)} /> : null}
    {record?.source === "runtime_redaction_v1" ? <RuntimeRedactionNotice incidents={[record.metadata || {}]} /> : null}
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

function HistoricalRecordDetail({ record, recordType, ownerRole, onClose, onSource }: { record: CompanyRecord; recordType: string; ownerRole: boolean; onClose: () => void; onSource: () => void }) {
  const { locale } = useLanguage();
  const polish = locale === "pl";
  const details: Array<[string, string | null | undefined]> = [
    [polish ? "Klucz" : "Key", record.key],
    [polish ? "Opis" : "Description", record.description],
    [polish ? "Cel biznesowy" : "Business purpose", record.businessPurpose],
    [polish ? "Uzasadnienie" : "Rationale", record.rationale],
    [polish ? "Stan obecny" : "Current state", record.currentState],
    [polish ? "Stan docelowy" : "Desired state", record.desiredState],
    [polish ? "Oczekiwane zachowanie" : "Expected behavior", record.expectedBehavior],
    [polish ? "Kryteria akceptacji" : "Acceptance criteria", record.acceptanceCriteria?.map(item => typeof item === "string" ? item : JSON.stringify(item)).join("\n")],
    [polish ? "Priorytet" : "Priority", humanizeBusinessValue(record.priority, undefined, locale)],
    [polish ? "Stan funkcjonalny" : "Functional state", humanizeBusinessValue(record.functionalState, undefined, locale)],
    [polish ? "Pokrycie wdrożenia" : "Implementation coverage", record.implementationCoverage == null ? null : `${record.implementationCoverage}%`],
    [polish ? "Termin" : "Due date", record.dueDate],
    [polish ? "Dział właścicielski" : "Owner department", record.organizationalContext?.ownerDepartment?.name || record.organizationalContext?.ownerDepartment?.key],
    [polish ? "Powiązane działy" : "Related departments", record.organizationalContext?.relatedDepartments?.map(department => department.name || department.key).join(", ")],
    [polish ? "Zakres całej firmy" : "Company-wide scope", record.organizationalContext?.scopes?.some(scope => scope.type === "company") ? polish ? "Tak" : "Yes" : polish ? "Nie" : "No"],
    [polish ? "Pochodzenie" : "Source", record.source],
    [polish ? "Weryfikacja rekordu" : "Record verification", verificationLabel(record.verificationState, polish)]
  ];
  return <CcRecordEditorModal actions={<>{ownerRole ? <CcButton onClick={onSource} variant="outline">{polish ? "Źródło" : "Source"}</CcButton> : null}<CcButton onClick={onClose} variant="primary">{polish ? "Zamknij" : "Close"}</CcButton></>} closeLabel={polish ? "Zamknij szczegóły historyczne" : "Close historical detail"} description={polish ? "Zarchiwizowany rekord jest dostępny do odczytu." : "This archived record is available for reading."} eyebrow={localizedRecordType(recordType, polish)} onClose={onClose} onSubmit={event => event.preventDefault()} title={`${polish ? "Zarchiwizowany rekord" : "Archived record"}: ${record.title}`} titleId="company-record-history-title">
    <CcNotice tone="info" title={polish ? "Status: zarchiwizowany" : "Status: archived"} />
    <CcRecordEditorSection title={polish ? "Szczegóły rekordu" : "Record details"}><dl className="grid gap-4 sm:grid-cols-2">{details.map(([name, value]) => <div className="min-w-0" key={name}><dt className="text-xs font-bold uppercase tracking-wide text-company-muted">{name}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-company-ink">{value || (polish ? "Nie zapisano" : "Not recorded")}</dd></div>)}</dl></CcRecordEditorSection>
  </CcRecordEditorModal>;
}

export function CompanyRecordsWorkbench({ departmentKey, recordType, title }: { departmentKey: CoreAreaKey; recordType: string; title?: string }) {
  const { locale, t } = useLanguage();
  const polish = locale === "pl";
  const recordName = localizedRecordType(recordType, polish);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<CompanyRecord | null | undefined>(undefined);
  const [auditRecord, setAuditRecord] = useState<RecordRef | null>(null);
  const [archiveRecord, setArchiveRecord] = useState<RecordRef | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [ownerRole, setOwnerRole] = useState<boolean | null>(null);
  const [ownerCheckError, setOwnerCheckError] = useState(false);
  const [authRefreshKey, setAuthRefreshKey] = useState(0);
  const [scope, setScope] = useState<"current" | "history">("current");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [registry, setRegistry] = useState<RegistryPage | null>(null);
  const [registryStatus, setRegistryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [registryError, setRegistryError] = useState("");
  const [detailTarget, setDetailTarget] = useState<RecordRef | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const registryRequest = useRef(0);
  const detailRequest = useRef(0);
  const requestedRecordId = recordIdFromQuery(window.location.search, "recordId");
  const sourceAuditRequested = new URLSearchParams(window.location.search).get("sourceAudit") === "1";
  const registerPath = `/areas?area=${departmentKey}&view=${encodeURIComponent(new URLSearchParams(window.location.search).get("view") || "overview")}`;
  const hasInvalidRecordId = new URLSearchParams(window.location.search).has("recordId") && !requestedRecordId;
  const fromAttention = new URLSearchParams(window.location.search).get("from") === "attention";
  const [navigationError, setNavigationError] = useState(hasInvalidRecordId);
  useEffect(() => {
    let active = true;
    setOwnerRole(null); setOwnerCheckError(false);
    void api<{ data: AuthMe }>("/v1/auth/me").then(({ data }) => {
      if (active) setOwnerRole(data.authType === "user" && data.workspaces?.some(workspace => workspace.active && workspace.role === "owner") === true);
    }).catch(() => { if (active) setOwnerCheckError(true); });
    return () => { active = false; };
  }, [authRefreshKey]);
  useEffect(() => {
    if (!requestedRecordId) { setNavigationError(hasInvalidRecordId); setAuditRecord(null); return; }
    if (sourceAuditRequested && ownerRole !== true) { setAuditRecord(null); return; }
    setNavigationError(false);
    let current = true;
    void api<{ data: CompanyRecord }>(`/v1/company-records/${requestedRecordId}`).then(response => {
      if (!current) return;
      if (response.data?.id !== requestedRecordId || response.data.recordType !== recordType) throw new Error("record_navigation_mismatch");
      if (sourceAuditRequested) { setEditing(undefined); setAuditRecord(response.data); }
      else { setAuditRecord(null); setEditing(response.data); }
    }).catch(() => { if (current) setNavigationError(true); });
    return () => { current = false; };
  }, [requestedRecordId, recordType, hasInvalidRecordId, sourceAuditRequested, ownerRole]);
  const searchPending = searchInput.trim() !== query;
  useEffect(() => {
    if (!searchPending) return;
    const timeout = window.setTimeout(() => { setQuery(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput, searchPending]);
  useEffect(() => {
    if (ownerRole === null || ownerCheckError || searchPending) return;
    const request = ++registryRequest.current;
    let active = true;
    setRegistry(null);
    setRegistryError("");
    setRegistryStatus("loading");
    const params = new URLSearchParams({ recordType, departmentKey, includeCompanyWide: "true", scope, q: query, page: String(page), pageSize: "50" });
    void api<{ data: RegistryPage }>(`/v1/company-records/registry?${params}`).then(({ data }) => {
      if (!active || request !== registryRequest.current) return;
      const lastPage = Math.max(1, Math.ceil(data.total / 50));
      if (page > lastPage) { setPage(lastPage); return; }
      setRegistry(data);
      setRegistryStatus("ready");
    }).catch(error => {
      if (!active || request !== registryRequest.current) return;
      setRegistryError(error instanceof AppApiError ? error.code : "request_failed");
      setRegistryStatus("error");
    });
    return () => { active = false; registryRequest.current += 1; };
  }, [ownerRole, ownerCheckError, searchPending, recordType, departmentKey, scope, query, page, refreshKey]);
  const departmentPacket = useOwnerPacket<{ departments: Department[] }>(`/v1/departments?refresh=${refreshKey}`, true, t);
  const rows = registry?.items || [];
  const tableLabels = useTranslatedTableLabels();
  const openEditor = useCallback((reference: RecordRef) => {
    const request = ++detailRequest.current;
    setDetailTarget(reference);
    setDetailLoading(true);
    setDetailError("");
    void api<{ data: CompanyRecord }>(`/v1/company-records/${encodeURIComponent(reference.id)}`).then(({ data }) => {
      if (request !== detailRequest.current) return;
      if (data.id !== reference.id || data.recordType !== recordType) throw new Error("record_navigation_mismatch");
      setEditing(data);
      setDetailTarget(null);
    }).catch(error => {
      if (request === detailRequest.current) setDetailError(error instanceof AppApiError ? error.code : "request_failed");
    }).finally(() => { if (request === detailRequest.current) setDetailLoading(false); });
  }, [recordType]);
  const columns = useMemo<Array<CcTableColumn<RegistryRecord>>>(() => [
    { key: "record", header: recordName, cell: row => <button className="grid min-w-0 text-left" onClick={() => openEditor(row)} type="button"><strong className="break-words">{row.title}</strong><span className="break-all text-xs text-company-muted">{row.key}</span></button> },
    { key: "owner", header: polish ? "Właściciel" : "Owner", cell: row => <span className="text-sm text-company-muted">{row.organizationalContext?.ownerDepartment ? departmentLabel(row.organizationalContext.ownerDepartment.key, t) : polish ? "Nieprzypisane" : "Unassigned"}</span> },
    { key: "source", header: polish ? "Pochodzenie" : "Source", cell: row => <span className="grid min-w-0 text-sm"><strong className="break-words">{row.source ? humanizeBusinessValue(row.source, undefined, locale) : polish ? "Nie zapisano" : "Not recorded"}</strong><span className="break-words text-company-muted">{[row.metadata?.sourceKind, row.metadata?.sourceSystem].filter(Boolean).join(" · ") || (polish ? "Brak metadanych źródła" : "No source metadata")}</span></span> },
    { key: "verification", header: polish ? "Weryfikacja rekordu" : "Record verification", cell: row => <span className="badge badge-outline whitespace-normal text-left">{verificationLabel(row.verificationState, polish)}</span> },
    { key: "evidence", header: polish ? "Dowody" : "Evidence", cell: row => <span className="text-sm text-company-muted">{row.evidenceCount}</span> },
    { key: "status", header: t("table.status"), cell: row => <span className="grid gap-1"><span className="badge badge-outline">{humanizeBusinessValue(row.status, undefined, locale)}</span>{row.activeSuspensionCount ? <span className="text-xs text-warning">{polish ? "Uprawnienie zablokowane" : "Capability blocked"}</span> : null}</span> },
    { key: "actions", header: t("table.actions"), cell: row => <div className="flex flex-wrap justify-end gap-1">{ownerRole ? <CcButton ariaLabel={polish ? `Pochodzenie i dopuszczenie: ${row.title}` : `Source provenance and eligibility: ${row.title}`} iconLeft="ph-shield-check" onClick={() => { detailRequest.current += 1; setEditing(undefined); setDetailTarget(null); setDetailLoading(false); setDetailError(""); setAuditRecord(row); navigateApp(`${registerPath}&recordId=${encodeURIComponent(row.id)}&sourceAudit=1`); }} size="xs" variant="outline">{polish ? "Źródło" : "Source"}</CcButton> : null}<CcButton ariaLabel={row.status === "archived" ? polish ? `Zobacz: ${row.title}` : `View: ${row.title}` : polish ? `Edytuj: ${row.title}` : `Edit: ${row.title}`} iconLeft={row.status === "archived" ? "ph-eye" : "ph-pencil-simple"} onClick={() => openEditor(row)} size="xs" variant="ghost"><span className="sr-only">{row.status === "archived" ? polish ? "Zobacz" : "View" : polish ? "Edytuj" : "Edit"}</span></CcButton>{row.status !== "archived" ? <CcButton ariaLabel={polish ? `Archiwizuj: ${row.title}` : `Archive: ${row.title}`} iconLeft="ph-archive" onClick={() => setArchiveRecord(row)} size="xs" variant="ghost"><span className="sr-only">{polish ? "Archiwizuj" : "Archive"}</span></CcButton> : null}</div> }
  ], [locale, polish, recordName, t, ownerRole, registerPath, openEditor]);
  function refresh() { setEditing(undefined); setDetailTarget(null); setRefreshKey(value => value + 1); }
  function changeScope(next: "current" | "history") { detailRequest.current += 1; setDetailTarget(null); setDetailLoading(false); setDetailError(""); setScope(next); setPage(1); }
  async function confirmArchive() {
    if (!archiveRecord) return;
    setArchiveBusy(true); setArchiveError("");
    try {
      await api(`/v1/company-records/${archiveRecord.id}`, { method: "DELETE" });
      const wasDeepLink = requestedRecordId === archiveRecord.id;
      setArchiveRecord(null);
      if (wasDeepLink) navigateApp(registerPath);
      refresh();
    } catch (error) { setArchiveError(error instanceof AppApiError ? error.code : "request_failed"); }
    finally { setArchiveBusy(false); }
  }
  const total = registry?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 50));
  const start = total ? (page - 1) * 50 + 1 : 0;
  const end = Math.min(page * 50, total);
  const searchActive = Boolean(query);
  const emptyTitle = searchActive ? polish ? "Brak wyników" : "No matching records" : scope === "history" ? polish ? "Brak archiwalnych rekordów" : "No archived records" : polish ? "Brak bieżących rekordów" : "No current records";
  const emptyDetail = searchActive ? polish ? "Zmień zapytanie lub przełącz widok bieżący i historię." : "Change the search or switch between current records and history." : scope === "history" ? polish ? "Zarchiwizowane rekordy pojawią się tutaj i pozostaną dostępne do audytu." : "Archived records will remain available here for audit." : polish ? "Utwórz pierwszy rekord albo sprawdź historię." : "Create a record or check history.";
  const pager = (position: "top" | "bottom") => <nav aria-label={position === "top" ? polish ? "Strony rejestru, góra" : "Register pages, top" : polish ? "Strony rejestru" : "Register pages"} className="flex flex-wrap items-center justify-between gap-3 rounded-company border border-base-300 bg-base-100 px-4 py-3 text-sm">
    <span aria-live={position === "top" ? "polite" : undefined} className="font-bold text-company-muted">{polish ? `${start}–${end} z ${total}` : `${start}–${end} of ${total}`}</span>
    <div className="flex items-center gap-2"><span className="text-company-muted">{polish ? `Strona ${page} z ${totalPages}` : `Page ${page} of ${totalPages}`}</span><CcButton disabled={registryStatus !== "ready" || page <= 1} onClick={() => setPage(value => value - 1)} size="sm" variant="outline">{polish ? "Poprzednia" : "Previous"}</CcButton><CcButton disabled={registryStatus !== "ready" || page >= totalPages} onClick={() => setPage(value => value + 1)} size="sm" variant="outline">{polish ? "Następna" : "Next"}</CcButton></div>
  </nav>;
  return <><CcPageHeader actions={ownerRole !== null && !ownerCheckError ? <CcButton iconLeft="ph-plus" onClick={() => setEditing(null)} size="sm" variant="primary">{polish ? "Utwórz" : "Create"}</CcButton> : null} description={polish ? `Wspólne rekordy „${recordName.toLowerCase()}” widoczne w tym dziale przez kontekst organizacyjny. Rekord kanoniczny nigdy nie jest kopiowany.` : `Shared ${label(recordType).toLowerCase()} records visible here through organizational context. The canonical object is never copied.`} eyebrow={departmentLabel(departmentKey, t)} title={polish ? recordName : title || recordName} />
    {navigationError ? <CcNotice live tone="error" title={polish ? "Wskazany rekord jest niedostępny w tym workspace." : "The requested record is unavailable in this workspace."} action={<CcButton href={registerPath} variant="outline">{polish ? "Otwórz rejestr" : "Open register"}</CcButton>} /> : null}
    {sourceAuditRequested && ownerRole === false ? <CcNotice live tone="warning" title={polish ? "Audyt źródła jest dostępny tylko właścicielowi workspace." : "Source audit is available only to the workspace owner."} action={<CcButton href={registerPath} variant="outline">{polish ? "Otwórz rejestr" : "Open register"}</CcButton>} /> : null}
    {fromAttention ? <CcButton href="/areas?area=00-ogolny&view=overview" variant="ghost">{polish ? "Wróć do uwag" : "Back to attention"}</CcButton> : null}
    {ownerCheckError ? <CcNotice live tone="error" title={polish ? "Nie udało się sprawdzić uprawnień do rejestru." : "Register permissions could not be checked."} action={<CcButton onClick={() => setAuthRefreshKey(value => value + 1)} variant="outline">{polish ? "Ponów" : "Retry"}</CcButton>} /> : null}
    {!ownerCheckError && ownerRole === null ? <CcNotice tone="loading" title={polish ? "Sprawdzanie dostępu do rejestru" : "Checking register access"} /> : null}
    {ownerRole !== null && !ownerCheckError ? <>
      <section aria-label={polish ? "Filtry rejestru" : "Register filters"} className="roost-work-panel grid gap-3 rounded-company p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
        <div aria-label={polish ? "Zakres rejestru" : "Register scope"} className="flex flex-wrap gap-2" role="group">
          <button aria-pressed={scope === "current"} className={`btn btn-sm ${scope === "current" ? "btn-primary" : "btn-outline"}`} onClick={() => changeScope("current")} type="button">{polish ? "Bieżące" : "Current"}</button>
          <button aria-pressed={scope === "history"} className={`btn btn-sm ${scope === "history" ? "btn-primary" : "btn-outline"}`} onClick={() => changeScope("history")} type="button">{polish ? "Historia" : "History"}</button>
        </div>
        <label className="grid min-w-0 gap-1 text-sm font-bold text-company-ink" htmlFor="company-records-register-search">{polish ? "Szukaj w rejestrze" : "Search register"}
          <input className="input input-bordered w-full" id="company-records-register-search" maxLength={120} onChange={event => { const next = event.target.value; if (next.trim() !== query) { registryRequest.current += 1; detailRequest.current += 1; setDetailTarget(null); setDetailLoading(false); setDetailError(""); setRegistryStatus("loading"); setPage(1); } else if (searchPending) { setRefreshKey(value => value + 1); } setSearchInput(next); }} placeholder={polish ? "Tytuł, klucz lub opis" : "Title, key or description"} type="search" value={searchInput} />
        </label>
      </section>
      <CcNotice tone="info" title={polish ? "Weryfikacja rekordu nie jest dopuszczeniem do zadania" : "Record verification is not task eligibility"} detail={ownerRole ? polish ? "Import i stan weryfikacji pokazują pochodzenie oraz brakujące dowody. Użycie w zadaniu sprawdź przez akcję Źródło dla konkretnego zadania." : "Import and verification state show provenance and missing proof. Use Source to check eligibility for a specific task." : polish ? "Import i stan weryfikacji pokazują pochodzenie oraz brakujące dowody. Audyt dopuszczenia do zadania jest dostępny właścicielowi workspace." : "Import and verification state show provenance and missing proof. Task eligibility audit is available to the workspace owner."} />
      {detailLoading ? <CcNotice tone="loading" title={polish ? "Otwieranie pełnego rekordu" : "Opening full record"} /> : null}
      {detailError && detailTarget ? <CcNotice live tone="error" title={polish ? "Nie udało się otworzyć rekordu." : "The record could not be opened."} detail={detailError} action={<CcButton onClick={() => openEditor(detailTarget)} variant="outline">{polish ? "Ponów" : "Retry"}</CcButton>} /> : null}
      {archiveError ? <CcNotice live tone="error" title={polish ? "Archiwizacja nie powiodła się." : "Archive failed."} detail={archiveError} /> : null}
      {pager("top")}
      <CcDataTable columns={columns} rows={rows} emptyDetail={emptyDetail} emptyTitle={emptyTitle} enableColumnVisibility={false} enablePagination={false} enableSearch={false} error={registryStatus === "error" ? registryError : null} errorAction={<CcButton onClick={() => setRefreshKey(value => value + 1)} variant="outline">{polish ? "Ponów" : "Retry"}</CcButton>} getRowLabel={row => row.title} labels={tableLabels} loading={registryStatus === "loading" || searchPending} mobileMode="cards" />
      {pager("bottom")}
    </> : null}
    {editing !== undefined ? editing?.status === "archived" ? <HistoricalRecordDetail onClose={() => { setEditing(undefined); if (fromAttention) navigateApp("/areas?area=00-ogolny&view=overview"); else if (requestedRecordId) navigateApp(registerPath); }} onSource={() => { setEditing(undefined); setAuditRecord(editing); navigateApp(`${registerPath}&recordId=${encodeURIComponent(editing.id)}&sourceAudit=1`); }} ownerRole={ownerRole === true} record={editing} recordType={recordType} /> : <RecordEditor departmentKey={departmentKey} departments={departmentPacket.data?.departments || []} onArchive={record => { setEditing(undefined); setArchiveRecord(record); }} onClose={() => { setEditing(undefined); if (fromAttention) navigateApp("/areas?area=00-ogolny&view=overview"); else if (requestedRecordId) navigateApp(registerPath); }} onSaved={refresh} record={editing} recordType={recordType} /> : null}
    {auditRecord ? <CompanySourcePanel onClose={() => { setAuditRecord(null); if (sourceAuditRequested) navigateApp(registerPath); }} recordId={auditRecord.id} recordTitle={auditRecord.title} /> : null}
    {archiveRecord ? <CcConfirmDialog busy={archiveBusy} confirmIcon="ph-archive" confirmLabel={polish ? "Archiwizuj" : "Archive"} confirmTone="warning" description={polish ? "Rekord pozostanie dostępny w historii i audycie." : "The record remains available in history and audit."} detail={<div className="grid gap-2"><strong>{archiveRecord.title}</strong>{archiveError ? <span role="alert" className="text-sm text-error">{polish ? "Nie udało się zarchiwizować: " : "Could not archive: "}{archiveError}</span> : null}</div>} eyebrow={label(recordType)} onCancel={() => { setArchiveRecord(null); setArchiveError(""); }} onConfirm={confirmArchive} title={polish ? "Zarchiwizować rekord?" : "Archive record?"} /> : null}</>;
}

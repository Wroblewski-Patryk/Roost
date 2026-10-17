import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { useLanguage } from "../../i18n/i18n";
import type { AuthMe } from "../../types";
import { CompanySourcePanel } from "./company-source-panel";
import { CompanyRecordInventoryAssessment, inventoryStateLabel } from "./company-record-inventory-assessment";
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";

type RegistryRecord = {
  id: string; recordType: string; title: string; key: string; source: string; status: string;
  verificationState: string; metadata?: { sourceKind?: string | null; sourceSystem?: string | null } | null;
  updatedAt: string;
  inventoryAssessment?: { status: "unassessed" | "current" | "stale"; category: "business" | "test" | "audit" | "unknown" | null;
    lastCategory: "business" | "test" | "audit" | "unknown" | null; latestAssessmentId: string | null; assessedAt: string | null } | null;
};
type RecordDetail = RegistryRecord & {
  description?: string | null; businessPurpose?: string | null; currentState?: string | null;
  desiredState?: string | null; expectedBehavior?: string | null; rationale?: string | null;
  acceptanceCriteria?: Array<string | Record<string, unknown>>;
  priority?: string; functionalState?: string; implementationCoverage?: number | null;
  dueDate?: string | null; parentId?: string | null; projectId?: string | null;
  applicationId?: string | null; clientId?: string | null; createdAt?: string;
  workspaceId?: string; evidenceCount?: number; activeSuspensionCount?: number;
  organizationalContext?: unknown; metadata?: Record<string, unknown>;
};
type SourceGroup = {
  id: string; kind: "import" | "incomplete" | "other"; recordKey: string | null; applicationId: string | null;
  applicationName: string | null; sourceSystem: string | null; sourceRoot: string | null;
  sourceRevision: string | null; recordCount: number; documentCount: number;
  legacyAssumptionCount: number; unspecifiedKindCount: number;
};
type SourceDocument = { id: string; filePath: string; recordCount: number };
type CatalogLevel = "groups" | "documents" | "records";
type CatalogStage = { level: "groups" } | { level: "documents"; group: SourceGroup }
  | { level: "records"; group: SourceGroup; document?: SourceDocument };
type CatalogPage = {
  level: CatalogLevel; items: Array<RegistryRecord | SourceGroup | SourceDocument>;
  total: number; recordTotal: number; page: number; pageSize: number;
};
type LoadState = "loading" | "ready" | "error";
const pageSize = 25;

function recordTypeLabel(value: string, pl: boolean) {
  if (pl) {
    const labels: Record<string, string> = {
      architecture_document: "Dokument architektury", architecture_section: "Sekcja architektury",
      requirement: "Wymaganie", knowledge_record: "Rekord wiedzy", company_update: "Aktualizacja firmy",
      initiative: "Inicjatywa", deliverable: "Rezultat", commercial_offer: "Oferta handlowa",
      operational_issue: "Problem operacyjny", operational_event: "Zdarzenie operacyjne",
      feedback: "Informacja zwrotna", competency: "Kompetencja", budget: "Budżet",
      invoice: "Faktura", technical_incident: "Incydent techniczny", environment: "Środowisko",
      contract: "Umowa", compliance_item: "Rejestr zgodności", experiment: "Eksperyment",
      portfolio_item: "Pozycja portfela", escalation: "Eskalacja", management_review: "Przegląd zarządczy"
    };
    if (labels[value]) return labels[value];
  }
  return humanizeBusinessValue(value, undefined, pl ? "pl" : "en");
}

function groupTitle(group: SourceGroup, pl: boolean) {
  const application = group.applicationId
    ? `${group.applicationName || (pl ? "Aplikacja bez nazwy" : "Unnamed application")} (${group.applicationId})`
    : pl ? "Bez aplikacji" : "No application";
  if (group.kind === "other") return `${pl ? "Pozostały rekord" : "Other record"} · ${group.recordKey || group.id} · ${application}`;
  if (group.kind === "incomplete") return `${pl ? "Niepełne metadane źródła" : "Incomplete source metadata"} · ${application}`;
  return `${application} · ${group.sourceSystem}`;
}

function ReadOnlyDetail({ record, onClose, onSource, onInventory }: { record: RecordDetail; onClose: () => void; onSource: () => void; onInventory: () => void }) {
  const { locale } = useLanguage();
  const pl = locale === "pl";
  const raw = (value: unknown) => value === null || value === undefined ? null
    : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
  const fields: Array<[string, string | null | undefined]> = [
    [pl ? "Identyfikator rekordu" : "Record ID", record.id],
    [pl ? "Typ" : "Type", `${recordTypeLabel(record.recordType, pl)} (${record.recordType})`],
    [pl ? "Klucz" : "Key", record.key],
    [pl ? "Status" : "Status", humanizeBusinessValue(record.status, undefined, locale)],
    [pl ? "Weryfikacja" : "Verification", humanizeBusinessValue(record.verificationState, undefined, locale)],
    [pl ? "Pochodzenie" : "Source", record.source],
    [pl ? "Priorytet" : "Priority", record.priority],
    [pl ? "Stan funkcjonalny" : "Functional state", record.functionalState],
    [pl ? "Pokrycie wdrożenia" : "Implementation coverage", raw(record.implementationCoverage)],
    [pl ? "Termin" : "Due date", record.dueDate],
    [pl ? "Rekord nadrzędny" : "Parent record", record.parentId],
    [pl ? "Projekt" : "Project", record.projectId],
    [pl ? "Aplikacja" : "Application", record.applicationId],
    [pl ? "Klient" : "Client", record.clientId],
    [pl ? "Kontekst organizacyjny" : "Organizational context", raw(record.organizationalContext)],
    [pl ? "Metadane źródła" : "Source metadata", raw(record.metadata)],
    [pl ? "Opis" : "Description", record.description],
    [pl ? "Cel biznesowy" : "Business purpose", record.businessPurpose],
    [pl ? "Uzasadnienie" : "Rationale", record.rationale],
    [pl ? "Stan obecny" : "Current state", record.currentState],
    [pl ? "Stan docelowy" : "Desired state", record.desiredState],
    [pl ? "Oczekiwane zachowanie" : "Expected behavior", record.expectedBehavior],
    [pl ? "Kryteria akceptacji" : "Acceptance criteria", raw(record.acceptanceCriteria)],
    [pl ? "Liczba dowodów" : "Evidence count", raw(record.evidenceCount)],
    [pl ? "Aktywne blokady" : "Active suspensions", raw(record.activeSuspensionCount)],
    [pl ? "Utworzono" : "Created", record.createdAt],
    [pl ? "Zaktualizowano" : "Updated", record.updatedAt]
  ];
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); }
  return <CcRecordEditorModal
    actions={<><CcButton onClick={onInventory} variant="outline">{pl ? "Oceń przeznaczenie" : "Assess purpose"}</CcButton><CcButton onClick={onSource} variant="outline">{pl ? "Audyt źródła" : "Source audit"}</CcButton><CcButton onClick={onClose} variant="primary">{pl ? "Zamknij" : "Close"}</CcButton></>}
    closeLabel={pl ? "Zamknij szczegóły rekordu" : "Close record details"}
    description={pl ? "Dokładny zapis tylko do odczytu. Obecność w katalogu nie oznacza dopuszczenia do zadania." : "Exact read-only record. Catalog presence does not grant task eligibility."}
    eyebrow={pl ? "Bez przypisania do działu ani całej firmy · tylko odczyt" : "No department or company-wide assignment · read only"}
    maxWidthClassName="max-w-5xl" onClose={onClose} onSubmit={submit}
    title={record.title} titleId="unassigned-company-record-title">
    <CcRecordEditorSection title={pl ? "Szczegóły i pochodzenie" : "Details and provenance"}>
      <dl className="grid gap-4 sm:grid-cols-2">
        {fields.map(([name, value]) => <div className="min-w-0" key={name}><dt className="text-xs font-bold uppercase tracking-wide text-company-muted">{name}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-company-ink">{value || (pl ? "Nie zapisano" : "Not recorded")}</dd></div>)}
      </dl>
    </CcRecordEditorSection>
  </CcRecordEditorModal>;
}

export function UnassignedCompanyRecords({ backHref }: { backHref: string }) {
  const { locale } = useLanguage();
  const pl = locale === "pl";
  const labels = useTranslatedTableLabels();
  const [owner, setOwner] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState(false);
  const [authRetry, setAuthRetry] = useState(0);
  const [scope, setScope] = useState<"current" | "history">("current");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [registry, setRegistry] = useState<CatalogPage | null>(null);
  const [stage, setStage] = useState<CatalogStage>({ level: "groups" });
  const [detailTarget, setDetailTarget] = useState<RegistryRecord | null>(null);
  const [detail, setDetail] = useState<RecordDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [audit, setAudit] = useState<RegistryRecord | null>(null);
  const [inventory, setInventory] = useState<RegistryRecord | null>(null);
  const registryRequest = useRef(0);
  const detailRequest = useRef(0);
  const searchPending = searchInput.trim() !== query;

  function dismissDetail() {
    detailRequest.current += 1;
    setDetailTarget(null); setDetail(null); setDetailError("");
  }
  function openAudit(row: RegistryRecord) {
    dismissDetail();
    setAudit(row);
  }
  function openInventory(row: RegistryRecord) {
    dismissDetail(); setAudit(null); setInventory(row);
  }

  useEffect(() => {
    let active = true;
    setOwner(null); setAuthError(false);
    void api<{ data: AuthMe }>("/v1/auth/me").then(({ data }) => {
      if (active) setOwner(data.authType === "user" && data.workspaces?.some(workspace => workspace.active && workspace.role === "owner") === true);
    }).catch(() => { if (active) setAuthError(true); });
    return () => { active = false; };
  }, [authRetry]);
  useEffect(() => {
    if (!searchPending) return;
    const timeout = window.setTimeout(() => { setQuery(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput, searchPending]);
  useEffect(() => {
    if (owner !== true || authError || searchPending) return;
    const request = ++registryRequest.current;
    let active = true;
    setState("loading"); setLoadError(""); setRegistry(null);
    const level: CatalogLevel = query ? "records" : stage.level;
    const params = new URLSearchParams({ scope, q: query, level, page: String(page), pageSize: String(pageSize) });
    if (!query && stage.level !== "groups") params.set("groupId", stage.group.id);
    if (!query && stage.level === "records" && stage.document) params.set("documentId", stage.document.id);
    void api<{ data: CatalogPage }>(`/v1/company-records/registry/unassigned?${params}`).then(({ data }) => {
      if (!active || registryRequest.current !== request) return;
      if (data.level !== level) throw new Error("catalog_level_mismatch");
      const lastPage = Math.max(1, Math.ceil(data.total / pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setRegistry(data); setState("ready");
    }).catch(error => {
      if (!active || registryRequest.current !== request) return;
      setLoadError(error instanceof AppApiError ? error.code : "request_failed"); setState("error");
    });
    return () => { active = false; registryRequest.current += 1; };
  }, [owner, authError, searchPending, scope, query, stage, page, refresh]);

  function openDetail(row: RegistryRecord) {
    const request = ++detailRequest.current;
    setAudit(null);
    setDetailTarget(row); setDetail(null); setDetailError("");
    void api<{ data: RecordDetail }>(`/v1/company-records/${encodeURIComponent(row.id)}`).then(({ data }) => {
      if (request !== detailRequest.current) return;
      if (data.id !== row.id || data.recordType !== row.recordType) throw new Error("record_navigation_mismatch");
      setDetail(data);
    }).catch(error => {
      if (request === detailRequest.current) setDetailError(error instanceof AppApiError ? error.code : "request_failed");
    });
  }
  const columns = useMemo<Array<CcTableColumn<RegistryRecord>>>(() => [
    { key: "record", header: pl ? "Rekord" : "Record", cell: row => <button className="grid min-w-0 text-left" onClick={() => openDetail(row)} type="button"><strong className="break-words">{row.title}</strong><span className="break-all text-xs text-company-muted">{row.key}</span></button> },
    { key: "type", header: pl ? "Typ" : "Type", cell: row => <span className="break-words text-sm">{recordTypeLabel(row.recordType, pl)}</span> },
    { key: "source", header: pl ? "Pochodzenie" : "Source", cell: row => <span className="grid min-w-0 text-sm"><strong className="break-words">{row.source}</strong><span className="break-words text-company-muted">{row.metadata?.sourceKind || (pl ? "Rodzaj źródła nie zapisany" : "Source kind not recorded")}{row.metadata?.sourceSystem ? ` · ${row.metadata.sourceSystem}` : ""}</span></span> },
    { key: "verification", header: pl ? "Weryfikacja" : "Verification", cell: row => <span className="badge badge-outline whitespace-normal">{humanizeBusinessValue(row.verificationState, undefined, locale)}</span> },
    { key: "purpose", header: pl ? "Ocena przeznaczenia" : "Purpose assessment", cell: row => <span className="badge badge-outline whitespace-normal">{inventoryStateLabel(row.inventoryAssessment, pl)}</span> },
    { key: "status", header: "Status", cell: row => <span className="badge badge-outline">{humanizeBusinessValue(row.status, undefined, locale)}</span> },
    { key: "actions", header: labels.actions, cell: row => <div className="flex flex-wrap justify-end gap-1"><CcButton ariaLabel={pl ? `Szczegóły: ${row.title}` : `Details: ${row.title}`} onClick={() => openDetail(row)} size="xs" variant="outline">{pl ? "Szczegóły" : "Details"}</CcButton><CcButton ariaLabel={pl ? `Oceń przeznaczenie: ${row.title}` : `Assess purpose: ${row.title}`} onClick={() => openInventory(row)} size="xs" variant="outline">{pl ? "Oceń" : "Assess"}</CcButton><CcButton ariaLabel={pl ? `Audyt źródła: ${row.title}` : `Source audit: ${row.title}`} onClick={() => openAudit(row)} size="xs" variant="ghost">{pl ? "Audyt" : "Audit"}</CcButton></div> }
  ], [locale, pl, labels]);
  const total = registry?.total ?? 0;
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const level: CatalogLevel = query ? "records" : stage.level;
  const groups = registry?.level === "groups" ? registry.items as SourceGroup[] : [];
  const documents = registry?.level === "documents" ? registry.items as SourceDocument[] : [];
  const records = registry?.level === "records" ? registry.items as RegistryRecord[] : [];
  function selectStage(next: CatalogStage) {
    dismissDetail(); setAudit(null); setRegistry(null); setState("loading"); setStage(next); setPage(1);
  }
  const scopeDescription = scope === "history"
    ? pl ? "Zarchiwizowane rekordy bez przypisania do działu ani zakresu całej firmy. Ich historia pozostaje dostępna do odczytu."
      : "Archived records without a department assignment or company-wide scope remain available for review."
    : pl ? "Rekordy bez przypisania do działu ani zakresu całej firmy. Mogą nadal być powiązane z aplikacją."
      : "Records without a department assignment or company-wide scope may still be linked to an application.";
  const groupDescription = pl
    ? "Grupy odzwierciedlają zapisane metadane źródła, nie potwierdzają zdarzenia importu ani dopuszczenia treści."
    : "Groups reflect recorded source metadata; they do not prove an import event or approve the content.";

  return <>
    <CcPageHeader actions={<CcButton href={backHref} variant="outline">{pl ? "Wróć do rejestru" : "Back to register"}</CcButton>}
      description={scopeDescription}
      eyebrow={pl ? "Katalog źródeł" : "Source catalog"} title={pl ? "Do uporządkowania" : "To organize"} />
    {owner === false ? <CcNotice tone="warning" title={pl ? "Ten widok jest dostępny tylko właścicielowi." : "This view is available only to the owner."} /> : null}
    {authError ? <CcNotice live tone="error" title={pl ? "Nie udało się sprawdzić dostępu." : "Could not check access."} action={<CcButton onClick={() => setAuthRetry(value => value + 1)} variant="outline">{pl ? "Ponów" : "Retry"}</CcButton>} /> : null}
    {owner === null && !authError ? <CcNotice tone="loading" title={pl ? "Sprawdzanie dostępu" : "Checking access"} /> : null}
    {owner === true && !authError ? <>
      <section aria-label={pl ? "Filtry źródeł" : "Source filters"} className="roost-work-panel grid gap-3 rounded-company p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
        <div aria-label={pl ? "Zakres źródeł" : "Source scope"} className="flex flex-wrap gap-2" role="group">
          <button aria-pressed={scope === "current"} className={`btn btn-sm ${scope === "current" ? "btn-primary" : "btn-outline"}`} onClick={() => { selectStage({ level: "groups" }); setScope("current"); }} type="button">{pl ? "Bieżące" : "Current"}</button>
          <button aria-pressed={scope === "history"} className={`btn btn-sm ${scope === "history" ? "btn-primary" : "btn-outline"}`} onClick={() => { selectStage({ level: "groups" }); setScope("history"); }} type="button">{pl ? "Historia" : "History"}</button>
        </div>
        <label className="grid min-w-0 gap-1 text-sm font-bold text-company-ink" htmlFor="unassigned-source-search">{pl ? "Szukaj we wszystkich typach" : "Search all record types"}
          <input className="input input-bordered w-full" id="unassigned-source-search" maxLength={120} onChange={event => { selectStage({ level: "groups" }); setSearchInput(event.target.value); }} placeholder={pl ? "Tytuł, klucz lub opis" : "Title, key or description"} type="search" value={searchInput} />
        </label>
      </section>
      <CcNotice tone="info" title={pl ? "Katalog nie nadaje dopuszczenia" : "The catalog does not grant eligibility"} detail={pl ? "Rekord może mieć odrębne dopuszczenie dla konkretnego zadania. Sprawdź je w audycie źródła." : "A record may have separate approval for a specific task. Check it in the source audit."} />
      {!query ? <p className="text-sm text-company-muted">{groupDescription}</p> : null}
      {!query && stage.level !== "groups" ? <nav aria-label={pl ? "Ścieżka źródła" : "Source path"} className="flex flex-wrap items-center gap-2 text-sm">
        <CcButton onClick={() => selectStage({ level: "groups" })} size="sm" variant="ghost">{pl ? "Wszystkie grupy" : "All groups"}</CcButton>
        <span aria-hidden="true">/</span>
        {stage.level === "records" && stage.document ? <CcButton onClick={() => selectStage({ level: "documents", group: stage.group })} size="sm" variant="ghost">{groupTitle(stage.group, pl)}</CcButton> : <span className="font-bold text-company-ink">{groupTitle(stage.group, pl)}</span>}
        {stage.level === "records" && stage.document ? <><span aria-hidden="true">/</span><span className="break-all font-bold text-company-ink">{stage.document.filePath}</span></> : null}
      </nav> : null}
      {query ? <p className="text-sm text-company-muted">{pl ? "Wyniki wyszukiwania są płaską listą wszystkich typów rekordów." : "Search results are a flat list across all record types."}</p> : null}
      {detailTarget && !detail && !detailError ? <CcNotice tone="loading" title={pl ? "Otwieranie dokładnego rekordu" : "Opening exact record"} /> : null}
      {detailError ? <CcNotice live tone="error" title={pl ? "Nie udało się otworzyć rekordu." : "Could not open record."} detail={detailError} action={detailTarget ? <CcButton onClick={() => openDetail(detailTarget)} variant="outline">{pl ? "Ponów" : "Retry"}</CcButton> : undefined} /> : null}
      <nav aria-label={pl ? "Strony źródeł" : "Source pages"} className="flex flex-wrap items-center justify-between gap-3 rounded-company border border-base-300 bg-base-100 px-4 py-3 text-sm">
        <span aria-live="polite" className="font-bold text-company-muted">{level === "groups"
          ? pl ? `${registry?.recordTotal ?? 0} rekordów · grupy ${start}–${end} z ${total}` : `${registry?.recordTotal ?? 0} records · groups ${start}–${end} of ${total}`
          : level === "documents"
            ? pl ? `${registry?.recordTotal ?? 0} rekordów · dokumenty ${start}–${end} z ${total}` : `${registry?.recordTotal ?? 0} records · documents ${start}–${end} of ${total}`
            : pl ? `${start}–${end} z ${total}` : `${start}–${end} of ${total}`}</span>
        <div className="flex items-center gap-2"><span className="text-company-muted">{pl ? `Strona ${page} z ${totalPages}` : `Page ${page} of ${totalPages}`}</span><CcButton disabled={state !== "ready" || page <= 1} onClick={() => { dismissDetail(); setPage(value => value - 1); }} size="sm" variant="outline">{pl ? "Poprzednia" : "Previous"}</CcButton><CcButton disabled={state !== "ready" || page >= totalPages} onClick={() => { dismissDetail(); setPage(value => value + 1); }} size="sm" variant="outline">{pl ? "Następna" : "Next"}</CcButton></div>
      </nav>
      {level !== "records" ? <section aria-label={level === "groups" ? pl ? "Grupy źródeł" : "Source groups" : pl ? "Dokumenty źródłowe" : "Source documents"} className="roost-work-panel overflow-hidden rounded-company">
        {state === "loading" || searchPending ? <CcNotice tone="loading" title={pl ? "Ładowanie źródeł" : "Loading sources"} /> : null}
        {state === "error" ? <CcNotice live tone="error" title={pl ? "Nie udało się załadować źródeł" : "Could not load sources"} detail={loadError} action={<CcButton onClick={() => setRefresh(value => value + 1)} variant="outline">{pl ? "Ponów" : "Retry"}</CcButton>} /> : null}
        {state === "ready" && total === 0 ? <CcNotice tone="info" title={scope === "history" ? pl ? "Brak historii" : "No history" : pl ? "Wszystko uporządkowane" : "All organized"} detail={pl ? "W tym zakresie nie ma rekordów bez przypisania do działu lub zakresu całej firmy." : "No records in this scope lack a department assignment or company-wide scope."} /> : null}
        {state === "ready" && level === "groups" ? <ul className="divide-y divide-base-300">{groups.map(group => <li key={group.id}>
          <button className="grid w-full gap-1 px-4 py-4 text-left hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" onClick={() => selectStage(group.kind === "import" ? { level: "documents", group } : { level: "records", group })} type="button">
            <span className="grid min-w-0 gap-1"><strong className="break-words text-company-ink">{groupTitle(group, pl)}</strong>
              {group.kind === "import" ? <span className="break-all text-xs text-company-muted">{group.sourceRoot} · {pl ? "rewizja" : "revision"} {group.sourceRevision}</span> : null}
              {group.kind === "import" ? <span className="text-xs text-company-muted">{group.legacyAssumptionCount ? `${group.legacyAssumptionCount} legacy_assumption · ` : ""}{group.unspecifiedKindCount ? pl ? `${group.unspecifiedKindCount} bez zapisanego sourceKind` : `${group.unspecifiedKindCount} without recorded sourceKind` : ""}</span> : null}
              {group.kind === "incomplete" ? <span className="text-xs text-company-muted">{pl ? "Część wymaganych pól pochodzenia jest nieobecna lub niepoprawna." : "Some required provenance fields are missing or malformed."}</span> : null}
            </span>
            <span className="text-sm text-company-muted">{pl ? `${group.recordCount} rekordów` : `${group.recordCount} records`}{group.kind === "import" ? pl ? ` · ${group.documentCount} dokumentów` : ` · ${group.documentCount} documents` : ""} <span aria-hidden="true">›</span></span>
          </button>
        </li>)}</ul> : null}
        {state === "ready" && level === "documents" ? <ul className="divide-y divide-base-300">{documents.map(document => <li key={document.id}>
          <button className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-4 text-left hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => selectStage({ level: "records", group: (stage as { group: SourceGroup }).group, document })} type="button">
            <strong className="min-w-0 break-all text-company-ink">{document.filePath}</strong>
            <span className="text-sm text-company-muted">{pl ? `${document.recordCount} fragmentów` : `${document.recordCount} fragments`} <span aria-hidden="true">›</span></span>
          </button>
        </li>)}</ul> : null}
      </section> : null}
      {level === "records" ? <CcDataTable columns={columns} rows={records} emptyDetail={query ? pl ? "Zmień wyszukiwanie lub przełącz Bieżące i Historię." : "Change the search or switch Current and History." : scope === "history" ? pl ? "Archiwalne rekordy bez przypisania do działu lub zakresu całej firmy pojawią się tutaj." : "Archived records without a department assignment or company-wide scope will appear here." : pl ? "W tym wyborze nie ma rekordów." : "There are no records in this selection."}
        emptyTitle={query ? pl ? "Brak wyników" : "No matching records" : pl ? "Brak rekordów w tym wyborze" : "No records in this selection"}
        enableColumnVisibility={false} enablePagination={false} enableSearch={false}
        error={state === "error" ? loadError : null} errorAction={<CcButton onClick={() => setRefresh(value => value + 1)} variant="outline">{pl ? "Ponów" : "Retry"}</CcButton>}
        getRowLabel={row => `${row.title} · ${row.key}`} labels={labels} loading={state === "loading" || searchPending} mobileMode="cards" /> : null}
    </> : null}
    {detail ? <ReadOnlyDetail record={detail} onClose={dismissDetail} onSource={() => openAudit(detail)} onInventory={() => openInventory(detail)} /> : null}
    {audit ? <CompanySourcePanel onClose={() => setAudit(null)} recordId={audit.id} recordTitle={audit.title} /> : null}
    {inventory ? <CompanyRecordInventoryAssessment key={inventory.id} recordId={inventory.id} title={inventory.title}
      onClose={() => setInventory(null)} onChanged={() => setRefresh(value => value + 1)} /> : null}
  </>;
}

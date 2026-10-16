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
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";

type RegistryRecord = {
  id: string; recordType: string; title: string; key: string; source: string; status: string;
  verificationState: string; metadata?: { sourceKind?: string | null; sourceSystem?: string | null } | null;
  updatedAt: string;
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
type RegistryPage = { items: RegistryRecord[]; total: number; page: number; pageSize: number };
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

function ReadOnlyDetail({ record, onClose, onSource }: { record: RecordDetail; onClose: () => void; onSource: () => void }) {
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
    actions={<><CcButton onClick={onSource} variant="outline">{pl ? "Audyt źródła" : "Source audit"}</CcButton><CcButton onClick={onClose} variant="primary">{pl ? "Zamknij" : "Close"}</CcButton></>}
    closeLabel={pl ? "Zamknij szczegóły rekordu" : "Close record details"}
    description={pl ? "Dokładny zapis tylko do odczytu. Obecność w katalogu nie oznacza dopuszczenia do zadania." : "Exact read-only record. Catalog presence does not grant task eligibility."}
    eyebrow={pl ? "Rekord bez kontekstu · tylko odczyt" : "Record without context · read only"}
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
  const [registry, setRegistry] = useState<RegistryPage | null>(null);
  const [detailTarget, setDetailTarget] = useState<RegistryRecord | null>(null);
  const [detail, setDetail] = useState<RecordDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [audit, setAudit] = useState<RegistryRecord | null>(null);
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
    const params = new URLSearchParams({ scope, q: query, page: String(page), pageSize: String(pageSize) });
    void api<{ data: RegistryPage }>(`/v1/company-records/registry/unassigned?${params}`).then(({ data }) => {
      if (!active || registryRequest.current !== request) return;
      const lastPage = Math.max(1, Math.ceil(data.total / pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setRegistry(data); setState("ready");
    }).catch(error => {
      if (!active || registryRequest.current !== request) return;
      setLoadError(error instanceof AppApiError ? error.code : "request_failed"); setState("error");
    });
    return () => { active = false; registryRequest.current += 1; };
  }, [owner, authError, searchPending, scope, query, page, refresh]);

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
    { key: "source", header: pl ? "Pochodzenie" : "Source", cell: row => <span className="grid min-w-0 text-sm"><strong className="break-words">{row.source}</strong><span className="break-words text-company-muted">{[row.metadata?.sourceKind, row.metadata?.sourceSystem].filter(Boolean).join(" · ") || (pl ? "Brak metadanych" : "No source metadata")}</span></span> },
    { key: "verification", header: pl ? "Weryfikacja" : "Verification", cell: row => <span className="badge badge-outline whitespace-normal">{humanizeBusinessValue(row.verificationState, undefined, locale)}</span> },
    { key: "status", header: "Status", cell: row => <span className="badge badge-outline">{humanizeBusinessValue(row.status, undefined, locale)}</span> },
    { key: "actions", header: labels.actions, cell: row => <div className="flex flex-wrap justify-end gap-1"><CcButton ariaLabel={pl ? `Szczegóły: ${row.title}` : `Details: ${row.title}`} onClick={() => openDetail(row)} size="xs" variant="outline">{pl ? "Szczegóły" : "Details"}</CcButton><CcButton ariaLabel={pl ? `Audyt źródła: ${row.title}` : `Source audit: ${row.title}`} onClick={() => openAudit(row)} size="xs" variant="ghost">{pl ? "Audyt" : "Audit"}</CcButton></div> }
  ], [locale, pl, labels]);
  const total = registry?.total ?? 0;
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return <>
    <CcPageHeader actions={<CcButton href={backHref} variant="outline">{pl ? "Wróć do rejestru" : "Back to register"}</CcButton>}
      description={pl ? "Bieżące rekordy bez przypisania do działu i bez zakresu całej firmy. Przejrzyj pochodzenie i szczegóły przed użyciem w konkretnym zadaniu." : "Current records without a department assignment or company-wide scope. Inspect provenance and exact details before using one for a specific task."}
      eyebrow={pl ? "Katalog źródeł" : "Source catalog"} title={pl ? "Do uporządkowania" : "To organize"} />
    {owner === false ? <CcNotice tone="warning" title={pl ? "Ten widok jest dostępny tylko właścicielowi." : "This view is available only to the owner."} /> : null}
    {authError ? <CcNotice live tone="error" title={pl ? "Nie udało się sprawdzić dostępu." : "Could not check access."} action={<CcButton onClick={() => setAuthRetry(value => value + 1)} variant="outline">{pl ? "Ponów" : "Retry"}</CcButton>} /> : null}
    {owner === null && !authError ? <CcNotice tone="loading" title={pl ? "Sprawdzanie dostępu" : "Checking access"} /> : null}
    {owner === true && !authError ? <>
      <section aria-label={pl ? "Filtry źródeł" : "Source filters"} className="roost-work-panel grid gap-3 rounded-company p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
        <div aria-label={pl ? "Zakres źródeł" : "Source scope"} className="flex flex-wrap gap-2" role="group">
          <button aria-pressed={scope === "current"} className={`btn btn-sm ${scope === "current" ? "btn-primary" : "btn-outline"}`} onClick={() => { dismissDetail(); setScope("current"); setPage(1); }} type="button">{pl ? "Bieżące" : "Current"}</button>
          <button aria-pressed={scope === "history"} className={`btn btn-sm ${scope === "history" ? "btn-primary" : "btn-outline"}`} onClick={() => { dismissDetail(); setScope("history"); setPage(1); }} type="button">{pl ? "Historia" : "History"}</button>
        </div>
        <label className="grid min-w-0 gap-1 text-sm font-bold text-company-ink" htmlFor="unassigned-source-search">{pl ? "Szukaj we wszystkich typach" : "Search all record types"}
          <input className="input input-bordered w-full" id="unassigned-source-search" maxLength={120} onChange={event => { dismissDetail(); setSearchInput(event.target.value); setPage(1); }} placeholder={pl ? "Tytuł, klucz lub opis" : "Title, key or description"} type="search" value={searchInput} />
        </label>
      </section>
      <CcNotice tone="info" title={pl ? "Katalog nie nadaje dopuszczenia" : "The catalog does not grant eligibility"} detail={pl ? "Rekord może mieć odrębne dopuszczenie dla konkretnego zadania. Sprawdź je w audycie źródła." : "A record may have separate approval for a specific task. Check it in the source audit."} />
      {detailTarget && !detail && !detailError ? <CcNotice tone="loading" title={pl ? "Otwieranie dokładnego rekordu" : "Opening exact record"} /> : null}
      {detailError ? <CcNotice live tone="error" title={pl ? "Nie udało się otworzyć rekordu." : "Could not open record."} detail={detailError} action={detailTarget ? <CcButton onClick={() => openDetail(detailTarget)} variant="outline">{pl ? "Ponów" : "Retry"}</CcButton> : undefined} /> : null}
      <nav aria-label={pl ? "Strony źródeł" : "Source pages"} className="flex flex-wrap items-center justify-between gap-3 rounded-company border border-base-300 bg-base-100 px-4 py-3 text-sm">
        <span aria-live="polite" className="font-bold text-company-muted">{pl ? `${start}–${end} z ${total}` : `${start}–${end} of ${total}`}</span>
        <div className="flex items-center gap-2"><span className="text-company-muted">{pl ? `Strona ${page} z ${totalPages}` : `Page ${page} of ${totalPages}`}</span><CcButton disabled={state !== "ready" || page <= 1} onClick={() => { dismissDetail(); setPage(value => value - 1); }} size="sm" variant="outline">{pl ? "Poprzednia" : "Previous"}</CcButton><CcButton disabled={state !== "ready" || page >= totalPages} onClick={() => { dismissDetail(); setPage(value => value + 1); }} size="sm" variant="outline">{pl ? "Następna" : "Next"}</CcButton></div>
      </nav>
      <CcDataTable columns={columns} rows={registry?.items || []} emptyDetail={query ? pl ? "Zmień wyszukiwanie lub przełącz Bieżące i Historię." : "Change the search or switch Current and History." : scope === "history" ? pl ? "Archiwalne rekordy bez kontekstu pojawią się tutaj." : "Archived records without context will appear here." : pl ? "Nie ma bieżących rekordów bez kontekstu." : "There are no current records without context."}
        emptyTitle={query ? pl ? "Brak wyników" : "No matching records" : scope === "history" ? pl ? "Brak historii" : "No history" : pl ? "Wszystko uporządkowane" : "All organized"}
        enableColumnVisibility={false} enablePagination={false} enableSearch={false}
        error={state === "error" ? loadError : null} errorAction={<CcButton onClick={() => setRefresh(value => value + 1)} variant="outline">{pl ? "Ponów" : "Retry"}</CcButton>}
        getRowLabel={row => `${row.title} · ${row.key}`} labels={labels} loading={state === "loading" || searchPending} mobileMode="cards" />
    </> : null}
    {detail ? <ReadOnlyDetail record={detail} onClose={dismissDetail} onSource={() => openAudit(detail)} /> : null}
    {audit ? <CompanySourcePanel onClose={() => setAudit(null)} recordId={audit.id} recordTitle={audit.title} /> : null}
  </>;
}

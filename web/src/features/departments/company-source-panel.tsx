import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { useLanguage } from "../../i18n/i18n";
import { humanizeBusinessValue } from "./shared";

type Task = { id: string; title: string; status: string };
type SourceReview = {
  id: string; ordinal: number; taskId: string; action: string; classification: string; provenance: string;
  environment: string; verificationMethod: string; verificationRef: string; inclusionReason: string;
  recordRevision: string; validFrom: string; validUntil: string; createdAt: string; actorUserId: string;
};
type SourceHistory = { ordinal: string; operation: string; recordedAt: string };
type SourceRecord = {
  id: string; title: string; recordType: string; status: string; verificationState: string; source: string;
  metadata: { sourceKind?: string | null; sourceSystem?: string | null; sourceId?: string | null; filePath?: string | null } | null;
  applicationId: string | null; updatedAt: string; createdAt: string;
};
type SourceAudit = {
  currentRecord: SourceRecord | null; currentRevision: string | null;
  reviews: SourceReview[]; reviewHistoryTruncated: boolean; nextBeforeOrdinal: number | null;
  history: SourceHistory[]; nextBeforeHistoryOrdinal: string | null;
  priorBodiesAvailable: boolean; historyStartsAtMigration: boolean; overwrittenBeforeMigrationAvailable: boolean;
  eligibility: { status: "task_required" | "eligible" | "ineligible"; reasons: string[]; task: Task | null; review: SourceReview | null };
};

const copy = {
  pl: {
    title: "Pochodzenie i dopuszczenie źródła", intro: "Odczyt aktualnego źródła i jego ocen. Dopuszczenie jest ważne tylko dla wskazanego zadania i bieżącej wersji rekordu.",
    close: "Zamknij", loading: "Wczytywanie audytu…", loadError: "Nie udało się wczytać audytu źródła. Sprawdź dostęp i spróbuj ponownie.",
    taskError: "Nie udało się pobrać zadań. Ocena dopuszczenia wymaga wybrania zadania.", retry: "Ponów", task: "Zadanie do sprawdzenia", chooseTask: "Wybierz zadanie", taskHint: "Bez zadania rekord nie ma globalnego dopuszczenia.", searchLabel: "Szukaj zadania po tytule lub pełnym ID", search: "Szukaj", refineSearch: "Wyniki są ograniczone do 30 zadań. Zawęź wyszukiwanie, aby znaleźć właściwe.", noTaskMatches: "Brak zadań dla tego wyszukiwania.",
    eligible: "Dopuszczony do wybranego zadania", ineligible: "Niedopuszczony do wybranego zadania", taskRequired: "Wybierz zadanie, aby sprawdzić dopuszczenie", noRecord: "Bieżący rekord jest niedostępny; historia pozostaje do wglądu.",
    missingProof: "Brakuje wystarczającego dowodu dopuszczenia. Sam import lub obecność rekordu nie oznacza, że jest bezużyteczny.",
    reasons: "Powody decyzji", current: "Bieżący rekord", source: "Źródło", sourceKind: "Rodzaj źródła", sourceSystem: "System źródłowy", sourceId: "Identyfikator źródła", filePath: "Ścieżka importu", revision: "Bieżąca wersja", verification: "Stan weryfikacji", recordStatus: "Status rekordu", application: "Zakres aplikacji", noApplication: "Bez przypisania do aplikacji", created: "Utworzono", notRecorded: "Nie zapisano",
    activeReview: "Ostatnia ocena dla wybranego zadania", noReview: "Dla tego zadania nie ma oceny właściciela.", action: "Decyzja", classification: "Klasyfikacja", provenance: "Pochodzenie wg oceny", environment: "Środowisko", verificationMethod: "Metoda weryfikacji", verificationRef: "Odnośnik dowodu", rationale: "Uzasadnienie włączenia", valid: "Ważność", reviewer: "Identyfikator oceniającego", reviewRevision: "Wersja objęta oceną",
    reviews: "Historia ocen", noReviews: "Nie ma zapisanych ocen.", reviewHistoryHint: "Oceny innych zadań są historią, nie przyznają dopuszczenia dla wybranego zadania.", moreReviews: "Pokaż starsze oceny", history: "Historia wersji", noHistory: "Nie ma zachowanych wcześniejszych wersji.", moreHistory: "Pokaż starsze wpisy", historyLimit: "Historia treści zaczyna się od migracji archiwum; wcześniejszych nadpisań nie można odtworzyć.", historyBody: "Wpis historii dotyczy poprzedniej treści; ten widok pokazuje tylko metadane.", beforeUpdate: "Przed zmianą", deleted: "Przy usunięciu", at: "Zapisano", yes: "Tak", no: "Nie", taskScope: "Zadanie", currentTask: "Wybrane zadanie", otherTask: "Inne zadanie", older: "Starsza wersja", currentRevision: "Bieżąca wersja"
  },
  en: {
    title: "Source provenance and eligibility", intro: "Read-only view of the current source and its reviews. Eligibility applies only to the selected task and current record revision.",
    close: "Close", loading: "Loading audit…", loadError: "The source audit could not be loaded. Check access and retry.",
    taskError: "Tasks could not be loaded. Choose a task to check eligibility.", retry: "Retry", task: "Task to check", chooseTask: "Choose a task", taskHint: "Without a task, the record has no global approval.", searchLabel: "Search tasks by title or full ID", search: "Search", refineSearch: "Results are limited to 30 tasks. Refine the search to find the right one.", noTaskMatches: "No tasks match this search.",
    eligible: "Eligible for the selected task", ineligible: "Ineligible for the selected task", taskRequired: "Choose a task to check eligibility", noRecord: "The current record is unavailable; its history remains visible.",
    missingProof: "Sufficient eligibility proof is missing. An imported or existing record is not thereby useless.",
    reasons: "Decision reasons", current: "Current record", source: "Source", sourceKind: "Source kind", sourceSystem: "Source system", sourceId: "Source ID", filePath: "Import path", revision: "Current revision", verification: "Verification state", recordStatus: "Record status", application: "Application scope", noApplication: "No application assignment", created: "Created", notRecorded: "Not recorded",
    activeReview: "Latest review for the selected task", noReview: "There is no owner review for this task.", action: "Decision", classification: "Classification", provenance: "Reviewed provenance", environment: "Environment", verificationMethod: "Verification method", verificationRef: "Evidence reference", rationale: "Inclusion rationale", valid: "Validity", reviewer: "Reviewer ID", reviewRevision: "Reviewed revision",
    reviews: "Review history", noReviews: "No reviews recorded.", reviewHistoryHint: "Reviews for other tasks are history; they do not grant eligibility for the selected task.", moreReviews: "Show older reviews", history: "Revision history", noHistory: "No prior revisions are retained.", moreHistory: "Show older entries", historyLimit: "Body history starts at the archive migration; earlier overwrites cannot be reconstructed.", historyBody: "This entry refers to earlier content; this view displays metadata only.", beforeUpdate: "Before update", deleted: "At deletion", at: "Recorded", yes: "Yes", no: "No", taskScope: "Task", currentTask: "Selected task", otherTask: "Other task", older: "Older revision", currentRevision: "Current revision"
  }
} as const;

export const reasonText: Record<string, { pl: string; en: string }> = {
  task_required: { pl: "Wybierz zadanie, aby sprawdzić dopuszczenie", en: "Choose a task to check eligibility" },
  record_missing: { pl: "Bieżący rekord jest niedostępny", en: "The current record is unavailable" },
  missing_review: { pl: "Brak oceny właściciela dla tego zadania", en: "No owner review for this task" },
  withdrawn: { pl: "Dopuszczenie zostało wycofane", en: "Approval was withdrawn" },
  not_approved: { pl: "Ostatnia ocena nie dopuszcza źródła", en: "The latest review does not approve this source" },
  wrong_task: { pl: "Ocena dotyczy innego zadania", en: "Review belongs to another task" },
  wrong_workspace: { pl: "Ocena dotyczy innego workspace", en: "Review belongs to another workspace" },
  wrong_record: { pl: "Ocena dotyczy innego rekordu", en: "Review belongs to another record" },
  wrong_environment: { pl: "Ocena dotyczy innego środowiska", en: "Review belongs to another environment" },
  expired: { pl: "Okres ważności minął", en: "Validity period has expired" },
  not_yet_valid: { pl: "Okres ważności jeszcze się nie rozpoczął", en: "Validity period has not started" },
  changed_revision: { pl: "Rekord zmienił się od oceny", en: "Record revision changed after review" },
  changed_content: { pl: "Treść różni się od ocenionej", en: "Content differs from the reviewed content" },
  forbidden_provenance: { pl: "Pochodzenie wymaga osobnej weryfikacji", en: "Provenance requires separate verification" },
  invalid_source_metadata: { pl: "Metadane źródła są nieprawidłowe", en: "Source metadata is invalid" },
  invalid_reference_package: { pl: "Pakiet referencyjny jest nieprawidłowy", en: "Reference package is invalid" },
  application_scope: { pl: "Rekord nie należy do zakresu aplikacji zadania", en: "Record is outside the task application scope" },
  task_archived: { pl: "Zadanie zostało zarchiwizowane", en: "Task is archived" },
  record_inactive: { pl: "Rekord nie jest aktywny", en: "Record is not active" },
  verification_failed: { pl: "Weryfikacja rekordu nie pozwala na użycie", en: "Record verification does not permit use" }
};

function displayDate(value: string | null | undefined, locale: "pl" | "en") {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function displayRevision(value: string | null | undefined, locale: "pl" | "en") {
  return value ? `${displayDate(value, locale)} · ${value}` : "—";
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div className="min-w-0"><dt className="text-xs font-bold uppercase tracking-wide text-company-muted">{label}</dt><dd className="mt-1 break-words text-sm text-company-ink">{value == null || value === "" ? "—" : value}</dd></div>;
}

function errorCode(error: unknown) { return error instanceof AppApiError ? error.code : "request_failed"; }

const valueText: Record<string, { pl: string; en: string }> = {
  approve: { pl: "Dopuszczenie", en: "Approve" }, withdraw: { pl: "Wycofanie", en: "Withdraw" },
  fact: { pl: "Fakt", en: "Fact" }, observation: { pl: "Obserwacja", en: "Observation" },
  proposal: { pl: "Propozycja", en: "Proposal" }, inference: { pl: "Wniosek", en: "Inference" },
  primary: { pl: "Źródło pierwotne", en: "Primary source" }, secondary: { pl: "Źródło wtórne", en: "Secondary source" },
  active: { pl: "Aktywny", en: "Active" }, archived: { pl: "Zarchiwizowany", en: "Archived" },
  blocked: { pl: "Zablokowany", en: "Blocked" }, completed: { pl: "Ukończony", en: "Completed" },
  planned: { pl: "Planowany", en: "Planned" }, approved: { pl: "Zatwierdzony", en: "Approved" },
  accepted: { pl: "Przyjęty", en: "Accepted" }, pending: { pl: "Oczekujący", en: "Pending" },
  passed: { pl: "Zaliczone", en: "Passed" }, failed: { pl: "Niepowodzenie", en: "Failed" },
  waived: { pl: "Odstąpiono", en: "Waived" }, not_started: { pl: "Nierozpoczęta", en: "Not started" },
  unverified: { pl: "Niezweryfikowany", en: "Unverified" }, unknown: { pl: "Nieznany", en: "Unknown" },
  production: { pl: "Produkcyjne", en: "Production" }, isolated_test: { pl: "Izolowane testy", en: "Isolated test" }
};
export function localizedValue(value: string | null | undefined, lang: "pl" | "en") {
  if (!value) return "—";
  return valueText[value]?.[lang] || humanizeBusinessValue(value, undefined, lang);
}

export function CompanySourcePanel({ recordId, recordTitle, onClose }: { recordId: string; recordTitle: string; onClose: () => void }) {
  const { locale } = useLanguage();
  const lang = locale === "pl" ? "pl" : "en";
  const c = copy[lang];
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskQuery, setTaskQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedTask, setPinnedTask] = useState<Task | null>(null);
  const [hasMoreTasks, setHasMoreTasks] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskId, setTaskId] = useState("");
  const [taskError, setTaskError] = useState("");
  const [audit, setAudit] = useState<SourceAudit | null>(null);
  const [auditError, setAuditError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState<"reviews" | "history" | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    let active = true;
    setTaskError("");
    setLoadingTasks(true);
    const query = new URLSearchParams({ q: searchQuery });
    void api<{ data: { items: Task[]; hasMore: boolean } }>(`/v1/company-records/${encodeURIComponent(recordId)}/source-audit/task-options?${query}`).then(result => {
      if (active) { setTasks(result.data.items); setHasMoreTasks(result.data.hasMore); }
    }).catch(error => { if (active) setTaskError(errorCode(error)); }).finally(() => { if (active) setLoadingTasks(false); });
    return () => { active = false; };
  }, [recordId, searchQuery, refreshKey]);

  useEffect(() => {
    const request = ++requestRef.current;
    setLoading(true);
    setLoadingMore(null);
    setAuditError("");
    setAudit(null);
    const query = new URLSearchParams({ projection: "summary", limit: "25" });
    if (taskId) query.set("taskId", taskId);
    void api<{ data: SourceAudit }>(`/v1/company-records/${encodeURIComponent(recordId)}/source-audit?${query}`).then(result => {
      if (request === requestRef.current) setAudit(result.data);
    }).catch(error => { if (request === requestRef.current) setAuditError(errorCode(error)); }).finally(() => {
      if (request === requestRef.current) setLoading(false);
    });
    return () => { requestRef.current += 1; };
  }, [recordId, taskId, refreshKey]);

  async function loadMore(kind: "reviews" | "history") {
    if (!audit || loadingMore) return;
    const cursor = kind === "reviews" ? audit.nextBeforeOrdinal : audit.nextBeforeHistoryOrdinal;
    if (!cursor) return;
    const request = requestRef.current;
    setLoadingMore(kind);
    const query = new URLSearchParams({ projection: "summary", limit: "25" });
    if (taskId) query.set("taskId", taskId);
    query.set(kind === "reviews" ? "beforeOrdinal" : "beforeHistoryOrdinal", String(cursor));
    try {
      const result = await api<{ data: SourceAudit }>(`/v1/company-records/${encodeURIComponent(recordId)}/source-audit?${query}`);
      if (request !== requestRef.current) return;
      setAudit(previous => previous ? {
        ...previous,
        reviews: kind === "reviews" ? [...previous.reviews, ...result.data.reviews.filter(row => !previous.reviews.some(existing => existing.ordinal === row.ordinal))] : previous.reviews,
        nextBeforeOrdinal: kind === "reviews" ? result.data.nextBeforeOrdinal : previous.nextBeforeOrdinal,
        reviewHistoryTruncated: kind === "reviews" ? result.data.reviewHistoryTruncated : previous.reviewHistoryTruncated,
        history: kind === "history" ? [...previous.history, ...result.data.history.filter(row => !previous.history.some(existing => existing.ordinal === row.ordinal))] : previous.history,
        nextBeforeHistoryOrdinal: kind === "history" ? result.data.nextBeforeHistoryOrdinal : previous.nextBeforeHistoryOrdinal
      } : previous);
    } catch (error) { if (request === requestRef.current) setAuditError(errorCode(error)); }
    finally { if (request === requestRef.current) setLoadingMore(null); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); }
  const taskOptions = taskId && pinnedTask && !tasks.some(task => task.id === pinnedTask.id) ? [pinnedTask, ...tasks] : tasks;
  const selectedTask = taskOptions.find(task => task.id === taskId);
  const eligibility = audit?.eligibility;
  const source = audit?.currentRecord;
  const statusText = eligibility?.status === "eligible" ? c.eligible : eligibility?.status === "ineligible" ? c.ineligible : c.taskRequired;
  const statusTone = eligibility?.status === "eligible" ? "border-success/40 bg-success/10" : eligibility?.status === "ineligible" ? "border-warning/50 bg-warning/10" : "border-base-300 bg-base-200/40";

  return <CcRecordEditorModal actions={<CcButton onClick={onClose} variant="primary">{c.close}</CcButton>} closeLabel={c.close} description={c.intro} eyebrow={lang === "pl" ? "Audyt źródła · tylko odczyt" : "Source audit · read only"} maxWidthClassName="max-w-5xl" onClose={onClose} onSubmit={submit} title={`${c.title}: ${source?.title || recordTitle}`} titleId="company-source-panel-title">
    <CcRecordEditorSection title={c.task} description={c.taskHint}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-bold text-company-ink" htmlFor="company-source-task-search">{c.searchLabel}
          <input className="input input-bordered w-full" id="company-source-task-search" onChange={event => setTaskQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); setSearchQuery(taskQuery.trim()); } }} type="search" value={taskQuery} />
        </label>
        <CcButton onClick={() => setSearchQuery(taskQuery.trim())} size="sm" variant="outline">{c.search}</CcButton>
        <CcButton onClick={() => setRefreshKey(value => value + 1)} size="sm" variant="outline">{c.retry}</CcButton>
      </div>
      <label className="mt-3 grid gap-1 text-sm font-bold text-company-ink" htmlFor="company-source-task">{c.task}
          <CcSelect disabled={loadingTasks && !taskOptions.length} id="company-source-task" onChange={event => { const next = event.target.value; setTaskId(next); setPinnedTask(taskOptions.find(task => task.id === next) || null); }} value={taskId}>
            <option value="">{c.chooseTask}</option>
            {taskOptions.map(task => <option key={task.id} value={task.id}>{task.title} · {task.id.slice(0, 8)} ({localizedValue(task.status, lang)})</option>)}
          </CcSelect>
      </label>
      {hasMoreTasks ? <p className="mt-2 text-sm text-company-muted">{c.refineSearch}</p> : null}
      {!loadingTasks && !taskError && !tasks.length ? <p className="mt-2 text-sm text-company-muted">{c.noTaskMatches}</p> : null}
      {taskError ? <CcNotice live tone="error" title={c.taskError} description={taskError} /> : null}
    </CcRecordEditorSection>
    {loading ? <p aria-live="polite" className="text-sm text-company-muted">{c.loading}</p> : null}
    {auditError ? <CcNotice live tone="error" title={c.loadError} description={auditError} /> : null}
    {audit ? <>
      <section aria-live="polite" className={`rounded-company border p-4 ${statusTone}`}>
        <h3 className="font-black text-company-ink">{statusText}</h3>
        <p className="mt-1 text-sm text-company-muted">{selectedTask?.title || eligibility?.task?.title || c.taskHint}</p>
        {eligibility?.status === "ineligible" && eligibility.reasons.includes("missing_review") ? <p className="mt-2 text-sm text-company-ink">{c.missingProof}</p> : null}
        {eligibility?.reasons.length ? <div className="mt-3"><h4 className="text-sm font-bold">{c.reasons}</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{eligibility.reasons.map(reason => <li key={reason}>{reasonText[reason]?.[lang] || reason.replace(/_/g, " ")}</li>)}</ul></div> : null}
      </section>
      <CcRecordEditorSection title={c.current}>
        {source ? <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label={c.source} value={source.source} />
          <Detail label={c.sourceKind} value={source.metadata?.sourceKind} />
          <Detail label={c.sourceSystem} value={source.metadata?.sourceSystem} />
          <Detail label={c.sourceId} value={source.metadata?.sourceId} />
          <Detail label={c.filePath} value={source.metadata?.filePath} />
          <Detail label={c.revision} value={displayRevision(audit.currentRevision, lang)} />
          <Detail label={c.verification} value={localizedValue(source.verificationState, lang)} />
          <Detail label={c.recordStatus} value={localizedValue(source.status, lang)} />
          <Detail label={c.application} value={source.applicationId || c.noApplication} />
          <Detail label={c.created} value={displayDate(source.createdAt, lang)} />
        </dl> : <p className="text-sm text-company-muted">{c.noRecord}</p>}
      </CcRecordEditorSection>
      <CcRecordEditorSection title={c.activeReview}>
        {eligibility?.review ? <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label={c.action} value={localizedValue(eligibility.review.action, lang)} />
          <Detail label={c.classification} value={localizedValue(eligibility.review.classification, lang)} />
          <Detail label={c.provenance} value={localizedValue(eligibility.review.provenance, lang)} />
          <Detail label={c.environment} value={localizedValue(eligibility.review.environment, lang)} />
          <Detail label={c.verificationMethod} value={localizedValue(eligibility.review.verificationMethod, lang)} />
          <Detail label={c.verificationRef} value={eligibility.review.verificationRef} />
          <Detail label={c.rationale} value={eligibility.review.inclusionReason} />
          <Detail label={c.reviewRevision} value={displayRevision(eligibility.review.recordRevision, lang)} />
          <Detail label={c.valid} value={`${displayDate(eligibility.review.validFrom, lang)} – ${displayDate(eligibility.review.validUntil, lang)}`} />
          <Detail label={c.reviewer} value={eligibility.review.actorUserId} />
        </dl> : <p className="text-sm text-company-muted">{c.noReview}</p>}
      </CcRecordEditorSection>
      <CcRecordEditorSection title={c.reviews} description={c.reviewHistoryHint}>
        {audit.reviews.length ? <ol className="grid gap-3">{audit.reviews.map(review => <li className="rounded-company border border-base-300 p-3" key={review.ordinal}>
          <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-company-ink">#{review.ordinal} · {localizedValue(review.action, lang)}</strong><time className="text-xs text-company-muted" dateTime={review.createdAt}>{displayDate(review.createdAt, lang)}</time></div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label={c.taskScope} value={`${tasks.find(task => task.id === review.taskId)?.title || review.taskId}${taskId ? ` · ${review.taskId === taskId ? c.currentTask : c.otherTask}` : ""}`} />
            <Detail label={c.reviewRevision} value={`${displayRevision(review.recordRevision, lang)}${audit.currentRevision ? ` · ${review.recordRevision === audit.currentRevision ? c.currentRevision : c.older}` : ""}`} />
            <Detail label={c.valid} value={`${displayDate(review.validFrom, lang)} – ${displayDate(review.validUntil, lang)}`} />
            <Detail label={c.classification} value={localizedValue(review.classification, lang)} />
            <Detail label={c.provenance} value={localizedValue(review.provenance, lang)} />
            <Detail label={c.environment} value={localizedValue(review.environment, lang)} />
            <Detail label={c.verificationMethod} value={localizedValue(review.verificationMethod, lang)} />
            <Detail label={c.verificationRef} value={review.verificationRef} />
            <Detail label={c.rationale} value={review.inclusionReason} />
            <Detail label={c.reviewer} value={review.actorUserId} />
          </dl>
        </li>)}</ol> : <p className="text-sm text-company-muted">{c.noReviews}</p>}
        {audit.nextBeforeOrdinal ? <CcButton className="mt-3" loading={loadingMore === "reviews"} onClick={() => void loadMore("reviews")} size="sm" variant="outline">{c.moreReviews}</CcButton> : null}
      </CcRecordEditorSection>
      <CcRecordEditorSection title={c.history} description={audit.historyStartsAtMigration && !audit.overwrittenBeforeMigrationAvailable ? c.historyLimit : c.historyBody}>
        {audit.history.length ? <ol className="grid gap-2">{audit.history.map(row => <li className="flex flex-wrap justify-between gap-2 rounded-company border border-base-300 p-3 text-sm" key={row.ordinal}>
          <span><strong>#{row.ordinal}</strong> · {row.operation === "before_update" ? c.beforeUpdate : row.operation === "delete" ? c.deleted : row.operation}</span>
          <time dateTime={row.recordedAt}>{c.at}: {displayDate(row.recordedAt, lang)}</time>
        </li>)}</ol> : <p className="text-sm text-company-muted">{c.noHistory}</p>}
        {audit.nextBeforeHistoryOrdinal ? <CcButton className="mt-3" loading={loadingMore === "history"} onClick={() => void loadMore("history")} size="sm" variant="outline">{c.moreHistory}</CcButton> : null}
      </CcRecordEditorSection>
    </> : null}
  </CcRecordEditorModal>;
}

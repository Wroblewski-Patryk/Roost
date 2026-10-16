import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { useLanguage } from "../../i18n/i18n";
import { localizedValue, reasonText } from "./company-source-panel";

type Option = { id: string; title: string; key: string; recordType: string; status: string; verificationState: string; source: string; updatedAt: string };
type Review = { id: string; ordinal: number; taskId: string; action: "approve" | "withdraw"; classification: string;
  provenance: string; environment: string; verificationMethod: string; verificationRef: string; inclusionReason: string;
  recordRevision: string; contentDigest: string; validFrom: string; validUntil: string; createdAt: string; actorUserId: string };
type RecordBody = Option & { description?: string | null; businessPurpose?: string | null; currentState?: string | null;
  desiredState?: string | null; expectedBehavior?: string | null; rationale?: string | null;
  acceptanceCriteria?: unknown; metadata?: unknown; applicationId?: string | null };
type Audit = { currentRecord: RecordBody | null; currentRevision: string | null; currentDigest: string | null;
  eligibility: { status: "eligible" | "ineligible" | "task_required"; reasons: string[]; task: { id: string; title: string; status: string } | null; review: Review | null };
  reviews: Review[]; nextBeforeOrdinal: number | null };
type Draft = { classification: "" | "fact" | "observation" | "proposal" | "inference"; provenance: string;
  verificationMethod: string; verificationRef: string; inclusionReason: string; validUntil: string };
const emptyDraft: Draft = { classification: "", provenance: "", verificationMethod: "", verificationRef: "", inclusionReason: "", validUntil: "" };
function code(error: unknown) { return error instanceof AppApiError ? error.code : "request_failed"; }
function date(value: string, pl: boolean) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(pl ? "pl-PL" : "en-GB"); }
function writeFailure(error: string, pl: boolean) {
  const messages: Record<string, [string, string]> = {
    source_review_revision_changed: ["Rekord zmienił się. Audyt został odświeżony; sprawdź nową wersję.", "The record changed. Audit refreshed; inspect the new revision."],
    source_review_task_archived: ["Zadanie zostało zarchiwizowane. Nie można zapisać oceny.", "The task was archived. Its review cannot be saved."],
    source_review_record_ineligible: ["Ten rekord nie może zostać dopuszczony jako kontekst.", "This record cannot be approved as context."],
    source_review_application_scope_invalid: ["Rekord jest poza zakresem aplikacji zadania.", "The record is outside the task application scope."],
    source_review_validity_invalid: ["Podaj przyszły termin ważności, nie dalszy niż rok.", "Choose a future expiry within one year."],
    source_review_request_conflict: ["Identyfikator próby ma inną treść. Odśwież audyt.", "This attempt ID has different content. Refresh the audit."],
    source_review_scope_invalid: ["Nie znaleziono zadania lub rekordu w tym workspace.", "Task or record was not found in this workspace."]
  };
  return messages[error]?.[pl ? 0 : 1] || (pl ? "Nie udało się potwierdzić zapisu. Ponów tę samą próbę lub odśwież audyt." : "The write could not be confirmed. Retry the same attempt or refresh the audit.");
}

export function TaskCompanySourceReview({ taskId, taskTitle, onClose }: { taskId: string; taskTitle: string; onClose: () => void }) {
  const { locale } = useLanguage(), pl = locale === "pl";
  const [query, setQuery] = useState(""), [search, setSearch] = useState(""), [options, setOptions] = useState<Option[]>([]);
  const [pinned, setPinned] = useState<Option | null>(null);
  const [moreOptions, setMoreOptions] = useState(false), [pickerError, setPickerError] = useState(""), [pickerBusy, setPickerBusy] = useState(true);
  const [recordId, setRecordId] = useState(""), [audit, setAudit] = useState<Audit | null>(null), [auditError, setAuditError] = useState("");
  const [auditBusy, setAuditBusy] = useState(false), [refresh, setRefresh] = useState(0), [olderBusy, setOlderBusy] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft), [withdrawReason, setWithdrawReason] = useState("");
  const [writeBusy, setWriteBusy] = useState(false), [writeError, setWriteError] = useState(""), [success, setSuccess] = useState("");
  const pending = useRef<{ key: string; requestId: string; input: Record<string, string> } | null>(null);
  const auditRequest = useRef(0);

  useEffect(() => {
    let active = true; setPickerBusy(true); setPickerError("");
    void api<{ data: { items: Option[]; hasMore: boolean } }>(`/v1/company-records/task-source-options?taskId=${encodeURIComponent(taskId)}&q=${encodeURIComponent(search)}`)
      .then(result => { if (active) { setOptions(result.data.items); setMoreOptions(result.data.hasMore); } })
      .catch(error => { if (active) setPickerError(code(error)); })
      .finally(() => { if (active) setPickerBusy(false); });
    return () => { active = false; };
  }, [taskId, search, refresh]);

  useEffect(() => {
    const request = ++auditRequest.current;
    setAudit(null); setAuditError(""); setWriteError("");
    if (!recordId) { setAuditBusy(false); return; }
    setAuditBusy(true);
    void api<{ data: Audit }>(`/v1/company-records/${encodeURIComponent(recordId)}/source-audit?projection=current&taskId=${encodeURIComponent(taskId)}&limit=25`)
      .then(result => { if (request === auditRequest.current) setAudit(result.data); })
      .catch(error => { if (request === auditRequest.current) setAuditError(code(error)); })
      .finally(() => { if (request === auditRequest.current) setAuditBusy(false); });
    return () => { auditRequest.current += 1; };
  }, [recordId, taskId, refresh]);

  async function older() {
    if (!audit?.nextBeforeOrdinal || olderBusy || !recordId) return;
    const request = auditRequest.current, cursor = audit.nextBeforeOrdinal;
    setOlderBusy(true);
    try {
      const result = await api<{ data: Audit }>(`/v1/company-records/${encodeURIComponent(recordId)}/source-audit?projection=current&taskId=${encodeURIComponent(taskId)}&limit=25&beforeOrdinal=${cursor}`);
      if (request === auditRequest.current) setAudit(previous => previous ? { ...previous,
        reviews: [...previous.reviews, ...result.data.reviews.filter(row => !previous.reviews.some(existing => existing.ordinal === row.ordinal))],
        nextBeforeOrdinal: result.data.nextBeforeOrdinal } : previous);
    } catch (error) { if (request === auditRequest.current) setAuditError(code(error)); }
    finally { if (request === auditRequest.current) setOlderBusy(false); }
  }

  async function submitReview(action: "approve" | "withdraw") {
    if (!audit?.currentRecord || !audit.currentRevision || !recordId || writeBusy || audit.eligibility.task?.status === "archived") return;
    const prior = audit.eligibility.review;
    if (action === "withdraw" && (prior?.action !== "approve" || !withdrawReason.trim())) return;
    if (action === "approve" && (!draft.classification || !draft.provenance.trim() || !draft.verificationMethod.trim() || !draft.verificationRef.trim() ||
      !draft.inclusionReason.trim() || !draft.validUntil)) return;
    const key = JSON.stringify({ taskId, recordId, revision: audit.currentRevision, action, draft, withdrawReason: withdrawReason.trim() });
    const until = action === "approve" ? new Date(draft.validUntil).toISOString() : new Date(Date.now() + 86400000).toISOString();
    const freshInput = { taskId, expectedRevision: audit.currentRevision, action,
      classification: action === "approve" ? draft.classification : prior!.classification,
      provenance: action === "approve" ? draft.provenance.trim() : prior!.provenance,
      environment: "production",
      verificationMethod: action === "approve" ? draft.verificationMethod.trim() : prior!.verificationMethod,
      verificationRef: action === "approve" ? draft.verificationRef.trim() : prior!.verificationRef,
      inclusionReason: action === "approve" ? draft.inclusionReason.trim() : withdrawReason.trim(), validUntil: until };
    const input = pending.current?.key === key ? pending.current.input : freshInput;
    const requestId = pending.current?.key === key ? pending.current.requestId : crypto.randomUUID();
    pending.current = { key, requestId, input };
    setWriteBusy(true); setWriteError(""); setSuccess("");
    try {
      await api(`/v1/company-records/${encodeURIComponent(recordId)}/context-reviews`,
        { method: "POST", body: JSON.stringify({ requestId, ...input }) });
      pending.current = null; setWithdrawReason(""); setDraft(emptyDraft); setRefresh(value => value + 1);
      setSuccess(pl ? "Ocena zapisana. Audyt został odświeżony." : "Review saved. Audit refreshed.");
    } catch (error) {
      setWriteError(code(error));
      if (code(error) === "source_review_revision_changed" || code(error) === "source_review_task_archived") setRefresh(value => value + 1);
    } finally { setWriteBusy(false); }
  }
  const taskOptions = pinned && !options.some(option => option.id === pinned.id) ? [pinned, ...options] : options;
  const record = audit?.currentRecord;
  const hardDenials = ["record_missing", "record_inactive", "verification_failed", "forbidden_provenance",
    "invalid_source_metadata", "invalid_reference_package", "application_scope", "task_archived", "wrong_workspace", "wrong_record"];
  const canApprove = Boolean(audit && record && audit.eligibility.task?.status !== "archived" &&
    audit.eligibility.status !== "eligible" && !audit.eligibility.reasons.some(reason => hardDenials.includes(reason)));
  const canWithdraw = Boolean(record && audit?.eligibility.review?.action === "approve" && audit.eligibility.task?.status !== "archived");
  const contentFields: Array<[string, unknown]> = record ? [
    [pl ? "Opis" : "Description", record.description], [pl ? "Cel biznesowy" : "Business purpose", record.businessPurpose],
    [pl ? "Stan bieżący" : "Current state", record.currentState], [pl ? "Stan docelowy" : "Desired state", record.desiredState],
    [pl ? "Oczekiwane zachowanie" : "Expected behavior", record.expectedBehavior], [pl ? "Uzasadnienie" : "Rationale", record.rationale],
    [pl ? "Kryteria akceptacji" : "Acceptance criteria", record.acceptanceCriteria], [pl ? "Metadane źródła" : "Source metadata", record.metadata]
  ] : [];
  return <CcRecordEditorModal actions={<CcButton disabled={writeBusy} onClick={onClose} variant="primary">{pl ? "Zamknij" : "Close"}</CcButton>}
    closeLabel={pl ? "Zamknij" : "Close"} description={pl ? "Ocena dotyczy wyłącznie tego zadania i dokładnej bieżącej wersji rekordu. Nie uruchamia zadania ani nie nadaje mu stanu Ready." : "A review applies only to this task and the exact current record revision. It does not launch the task or mark it Ready."}
    eyebrow={pl ? "04 Operacje · źródło zadania" : "04 Operations · task source"} maxWidthClassName="max-w-5xl"
    onClose={() => { if (!writeBusy) onClose(); }} onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
    title={pl ? `Źródła dla zadania: ${taskTitle}` : `Task sources: ${taskTitle}`} titleId="task-company-source-title">
    <CcRecordEditorSection title={pl ? "Wybierz rekord firmy" : "Choose a company record"}>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-bold" htmlFor="task-source-query">{pl ? "Szukaj po tytule, kluczu lub pełnym ID" : "Search by title, key or full ID"}
          <input id="task-source-query" className="input input-bordered w-full" disabled={writeBusy} type="search" value={query}
            onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); setSearch(query.trim()); } }} />
        </label>
        <CcButton disabled={writeBusy} onClick={() => setSearch(query.trim())} variant="outline">{pl ? "Szukaj" : "Search"}</CcButton>
      </div>
      <label className="mt-3 grid gap-1 text-sm font-bold" htmlFor="task-source-record">{pl ? "Rekord do oceny" : "Record to review"}
        <select id="task-source-record" className="select select-bordered w-full" disabled={writeBusy} value={recordId}
          onChange={event => { setRecordId(event.target.value); setPinned(taskOptions.find(option => option.id === event.target.value) || null);
            pending.current = null; setDraft(emptyDraft); setWithdrawReason(""); setSuccess(""); }}>
          <option value="">{pl ? "Wybierz rekord" : "Choose a record"}</option>
          {taskOptions.map(option => <option key={option.id} value={option.id}>{option.title} · {option.recordType} · {option.id.slice(0, 8)}</option>)}
        </select>
      </label>
      {pickerBusy ? <p role="status">{pl ? "Wczytywanie rekordów…" : "Loading records…"}</p> : null}
      {moreOptions ? <p className="text-sm text-company-muted">{pl ? "Wyniki są ograniczone do 20 rekordów. Zawęź wyszukiwanie." : "Results are limited to 20 records. Refine the search."}</p> : null}
      {!pickerBusy && !pickerError && !options.length ? <p className="text-sm text-company-muted">{pl ? "Brak rekordów dla tego wyszukiwania." : "No records match this search."}</p> : null}
      {pickerError ? <CcNotice live tone="error" title={pl ? "Nie udało się pobrać rekordów" : "Records could not be loaded"} /> : null}
      {pickerError ? <CcButton onClick={() => setRefresh(value => value + 1)} variant="outline">{pl ? "Ponów" : "Retry"}</CcButton> : null}
    </CcRecordEditorSection>
    {auditBusy ? <p role="status">{pl ? "Wczytywanie audytu…" : "Loading audit…"}</p> : null}
    {auditError ? <CcNotice live tone="error" title={pl ? "Nie udało się pobrać audytu" : "Audit could not be loaded"} /> : null}
    {auditError ? <CcButton onClick={() => setRefresh(value => value + 1)} variant="outline">{pl ? "Ponów" : "Retry"}</CcButton> : null}
    {audit ? <>
      <CcRecordEditorSection title={pl ? "Bieżąca wersja i pochodzenie" : "Current revision and provenance"}>
        {record ? <>
          <dl className="grid gap-3 sm:grid-cols-2">
            {[[pl ? "Tytuł" : "Title", record.title], ["ID", record.id], [pl ? "Klucz" : "Key", record.key],
              [pl ? "Typ" : "Type", record.recordType], [pl ? "Źródło" : "Source", record.source],
              [pl ? "Status" : "Status", record.status], [pl ? "Weryfikacja" : "Verification", record.verificationState],
              [pl ? "Zakres aplikacji" : "Application scope", record.applicationId || "—"],
              [pl ? "Wersja" : "Revision", audit.currentRevision], ["SHA-256", audit.currentDigest]].map(([label, value]) =>
              <div className="min-w-0" key={String(label)}><dt className="text-xs font-bold uppercase text-company-muted">{label}</dt><dd className="break-all text-sm">{value || "—"}</dd></div>)}
          </dl>
          <dl className="mt-4 grid gap-3">{contentFields.filter(([, value]) => value != null && value !== "").map(([label, value]) =>
            <div className="min-w-0" key={label}><dt className="text-xs font-bold uppercase text-company-muted">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm">{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</dd></div>)}</dl>
        </> : <p>{pl ? "Bieżący rekord jest niedostępny." : "The current record is unavailable."}</p>}
      </CcRecordEditorSection>
      <CcRecordEditorSection title={pl ? "Dopuszczenie dla tego zadania" : "Eligibility for this task"}>
        <p aria-live="polite" className="font-bold">{audit.eligibility.status === "eligible"
          ? pl ? "Dopuszczony" : "Eligible" : pl ? "Niedopuszczony" : "Ineligible"}</p>
        <p className="text-sm">{taskTitle} · {taskId}</p>
        {audit.eligibility.reasons.length ? <ul className="mt-2 list-disc pl-5 text-sm">{audit.eligibility.reasons.map(reason =>
          <li key={reason}>{reasonText[reason]?.[pl ? "pl" : "en"] || reason.replace(/_/g, " ")}</li>)}</ul> : null}
        {audit.eligibility.review ? <p className="mt-2 text-sm">{pl ? "Ostatnia ocena" : "Latest review"}: #{audit.eligibility.review.ordinal} · {localizedValue(audit.eligibility.review.action, pl ? "pl" : "en")} · {date(audit.eligibility.review.validUntil, pl)}</p> : null}
      </CcRecordEditorSection>
      {canApprove ? <CcRecordEditorSection title={pl ? "Zatwierdź tę wersję jako kontekst" : "Approve this revision as context"}
        description={pl ? "Wpisz podstawę oceny i termin końcowy. Zatwierdzenie nie potwierdza niezależnie prawdziwości rekordu." : "Enter the review basis and expiry. Approval is an owner attestation, not independent verification."}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold">{pl ? "Klasyfikacja" : "Classification"}
            <select className="select select-bordered" disabled={writeBusy} value={draft.classification} onChange={event => setDraft(value => ({ ...value, classification: event.target.value as Draft["classification"] }))}>
              <option value="">{pl ? "Wybierz klasyfikację" : "Choose classification"}</option>
              <option value="fact">{pl ? "Fakt" : "Fact"}</option><option value="observation">{pl ? "Obserwacja" : "Observation"}</option>
              <option value="proposal">{pl ? "Propozycja" : "Proposal"}</option><option value="inference">{pl ? "Wniosek" : "Inference"}</option>
            </select>
          </label>
          {([["provenance", pl ? "Pochodzenie" : "Provenance"], ["verificationMethod", pl ? "Metoda weryfikacji" : "Verification method"],
            ["verificationRef", pl ? "Odnośnik dowodu" : "Evidence reference"], ["inclusionReason", pl ? "Powód włączenia" : "Inclusion reason"]] as const).map(([field, label]) =>
            <label className="grid gap-1 text-sm font-bold" key={field}>{label}<input className="input input-bordered w-full" required
              disabled={writeBusy} maxLength={field === "provenance" || field === "verificationMethod" ? 500 : 1000} value={draft[field]}
              onChange={event => setDraft(value => ({ ...value, [field]: event.target.value }))} /></label>)}
          <label className="grid gap-1 text-sm font-bold">{pl ? "Ważne do" : "Valid until"}
            <input className="input input-bordered" type="datetime-local" required disabled={writeBusy} value={draft.validUntil}
              onChange={event => setDraft(value => ({ ...value, validUntil: event.target.value }))} /></label>
        </div>
        <CcButton className="mt-4" disabled={writeBusy || !draft.classification || !draft.validUntil || !draft.provenance.trim() || !draft.verificationMethod.trim() ||
          !draft.verificationRef.trim() || !draft.inclusionReason.trim()} loading={writeBusy}
          onClick={() => void submitReview("approve")} variant="primary">{pl ? "Zatwierdź dla tego zadania" : "Approve for this task"}</CcButton>
      </CcRecordEditorSection> : null}
      {canWithdraw ? <CcRecordEditorSection title={pl ? "Wycofaj dopuszczenie" : "Withdraw approval"}>
        <label className="grid gap-1 text-sm font-bold">{pl ? "Powód wycofania" : "Withdrawal reason"}
          <input className="input input-bordered w-full" disabled={writeBusy} maxLength={1000} required value={withdrawReason}
            onChange={event => setWithdrawReason(event.target.value)} /></label>
        <CcButton className="mt-3" disabled={writeBusy || !withdrawReason.trim()} loading={writeBusy}
          onClick={() => void submitReview("withdraw")} variant="outline">{pl ? "Wycofaj dla tego zadania" : "Withdraw for this task"}</CcButton>
      </CcRecordEditorSection> : null}
      {writeError ? <CcNotice live tone="error" title={pl ? "Nie udało się zapisać oceny" : "Review could not be saved"}
        description={writeFailure(writeError, pl)} /> : null}
      {success ? <CcNotice live tone="success" title={success} /> : null}
      <CcRecordEditorSection title={pl ? "Historia ocen" : "Review history"}
        description={pl ? "Oceny innych zadań są widoczne historycznie i nie nadają dopuszczenia temu zadaniu." : "Reviews for other tasks are history and do not grant eligibility to this task."}>
        {audit.reviews.length ? <ol className="grid gap-3">{audit.reviews.map(review =>
          <li className="rounded-company border border-base-300 p-3 text-sm" key={review.ordinal}>
            <strong>#{review.ordinal} · {localizedValue(review.action, pl ? "pl" : "en")} · {review.taskId === taskId ? taskTitle : review.taskId}</strong>
            <p>{pl ? "Wersja" : "Revision"}: {review.recordRevision} · SHA-256: {review.contentDigest}</p>
            <p>{pl ? "Ważne" : "Valid"}: {date(review.validFrom, pl)} – {date(review.validUntil, pl)}</p>
            <p>{pl ? "Ocenił" : "Reviewed by"}: {review.actorUserId} · {date(review.createdAt, pl)}</p>
            <p>{localizedValue(review.classification, pl ? "pl" : "en")} · {review.provenance} · {localizedValue(review.environment, pl ? "pl" : "en")}</p>
            <p>{review.verificationMethod} · {review.verificationRef}</p><p>{review.inclusionReason}</p>
          </li>)}</ol> : <p>{pl ? "Brak ocen." : "No reviews."}</p>}
        {audit.nextBeforeOrdinal ? <CcButton className="mt-3" loading={olderBusy} onClick={() => void older()} variant="outline">
          {pl ? "Pokaż starsze oceny" : "Show older reviews"}</CcButton> : null}
      </CcRecordEditorSection>
    </> : null}
  </CcRecordEditorModal>;
}

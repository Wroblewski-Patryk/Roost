import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { useLanguage } from "../../i18n/i18n";

type Category = "business" | "test" | "audit" | "unknown";
type Assessment = { id: string; ordinal: number; category: Category; reason: string;
  actorUserId: string; createdAt: string; recordRevision: string; recordDigest: string;
  sourceReference: Record<string, unknown>; previousAssessmentId: string | null };
type InventoryState = { status: "unassessed" | "current" | "stale"; category: Category | null;
  lastCategory: Category | null; latestAssessmentId: string | null; assessedAt: string | null };
type Preview = { record: Record<string, unknown> & { id: string; title: string; key: string; source: string;
  status: string; updatedAt: string; description?: string | null; metadata?: unknown };
  recordRevision: string; recordDigest: string; sourceReference: Record<string, unknown>;
  assessable: boolean; state: InventoryState; latest: Assessment | null;
  history: Assessment[]; nextBeforeOrdinal: number | null };

const categoryOptions: Array<{ value: Category; pl: string; en: string }> = [
  { value: "business", pl: "Firmowy", en: "Business" },
  { value: "test", pl: "Testowy", en: "Test" },
  { value: "audit", pl: "Audytowy", en: "Audit" },
  { value: "unknown", pl: "Nieustalone", en: "Unknown" }
];
function errorMessage(code: string, pl: boolean) {
  const messages: Record<string, [string, string]> = {
    inventory_assessment_record_changed: ["Rekord zmienił się. Sprawdź ponownie jego aktualną wersję.", "The record changed. Review its current version again."],
    inventory_assessment_chain_changed: ["Ktoś dopisał ocenę. Sprawdź historię przed kolejną korektą.", "Another assessment was added. Review its history before correcting it."],
    inventory_assessment_record_no_longer_unassigned: ["Rekord nie jest już w Do uporządkowania.", "The record is no longer in To organize."],
    inventory_assessment_owner_required: ["Ta czynność wymaga dostępu właściciela.", "This action requires owner access."],
    inventory_assessment_record_not_found: ["Nie znaleziono już tego rekordu.", "This record is no longer available."],
    inventory_assessment_request_conflict: ["Identyfikator zapisu został już użyty dla innej oceny. Odśwież rekord.", "This request ID was used for another assessment. Refresh the record."]
  };
  return (messages[code] ?? ["Żądanie się nie powiodło. Odśwież dokładny rekord i spróbuj ponownie.",
    "The request failed. Refresh the exact record and try again."])[pl ? 0 : 1];
}
export function inventoryCategoryLabel(value: Category | null, pl: boolean) {
  const option = categoryOptions.find(option => option.value === value);
  return option ? pl ? option.pl : option.en : pl ? "Brak oceny" : "No assessment";
}
export function inventoryStateLabel(state: InventoryState | null | undefined, pl: boolean) {
  if (!state || state.status === "unassessed") return pl ? "Brak oceny" : "No assessment";
  if (state.status === "stale") return pl ? "Wymaga ponownej oceny" : "Needs reassessment";
  return inventoryCategoryLabel(state.category, pl);
}

export function CompanyRecordInventoryAssessment({ recordId, title, onClose, onChanged }: {
  recordId: string; title: string; onClose: () => void; onChanged: () => void;
}) {
  const { locale } = useLanguage(), pl = locale === "pl";
  const [preview, setPreview] = useState<Preview | null>(null);
  const [history, setHistory] = useState<Assessment[]>([]);
  const [nextBeforeOrdinal, setNextBeforeOrdinal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true), [olderLoading, setOlderLoading] = useState(false);
  const [loadError, setLoadError] = useState(""), [writeError, setWriteError] = useState("");
  const [historyError, setHistoryError] = useState(""), [writeUncertain, setWriteUncertain] = useState(false);
  const [success, setSuccess] = useState(false), [sending, setSending] = useState(false);
  const [category, setCategory] = useState<Category | "">("");
  const [reason, setReason] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const request = useRef(0);
  const endpoint = `/v1/company-records/${encodeURIComponent(recordId)}/inventory-assessments`;

  function load() {
    const current = ++request.current;
    setLoading(true); setLoadError(""); setWriteError(""); setPreview(null); setPrepared(false); setRequestId(null); setWriteUncertain(false);
    void api<{ data: Preview }>(endpoint).then(({ data }) => {
      if (request.current !== current) return;
      if (data.record.id !== recordId) throw new Error("inventory_record_mismatch");
      setPreview(data); setHistory(data.history); setNextBeforeOrdinal(data.nextBeforeOrdinal);
      setLoading(false);
    }).catch(error => {
      if (request.current !== current) return;
      setLoadError(error instanceof AppApiError ? error.code : "request_failed"); setLoading(false);
    });
  }
  useEffect(() => { load(); return () => { request.current += 1; }; }, [recordId]);

  function loadOlder() {
    if (nextBeforeOrdinal === null || olderLoading) return;
    setOlderLoading(true); setHistoryError("");
    void api<{ data: Preview }>(`${endpoint}?beforeOrdinal=${nextBeforeOrdinal}`).then(({ data }) => {
      if (data.record.id !== recordId) throw new Error("inventory_record_mismatch");
      setHistory(rows => [...rows, ...data.history]); setNextBeforeOrdinal(data.nextBeforeOrdinal);
    }).catch(error => setHistoryError(error instanceof AppApiError ? error.code : "request_failed"))
      .finally(() => setOlderLoading(false));
  }

  function prepare() {
    setWriteError(""); setSuccess(false);
    if (!preview || loading || loadError || writeUncertain || !preview.assessable || !category || !reason.trim()) {
      setWriteError(pl ? "Wybierz kategorię i wpisz uzasadnienie." : "Choose a category and enter a reason."); return;
    }
    setRequestId(crypto.randomUUID()); setPrepared(true);
  }

  function submit() {
    if (!preview || loading || loadError || !prepared || !category || !reason.trim() || sending) return;
    const id = requestId ?? crypto.randomUUID();
    setRequestId(id); setSending(true); setWriteError("");
    const body = { requestId: id, expectedRevision: preview.recordRevision,
      expectedDigest: preview.recordDigest, expectedPreviousAssessmentId: preview.state.latestAssessmentId,
      category, reason: reason.trim() };
    void api<{ data: Assessment }>(endpoint, { method: "POST", body: JSON.stringify(body) }).then(() => {
      setSuccess(true); setPrepared(false); setRequestId(null); setWriteUncertain(false); setCategory(""); setReason("");
      onChanged(); load();
    }).catch(error => {
      const code = error instanceof AppApiError ? error.code : "network_error";
      setWriteError(code);
      if (error instanceof AppApiError && error.status === 409) {
        setPrepared(false); setRequestId(null); load();
      } else if (!(error instanceof AppApiError) || error.status === 0 || error.status >= 500) {
        setWriteUncertain(true);
      } else {
        setPrepared(false); setRequestId(null);
      }
      // An uncertain network failure keeps the same request ID for a safe retry.
    }).finally(() => setSending(false));
  }

  function preventSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); }
  const source = preview?.sourceReference ?? {};
  const sourceFields = Object.entries(source).filter(([, value]) => value !== null && value !== undefined && value !== "");
  return <CcRecordEditorModal titleId="inventory-assessment-title"
    initialFocus="heading"
    eyebrow={pl ? "Ocena przeznaczenia · jeden dokładny rekord" : "Inventory purpose · one exact record"}
    title={preview?.record.title ?? title} description={pl ? "Ocena właściciela dotyczy widocznej wersji. Nie weryfikuje prawdziwości treści ani nie dopuszcza jej do zadań agenta."
      : "The owner's assessment applies to the visible version. It does not verify content or admit it to agent tasks."}
    maxWidthClassName="max-w-5xl" closeLabel={pl ? "Zamknij ocenę" : "Close assessment"}
    onClose={onClose} onSubmit={preventSubmit}
    actions={<><CcButton onClick={onClose} variant="outline">{pl ? "Zamknij" : "Close"}</CcButton>
      {preview?.assessable && !prepared ? <CcButton disabled={loading || !!loadError || !category || !reason.trim()} onClick={prepare} variant="primary">{pl ? "Pokaż skutki oceny" : "Preview assessment effect"}</CcButton> : null}
      {prepared ? <>{!writeUncertain ? <CcButton disabled={sending} onClick={() => { setPrepared(false); setRequestId(null); }} variant="ghost">{pl ? "Wróć do edycji" : "Back to edit"}</CcButton> : null}
        <CcButton disabled={!preview?.assessable} loading={sending} onClick={submit} variant="primary">{writeUncertain
          ? pl ? "Ponów identyczny zapis" : "Retry same request" : pl ? "Zapisz ocenę rekordu" : "Save record assessment"}</CcButton></> : null}</>}>
    {loading ? <CcNotice tone="loading" title={pl ? "Wczytywanie dokładnego rekordu" : "Loading exact record"} /> : null}
    {loadError ? <CcNotice live tone="error" title={pl ? "Nie udało się odczytać oceny" : "Could not load assessment"}
      detail={errorMessage(loadError, pl)} action={<CcButton onClick={load} variant="outline">{pl ? "Ponów" : "Retry"}</CcButton>} /> : null}
    {preview ? <>
      {success ? <CcNotice live tone="success" title={pl ? "Ocena została zapisana" : "Assessment saved"} /> : null}
      <CcRecordEditorSection title={pl ? "Dokładny rekord" : "Exact record"}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {([ [pl ? "Identyfikator" : "ID", preview.record.id], [pl ? "Klucz" : "Key", preview.record.key],
            [pl ? "Status" : "Status", preview.record.status], [pl ? "Źródło" : "Source", preview.record.source],
            [pl ? "Wersja" : "Revision", preview.recordRevision], [pl ? "Skrót treści" : "Content digest", preview.recordDigest],
            [pl ? "Weryfikacja" : "Verification", String(preview.record.verificationState ?? "—")],
            [pl ? "Cel biznesowy" : "Business purpose", String(preview.record.businessPurpose ?? "—")],
            [pl ? "Stan obecny" : "Current state", String(preview.record.currentState ?? "—")],
            [pl ? "Opis" : "Description", preview.record.description ?? "—"],
            [pl ? "Metadane" : "Metadata", JSON.stringify(preview.record.metadata ?? null, null, 2)] ] as Array<[string, string]>).map(([label, value]) =>
            <div className="min-w-0" key={label}><dt className="font-bold text-company-muted">{label}</dt><dd className="break-all whitespace-pre-wrap text-company-ink">{value}</dd></div>)}
        </dl>
        <details className="mt-3 rounded-company border border-base-300 p-3"><summary className="cursor-pointer font-bold">{pl ? "Wszystkie zapisane pola rekordu" : "All recorded fields"}</summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(preview.record, null, 2)}</pre></details>
      </CcRecordEditorSection>
      <CcRecordEditorSection title={pl ? "Zapisane pochodzenie" : "Recorded source reference"}>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">{sourceFields.map(([key, value]) =>
          <div className="min-w-0" key={key}><dt className="font-bold text-company-muted">{key}</dt><dd className="break-all text-company-ink">{String(value)}</dd></div>)}</dl>
      </CcRecordEditorSection>
      <CcRecordEditorSection title={pl ? "Stan oceny" : "Assessment state"}>
        <p className="font-bold">{preview.state.status === "unassessed" ? pl ? "Brak oceny" : "No assessment"
          : preview.state.status === "stale" ? pl ? "Wymaga ponownej oceny po zmianie rekordu" : "Needs reassessment after record change"
          : inventoryCategoryLabel(preview.state.category, pl)}</p>
        {preview.latest ? <p className="mt-2 text-sm text-company-muted">{pl ? "Ostatnia zapisana ocena" : "Last recorded assessment"}: {inventoryCategoryLabel(preview.latest.category, pl)} · {preview.latest.createdAt} · {preview.latest.actorUserId}</p> : null}
        {preview.latest ? <p className="mt-2 whitespace-pre-wrap text-sm">{preview.latest.reason}</p> : null}
      </CcRecordEditorSection>
      {!preview.assessable ? <CcNotice tone="warning" title={pl ? "Rekord nie jest już w katalogu Do uporządkowania" : "Record is no longer in To organize"}
        detail={pl ? "Historia pozostaje dostępna. Nowej oceny nie można tu zapisać." : "History remains visible. A new assessment cannot be saved here."} /> : null}
      {preview.assessable ? <CcRecordEditorSection title={pl ? "Nowa ocena lub korekta" : "New assessment or correction"}>
        <div className="grid gap-3"><label className="grid gap-1 font-bold" htmlFor="inventory-category">{pl ? "Przeznaczenie" : "Purpose"}
          <select className="select select-bordered w-full" disabled={sending || writeUncertain} id="inventory-category" value={category} onChange={event => { setCategory(event.target.value as Category | ""); setPrepared(false); setRequestId(null); }}>
            <option value="">{pl ? "Wybierz" : "Choose"}</option>{categoryOptions.map(option => <option key={option.value} value={option.value}>{pl ? option.pl : option.en}</option>)}
          </select></label>
          <label className="grid gap-1 font-bold" htmlFor="inventory-reason">{pl ? "Uzasadnienie" : "Reason"}
            <textarea className="textarea textarea-bordered min-h-28 w-full" disabled={sending || writeUncertain} id="inventory-reason" maxLength={2000} value={reason}
              onChange={event => { setReason(event.target.value); setPrepared(false); setRequestId(null); }} /></label></div>
        <p className="mt-2 text-sm text-company-muted">{pl ? "Zapis doda nowy wpis historii dla tego jednego ID i wersji. Nie zmieni treści, statusu, weryfikacji ani dopuszczenia źródła do zadań."
          : "Saving adds one history entry for this ID and version. It does not change content, status, verification or task source eligibility."}</p>
        {prepared ? <div className="mt-3 rounded-company border border-primary p-3" role="status"><strong>{pl ? "Podgląd skutków" : "Effect preview"}</strong>
          <p className="mt-1 text-sm">{inventoryCategoryLabel(category || null, pl)} · {preview.record.id} · {preview.recordRevision}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{reason.trim()}</p></div> : null}
        {writeError ? <CcNotice live tone="error" title={writeUncertain ? pl ? "Wynik zapisu jest nieznany" : "Save result is unknown"
          : pl ? "Ocena nie została zapisana" : "Assessment was not saved"}
          detail={writeUncertain ? pl ? "Ponów dokładnie to samo żądanie albo odśwież zapis, zanim przygotujesz nową ocenę."
            : "Retry the same request or refresh the record before preparing a new assessment." : errorMessage(writeError, pl)}
          action={writeUncertain && prepared ? <CcButton onClick={load} variant="outline">{pl ? "Sprawdź zapis" : "Check saved state"}</CcButton> : undefined} /> : null}
      </CcRecordEditorSection> : null}
      <CcRecordEditorSection title={pl ? "Historia ocen" : "Assessment history"}>
        {!history.length ? <p className="text-sm text-company-muted">{pl ? "Nie ma zapisanych ocen." : "No assessments recorded."}</p> : null}
        <ol className="grid gap-2">{history.map(item => <li className="rounded-company border border-base-300 p-3 text-sm" key={item.id}>
          <strong>#{item.ordinal} · {inventoryCategoryLabel(item.category, pl)}</strong>
          <p className="mt-1 break-all text-company-muted">{item.createdAt} · {item.actorUserId} · {item.recordRevision}</p>
          <details className="mt-1"><summary className="cursor-pointer">{pl ? "Zapisane pochodzenie i skrót" : "Recorded source and digest"}</summary>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({ digest: item.recordDigest, source: item.sourceReference }, null, 2)}</pre></details>
          <p className="mt-1 whitespace-pre-wrap">{item.reason}</p>
        </li>)}</ol>
        {historyError ? <CcNotice live tone="error" title={pl ? "Nie udało się wczytać starszej historii" : "Could not load older history"}
          detail={errorMessage(historyError, pl)} /> : null}
        {nextBeforeOrdinal !== null ? <CcButton loading={olderLoading} onClick={loadOlder} variant="outline">{pl ? "Pokaż starsze oceny" : "Show older assessments"}</CcButton> : null}
      </CcRecordEditorSection>
    </> : null}
  </CcRecordEditorModal>;
}

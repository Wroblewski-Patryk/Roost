import { useEffect, useRef, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcSelect } from "../../components/cc-select";
import { useLanguage } from "../../i18n/i18n";

type Task = { id: string; title: string };
type Snapshot = { id: string; createdAt: string; sourceRevisionId: string; extractedText: string | null };
type Candidate = { task: Task & { assignedWorkforceEntityId: string | null }; file: { id: string; name: string };
  credentials: Array<{ id: string; keyPrefix: string | null; expiresAt: string | null }>;
  snapshot: { id: string; sourceRevisionId: string; createdAt: string } | null };
type Intent = { id: string; state: string; errorCode: string | null; providerRevisionId: string | null; actorVerification: string; createdAt: string; possibleLateWrite?: boolean };
type Governed = { status: string; provider: { revisionId: string; version: string | null; actorVerification: string } | null;
  file: { name: string }; content: string | null; previousApprovedContent?: string | null; intent: Intent | null };

async function bodyDigest(body: string) {
  const bytes = new TextEncoder().encode(JSON.stringify(JSON.parse(body)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function GovernedDocPanel({ fileId, snapshot }: { fileId: string; snapshot: Snapshot }) {
  const { locale } = useLanguage();
  const pl = locale === "pl";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState("");
  const [governed, setGoverned] = useState<Governed | null>(null);
  const [unbound, setUnbound] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [credentialId, setCredentialId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [classification, setClassification] = useState("fact");
  const [submitted, setSubmitted] = useState(false);
  const [reload, setReload] = useState(0);
  const appendRequest = useRef("");
  const mandateRequest = useRef<{ body: string; path: string } | null>(null);
  const passwordInput = useRef<HTMLInputElement | null>(null);
  const inspectedCurrent = Boolean(candidate?.snapshot && candidate.snapshot.id === snapshot.id
    && candidate.snapshot.sourceRevisionId === snapshot.sourceRevisionId);
  const stateLabel = (state: string) => ({ ready: pl ? "Gotowy" : "Ready", posting: pl ? "Wysyłanie" : "Posting",
    applied: pl ? "Zastosowano" : "Applied", uncertain: pl ? "Wynik niepewny" : "Uncertain",
    conflict: pl ? "Konflikt" : "Conflict", closed: pl ? "Zamknięty" : "Closed",
    source_changed: pl ? "Źródło zmienione" : "Source changed",
    mandate_stale: pl ? "Mandat nieaktualny" : "Mandate stale",
    uncertain_in_flight: pl ? "Wynik niepewny, żądanie może nadal trwać" : "Uncertain; request may still be running",
    provider_unavailable: pl ? "Google niedostępne" : "Google unavailable" } as Record<string, string>)[state] ?? state;

  useEffect(() => {
    let active = true;
    api<{ data: Task[] }>("/v1/tasks").then(result => { if (active) setTasks(result.data); })
      .catch(() => { if (active) setError(pl ? "Nie można pobrać zadań." : "Could not load tasks."); });
    return () => { active = false; };
  }, [pl]);

  useEffect(() => {
    if (!taskId) { setGoverned(null); setUnbound(false); return; }
    let active = true;
    setBusy(true); setError(""); setGoverned(null); setUnbound(false);
    api<{ data: Governed }>(`/v1/google-drive/tasks/${taskId}/docs/${fileId}/governed`, { cache: "no-store" })
      .then(result => { if (active) setGoverned(result.data); })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof AppApiError && reason.code === "google_doc_mandate_required") setUnbound(true);
        else setError(reason instanceof AppApiError ? reason.code : "request_failed");
      }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [taskId, fileId, reload]);

  useEffect(() => {
    if (!unbound || !taskId) { setCandidate(null); return; }
    let active = true;
    api<{ data: Candidate }>(`/v1/google-drive/tasks/${taskId}/docs/${fileId}/governed/candidate`, { cache: "no-store" })
      .then(result => { if (active) setCandidate(result.data); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof AppApiError ? reason.code : "request_failed"); });
    return () => { active = false; };
  }, [unbound, taskId, fileId, reload]);

  async function approveAndBind() {
    if (!taskId || !candidate?.snapshot || !inspectedCurrent || !credentialId || !passwordInput.current?.value) return;
    setBusy(true); setError("");
    if (!mandateRequest.current) {
      mandateRequest.current = {
        path: `/v1/google-drive/tasks/${taskId}/docs/${fileId}/governed/mandate`,
        body: JSON.stringify({ requestId: crypto.randomUUID(), sourceSnapshotId: candidate.snapshot.id,
          credentialId, expectedRevision: candidate.snapshot.sourceRevisionId, classification,
          validUntil: new Date(Date.now() + 86400000).toISOString() })
      };
    }
    try {
      const prepared = mandateRequest.current;
      const proof = await api<{ data: { proof: string } }>("/v1/auth/reauth", { method: "POST", body: JSON.stringify({
        password: passwordInput.current.value, method: "POST", path: prepared.path, bodyDigest: await bodyDigest(prepared.body)
      }) });
      passwordInput.current.value = "";
      await api(prepared.path, { method: "POST", body: prepared.body, headers: { "X-Owner-Action-Proof": proof.data.proof } });
      mandateRequest.current = null;
      setReload(value => value + 1);
    } catch (reason) {
      setError(reason instanceof AppApiError ? reason.code : "request_failed");
    } finally { setBusy(false); }
  }

  async function appendOnce() {
    if (!governed?.provider || !taskId || !text.trim() || submitted) return;
    setSubmitted(true); setBusy(true); setError("");
    if (!appendRequest.current) appendRequest.current = crypto.randomUUID();
    try {
      await api(`/v1/google-drive/tasks/${taskId}/docs/${fileId}/governed/append`, { method: "POST", body: JSON.stringify({
        requestId: appendRequest.current, expectedRevision: governed.provider.revisionId, text
      }) });
      setReload(value => value + 1);
    } catch (reason) {
      setError(reason instanceof AppApiError ? reason.code : "request_failed");
    } finally { setBusy(false); }
  }

  async function closeIntent() {
    if (!taskId || !governed?.intent) return;
    setBusy(true); setError("");
    try {
      await api(`/v1/google-drive/tasks/${taskId}/docs/${fileId}/governed/intents/${governed.intent.id}/close`, { method: "POST" });
      setReload(value => value + 1);
    } catch (reason) {
      setError(reason instanceof AppApiError ? reason.code : "request_failed");
    } finally { setBusy(false); }
  }

  return <section className="grid gap-3 rounded-company border border-base-300 p-3" aria-label={pl ? "Edycja Google Doc powiązana z zadaniem" : "Task-bound Google Doc edit"}>
    <h3 className="font-bold">{pl ? "Zarządzana edycja dokumentu" : "Governed document edit"}</h3>
    <p className="text-sm text-company-muted">{pl ? "Wybierz jedno zadanie. Właściciel zatwierdza odczytane źródło, a następnie może dopisać tekst raz. Google pozostaje źródłem treści." : "Select one task. The owner approves the inspected source, then text may be appended once. Google remains the content authority."}</p>
    <CcSelect aria-label={pl ? "Zadanie dla dokumentu" : "Task for document"} value={taskId} onChange={event => { setTaskId(event.target.value); setSubmitted(false); appendRequest.current = ""; mandateRequest.current = null; setCredentialId(""); }}>
      <option value="">{pl ? "Wybierz zadanie" : "Choose a task"}</option>
      {tasks.map(task => <option key={task.id} value={task.id}>{task.title} · {task.id.slice(0, 8)}</option>)}
    </CcSelect>
    {busy ? <p role="status">{pl ? "Sprawdzam stan Google i Roost…" : "Checking Google and Roost…"}</p> : null}
    {error ? <CcNotice tone="error" title={pl ? "Nie udało się potwierdzić operacji" : "Operation could not be confirmed"} detail={error} live /> : null}
    {unbound ? <div className="grid gap-2">
      <p className="text-sm">{pl ? "Ten dokument nie ma jeszcze zatwierdzonego źródła i mandatu dla zadania. Przed zatwierdzeniem przeczytaj aktualną treść powyżej." : "This Doc has no approved source and mandate for the task. Inspect the current content above before approval."}</p>
      {candidate ? <p className="text-sm">{pl ? "Przypisany agent" : "Assigned agent"}: <span className="font-mono">{candidate.task.assignedWorkforceEntityId ?? (pl ? "brak" : "none")}</span> · {pl ? "Zapis źródła" : "Source snapshot"}: <span className="font-mono">{candidate.snapshot?.sourceRevisionId ?? (pl ? "brak" : "none")}</span></p> : null}
      {candidate && !inspectedCurrent ? <CcNotice tone="warning" title={pl ? "Dokument zmienił się od podglądu" : "Doc changed since preview"} detail={pl ? "Odśwież podgląd oryginału przed zatwierdzeniem." : "Refresh the original preview before approval."} /> : null}
      <CcSelect aria-label={pl ? "Poświadczenie agenta" : "Agent credential"} value={credentialId} onChange={event => { setCredentialId(event.target.value); mandateRequest.current = null; }}>
        <option value="">{pl ? "Wybierz poświadczenie" : "Choose credential"}</option>
        {candidate?.credentials.map(key => <option key={key.id} value={key.id}>{key.keyPrefix ?? key.id.slice(0, 8)} · {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString(locale) : "—"}</option>)}
      </CcSelect>
      <CcSelect aria-label={pl ? "Klasyfikacja źródła" : "Source classification"} value={classification} onChange={event => { setClassification(event.target.value); mandateRequest.current = null; }}>
        <option value="fact">{pl ? "Fakt" : "Fact"}</option><option value="observation">{pl ? "Obserwacja" : "Observation"}</option>
        <option value="proposal">{pl ? "Propozycja" : "Proposal"}</option><option value="inference">{pl ? "Wniosek" : "Inference"}</option>
      </CcSelect>
      <label className="grid gap-1 text-sm">{pl ? "Obecne hasło właściciela" : "Current owner password"}<input ref={passwordInput} type="password" autoComplete="current-password" className="input input-bordered w-full" /></label>
      <p className="text-xs text-company-muted">{pl ? "Potwierdzenie obejmuje dokładny dokument, zadanie, agenta, poświadczenie i 24 godziny ważności. Zatwierdzenie źródła i mandat zapiszą się razem." : "Confirmation binds this Doc, task, agent, credential and a 24-hour expiry. Source approval and mandate are recorded together."}</p>
      <CcButton disabled={busy || !inspectedCurrent || !credentialId} onClick={approveAndBind} size="sm">{pl ? "Potwierdź i wydaj mandat" : "Confirm and issue mandate"}</CcButton>
    </div> : null}
    {governed ? <div className="grid gap-2">
      <dl className="grid gap-1 text-sm"><div><dt className="font-bold">{pl ? "Stan" : "State"}</dt><dd>{stateLabel(governed.status)}</dd></div>
        <div><dt className="font-bold">{pl ? "Rewizja Google" : "Google revision"}</dt><dd className="break-all font-mono">{governed.provider?.revisionId ?? (pl ? "niedostępna" : "unavailable")}</dd></div>
        <div><dt className="font-bold">{pl ? "Aktor Google" : "Google actor"}</dt><dd>{pl ? "Niezweryfikowany" : "Unverified"}</dd></div></dl>
      {governed.status === "source_changed" ? <CcNotice tone="warning" title={pl ? "Źródło zmieniło się od zatwierdzenia" : "Source changed since approval"}
        detail={pl ? "Nie wysyłaj edycji. Porównaj wersje w Google. Ten mandat dopuszcza tylko jedną próbę; dalsza edycja wymaga nowej decyzji właściciela." : "Do not send an edit. Compare versions in Google. This mandate permits one attempt; a later edit needs a new owner decision."} /> : null}
      {governed.previousApprovedContent != null ? <details><summary>{pl ? "Poprzednia zatwierdzona treść" : "Previously approved content"}</summary><pre className="whitespace-pre-wrap text-xs">{governed.previousApprovedContent}</pre></details> : null}
      {governed.intent ? <CcNotice tone={governed.intent.state === "applied" ? "success" : "warning"}
        title={`${pl ? "Intencja" : "Intent"}: ${stateLabel(governed.intent.state)}`}
        detail={governed.intent.possibleLateWrite
          ? (pl ? "Żądanie może nadal trwać i zapisać dokument później. Nie zamykaj ani nie ponawiaj; sprawdź Google po ustaleniu wyniku." : "The request may still be running and write later. Do not close or retry; inspect Google after its outcome is known.")
          : `${governed.intent.errorCode ?? ""} ${governed.intent.providerRevisionId ?? ""}`.trim() || (pl ? "Odczytano wynik z Google." : "Read back from Google.")} /> : null}
      {governed.intent && ["conflict", "uncertain"].includes(governed.intent.state) ? <CcButton disabled={busy} onClick={closeIntent} size="sm" variant="outline">{pl ? "Zamknij po ręcznym sprawdzeniu Google" : "Close after manual Google inspection"}</CcButton> : null}
      {governed.status === "ready" && governed.provider && !governed.intent ? <><label className="grid gap-1 text-sm">{pl ? "Tekst do dopisania w pierwszej karcie" : "Text to append in the first tab"}
        <textarea className="textarea textarea-bordered w-full" maxLength={20000} value={text} onChange={event => setText(event.target.value)} /></label>
        <CcButton disabled={busy || submitted || !text.trim()} onClick={appendOnce} size="sm">{pl ? "Dopisz raz w Google Docs" : "Append once in Google Docs"}</CcButton>
        <p className="text-xs text-company-muted">{pl ? "Po niepewnym wyniku nie ponawiaj zapisu. Odśwież widok i sprawdź dokument w Google." : "Do not resend an uncertain result. Refresh this view and inspect the Doc in Google."}</p></> : null}
      <CcButton disabled={busy} onClick={() => setReload(value => value + 1)} size="sm" variant="outline">{pl ? "Odczytaj ponownie" : "Read again"}</CcButton>
    </div> : null}
  </section>;
}

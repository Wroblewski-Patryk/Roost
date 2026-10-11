import { FormEvent, useEffect, useRef, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { useLanguage } from "../../i18n/i18n";
import { formatAppDate } from "../../i18n/date-format";

type Candidate = {
  taskId: string;
  title: string;
  agent: { id: string; label: string };
  credential: { id: string; keyPrefix: string | null };
  sources: Array<{ id: string; title: string; revision: string; reviewId: string }>;
};
type Mandate = {
  id: string;
  status: "active" | "used" | "expired" | "revoked" | "stale";
  sourceTitle: string | null;
  sourceRecordId: string;
  sourceRevision: string;
  validUntil: string;
  revokedAt: string | null;
  reason: string;
  credentialId: string;
  keyPrefix: string | null;
  usedProposalId: string | null;
};
type RequestPin = { signature: string; id: string };
type PreparedAction = { path: string; body: string; action: "issue" | "revoke" };

const words = {
  pl: {
    title: "Mandat do proponowania zadania", description: "Właściciel dopuszcza jedno uprawnione zadanie, przypiętego agenta i jedno aktualne zatwierdzone źródło. Sam przegląd źródła nie daje agentowi prawa do zgłoszenia.",
    loading: "Wczytywanie kandydatów", empty: "Brak zadań z jednoznacznie przypiętym agentem, poświadczeniem i aktualnym zatwierdzonym źródłem.",
    unavailable: "Nie udało się wczytać mandatów.", forbidden: "Nie masz uprawnienia do zarządzania mandatami.", choose: "Wybierz…", task: "Zadanie źródłowe", source: "Zatwierdzone źródło", agent: "Agent", credential: "Poświadczenie", expiry: "Ważny do", reason: "Powód wydania", revokeReason: "Powód cofnięcia", issue: "Wydaj mandat", revoke: "Cofnij mandat", cancelRevoke: "Anuluj cofnięcie", history: "Mandaty tego zadania", noHistory: "Brak mandatów dla wybranego zadania.", refresh: "Odśwież", issued: "Mandat wydany.", revoked: "Mandat cofnięty.", revokedAt: "Cofnięto", changed: "Zadanie, źródło lub poświadczenie zmieniły się. Odśwież przed kolejną próbą.", writeError: "Nie udało się zapisać mandatu. Odśwież stan przed kolejną próbą.", truncated: "Lista jest ograniczona do pierwszych kwalifikujących się zadań lub mandatów; pozostałe nie są pokazane w tym widoku.",
    historyOnly: "To zadanie nie spełnia obecnie warunków wydania nowego mandatu. Historia i cofnięcie nadal są dostępne.",
    reauth: "Potwierdź hasło, aby wykonać dokładnie tę zmianę. Po potwierdzeniu wyślę ten sam zapis z tym samym identyfikatorem żądania.", password: "Obecne hasło", confirm: "Potwierdź i kontynuuj", cancel: "Anuluj", reauthError: "Potwierdzenie hasła nie powiodło się. Przygotowana zmiana nadal czeka.",
    statuses: { active: "Aktywny", used: "Wykorzystany", expired: "Wygasły", revoked: "Cofnięty", stale: "Nieaktualny" }
  },
  en: {
    title: "Task proposal mandate", description: "The owner authorizes one eligible task, its bound agent, and one current approved source. Source review alone does not grant proposal authority to an agent.",
    loading: "Loading candidates", empty: "No task has an unambiguous bound agent, credential and current approved source.",
    unavailable: "Mandates could not be loaded.", forbidden: "You do not have permission to manage mandates.", choose: "Choose…", task: "Source task", source: "Approved source", agent: "Agent", credential: "Credential", expiry: "Valid until", reason: "Issue reason", revokeReason: "Revocation reason", issue: "Issue mandate", revoke: "Revoke mandate", cancelRevoke: "Cancel revocation", history: "Mandates for this task", noHistory: "No mandates for the selected task.", refresh: "Refresh", issued: "Mandate issued.", revoked: "Mandate revoked.", revokedAt: "Revoked at", changed: "The task, source or credential changed. Refresh before another attempt.", writeError: "The mandate could not be saved. Refresh the state before another attempt.", truncated: "The list is limited to the first eligible tasks or mandates; others are not shown in this view.",
    historyOnly: "This task is no longer eligible for a new mandate. Its history and revocation remain available.",
    reauth: "Confirm your password for this exact change. After confirmation, the same request body and request ID will be sent.", password: "Current password", confirm: "Confirm and continue", cancel: "Cancel", reauthError: "Password confirmation failed. The prepared change is still available.",
    statuses: { active: "Active", used: "Used", expired: "Expired", revoked: "Revoked", stale: "Stale" }
  }
};

function localTime(date: Date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
async function bodyDigest(body: string) {
  const bytes = new TextEncoder().encode(JSON.stringify(JSON.parse(body)));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function TaskProposalMandates() {
  const { locale } = useLanguage();
  const c = words[locale];
  const [refresh, setRefresh] = useState(0);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [mandateTasks, setMandateTasks] = useState<Array<{ taskId: string; title: string }>>([]);
  const [candidateTruncated, setCandidateTruncated] = useState(false);
  const [historyTruncated, setHistoryTruncated] = useState(false);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [taskId, setTaskId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [expiry, setExpiry] = useState(() => localTime(new Date(Date.now() + 30 * 60000)));
  const [reason, setReason] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [history, setHistory] = useState<Mandate[]>([]);
  const [historyMore, setHistoryMore] = useState(false);
  const [historyState, setHistoryState] = useState<"idle" | "loading" | "ready" | "error" | "forbidden">("idle");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<"issued" | "revoked" | "changed" | "forbidden" | "error" | null>(null);
  const [prepared, setPrepared] = useState<PreparedAction | null>(null);
  const [reauthError, setReauthError] = useState(false);
  const pin = useRef<RequestPin | null>(null);
  const selected = candidates.find(item => item.taskId === taskId);
  const source = selected?.sources.find(item => item.id === sourceId);
  const taskOptions = [...candidates.map(item => ({ taskId: item.taskId, title: item.title })), ...mandateTasks.filter(item => !candidates.some(candidate => candidate.taskId === item.taskId))];

  useEffect(() => {
    let live = true;
    setCatalogState("loading");
    void api<{ data: { items: Candidate[]; truncated: boolean; mandateTasks?: Array<{ taskId: string; title: string }>; historyTruncated?: boolean } }>("/v1/agent-runtime/task-proposal-mandate-candidates")
      .then(response => {
        if (!live) return;
        if (!Array.isArray(response.data?.items) || typeof response.data.truncated !== "boolean") throw new Error("mandate_candidates_invalid");
        setCandidates(response.data.items);
        setCandidateTruncated(response.data.truncated);
        setMandateTasks(Array.isArray(response.data.mandateTasks) ? response.data.mandateTasks : []);
        setHistoryTruncated(Boolean(response.data.historyTruncated));
        setCatalogState("ready");
      })
      .catch(error => { if (live) setCatalogState(error instanceof AppApiError && error.status === 403 ? "forbidden" : "error"); });
    return () => { live = false; };
  }, [refresh]);

  useEffect(() => {
    if (!taskId) { setHistory([]); setHistoryState("idle"); return; }
    let live = true;
    setHistoryState("loading");
    void api<{ data: { items: Mandate[]; hasMore: boolean } }>(`/v1/agent-runtime/tasks/${encodeURIComponent(taskId)}/proposal-mandates`)
      .then(response => {
        if (!live) return;
        if (!Array.isArray(response.data?.items) || typeof response.data.hasMore !== "boolean") throw new Error("mandate_history_invalid");
        setHistory(response.data.items);
        setHistoryMore(response.data.hasMore);
        setHistoryState("ready");
      })
      .catch(error => { if (live) setHistoryState(error instanceof AppApiError && error.status === 403 ? "forbidden" : "error"); });
    return () => { live = false; };
  }, [taskId, refresh]);

  function reload() { pin.current = null; setNotice(null); setPrepared(null); setRefresh(value => value + 1); }
  function chooseTask(id: string) { pin.current = null; setTaskId(id); setSourceId(""); setRevoking(null); setReason(""); setNotice(null); }
  function chooseSource(id: string) { pin.current = null; setSourceId(id); setNotice(null); }
  const validUntil = Date.parse(expiry);
  const canIssue = Boolean(selected && source && !busy && reason.trim().length >= 3 && Number.isFinite(validUntil) && validUntil > Date.now());

  function recorded(action: "issue" | "revoke") {
    pin.current = null;
    setPrepared(null); setReauthError(false);
    setReason(""); setSourceId(""); setRevoking(null);
    setNotice(action === "revoke" ? "revoked" : "issued");
    setRefresh(value => value + 1);
  }

  async function confirmPrepared(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prepared || busy) return;
    const password = String(new FormData(event.currentTarget).get("reauthPassword") || "");
    setBusy(true); setReauthError(false); setNotice(null);
    try {
      const proofResponse = await api<{ data: { proof: string } }>("/v1/auth/reauth", {
        method: "POST", body: JSON.stringify({ password, method: "POST", path: prepared.path, bodyDigest: await bodyDigest(prepared.body) })
      });
      await api(prepared.path, { method: "POST", body: prepared.body, headers: { "X-Owner-Action-Proof": proofResponse.data.proof } });
      recorded(prepared.action);
    } catch (error) {
      if (error instanceof AppApiError && error.code === "invalid_credentials") setReauthError(true);
      else if (error instanceof AppApiError && error.status === 409) { setPrepared(null); setNotice("changed"); setRefresh(value => value + 1); }
      else setNotice("error");
    } finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !taskId || reason.trim().length < 3 || !revoking && !selected) return;
    const route = revoking
      ? `/v1/agent-runtime/tasks/${encodeURIComponent(taskId)}/proposal-mandates/${encodeURIComponent(revoking)}/actions/revoke`
      : `/v1/agent-runtime/tasks/${encodeURIComponent(taskId)}/proposal-mandates`;
    if (!revoking && (!source || !canIssue)) return;
    const input = revoking ? { reason: reason.trim() } : { credentialId: selected!.credential.id, sourceRecordId: source!.id, expectedSourceRevision: source!.revision, validUntil: new Date(validUntil).toISOString(), reason: reason.trim() };
    const signature = JSON.stringify({ route, input });
    if (pin.current?.signature !== signature) pin.current = { signature, id: crypto.randomUUID() };
    setBusy(true); setNotice(null);
    const body = JSON.stringify({ ...input, requestId: pin.current.id });
    try {
      await api(route, { method: "POST", body });
      recorded(revoking ? "revoke" : "issue");
    } catch (error) {
      if (error instanceof AppApiError && error.code === "task_proposal_fresh_owner_required") { setPrepared({ path: route, body, action: revoking ? "revoke" : "issue" }); setReauthError(false); }
      else if (error instanceof AppApiError && error.status === 409) { setNotice("changed"); setRefresh(value => value + 1); }
      else setNotice(error instanceof AppApiError && error.status === 403 ? "forbidden" : "error");
    } finally { setBusy(false); }
  }

  return <section aria-labelledby="task-proposal-mandates-heading" className="roost-work-surface rounded-company p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-company-ink" id="task-proposal-mandates-heading">{c.title}</h2><p className="text-sm text-company-muted">{c.description}</p></div><CcButton size="sm" variant="outline" onClick={reload} disabled={busy || catalogState === "loading"}>{c.refresh}</CcButton></div>
    {notice ? <div className="mt-4"><CcNotice live tone={notice === "issued" || notice === "revoked" ? "success" : "error"} title={notice === "issued" ? c.issued : notice === "revoked" ? c.revoked : notice === "changed" ? c.changed : notice === "forbidden" ? c.forbidden : c.writeError} /></div> : null}
    {catalogState === "loading" ? <div className="mt-4"><CcNotice tone="loading" title={c.loading} /></div> : null}
    {catalogState === "error" || catalogState === "forbidden" ? <div className="mt-4"><CcNotice tone="error" title={catalogState === "forbidden" ? c.forbidden : c.unavailable} live /></div> : null}
    {catalogState === "ready" ? <>
      {candidateTruncated || historyTruncated ? <div className="mt-4"><CcNotice tone="warning" title={c.truncated} /></div> : null}
      {!taskOptions.length ? <p className="mt-4 text-sm text-company-muted">{c.empty}</p> : <form className="mt-4 grid gap-4" onSubmit={submit}>
        <CcField label={c.task} required>{({ id }) => <CcSelect id={id} value={taskId} onChange={event => chooseTask(event.target.value)} disabled={busy} required><option value="">{c.choose}</option>{taskOptions.map(item => <option key={item.taskId} value={item.taskId}>{item.title}</option>)}</CcSelect>}</CcField>
        {taskId && !selected ? <CcNotice tone="info" title={c.historyOnly} /> : null}
        {selected ? <>
          <p className="text-sm"><strong>{c.agent}:</strong> {selected.agent.label} <span className="break-all text-xs text-company-muted">({selected.agent.id})</span> · <strong>{c.credential}:</strong> {selected.credential.keyPrefix || selected.credential.id}</p>
          <CcField label={c.source} required>{({ id }) => <CcSelect id={id} value={sourceId} onChange={event => chooseSource(event.target.value)} disabled={busy || Boolean(revoking)} required={!revoking}><option value="">{c.choose}</option>{selected.sources.map(item => <option key={item.id} value={item.id}>{item.title} · {item.revision}</option>)}</CcSelect>}</CcField>
          {source ? <p className="break-all text-xs text-company-muted">{c.source}: {source.id} · {source.revision} · {source.reviewId}</p> : null}
          {!revoking ? <CcField label={c.expiry} required>{({ id }) => <input id={id} className="input input-bordered w-full max-w-sm" type="datetime-local" value={expiry} onChange={event => { pin.current = null; setExpiry(event.target.value); }} disabled={busy} required />}</CcField> : null}
          {!revoking ? <><CcField label={c.reason} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-20 w-full" value={reason} onChange={event => { pin.current = null; setReason(event.target.value); }} minLength={3} maxLength={1000} disabled={busy} required />}</CcField><div><CcButton type="submit" variant="primary" loading={busy} disabled={!canIssue}>{c.issue}</CcButton></div></> : null}
        </> : null}
        {revoking ? <><CcField label={c.revokeReason} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-20 w-full" value={reason} onChange={event => { pin.current = null; setReason(event.target.value); }} minLength={3} maxLength={1000} disabled={busy} required />}</CcField><div className="flex flex-wrap gap-2"><CcButton type="submit" variant="warning" loading={busy} disabled={reason.trim().length < 3}>{c.revoke}</CcButton><CcButton onClick={() => { setRevoking(null); setReason(""); pin.current = null; }} disabled={busy} variant="ghost">{c.cancelRevoke}</CcButton></div></> : null}
      </form>}
      {taskId ? <div className="mt-6 border-t border-base-300 pt-4"><h3 className="font-bold">{c.history}</h3>
        {historyState === "loading" ? <CcNotice tone="loading" title={c.loading} /> : null}
        {historyState === "error" || historyState === "forbidden" ? <CcNotice tone="error" title={historyState === "forbidden" ? c.forbidden : c.unavailable} live /> : null}
        {historyState === "ready" && !history.length ? <p className="mt-3 text-sm text-company-muted">{c.noHistory}</p> : null}
        {historyState === "ready" ? <ul className="mt-3 divide-y divide-base-300">{history.map(item => <li key={item.id} className="grid gap-1 py-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.sourceTitle || item.sourceRecordId}</strong><span>{c.statuses[item.status]}</span></div><p className="break-all text-xs text-company-muted">{item.sourceRecordId} · {item.sourceRevision} · {item.keyPrefix || item.credentialId}</p><p>{c.expiry}: {formatAppDate(item.validUntil, { dateStyle: "medium", timeStyle: "short" })}</p><p>{item.reason}</p>{item.revokedAt ? <p>{c.revokedAt}: {formatAppDate(item.revokedAt, { dateStyle: "medium", timeStyle: "short" })}</p> : null}{item.status !== "revoked" && !revoking ? <div><CcButton size="sm" variant="outline" onClick={() => { setRevoking(item.id); setReason(""); pin.current = null; }} disabled={busy}>{c.revoke}</CcButton></div> : null}</li>)}</ul> : null}
        {historyMore ? <p className="mt-3 text-sm text-company-muted">{c.truncated}</p> : null}
      </div> : null}
    </> : null}
    {prepared ? <CcRecordEditorModal titleId="proposal-mandate-reauth-title" eyebrow={c.title} title={prepared.action === "issue" ? c.issue : c.revoke} description={c.reauth} closeLabel={c.cancel} onClose={() => { if (!busy) { setPrepared(null); setReauthError(false); } }} onSubmit={event => void confirmPrepared(event)} actions={<><CcButton onClick={() => { setPrepared(null); setReauthError(false); }} disabled={busy} variant="ghost">{c.cancel}</CcButton><CcButton type="submit" variant="primary" loading={busy}>{c.confirm}</CcButton></>}>
      {reauthError ? <CcNotice tone="error" title={c.reauthError} live /> : null}
      {notice === "error" ? <CcNotice tone="error" title={c.writeError} live /> : null}
      <CcField label={c.password} required>{({ id }) => <input id={id} name="reauthPassword" type="password" autoComplete="current-password" className="input input-bordered w-full" required disabled={busy} />}</CcField>
    </CcRecordEditorModal> : null}
  </section>;
}

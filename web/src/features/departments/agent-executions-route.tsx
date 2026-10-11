import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { CcRecordEditorModal } from "../../components/cc-record-editor";
import { CcSelect } from "../../components/cc-select";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";
import { ChangedContextSources, type ChangedContextSource } from "./changed-context-sources";
import { TaskReadinessModal } from "./task-readiness";
import { RuntimeRedactionNotice, type RedactionIncident } from "./runtime-redaction-notice";
import { refusedTrackedRecoveryEvidence } from "./refused-tracked-recovery-model";
import { ExecutionContinuationReview } from "./company-information-result";

type Host = { id: string; name: string; slug: string; status: string; platform: string; lastSeenAt?: string | null; applicationSlugs: string[] };
type ExecutionEvent = { id: string; type: string; level: string; message: string; payload: Record<string, unknown>; createdAt: string };
type Execution = {
  id: string; status: string; attempt?: number; summary?: string | null; finalResponse?: string | null; createdAt: string; startedAt?: string | null; completedAt?: string | null; cancelRequestedAt?: string | null;
  changedFiles: string[]; verification: Record<string, unknown>; usage: Record<string, unknown>; errorState?: { code?: string; message?: string; retryable?: boolean; details?: unknown } | null;
  checkpoint?: { stage?: string; contextRevision?: string | null; headCommit?: string } | null; checkpointVersion?: number;
  metadata?: { resultRevision?: { commit: string; branch: string; workingTree: string; observedAt: string } | null; refusedTrackedRecoveries?: unknown } | null;
  contextInvalidatedAt?: string | null; contextStoppedAt?: string | null; contextInvalidation?: { changedSources?: ChangedContextSource[] } | null;
  task: { id: string; title: string; project?: { id: string; name: string } | null };
  application: { id: string; name: string; slug: string } | null;
  agentHost?: Host | null; events: ExecutionEvent[]; eventTotalCount?: number;
};
type ExecutionRow = Pick<Execution, "id" | "status" | "attempt" | "createdAt" | "startedAt" | "contextInvalidatedAt" | "contextStoppedAt" | "task" | "application" | "agentHost">;
type AgentLog = { id: string; level: string; message: string; metadata?: Record<string, unknown> | null; createdAt: string; agent?: { id: string; name: string } | null };
type ActivityItem = { id: string; source: string; context: string; message: string; level: string; createdAt: string };
type RuntimeReadiness = {
  executionEnabled: boolean;
  mode: string;
  applications: Array<{ id: string; name: string; slug: string; readyForHost: boolean; checks: { repository: boolean; deployment: boolean; localMapping: boolean; deliveryProject: boolean; hostAdvertised: boolean }; project?: { name: string } | null }>;
  triggerPolicy?: { status: string; triggers: Array<{ status: string; eventType?: string | null }> } | null;
  activationRequirements: string[];
};

const activeStatuses = new Set(["queued", "claimed", "running", "waiting_for_approval"]);
function tone(status: string) { return status === "completed" ? "badge-success" : status === "failed" ? "badge-error" : status === "cancelled" ? "badge-ghost" : status === "waiting_for_approval" ? "badge-warning" : "badge-info"; }
function date(value?: string | null) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"; }

type CriticalPreemptionCandidates = {
  canRequest: boolean;
  expectedVersion: number;
  incidents: Array<{ id: string; title: string; updatedAt: string }>;
  incoming: Array<{ id: string; createdAt: string; task: { id: string; title: string; priority: string } }>;
  request: { id: string; status: string; incidentRecordId: string; incomingExecutionId: string; requestedAt: string; stoppedAt: string | null; incidentTitleCurrent: string | null; incomingTaskTitleCurrent: string | null } | null;
};
type PreparedPreemption = { path: string; body: string; incidentTitle: string; taskTitle: string; reason: string };

async function actionBodyDigest(body: string) {
  const bytes = new TextEncoder().encode(JSON.stringify(JSON.parse(body)));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function CriticalPreemptionControl({ execution, polish, onRequested }: { execution: Execution; polish: boolean; onRequested: () => void }) {
  const [packet, setPacket] = useState<CriticalPreemptionCandidates | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [refresh, setRefresh] = useState(0);
  const [incidentId, setIncidentId] = useState("");
  const [incomingId, setIncomingId] = useState("");
  const [reason, setReason] = useState("");
  const [prepared, setPrepared] = useState<PreparedPreemption | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<"invalid_password" | "changed" | "uncertain" | null>(null);
  const clearSubmittedAfterRead = useRef(false);

  useEffect(() => {
    let live = true;
    setLoadState("loading");
    void api<{ data: CriticalPreemptionCandidates }>(`/v1/agent-runtime/executions/${execution.id}/critical-preemption-candidates`)
      .then(response => { if (live) { setPacket(response.data); setLoadState("ready"); if (clearSubmittedAfterRead.current && !response.data.request) { setSubmitted(false); setNotice(null); } clearSubmittedAfterRead.current = false; } })
      .catch(error => { if (live) { clearSubmittedAfterRead.current = false; setLoadState(error instanceof AppApiError && error.status === 403 ? "forbidden" : "error"); } });
    return () => { live = false; };
  }, [execution.id, refresh]);

  useEffect(() => {
    if (packet?.request?.status !== "requested") return;
    const timer = window.setInterval(() => { if (!document.hidden) setRefresh(value => value + 1); }, 5000);
    return () => window.clearInterval(timer);
  }, [packet?.request?.status]);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitted || prepared || loadState !== "ready" || !packet?.canRequest || packet.request || packet.expectedVersion < 1) return;
    const incident = packet.incidents.find(item => item.id === incidentId);
    const incoming = packet.incoming.find(item => item.id === incomingId);
    const explanation = reason.trim();
    if (!incident || !incoming || explanation.length < 12 || explanation.length > 1000) return;
    const path = `/v1/agent-runtime/executions/${execution.id}/actions/request-critical-preemption`;
    const body = JSON.stringify({ requestId: crypto.randomUUID(), incidentRecordId: incident.id, incidentRevision: incident.updatedAt, incomingExecutionId: incoming.id, expectedVersion: packet.expectedVersion, reason: explanation });
    setNotice(null);
    setPrepared({ path, body, incidentTitle: incident.title, taskTitle: incoming.task.title, reason: explanation });
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prepared || busy) return;
    const password = String(new FormData(event.currentTarget).get("reauthPassword") || "");
    setBusy(true); setNotice(null);
    try {
      const proof = await api<{ data: { proof: string } }>("/v1/auth/reauth", {
        method: "POST", body: JSON.stringify({ password, method: "POST", path: prepared.path, bodyDigest: await actionBodyDigest(prepared.body) })
      });
      await api(prepared.path, { method: "POST", body: prepared.body, headers: { "X-Owner-Action-Proof": proof.data.proof } });
      setSubmitted(true); setPrepared(null); setReason(""); setIncidentId(""); setIncomingId("");
      onRequested(); setRefresh(value => value + 1);
    } catch (error) {
      if (error instanceof AppApiError && error.code === "invalid_credentials") setNotice("invalid_password");
      else {
        setPrepared(null);
        setNotice(error instanceof AppApiError && error.status === 409 ? "changed" : "uncertain");
        if (!(error instanceof AppApiError && error.status === 409)) setSubmitted(true);
        setRefresh(value => value + 1);
      }
    } finally { setBusy(false); }
  }

  if (loadState === "forbidden") return null;
  if (loadState === "loading" && !packet) return execution.status === "running" ? <CcNotice tone="loading" title={polish ? "Sprawdzanie możliwości wyparcia" : "Checking preemption availability"} /> : null;
  if (loadState === "error" && !packet) return execution.status === "running" ? <CcNotice tone="error" title={polish ? "Nie udało się sprawdzić incydentów i zadań critical" : "Could not check incidents and critical tasks"} /> : null;
  if (!packet || (execution.status !== "running" && !packet.request)) return null;
  const activeRequest = packet.request;
  const canPrepare = loadState === "ready" && packet.canRequest && !activeRequest && !submitted && packet.incidents.some(item => item.id === incidentId)
    && packet.incoming.some(item => item.id === incomingId) && reason.trim().length >= 12 && reason.trim().length <= 1000;

  return <section className="mt-4 border-t border-base-300 pt-4" aria-labelledby="critical-preemption-heading">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black" id="critical-preemption-heading">{polish ? "Incydent critical i wyparcie" : "Critical incident and preemption"}</h3><CcButton size="xs" variant="outline" className="min-h-11" disabled={busy} onClick={() => { clearSubmittedAfterRead.current = submitted; setRefresh(value => value + 1); }}>{polish ? "Odśwież stan" : "Refresh status"}</CcButton></div>
    {notice === "changed" ? <CcNotice live tone="warning" title={polish ? "Stan zadania, incydentu lub checkpointu zmienił się. Sprawdź aktualną listę przed nową decyzją." : "The task, incident, or checkpoint changed. Review the current list before a new decision."} /> : null}
    {notice === "uncertain" ? <CcNotice live tone="warning" title={polish ? "Nie udało się potwierdzić wyniku żądania. Odczytuję aktualny stan; sprawdź go przed ponowną decyzją." : "The command result could not be confirmed. The current state is being refreshed; review it before another decision."} /> : null}
    {loadState === "error" ? <CcNotice tone="error" title={polish ? "Nie udało się odświeżyć stanu wyparcia" : "Could not refresh preemption state"} /> : null}
    {activeRequest ? <div className="mt-3 grid gap-2">
      <CcNotice tone={activeRequest.status === "stopped" ? "success" : "warning"} title={activeRequest.status === "stopped" ? (polish ? "Natywne zatrzymanie i checkpoint potwierdzone" : "Native stop and checkpoint confirmed") : (polish ? "Żądanie wyparcia oczekuje na potwierdzony stop" : "Preemption request awaits confirmed stop")} detail={activeRequest.status === "stopped" ? (polish ? "To wykonanie jest zamknięte. Wznowienie wymaga zmienionego planu, zgody właściciela i nowego Ready." : "This execution is closed. Continuation requires a changed plan, owner approval, and a new Ready.") : (polish ? "Worker musi potwierdzić zatrzymanie procesu. Blokada Writera pozostaje zajęta do tego potwierdzenia; nowe zadanie nie startuje automatycznie." : "The Worker must confirm process termination. The Writer remains held until then; the new task does not start automatically.")} />
      <dl className="grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-company-muted">{polish ? "Incydent" : "Incident"}</dt><dd>{activeRequest.incidentTitleCurrent || (polish ? "Nazwa niedostępna" : "Name unavailable")}</dd></div><div><dt className="text-company-muted">{polish ? "Zadanie critical" : "Critical task"}</dt><dd>{activeRequest.incomingTaskTitleCurrent || (polish ? "Nazwa niedostępna" : "Name unavailable")}</dd></div><div><dt className="text-company-muted">{polish ? "Żądanie" : "Requested"}</dt><dd>{date(activeRequest.requestedAt)}</dd></div><div><dt className="text-company-muted">{polish ? "Potwierdzony stop" : "Confirmed stop"}</dt><dd>{date(activeRequest.stoppedAt)}</dd></div></dl>
    </div> : submitted ? <p className="mt-2 text-sm text-company-muted">{polish ? "Sprawdź aktualny stan przed kolejną decyzją. Żądanie mogło zostać zapisane, nawet jeśli odpowiedź nie dotarła." : "Check the current state before another decision. The request may have been recorded even if its response was lost."}</p> : packet.canRequest ? <>
      <p className="mt-2 text-sm text-company-muted">{polish ? "Wskaż aktywny incydent i oczekujące zadanie critical. Sama decyzja nie kończy bieżącej pracy: Worker musi potwierdzić natywne zatrzymanie i checkpoint." : "Select an active incident and a queued critical task. The decision alone does not stop current work: the Worker must confirm native termination and a checkpoint."}</p>
      {!packet.incidents.length || !packet.incoming.length ? <CcNotice tone="info" title={polish ? "Brak kwalifikującego się incydentu lub zadania critical" : "No eligible incident or critical task"} detail={polish ? "Wyparcie wymaga obu aktualnych rekordów. Odśwież szczegóły po ich przygotowaniu." : "Preemption requires both current records. Refresh the details once they are available."} /> : <form className="mt-3 grid gap-3" onSubmit={prepare}>
        <CcField label={polish ? "Potwierdzany incydent" : "Incident to confirm"} required>{({ id }) => <CcSelect id={id} value={incidentId} onChange={event => setIncidentId(event.target.value)} required disabled={busy}><option value="">{polish ? "Wybierz incydent" : "Choose an incident"}</option>{packet.incidents.map(item => <option value={item.id} key={item.id}>{item.title} · {date(item.updatedAt)}</option>)}</CcSelect>}</CcField>
        <CcField label={polish ? "Oczekujące zadanie critical" : "Queued critical task"} required>{({ id }) => <CcSelect id={id} value={incomingId} onChange={event => setIncomingId(event.target.value)} required disabled={busy}><option value="">{polish ? "Wybierz zadanie" : "Choose a task"}</option>{packet.incoming.map(item => <option value={item.id} key={item.id}>{item.task.title} · {date(item.createdAt)}</option>)}</CcSelect>}</CcField>
        <CcField label={polish ? "Uzasadnienie decyzji" : "Decision reason"} hint={polish ? "Opisz, dlaczego ten incydent wymaga przerwania bieżącej pracy (12–1000 znaków)." : "Explain why this incident requires interrupting current work (12–1000 characters)."} required>{({ id, describedBy }) => <textarea id={id} aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" value={reason} onChange={event => setReason(event.target.value)} minLength={12} maxLength={1000} disabled={busy} required />}</CcField>
        <div><CcButton type="submit" size="sm" variant="warning" disabled={!canPrepare || busy}>{polish ? "Przejrzyj wyparcie" : "Review preemption"}</CcButton></div>
      </form>}
    </> : <p className="mt-2 text-sm text-company-muted">{polish ? "Wyparcie nie jest dostępne dla tego wykonania. Stan zadania, hosta lub checkpointu może wymagać odświeżenia." : "Preemption is unavailable for this execution. The task, host, or checkpoint state may need refreshing."}</p>}
    {prepared ? <CcRecordEditorModal titleId="critical-preemption-confirm-title" eyebrow={polish ? "Decyzja właściciela" : "Owner decision"} title={polish ? "Potwierdź wyparcie" : "Confirm preemption"} description={polish ? "Hasło potwierdzi dokładnie to żądanie. Worker musi jeszcze zatrzymać proces i zapisać checkpoint." : "Your password confirms this exact request. The Worker must still stop the process and seal a checkpoint."} closeLabel={polish ? "Zamknij" : "Close"} onClose={() => { if (!busy) { setPrepared(null); setNotice(null); } }} onSubmit={event => void confirm(event)} maxWidthClassName="max-w-xl" actions={<><CcButton onClick={() => { setPrepared(null); setNotice(null); }} disabled={busy} variant="ghost">{polish ? "Wróć" : "Back"}</CcButton><CcButton type="submit" variant="warning" loading={busy}>{polish ? "Potwierdź i zażądaj stopu" : "Confirm and request stop"}</CcButton></>}>
      <dl className="grid gap-2 text-sm"><div><dt className="text-company-muted">{polish ? "Przerywana praca" : "Current work"}</dt><dd>{execution.task.title}</dd></div><div><dt className="text-company-muted">{polish ? "Incydent" : "Incident"}</dt><dd>{prepared.incidentTitle}</dd></div><div><dt className="text-company-muted">{polish ? "Zadanie critical" : "Critical task"}</dt><dd>{prepared.taskTitle}</dd></div><div><dt className="text-company-muted">{polish ? "Uzasadnienie" : "Reason"}</dt><dd className="whitespace-pre-wrap">{prepared.reason}</dd></div></dl>
      {notice === "invalid_password" ? <CcNotice live tone="error" title={polish ? "Hasło jest niepoprawne. Przygotowana decyzja nadal czeka." : "Password was incorrect. The prepared decision is still pending."} /> : null}
      <CcField label={polish ? "Obecne hasło" : "Current password"} required>{({ id }) => <input id={id} name="reauthPassword" type="password" autoComplete="current-password" className="input input-bordered w-full" required disabled={busy} />}</CcField>
    </CcRecordEditorModal> : null}
  </section>;
}

export function AgentExecutionsRoute() {
  const { locale, t } = useLanguage(); const polish = locale === "pl"; const labels = useTranslatedTableLabels();
  const [readyTaskId, setReadyTaskId] = useState<string | null>(null);
  const executionLabel = (execution: Pick<Execution, "status" | "contextInvalidatedAt" | "contextStoppedAt">) => execution.contextInvalidatedAt ? t(execution.status === "cancelled" ? "ready.contextAttemptClosed" : execution.contextStoppedAt ? "ready.contextStoppedStatus" : "ready.contextStoppingStatus") : humanizeBusinessValue(execution.status, undefined, locale);
  const [executionRefresh, setExecutionRefresh] = useState(0); const [detailRefresh, setDetailRefresh] = useState(0); const [executionPage, setExecutionPage] = useState(0); const [hostRefresh, setHostRefresh] = useState(0); const [logRefresh, setLogRefresh] = useState(0); const [selectedId, setSelectedId] = useState(""); const [preemptionRequestedId, setPreemptionRequestedId] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null); const [busy, setBusy] = useState(false); const refreshTick = useRef(0);
  const packet = useOwnerPacket<ExecutionRow[]>(`/v1/agent-runtime/executions?page=${executionPage}&refresh=${executionRefresh}`, true, t);
  const detailPacket = useOwnerPacket<Execution>(selectedId ? `/v1/agent-runtime/executions/${selectedId}?refresh=${detailRefresh}` : "", Boolean(selectedId), t);
  const hosts = useOwnerPacket<Host[]>(`/v1/agent-runtime/hosts?refresh=${hostRefresh}`, true, t);
  const readiness = useOwnerPacket<RuntimeReadiness>("/v1/agent-runtime/readiness", true, t);
  const agentLogs = useOwnerPacket<AgentLog[]>(`/v1/agent-logs?limit=80&refresh=${logRefresh}`, true, t);
  const rows = packet.data || []; const selected = detailPacket.data?.id === selectedId ? detailPacket.data : null;
  const recoveryEvidence = selected ? refusedTrackedRecoveryEvidence(selected) : [];
  const hasActiveExecution = rows.some((item) => activeStatuses.has(item.status));
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      refreshTick.current += 1;
      if (hasActiveExecution) {
        setExecutionRefresh((value) => value + 1);
        if (refreshTick.current % 4 === 0) {
          setHostRefresh((value) => value + 1);
          setLogRefresh((value) => value + 1);
        }
        return;
      }
      const lane = refreshTick.current % 3;
      if (lane === 0) setExecutionRefresh((value) => value + 1);
      if (lane === 1) setHostRefresh((value) => value + 1);
      if (lane === 2) setLogRefresh((value) => value + 1);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [hasActiveExecution]);
  const activity = useMemo<ActivityItem[]>(() => [
    ...(selected?.events || []).map((event) => ({ id: `execution:${event.id}`, source: selected.agentHost?.name || "Codex", context: `${selected.application?.name || (polish ? "Praca firmowa" : "Company work")} · ${selected.task.title}`, message: event.message, level: event.level, createdAt: event.createdAt })),
    ...(agentLogs.data || []).map((log) => ({ id: `log:${log.id}`, source: log.agent?.name || (polish ? "Agent Roost" : "Roost agent"), context: typeof log.metadata?.application === "string" ? log.metadata.application : (polish ? "Praca firmowa" : "Company work"), message: log.message, level: log.level, createdAt: log.createdAt }))
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 30), [agentLogs.data, polish, selected]);
  const columns = useMemo<Array<CcTableColumn<ExecutionRow>>>(() => [
    { key: "task", header: polish ? "Zadanie" : "Task", sortable: true, searchValue: (row) => `${row.task.title} ${row.application?.name || ""}`, cell: (row) => <button className="grid text-left" onClick={() => setSelectedId(row.id)} type="button"><strong>{row.task.title}</strong><span className="text-xs text-company-muted">{row.application?.name || (polish ? "Praca firmowa" : "Company work")} · {row.task.project?.name || "No project"}</span></button> },
    { key: "status", header: "Status", filterable: true, filterValue: (row) => row.status, cell: (row) => <span className={`badge ${tone(row.status)}`}>{executionLabel(row)}</span> },
    { key: "host", header: "Agent Host", cell: (row) => <span className="text-sm text-company-muted">{row.agentHost?.name || (row.status === "queued" ? "Waiting for laptop" : "—")}</span> },
    { key: "started", header: polish ? "Uruchomiono" : "Started", sortable: true, sortValue: (row) => row.startedAt || row.createdAt, cell: (row) => <span className="text-sm text-company-muted">{date(row.startedAt || row.createdAt)}</span> },
    { key: "actions", header: labels.actions, cell: (row) => <CcButton ariaLabel="Open execution" iconLeft="ph-arrow-right" onClick={() => setSelectedId(row.id)} size="xs" variant="ghost"><span className="sr-only">Open</span></CcButton> }
  ], [labels.actions, locale, polish]);
  async function action(name: "cancel") { if (!selected || selected.cancelRequestedAt || preemptionRequestedId === selected.id) return; setBusy(true); setNotice(null); try { await api(`/v1/agent-runtime/executions/${selected.id}/actions/${name}`, { method: "POST", body: "{}" }); setExecutionRefresh((value) => value + 1); setDetailRefresh((value) => value + 1); } catch (error) { setNotice(error instanceof AppApiError ? error.code : "request_failed"); } finally { setBusy(false); } }
  return <>
    <CcPageHeader actions={<><CcButton href="/workspace/settings#agent-connections" iconLeft="ph-plugs" size="sm" variant="outline">{polish ? "Połączenia" : "Connections"}</CcButton><CcButton href="/areas?area=06-kadry&view=directory" iconLeft="ph-users-three" size="sm" variant="outline">{polish ? "Ludzie i agenci" : "People and agents"}</CcButton></>} description={polish ? "Zapisane zdarzenia wykonania i dzienniki agentów. Roost przechowuje kontekst, heartbeat, dowody i wynik; wewnętrzny postęp Hermes pozostaje nieobserwowalny." : "Recorded execution events and agent logs. Roost keeps context, heartbeats, evidence, and results; Hermes internal progress remains unobserved."} eyebrow="06 People / Agents" title={polish ? "Praca agentów" : "Agent activity"} />
    {readiness.data && !readiness.data.executionEnabled ? <CcNotice tone="warning" title={polish ? "Tryb fundamentu — wykonywanie wyłączone" : "Foundation mode — execution disabled"} detail={polish ? "Struktura aplikacji, projektów, repozytoriów i triggerów jest dostępna, ale Roost nie może jeszcze kolejkować ani przydzielać pracy Codex." : "Application, project, repository and trigger structure is available, but Roost cannot queue or assign Codex work yet."} /> : null}
    {readiness.data ? <section className="roost-work-panel mt-4 overflow-hidden rounded-company">
      <div className="border-b border-base-300 p-4"><h2 className="font-black">{polish ? "Gotowość aplikacji" : "Application readiness"}</h2><p className="mt-1 text-sm text-company-muted">{polish ? "Każda aplikacja musi mieć jednoznaczny projekt, repozytorium, wdrożenie i lokalne mapowanie." : "Every application needs an unambiguous project, repository, deployment and local mapping."}</p></div>
      <ul className="divide-y divide-base-300">{readiness.data.applications.map((application) => <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={application.id}><div><strong>{application.name}</strong><p className="text-xs text-company-muted">{application.project?.name || (polish ? "Brak projektu dostawczego" : "No delivery project")}</p></div><div className="flex items-center gap-3"><span className="text-xs text-company-muted">{Object.values(application.checks).filter(Boolean).length}/5</span><span className={`badge ${application.readyForHost ? "badge-success" : "badge-warning"}`}>{application.readyForHost ? (polish ? "struktura gotowa" : "structure ready") : (polish ? "wymaga konfiguracji" : "needs configuration")}</span></div></li>)}</ul>
      <div className="border-t border-base-300 px-4 py-3 text-xs text-company-muted">{polish ? "Trigger przygotowania kandydata" : "Candidate preparation trigger"}: <strong>{humanizeBusinessValue(readiness.data.triggerPolicy?.status || "not_configured", undefined, locale)}</strong> · {polish ? "nie tworzy zadań ani wykonań" : "creates no tasks or executions"}</div>
    </section> : null}
    <section className="roost-work-panel mt-4 grid overflow-hidden rounded-company sm:grid-cols-3 sm:divide-x sm:divide-base-300">{[
      [polish ? "Hosty online" : "Hosts online", (hosts.data || []).filter((host) => host.status === "online").length, "ph-laptop"],
      [polish ? "W toku na stronie" : "Active on page", rows.filter((row) => activeStatuses.has(row.status)).length, "ph-spinner-gap"],
      [polish ? "Do przeglądu na stronie" : "Ready for review on page", rows.filter((row) => row.status === "completed").length, "ph-check-circle"]
    ].map(([label, value, icon]) => <div className="flex items-center gap-3 border-b border-base-300 p-4 last:border-b-0 sm:border-b-0" key={String(label)}><i className={`ph-bold ${icon} text-primary`} aria-hidden="true"></i><span><strong className="block text-xl">{value}</strong><small className="text-xs font-bold text-company-muted">{label}</small></span></div>)}</section>
    {notice ? <CcNotice live tone="error" title={humanizeBusinessValue(notice, undefined, locale)} /> : null}
    <section className="roost-work-panel mt-4 overflow-hidden rounded-company" aria-labelledby="agent-live-activity-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 p-4"><div><h2 className="font-black" id="agent-live-activity-heading">{polish ? "Zgłoszona aktywność" : "Reported activity"}</h2><p className="mt-1 text-sm text-company-muted">{polish ? "Zdarzenia otwartego wykonania i dzienniki agentów; oś zapisanych zdarzeń jest w szczegółach wykonania." : "Events for the open execution and agent logs; the recorded event timeline is in execution details."}</p></div></div>
      {activity.length ? <ol className="divide-y divide-base-300">{activity.map((item) => <li className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(9rem,0.22fr)_minmax(0,1fr)_auto] sm:items-start" key={item.id}><div><strong className="text-sm">{item.source}</strong><p className="mt-0.5 text-xs text-company-muted">{item.context}</p></div><p className="whitespace-pre-wrap text-sm text-company-muted">{item.message}</p><time className="text-xs text-company-muted">{date(item.createdAt)}</time></li>)}</ol> : <CcNotice detail={polish ? "Zapisane zdarzenia Codexa i innych agentów pojawią się tutaj." : "Recorded Codex and agent events will appear here."} title={polish ? "Brak zgłoszonej aktywności" : "No reported activity"} tone="info" />}
    </section>
    <section className="mt-4" aria-labelledby="codex-executions-heading"><h2 className="mb-3 text-sm font-black" id="codex-executions-heading">{polish ? "Historia uruchomień Codexa" : "Codex execution history"}</h2><CcDataTable columns={columns} rows={rows} emptyDetail={polish ? "Uruchom Codexa z listy zadań. Zadanie poczeka bezpiecznie, jeśli laptop jest offline." : "Start Codex from the task list. Work remains safely queued while the laptop is offline."} emptyTitle={polish ? "Brak uruchomień" : "No executions"} error={packet.status === "error" ? packet.error : null} getRowLabel={(row) => row.task.title} labels={labels} loading={packet.status === "loading"} mobileMode="cards" /><div className="mt-3 flex items-center justify-end gap-3"><CcButton disabled={executionPage === 0 || packet.status !== "ready"} onClick={() => setExecutionPage(page => page - 1)} size="xs" variant="outline">{polish ? "Nowsze" : "Newer"}</CcButton><span className="text-xs text-company-muted">{polish ? "Strona" : "Page"} {executionPage + 1}</span><CcButton disabled={packet.status !== "ready" || rows.length < 50} onClick={() => setExecutionPage(page => page + 1)} size="xs" variant="outline">{polish ? "Starsze" : "Older"}</CcButton></div></section>
    {selectedId && !selected ? <div className="fixed inset-0 z-40 flex justify-end bg-neutral/55" role="dialog" aria-modal="true" aria-label="Codex execution details"><aside className="h-full w-full max-w-2xl overflow-y-auto bg-base-100 p-5 shadow-2xl"><div className="flex justify-between gap-3"><h2 className="font-black">{polish ? "Szczegóły wykonania" : "Execution details"}</h2><CcButton ariaLabel="Close" iconLeft="ph-x" onClick={() => setSelectedId("")} size="sm" variant="ghost"><span className="sr-only">Close</span></CcButton></div><CcNotice title={detailPacket.status === "error" ? (polish ? "Nie udało się wczytać wykonania" : "Could not load execution") : (polish ? "Wczytywanie wykonania" : "Loading execution")} detail={detailPacket.status === "error" ? detailPacket.error : undefined} tone={detailPacket.status === "error" ? "error" : "info"} /></aside></div> : null}
    {selected ? <div className="fixed inset-0 z-40 flex justify-end bg-neutral/55" role="dialog" aria-modal="true" aria-label="Codex execution details"><aside className="h-full w-full max-w-2xl overflow-y-auto bg-base-100 p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-primary">{selected.application?.name || (polish ? "Praca firmowa" : "Company work")}</p><h2 className="text-xl font-black">{selected.task.title}</h2><p className="mt-1 text-sm text-company-muted">{selected.agentHost?.name || "Local host not claimed"} · {date(selected.startedAt || selected.createdAt)}</p></div><CcButton ariaLabel="Close" iconLeft="ph-x" onClick={() => setSelectedId("")} size="sm" variant="ghost"><span className="sr-only">Close</span></CcButton></div>
      <div className="mt-4 flex flex-wrap items-center gap-2"><span className={`badge ${tone(selected.status)}`}>{executionLabel(selected)}</span>{activeStatuses.has(selected.status) && !selected.cancelRequestedAt && preemptionRequestedId !== selected.id && (!selected.contextInvalidatedAt || selected.contextStoppedAt) ? <CcButton loading={busy} onClick={() => void action("cancel")} className="min-h-11" size="sm" variant="outline">{selected.contextStoppedAt ? t("ready.closeStoppedAttempt") : polish ? "Anuluj" : "Cancel"}</CcButton> : null}</div>
      <CriticalPreemptionControl key={selected.id} execution={selected} polish={polish} onRequested={() => { setPreemptionRequestedId(selected.id); setExecutionRefresh(value => value + 1); setDetailRefresh(value => value + 1); }} />
      {selected.contextInvalidatedAt ? <section className="mt-4 grid gap-3"><CcNotice tone="warning" title={t(selected.contextStoppedAt ? "ready.contextStopped" : "ready.contextStopRequested")} detail={t(selected.contextStoppedAt ? "ready.contextStoppedHint" : "ready.contextStopRequestedHint")} /><ChangedContextSources sources={selected.contextInvalidation?.changedSources} /></section> : null}
      {selected.events.some(event => event.type === "runtime_redaction") || JSON.stringify(selected).includes("[REDACTED]") ? <RuntimeRedactionNotice incidents={selected.events.filter(event => event.type === "runtime_redaction").map(event => event.payload as RedactionIncident)} /> : null}
      {selected.summary || selected.finalResponse ? <section className="roost-work-panel mt-4 rounded-company p-4"><h3 className="font-black">{polish ? "Wynik" : "Result"}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-company-muted">{selected.finalResponse || selected.summary}</p></section> : null}
      <section className="roost-work-panel mt-4 rounded-company p-4"><h3 className="font-black">{polish ? "Tożsamość wyniku i wznowienie" : "Result and recovery identity"}</h3><dl className="mt-3 grid gap-3 text-sm"><div><dt className="text-company-muted">{polish ? "Commit" : "Commit"}</dt><dd className="break-all font-mono">{selected.metadata?.resultRevision?.commit ?? "—"}</dd></div><div><dt className="text-company-muted">{polish ? "Gałąź i drzewo robocze" : "Branch and working tree"}</dt><dd className="break-all font-mono">{selected.metadata?.resultRevision ? `${selected.metadata.resultRevision.branch} · ${selected.metadata.resultRevision.workingTree}` : "—"}</dd></div><div><dt className="text-company-muted">Checkpoint</dt><dd>{selected.checkpoint?.stage ?? "—"} · {selected.checkpointVersion ?? "—"}</dd></div></dl></section>
      {recoveryEvidence.length ? <section className="mt-4 border-t border-base-300 pt-4" aria-labelledby="refused-tracked-recovery-heading">
        <h3 className="font-black" id="refused-tracked-recovery-heading">{polish ? "Dowód przywrócenia plików" : "File restoration evidence"}</h3>
        <p className="mt-2 text-sm text-company-muted">{polish ? "Przywrócono pliki po odrzuconej próbie. Wykonanie pozostaje nieudane; nie zaakceptowano nowego kandydata ani nie udzielono zgody na ponowienie lub wydanie. Blokada zapisu była zachowana przy zakończeniu odzyskania." : "Files were restored after a refused attempt. The execution remains failed; no new candidate was accepted and no retry or release was authorized. The writer fence was retained when recovery completed."}</p>
        <ul className="mt-3 divide-y divide-base-300">{recoveryEvidence.map(evidence => <li className="py-3 first:pt-0" key={evidence.requestId}>
          <dl className="grid gap-3 text-sm">
            <div><dt className="text-company-muted">{polish ? "Zapisano dowód" : "Evidence recorded"}</dt><dd><time dateTime={evidence.recordedAt}>{date(evidence.recordedAt)}</time></dd></div>
            <div><dt className="text-company-muted">{polish ? "Przywrócone / zarchiwizowane pliki" : "Restored / archived files"}</dt><dd>{evidence.restoredFileCount} / {evidence.archivedFileCount}</dd></div>
            <div><dt className="text-company-muted">{polish ? "Wykonanie" : "Execution"}</dt><dd className="break-all font-mono">{evidence.executionId}</dd></div>
            <div><dt className="text-company-muted">{polish ? "Commit stanu bazowego" : "Baseline commit"}</dt><dd className="break-all font-mono">{evidence.baselineCommit}</dd></div>
            <div><dt className="text-company-muted">{polish ? "SHA-256 odbioru" : "Review SHA-256"}</dt><dd className="break-all font-mono">{evidence.reviewDigest}</dd></div>
            <div><dt className="text-company-muted">{polish ? "SHA-256 dziennika odzyskania" : "Recovery journal SHA-256"}</dt><dd className="break-all font-mono">{evidence.journalDigest}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-company-muted">{polish ? "Odzyskanie nie uruchomiło modeli ani operacji zdalnych. Nie upoważnia do nowego wykonania ani wydania." : "Recovery invoked no models or remote operations. It authorizes no new execution or release."}</p>
        </li>)}</ul>
      </section> : null}
      {selected.errorState && !selected.contextInvalidatedAt ? <CcNotice tone="error" title={selected.errorState.code || "execution_failed"} detail={selected.errorState.message} /> : null}
      <ExecutionContinuationReview key={selected.id} taskId={selected.task.id} executionId={selected.id} fallback={{ id: selected.id, status: selected.status, attempt: selected.attempt ?? null, completedAt: selected.completedAt ?? null, usage: selected.usage, errorState: selected.errorState ?? null, checkpoint: selected.checkpoint ?? null, checkpointVersion: selected.checkpointVersion ?? null }} onPrepareReady={() => setReadyTaskId(selected.task.id)} onSaved={() => { setExecutionRefresh(value => value + 1); setDetailRefresh(value => value + 1); }} />
      <section className="roost-work-panel mt-4 rounded-company p-4"><div className="flex justify-between"><h3 className="font-black">{polish ? "Zmienione pliki" : "Changed files"}</h3>{!selected.contextInvalidatedAt ? <span className="badge badge-outline">{selected.changedFiles.length}</span> : null}</div><ul className="mt-3 grid gap-1 text-sm text-company-muted">{selected.changedFiles.length ? selected.changedFiles.map((file) => <li className="font-mono" key={file}>{file}</li>) : <li>{selected.contextInvalidatedAt ? t("ready.unverifiedFiles") : "—"}</li>}</ul></section>
      <section className="roost-work-panel mt-4 rounded-company p-4"><div className="flex justify-between"><h3 className="font-black">{polish ? "Oś wykonania" : "Execution timeline"}</h3><span className="badge badge-outline">{selected.events.length} / {selected.eventTotalCount ?? selected.events.length}</span></div><p className="mt-2 text-xs text-company-muted">{polish ? "Ostatnie zapisane zdarzenia (maksymalnie 20)." : "Most recent recorded events (up to 20)."}</p><ol className="mt-3 grid gap-2">{selected.events.map((event) => <li className="rounded-company border border-base-300 p-3" key={event.id}><div className="flex justify-between gap-3"><strong>{humanizeBusinessValue(event.type, undefined, locale)}</strong><time className="text-xs text-company-muted">{date(event.createdAt)}</time></div><p className="mt-1 whitespace-pre-wrap text-sm text-company-muted">{event.message}</p></li>)}</ol></section>
    </aside></div> : null}
    {readyTaskId ? <TaskReadinessModal taskId={readyTaskId} onClose={() => setReadyTaskId(null)} onSaved={() => setExecutionRefresh(value => value + 1)} /> : null}
  </>;
}

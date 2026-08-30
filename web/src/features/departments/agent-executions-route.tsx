import { useEffect, useMemo, useRef, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcDataTable, type CcTableColumn } from "../../components/cc-data-table";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { humanizeBusinessValue, useTranslatedTableLabels } from "./shared";

type Host = { id: string; name: string; slug: string; status: string; platform: string; lastSeenAt?: string | null; applicationSlugs: string[] };
type ExecutionEvent = { id: string; type: string; level: string; message: string; payload: Record<string, unknown>; createdAt: string };
type Execution = {
  id: string; status: string; summary?: string | null; finalResponse?: string | null; createdAt: string; startedAt?: string | null; completedAt?: string | null;
  changedFiles: string[]; verification: Record<string, unknown>; usage: Record<string, unknown>; errorState?: { code?: string; message?: string } | null;
  task: { id: string; title: string; project?: { id: string; name: string } | null };
  application: { id: string; name: string; slug: string };
  agentHost?: Host | null; events: ExecutionEvent[];
};
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

export function AgentExecutionsRoute() {
  const { locale, t } = useLanguage(); const polish = locale === "pl"; const labels = useTranslatedTableLabels();
  const [executionRefresh, setExecutionRefresh] = useState(0); const [hostRefresh, setHostRefresh] = useState(0); const [logRefresh, setLogRefresh] = useState(0); const [selectedId, setSelectedId] = useState(""); const [notice, setNotice] = useState<string | null>(null); const [busy, setBusy] = useState(false); const refreshTick = useRef(0);
  const packet = useOwnerPacket<Execution[]>(`/v1/agent-runtime/executions?refresh=${executionRefresh}`, true, t);
  const hosts = useOwnerPacket<Host[]>(`/v1/agent-runtime/hosts?refresh=${hostRefresh}`, true, t);
  const readiness = useOwnerPacket<RuntimeReadiness>("/v1/agent-runtime/readiness", true, t);
  const agentLogs = useOwnerPacket<AgentLog[]>(`/v1/agent-logs?limit=80&refresh=${logRefresh}`, true, t);
  const rows = packet.data || []; const selected = rows.find((item) => item.id === selectedId) || null;
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
    ...rows.flatMap((execution) => execution.events.map((event) => ({ id: `execution:${event.id}`, source: execution.agentHost?.name || "Codex", context: `${execution.application.name} · ${execution.task.title}`, message: event.message, level: event.level, createdAt: event.createdAt }))),
    ...(agentLogs.data || []).map((log) => ({ id: `log:${log.id}`, source: log.agent?.name || (polish ? "Agent Roost" : "Roost agent"), context: typeof log.metadata?.application === "string" ? log.metadata.application : (polish ? "Praca firmowa" : "Company work"), message: log.message, level: log.level, createdAt: log.createdAt }))
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 30), [agentLogs.data, polish, rows]);
  const columns = useMemo<Array<CcTableColumn<Execution>>>(() => [
    { key: "task", header: polish ? "Zadanie" : "Task", sortable: true, searchValue: (row) => `${row.task.title} ${row.application.name}`, cell: (row) => <button className="grid text-left" onClick={() => setSelectedId(row.id)} type="button"><strong>{row.task.title}</strong><span className="text-xs text-company-muted">{row.application.name} · {row.task.project?.name || "No project"}</span></button> },
    { key: "status", header: "Status", filterable: true, filterValue: (row) => row.status, cell: (row) => <span className={`badge ${tone(row.status)}`}>{humanizeBusinessValue(row.status, undefined, locale)}</span> },
    { key: "host", header: "Agent Host", cell: (row) => <span className="text-sm text-company-muted">{row.agentHost?.name || (row.status === "queued" ? "Waiting for laptop" : "—")}</span> },
    { key: "started", header: polish ? "Uruchomiono" : "Started", sortable: true, sortValue: (row) => row.startedAt || row.createdAt, cell: (row) => <span className="text-sm text-company-muted">{date(row.startedAt || row.createdAt)}</span> },
    { key: "actions", header: labels.actions, cell: (row) => <CcButton ariaLabel="Open execution" iconLeft="ph-arrow-right" onClick={() => setSelectedId(row.id)} size="xs" variant="ghost"><span className="sr-only">Open</span></CcButton> }
  ], [labels.actions, locale, polish]);
  async function action(name: "cancel" | "retry") { if (!selected) return; setBusy(true); setNotice(null); try { await api(`/v1/agent-runtime/executions/${selected.id}/actions/${name}`, { method: "POST", body: "{}" }); setExecutionRefresh((value) => value + 1); } catch (error) { setNotice(error instanceof AppApiError ? error.code : "request_failed"); } finally { setBusy(false); } }
  return <>
    <CcPageHeader actions={<><CcButton href="/workspace/settings#agent-connections" iconLeft="ph-plugs" size="sm" variant="outline">{polish ? "Połączenia" : "Connections"}</CcButton><CcButton href="/areas?area=06-kadry&view=directory" iconLeft="ph-users-three" size="sm" variant="outline">{polish ? "Ludzie i agenci" : "People and agents"}</CcButton></>} description={polish ? "Live postęp Codexa na laptopie oraz dzienniki pozostałych agentów. Roost przechowuje kontekst, heartbeat, dowody i wynik." : "Live progress from laptop Codex and logs from other agents. Roost keeps context, heartbeats, evidence, and results."} eyebrow="06 People / Agents" title={polish ? "Praca agentów" : "Agent activity"} />
    {readiness.data && !readiness.data.executionEnabled ? <CcNotice tone="warning" title={polish ? "Tryb fundamentu — wykonywanie wyłączone" : "Foundation mode — execution disabled"} detail={polish ? "Struktura aplikacji, projektów, repozytoriów i triggerów jest dostępna, ale Roost nie może jeszcze kolejkować ani przydzielać pracy Codex." : "Application, project, repository and trigger structure is available, but Roost cannot queue or assign Codex work yet."} /> : null}
    {readiness.data ? <section className="roost-work-panel mt-4 overflow-hidden rounded-company">
      <div className="border-b border-base-300 p-4"><h2 className="font-black">{polish ? "Gotowość aplikacji" : "Application readiness"}</h2><p className="mt-1 text-sm text-company-muted">{polish ? "Każda aplikacja musi mieć jednoznaczny projekt, repozytorium, wdrożenie i lokalne mapowanie." : "Every application needs an unambiguous project, repository, deployment and local mapping."}</p></div>
      <ul className="divide-y divide-base-300">{readiness.data.applications.map((application) => <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={application.id}><div><strong>{application.name}</strong><p className="text-xs text-company-muted">{application.project?.name || (polish ? "Brak projektu dostawczego" : "No delivery project")}</p></div><div className="flex items-center gap-3"><span className="text-xs text-company-muted">{Object.values(application.checks).filter(Boolean).length}/5</span><span className={`badge ${application.readyForHost ? "badge-success" : "badge-warning"}`}>{application.readyForHost ? (polish ? "struktura gotowa" : "structure ready") : (polish ? "wymaga konfiguracji" : "needs configuration")}</span></div></li>)}</ul>
      <div className="border-t border-base-300 px-4 py-3 text-xs text-company-muted">{polish ? "Trigger przygotowania kandydata" : "Candidate preparation trigger"}: <strong>{humanizeBusinessValue(readiness.data.triggerPolicy?.status || "not_configured", undefined, locale)}</strong> · {polish ? "nie tworzy zadań ani wykonań" : "creates no tasks or executions"}</div>
    </section> : null}
    <section className="roost-work-panel mt-4 grid overflow-hidden rounded-company sm:grid-cols-3 sm:divide-x sm:divide-base-300">{[
      [polish ? "Hosty online" : "Hosts online", (hosts.data || []).filter((host) => host.status === "online").length, "ph-laptop"],
      [polish ? "W toku" : "Active", rows.filter((row) => activeStatuses.has(row.status)).length, "ph-spinner-gap"],
      [polish ? "Do przeglądu" : "Ready for review", rows.filter((row) => row.status === "completed").length, "ph-check-circle"]
    ].map(([label, value, icon]) => <div className="flex items-center gap-3 border-b border-base-300 p-4 last:border-b-0 sm:border-b-0" key={String(label)}><i className={`ph-bold ${icon} text-primary`} aria-hidden="true"></i><span><strong className="block text-xl">{value}</strong><small className="text-xs font-bold text-company-muted">{label}</small></span></div>)}</section>
    {notice ? <CcNotice live tone="error" title={humanizeBusinessValue(notice, undefined, locale)} /> : null}
    <section className="roost-work-panel mt-4 overflow-hidden rounded-company" aria-labelledby="agent-live-activity-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 p-4"><div><h2 className="font-black" id="agent-live-activity-heading">{polish ? "Aktywność na żywo" : "Live activity"}</h2><p className="mt-1 text-sm text-company-muted">{polish ? "Aktywne wykonanie odświeża się co 15 sekund; heartbeat i pozostałe logi raz na minutę." : "Active work refreshes every 15 seconds; host heartbeats and other logs refresh once a minute."}</p></div><span className="badge badge-outline badge-success"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-success"></span>live</span></div>
      {activity.length ? <ol className="divide-y divide-base-300">{activity.map((item) => <li className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(9rem,0.22fr)_minmax(0,1fr)_auto] sm:items-start" key={item.id}><div><strong className="text-sm">{item.source}</strong><p className="mt-0.5 text-xs text-company-muted">{item.context}</p></div><p className="whitespace-pre-wrap text-sm text-company-muted">{item.message}</p><time className="text-xs text-company-muted">{date(item.createdAt)}</time></li>)}</ol> : <CcNotice detail={polish ? "Gdy Codex lub inny agent zgłosi postęp, pojawi się tutaj bez tworzenia dodatkowego workspace’u." : "Codex and other agent progress will appear here without creating another workspace."} title={polish ? "Brak zgłoszonej aktywności" : "No reported activity"} tone="info" />}
    </section>
    <section className="mt-4" aria-labelledby="codex-executions-heading"><h2 className="mb-3 text-sm font-black" id="codex-executions-heading">{polish ? "Historia uruchomień Codexa" : "Codex execution history"}</h2><CcDataTable columns={columns} rows={rows} emptyDetail={polish ? "Uruchom Codexa z listy zadań. Zadanie poczeka bezpiecznie, jeśli laptop jest offline." : "Start Codex from the task list. Work remains safely queued while the laptop is offline."} emptyTitle={polish ? "Brak uruchomień" : "No executions"} error={packet.status === "error" ? packet.error : null} getRowLabel={(row) => row.task.title} labels={labels} loading={packet.status === "loading"} mobileMode="cards" /></section>
    {selected ? <div className="fixed inset-0 z-40 flex justify-end bg-neutral/55" role="dialog" aria-modal="true" aria-label="Codex execution details"><aside className="h-full w-full max-w-2xl overflow-y-auto bg-base-100 p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-primary">{selected.application.name}</p><h2 className="text-xl font-black">{selected.task.title}</h2><p className="mt-1 text-sm text-company-muted">{selected.agentHost?.name || "Local host not claimed"} · {date(selected.startedAt || selected.createdAt)}</p></div><CcButton ariaLabel="Close" iconLeft="ph-x" onClick={() => setSelectedId("")} size="sm" variant="ghost"><span className="sr-only">Close</span></CcButton></div>
      <div className="mt-4 flex flex-wrap items-center gap-2"><span className={`badge ${tone(selected.status)}`}>{humanizeBusinessValue(selected.status, undefined, locale)}</span>{activeStatuses.has(selected.status) ? <CcButton loading={busy} onClick={() => void action("cancel")} size="xs" variant="outline">{polish ? "Anuluj" : "Cancel"}</CcButton> : null}{["failed", "cancelled"].includes(selected.status) ? <CcButton loading={busy} onClick={() => void action("retry")} size="xs" variant="primary">{polish ? "Ponów" : "Retry"}</CcButton> : null}</div>
      {selected.summary || selected.finalResponse ? <section className="roost-work-panel mt-4 rounded-company p-4"><h3 className="font-black">{polish ? "Wynik" : "Result"}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-company-muted">{selected.finalResponse || selected.summary}</p></section> : null}
      {selected.errorState ? <CcNotice tone="error" title={selected.errorState.code || "execution_failed"} detail={selected.errorState.message} /> : null}
      <section className="roost-work-panel mt-4 rounded-company p-4"><div className="flex justify-between"><h3 className="font-black">{polish ? "Zmienione pliki" : "Changed files"}</h3><span className="badge badge-outline">{selected.changedFiles.length}</span></div><ul className="mt-3 grid gap-1 text-sm text-company-muted">{selected.changedFiles.length ? selected.changedFiles.map((file) => <li className="font-mono" key={file}>{file}</li>) : <li>—</li>}</ul></section>
      <section className="roost-work-panel mt-4 rounded-company p-4"><div className="flex justify-between"><h3 className="font-black">{polish ? "Oś wykonania" : "Execution timeline"}</h3><span className="badge badge-outline">{selected.events.length}</span></div><ol className="mt-3 grid gap-2">{selected.events.map((event) => <li className="rounded-company border border-base-300 p-3" key={event.id}><div className="flex justify-between gap-3"><strong>{humanizeBusinessValue(event.type, undefined, locale)}</strong><time className="text-xs text-company-muted">{date(event.createdAt)}</time></div><p className="mt-1 whitespace-pre-wrap text-sm text-company-muted">{event.message}</p></li>)}</ol></section>
    </aside></div> : null}
  </>;
}

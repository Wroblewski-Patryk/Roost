import { useCallback, useEffect, useRef, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { useLanguage } from "../../i18n/i18n";

type Project = { id: string; name: string; status: string };
type Step = { id: string; order: number; instruction: string; executor: string; expectedInput: Record<string, unknown>;
  expectedOutput: Record<string, unknown>; validationRule: Record<string, unknown>; rollbackInstruction: string | null; taskTitle: string };
type Preview = { procedure: { id: string; name: string; purpose: string; version: number; status: string; scope: string | null; expectedResult: string | null; updatedAt: string };
  project: Project; ownerRole: { name: string; escalation: string | null; terminalOwnerDecision?: boolean } | null; inputs: Record<string, string>;
  taskAssigneeUserId: string; taskAssigneeLabel: string; applicability: Array<{ type: string; entityId: string | null }>;
  steps: Step[]; blockers: string[]; digest: string; previewToken: string | null; expiresAt: string;
  effects: { roostNativeTasks: number; externalWrites: number; agentExecutions: number } };
type Run = { id: string; procedureId?: string; procedureVersion: number; projectId: string; projectName: string; inputSnapshot: Record<string, string>; createdAt: string; status: string;
  steps: Array<{ id: string; order: number; instruction: string; task: { id: string; title: string; status: string };
    outputEvidence: Array<{ id: string; evidence: { summary?: string; references?: string[] }; recordedAt: string }>;
    outcomeHistory: Array<{ id: string; decision: string; evidence: { summary?: string; references?: string[] }; reason: string | null }>;
    exception: string | null }> };

function errorCode(error: unknown) { return error instanceof AppApiError ? error.code : "request_failed"; }
function message(code: string, pl: boolean) {
  const labels: Record<string, [string, string]> = {
    procedure_launch_stale: ["Procedura lub projekt zmieniły się. Odśwież podgląd.", "The procedure or project changed. Refresh the preview."],
    procedure_launch_preview_expired: ["Podgląd wygasł. Pobierz nowy.", "The preview expired. Get a new one."],
    procedure_launch_conflict: ["Ten przebieg mógł już zostać uruchomiony. Odśwież historię.", "This run may already exist. Refresh history."],
    procedure_launch_blocked: ["Warunki uruchomienia nie są spełnione. Odśwież podgląd.", "Launch conditions are not met. Refresh the preview."],
    procedure_origin_unverified: ["Brak zapisanego pochodzenia tej wersji.", "This version has no recorded origin."],
    procedure_applicability_ambiguous: ["Zakres strukturalny nie wskazuje jednej obsługiwanej reguły.", "Structured applicability must contain one supported rule."],
    procedure_scope_mismatch: ["Wybrany projekt nie należy do zakresu procedury.", "The selected project is outside the procedure scope."],
    already_launched_for_scope: ["Ta rodzina procedury ma już przebieg w tym projekcie.", "This procedure family already has a run in this project."],
    human_owner_role_missing: ["Brak roli odpowiedzialnej osoby.", "A responsible human role is missing."],
    escalation_role_missing: ["Brak roli eskalacyjnej.", "An escalation role is missing."],
    external_tool_required: ["Procedura wymaga narzędzia zewnętrznego.", "The procedure requires an external tool."],
    additional_permission_required: ["Procedura wymaga dodatkowego uprawnienia.", "The procedure requires additional permission."],
    procedure_scope_missing: ["Brak opisu zakresu procedury.", "The procedure scope is missing."],
    procedure_result_missing: ["Brak oczekiwanego wyniku.", "The expected result is missing."],
    procedure_steps_missing: ["Brak kroków.", "There are no steps."],
    procedure_not_active: ["Wersja nie jest aktywna.", "The version is not active."],
    project_not_active: ["Projekt nie jest aktywny.", "The project is not active."],
    procedure_task_not_done: ["Najpierw oznacz zadanie jako wykonane.", "Mark the task done first."],
    task_blocked: ["Zadanie jest zablokowane.", "The Task is blocked."],
    task_archived_without_accepted_output: ["Zadanie przeniesiono do historii bez przyjętego wyniku.", "The Task was archived without accepted output."],
    procedure_outcome_request_conflict: ["Identyfikator zapisu został już użyty. Odśwież historię.", "The request ID was already used. Refresh history."]
  };
  if (code.startsWith("input_missing:")) return pl ? `Uzupełnij dane: ${code.slice(14)}.` : `Provide input: ${code.slice(14)}.`;
  if (code.startsWith("input_unexpected:")) return pl ? `Usuń nieoczekiwane pole: ${code.slice(17)}.` : `Remove unexpected input: ${code.slice(17)}.`;
  const step = /^step_(\d+)_(executor_unsupported|external_adapter_required|instruction_missing|output_missing|success_missing|retry_missing|fallback_missing)$/.exec(code);
  if (step) {
    const labels: Record<string, [string, string]> = {
      executor_unsupported: ["typ wykonawcy nie jest obsługiwany", "executor type is unsupported"],
      external_adapter_required: ["wymaga adaptera zewnętrznego", "requires an external adapter"],
      instruction_missing: ["brak instrukcji", "instruction is missing"], output_missing: ["brak opisu wyniku", "output is missing"],
      success_missing: ["brak warunku sukcesu", "success rule is missing"], retry_missing: ["brak limitu prób", "retry limit is missing"],
      fallback_missing: ["brak planu awaryjnego", "fallback is missing"]
    };
    return pl ? `Krok ${step[1]}: ${labels[step[2]][0]}.` : `Step ${step[1]}: ${labels[step[2]][1]}.`;
  }
  return labels[code]?.[pl ? 0 : 1] || (pl ? `Nie można wykonać operacji (${code}). Odśwież widok.` : `The operation could not be completed (${code}). Refresh this view.`);
}
export { message as procedureLaunchMessage };
export function runStatus(value: string, pl: boolean) {
  const labels: Record<string, [string, string]> = { tasks_open: ["Zadania otwarte", "Tasks open"], in_progress: ["W toku", "In progress"],
    exception: ["Wyjątek", "Exception"], tasks_done_evidence_pending: ["Zadania wykonane, czeka dowód", "Tasks done, output pending"],
    owner_accepted: ["Wynik przyjęty przez właściciela", "Owner accepted output"] };
  return labels[value]?.[pl ? 0 : 1] || value;
}
function taskStatus(value: string, pl: boolean) {
  const labels: Record<string, [string, string]> = { todo: ["Do zrobienia", "To do"], in_progress: ["W toku", "In progress"],
    blocked: ["Zablokowane", "Blocked"], done: ["Wykonane", "Done"], archived: ["Archiwalne", "Archived"] };
  return labels[value]?.[pl ? 0 : 1] || value;
}

function sameInputs(left: Record<string, string>, right: Record<string, string>) {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && left[key] === right[key]);
}

function OutcomeForm({ runId, stepId, taskStatusValue, onSaved }: { runId: string; stepId: string; taskStatusValue: string; onSaved: () => Promise<void> }) {
  const { locale } = useLanguage(); const pl = locale === "pl";
  const [decision, setDecision] = useState<"accept" | "exception">("accept");
  const [summary, setSummary] = useState(""); const [reason, setReason] = useState(""); const [references, setReferences] = useState("");
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  const request = useRef<string | null>(null);
  async function submit() {
    if (busy || summary.trim().length < 10 || (decision === "accept" && taskStatusValue !== "done") || (decision === "exception" && reason.trim().length < 10)) return;
    setBusy(true); setError(null); setSaved(false);
    request.current ||= crypto.randomUUID();
    try {
      await api(`/v1/process-core/procedure-runs/${encodeURIComponent(runId)}/steps/${encodeURIComponent(stepId)}/outcomes`,
        { method: "POST", body: JSON.stringify({ requestId: request.current, decision,
          evidence: { summary: summary.trim(), references: references.split("\n").map(value => value.trim()).filter(Boolean) },
          ...(decision === "exception" ? { reason: reason.trim() } : {}) }) });
      request.current = null; setSummary(""); setReason(""); setReferences(""); setSaved(true); await onSaved();
    } catch (caught) { setError(errorCode(caught)); }
    finally { setBusy(false); }
  }
  return <div className="mt-2 grid gap-2 rounded-lg border border-base-300 p-2">
    <label className="grid gap-1">{pl ? "Ocena właściciela" : "Owner decision"}<select className="select select-bordered w-full" value={decision} onChange={event => { setDecision(event.target.value as "accept" | "exception"); request.current = null; }}><option value="accept">{pl ? "Przyjmij wynik" : "Accept output"}</option><option value="exception">{pl ? "Zgłoś wyjątek" : "Record exception"}</option></select></label>
    <label className="grid gap-1">{pl ? "Dowód lub opis wyniku" : "Evidence or output summary"}<textarea className="textarea textarea-bordered w-full" minLength={10} value={summary} onChange={event => { setSummary(event.target.value); request.current = null; }} /></label>
    <label className="grid gap-1">{pl ? "Odniesienia do dowodu, po jednym w wierszu" : "Evidence references, one per line"}<textarea className="textarea textarea-bordered w-full" value={references} onChange={event => { setReferences(event.target.value); request.current = null; }} /></label>
    {decision === "exception" ? <label className="grid gap-1">{pl ? "Powód wyjątku" : "Exception reason"}<textarea className="textarea textarea-bordered w-full" minLength={10} value={reason} onChange={event => { setReason(event.target.value); request.current = null; }} /></label> : null}
    {decision === "accept" && taskStatusValue !== "done" ? <p className="text-warning">{message("procedure_task_not_done", pl)}</p> : null}
    {error ? <CcNotice tone="error" title={message(error, pl)} live /> : null}
    {saved ? <CcNotice tone="success" title={pl ? "Ocena zapisana" : "Decision saved"} live /> : null}
    <div><CcButton disabled={busy || summary.trim().length < 10 || (decision === "accept" && taskStatusValue !== "done") || (decision === "exception" && reason.trim().length < 10)} loading={busy} onClick={() => void submit()} size="sm" variant="outline">{pl ? "Zapisz ocenę" : "Record decision"}</CcButton></div>
  </div>;
}

export function ProcedureLaunchPanel({ procedure, focusRunId = null, focusStepId = null, fromAttention = false }: { procedure: { id: string; name: string; version: number; status: string; updatedAt: string;
  steps: Array<{ expectedInput?: Record<string, unknown> }> }; focusRunId?: string | null; focusStepId?: string | null; fromAttention?: boolean }) {
  const { locale } = useLanguage();
  const pl = locale === "pl";
  const [projects, setProjects] = useState<Project[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [projectId, setProjectId] = useState("");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [focusRunError, setFocusRunError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const launchRequest = useRef<{ requestId: string; previewToken: string; projectId: string; inputs: Record<string, string> } | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<HTMLLIElement>(null);
  const stepRef = useRef<HTMLLIElement>(null);
  const focusedRun = focusRunId ? runs.find(run => run.id === focusRunId) : null;
  const focusedStep = focusedRun?.steps.find(step => step.id === focusStepId);
  const focusStepError = Boolean(focusStepId && focusedRun && !focusedStep);
  const focusStepStale = Boolean(fromAttention && focusedStep &&
    (focusedStep.outcomeHistory[0]?.decision !== "exception" &&
      (focusedStep.task.status !== "done" || focusedStep.outcomeHistory.length > 0)));
  const inputKeys = [...new Set(procedure.steps.flatMap(step => Object.keys(step.expectedInput || {})))];
  const load = useCallback(async () => {
    setReadError(null); setLoadingRuns(true);
    const [projectResult, listResult, exactResult] = await Promise.allSettled([
      api<{ data: Project[] }>("/v1/projects"),
      api<{ data: Run[] }>(`/v1/process-core/procedures/${encodeURIComponent(procedure.id)}/runs`),
      focusRunId ? api<{ data: Run }>(`/v1/process-core/procedure-runs/${encodeURIComponent(focusRunId)}`) : Promise.resolve(null)
    ]);
    if (projectResult.status === "fulfilled") setProjects(projectResult.value.data.filter(project => project.status === "active"));
    let runRows = listResult.status === "fulfilled" && Array.isArray(listResult.value.data) ? listResult.value.data : [];
    const exact = exactResult.status === "fulfilled" ? exactResult.value?.data : null;
    const exactValid = Boolean(focusRunId && exact?.id === focusRunId && exact.procedureId === procedure.id);
    if (focusRunId) runRows = runRows.filter(run => run.id !== focusRunId);
    if (exactValid) runRows = [exact!, ...runRows];
    setFocusRunError(Boolean(focusRunId && !exactValid));
    setRuns(runRows);
    setReadError(projectResult.status === "rejected" ? errorCode(projectResult.reason)
      : listResult.status === "rejected" ? errorCode(listResult.reason)
        : listResult.status === "fulfilled" && !Array.isArray(listResult.value.data) ? "request_failed" : null);
    setLoadingRuns(false);
  }, [procedure.id, focusRunId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPreview(null); setSuccessId(null); launchRequest.current = null; }, [procedure.id, procedure.updatedAt]);
  useEffect(() => { if (successId) successRef.current?.focus(); }, [successId]);
  useEffect(() => { if (focusRunId && runs.some(run => run.id === focusRunId)) {
    const target = focusStepId && stepRef.current ? stepRef.current : runRef.current;
    target?.scrollIntoView({ block: "center" }); target?.focus();
  } }, [focusRunId, focusStepId, runs]);
  useEffect(() => {
    if (!preview) return;
    setNow(Date.now());
    const delay = Math.max(0, new Date(preview.expiresAt).getTime() - Date.now());
    const timer = window.setTimeout(() => setNow(Date.now()), delay + 10);
    return () => window.clearTimeout(timer);
  }, [preview]);

  async function makePreview() {
    if (!projectId || loading || busy) return;
    setLoading(true); setError(null); setPreview(null); launchRequest.current = null;
    try {
      const response = await api<{ data: Preview }>(`/v1/process-core/procedures/${encodeURIComponent(procedure.id)}/launch-preview`,
        { method: "POST", body: JSON.stringify({ projectId, inputs }) });
      setPreview(response.data);
    } catch (caught) { setError(errorCode(caught)); }
    finally { setLoading(false); }
  }

  async function launch() {
    if (busy) return;
    if (!preview || preview.blockers.length || preview.project.id !== projectId ||
      preview.procedure.id !== procedure.id || preview.procedure.version !== procedure.version ||
      preview.procedure.updatedAt !== procedure.updatedAt || !preview.previewToken ||
      !sameInputs(preview.inputs, inputs)) {
      setError("procedure_launch_stale");
      setPreview(null);
      launchRequest.current = null;
      return;
    }
    if (new Date(preview.expiresAt).getTime() <= Date.now()) { setNow(Date.now()); setError("procedure_launch_preview_expired"); return; }
    if (!launchRequest.current || launchRequest.current.previewToken !== preview.previewToken) {
      launchRequest.current = { requestId: crypto.randomUUID(), previewToken: preview.previewToken, projectId, inputs };
    }
    setBusy(true); setError(null);
    try {
      const response = await api<{ data: { run: Run; replayed: boolean } }>(`/v1/process-core/procedures/${encodeURIComponent(procedure.id)}/actions/launch`,
        { method: "POST", body: JSON.stringify(launchRequest.current) });
      setSuccessId(response.data.run.id);
      setPreview(null);
      launchRequest.current = null;
      await load();
    } catch (caught) {
      const code = errorCode(caught);
      setError(code);
      if (["procedure_launch_stale", "procedure_launch_preview_expired", "procedure_launch_blocked", "procedure_launch_conflict"].includes(code)) {
        setPreview(null); launchRequest.current = null;
        await load();
      }
    } finally { setBusy(false); }
  }

  return <section aria-labelledby="procedure-launch-title" className="mt-6 border-t border-base-300 pt-5" data-procedure-launch>
    <h3 className="font-black text-company-ink" id="procedure-launch-title">{pl ? "Uruchomienie i przebiegi" : "Launch and runs"}</h3>
    <p className="mt-1 text-sm text-company-muted">{pl ? "Wybierz dokładny projekt, sprawdź podgląd i dopiero wtedy utwórz zadania w Roost." : "Choose the exact project, inspect the preview, then create tasks in Roost."}</p>
    {successId ? <div ref={successRef} tabIndex={-1}><CcNotice tone="success" title={pl ? "Przebieg i zadania zapisane" : "Run and tasks saved"} detail={successId} />
      <CcButton href={`/areas?area=04-operacje&view=procedures&procedureId=${encodeURIComponent(procedure.id)}&runId=${encodeURIComponent(successId)}`} size="sm" variant="outline">{pl ? "Zobacz przebieg i ocenę" : "View run and assessment"}</CcButton></div> : null}
    {error ? <CcNotice tone="error" title={message(error, pl)} live /> : null}
    {readError ? <CcNotice tone="warning" title={pl ? "Nie udało się odświeżyć historii lub projektów" : "Could not refresh history or projects"} detail={message(readError, pl)} /> : null}
    {focusRunError ? <CcNotice live tone="warning" title={pl ? "Przebieg z linku jest niedostępny dla tej procedury." : "The linked run is unavailable for this procedure."} /> : null}
    {focusStepError ? <CcNotice live tone="warning" title={pl ? "Krok z linku nie należy do tego przebiegu." : "The linked step does not belong to this run."} /> : null}
    {focusStepStale ? <CcNotice live tone="warning" title={pl ? "Ten krok nie oczekuje już na ocenę w Dzisiaj." : "This step no longer awaits assessment in Today."}
      detail={pl ? "Sprawdź bieżący status i historię ocen w przypiętym przebiegu." : "Inspect its current status and assessment history in the pinned run."} /> : null}
    {fromAttention && focusStepId ? <CcButton href={`/areas?area=00-ogolny&view=overview&attentionProcedureStepId=${encodeURIComponent(focusStepId)}`} size="sm" variant="ghost">{pl ? "Wróć do Dzisiaj" : "Return to Today"}</CcButton> : null}
    {procedure.status === "active" ? <div className="mt-4 grid gap-3 rounded-lg border border-base-300 p-3 sm:p-4">
      <label className="grid gap-1 text-sm font-bold" htmlFor="procedure-launch-project">{pl ? "Projekt, którego dotyczy przebieg" : "Project for this run"}
        <select id="procedure-launch-project" className="select select-bordered w-full" value={projectId} onChange={event => { setProjectId(event.target.value); setPreview(null); launchRequest.current = null; }}>
          <option value="">{pl ? "Wybierz projekt" : "Choose a project"}</option>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name} · {project.id}</option>)}
        </select>
      </label>
      {inputKeys.map(key => <label className="grid gap-1 text-sm font-bold" htmlFor={`procedure-launch-input-${key}`} key={key}>{key}
        <textarea id={`procedure-launch-input-${key}`} className="textarea textarea-bordered min-h-16 w-full" value={inputs[key] || ""}
          onChange={event => { setInputs(current => ({ ...current, [key]: event.target.value })); setPreview(null); launchRequest.current = null; }} />
      </label>)}
      <div><CcButton disabled={!projectId || loading || busy} loading={loading} onClick={() => void makePreview()} size="sm" variant="outline">{pl ? "Pokaż podgląd" : "Preview launch"}</CcButton></div>
      {preview ? <div className="grid gap-3 border-t border-base-300 pt-4 text-sm">
        <div><strong>{preview.procedure.name}</strong> · v{preview.procedure.version} · {preview.project.name} · <span className="break-all font-mono text-xs">{preview.project.id}</span></div>
        <p>{preview.procedure.purpose}</p>
        <p>{pl ? "Zakres:" : "Scope:"} {preview.procedure.scope || (pl ? "Nieokreślony" : "Unspecified")}</p>
        <p>{pl ? "Zakres strukturalny:" : "Structured applicability:"} {preview.applicability.map(scope => `${scope.type}${scope.entityId ? ` · ${scope.entityId}` : ""}`).join(", ") || (pl ? "Nieokreślony" : "Unspecified")}</p>
        <p>{pl ? "Wynik:" : "Result:"} {preview.procedure.expectedResult || (pl ? "Nieokreślony" : "Unspecified")}</p>
        <p>{pl ? "Rola odpowiedzialna w procedurze:" : "Procedure's accountable role:"} {preview.ownerRole?.name || (pl ? "Brak" : "Missing")} · {preview.ownerRole?.terminalOwnerDecision
          ? pl ? "Decyzja końcowa właściciela; nierozstrzygnięty wyjątek zatrzymuje krok." : "Final owner decision; an unresolved exception stops the step."
          : <>{pl ? "Eskalacja:" : "Escalation:"} {preview.ownerRole?.escalation || (pl ? "Brak" : "Missing")}</>}</p>
        <p>{pl ? "Zadania zostaną przypisane osobie uruchamiającej:" : "Tasks will be assigned to the launching owner:"} {preview.taskAssigneeLabel} · <span className="break-all font-mono text-xs">{preview.taskAssigneeUserId}</span></p>
        <p>{pl ? "Wpływ:" : "Effects:"} {preview.effects.roostNativeTasks} {pl ? "zadań Roost" : "Roost tasks"}; {preview.effects.externalWrites} {pl ? "zapisów zewnętrznych" : "external writes"}; {preview.effects.agentExecutions} {pl ? "uruchomień agenta" : "agent executions"}.</p>
        <p>{pl ? "Wprowadzone dane:" : "Inputs:"} {Object.keys(preview.inputs).length ? JSON.stringify(preview.inputs) : (pl ? "Brak dodatkowych danych" : "No additional input")}</p>
        <p className="text-xs text-company-muted">{pl ? "Wartości wejściowe zostaną zapisane w przebiegu dostępnym właścicielowi. Opisy Zadań pokażą tylko nazwy pól; wszystkie osoby w przestrzeni roboczej mogą czytać Zadania. Nie wpisuj sekretów." : "Input values are saved in the owner-only run. Task descriptions show field names only; all workspace members can read Tasks. Do not enter secrets."}</p>
        <ol className="list-decimal space-y-2 pl-5">{preview.steps.map(step => <li key={step.id}><strong>{step.taskTitle}</strong><br />{pl ? "Wykonawca:" : "Executor:"} {step.executor} · {pl ? "Wyjście:" : "Output:"} {JSON.stringify(step.expectedOutput)}<br />{pl ? "Sukces i próby:" : "Success and retry:"} {JSON.stringify(step.validationRule)} · {pl ? "Plan awaryjny:" : "Fallback:"} {step.rollbackInstruction || (pl ? "Brak" : "Missing")}</li>)}</ol>
        {preview.blockers.length ? <CcNotice tone="warning" title={pl ? "Uruchomienie zablokowane" : "Launch blocked"} detail={preview.blockers.map(code => message(code, pl)).join(" · ")} /> : null}
        <p className="break-all text-xs text-company-muted">{pl ? "Odcisk podglądu:" : "Preview digest:"} {preview.digest}</p>
        <p className="text-xs text-company-muted">{pl ? "Ważny do:" : "Valid until:"} {new Date(preview.expiresAt).toLocaleString(locale)}</p>
        {new Date(preview.expiresAt).getTime() <= now ? <CcNotice tone="warning" title={message("procedure_launch_preview_expired", pl)} /> : null}
        <div><CcButton disabled={Boolean(preview.blockers.length) || !preview.previewToken || busy || new Date(preview.expiresAt).getTime() <= now} loading={busy} onClick={() => void launch()} size="sm" variant="primary">{pl ? "Potwierdź i utwórz zadania" : "Confirm and create tasks"}</CcButton></div>
      </div> : null}
    </div> : null}
    <div className="mt-5 flex items-center justify-between gap-2"><h4 className="font-bold">{pl ? "Historia przebiegów" : "Run history"}</h4><CcButton onClick={() => void load()} size="sm" variant="ghost">{pl ? "Odśwież" : "Refresh"}</CcButton></div>
    {loadingRuns ? <p className="mt-2 text-sm" role="status">{pl ? "Wczytywanie historii przebiegów…" : "Loading run history…"}</p> : null}
    {runs.length ? <ol className="mt-2 grid gap-3">{runs.map(run => <li className="rounded-lg border border-base-300 p-3 text-sm focus:outline focus:outline-2 focus:outline-primary" key={run.id}
      ref={run.id === focusRunId ? runRef : null} tabIndex={run.id === focusRunId ? -1 : undefined}>
      <strong>{run.projectName}</strong> · <span className="break-all font-mono text-xs">{run.projectId}</span> · v{run.procedureVersion} · {runStatus(run.status, pl)} · {new Date(run.createdAt).toLocaleString(locale)}
      <p className="break-all text-xs text-company-muted">{run.id}</p>
      <details className="mt-2"><summary>{pl ? "Dane wejściowe przebiegu (tylko właściciel)" : "Run inputs (owner only)"}</summary><pre className="mt-1 whitespace-pre-wrap break-all text-xs">{JSON.stringify(run.inputSnapshot, null, 2)}</pre></details>
      <ol className="mt-2 grid gap-2">{run.steps.map(step => <li className="border-t border-base-300 pt-2 focus:outline focus:outline-2 focus:outline-primary" key={step.id}
        ref={run.id === focusRunId && step.id === focusStepId ? stepRef : null} tabIndex={run.id === focusRunId && step.id === focusStepId ? -1 : undefined}>
        {step.order}. <a className="link" href={`/areas?area=04-operacje&view=tasks&taskId=${encodeURIComponent(step.task.id)}`}>{step.task.title}</a> · {taskStatus(step.task.status, pl)}
        {step.exception ? <span className="ml-2 text-warning">{pl ? "Wyjątek:" : "Exception:"} {step.exception === "task_blocked" || step.exception === "task_archived_without_accepted_output" ? message(step.exception, pl) : step.exception}</span> : null}
        <p className="text-xs text-company-muted">{pl ? "Dowód wyniku:" : "Output evidence:"} {step.outputEvidence.length ? step.outputEvidence.map(item => `${item.evidence.summary || item.id} (${new Date(item.recordedAt).toLocaleString(locale)})`).join(", ") : (pl ? "Brak przyjętego wyniku" : "No accepted output")}</p>
        {step.outputEvidence.flatMap(item => item.evidence.references || []).length ? <ul className="list-disc pl-5 text-xs">{step.outputEvidence.flatMap(item => item.evidence.references || []).map((reference, index) => <li className="break-all" key={index}>{reference}</li>)}</ul> : null}
        {step.outcomeHistory.length ? <p className="break-words text-xs text-company-muted">{pl ? "Historia ocen:" : "Decision history:"} {step.outcomeHistory.map(item => `${item.decision === "accept" ? (pl ? "Przyjęty wynik" : "Accepted output") : (pl ? "Wyjątek" : "Exception")}: ${item.reason ? `${item.reason} · ` : ""}${item.evidence.summary || item.id}${item.evidence.references?.length ? ` · ${item.evidence.references.join(", ")}` : ""}`).join(" · ")}</p> : null}
        {step.outcomeHistory.length ? <p className="mt-2 text-xs text-company-muted">{pl
          ? "Nowa ocena zmieni bieżący wynik kroku; wcześniejsze oceny pozostaną w historii."
          : "A new assessment changes the step's current outcome; earlier assessments remain in history."}</p> : null}
        <OutcomeForm runId={run.id} stepId={step.id} taskStatusValue={step.task.status} onSaved={load} />
      </li>)}</ol>
    </li>)}</ol> : !loadingRuns && !readError && !focusRunError ? <p className="mt-2 text-sm text-company-muted">{pl ? "Nie ma jeszcze przebiegów tej procedury." : "No runs for this procedure yet."}</p> : null}
  </section>;
}

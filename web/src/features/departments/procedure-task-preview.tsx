import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { useLanguage } from "../../i18n/i18n";
import { humanizeBusinessValue } from "./shared";
import { runStatus } from "./procedure-launch-panel";

export type ProcedureRunStepLink = { id: string; stepOrder: number; stepType: "manual" | "human_review";
  run: { id: string; procedureId: string; procedureVersion: number; procedureName: string } };
export type ProcedureLinkedTask = { id: string; title: string; status: string; procedureRunStep: ProcedureRunStepLink };
type Run = { id: string; procedureId: string; procedureVersion: number; procedureName: string; status: string;
  steps: Array<{ id: string; order: number; instruction: string; executor: string;
    task: { id: string; status: string }; outcomeHistory: Array<{ decision: string }> }> };
type State = { kind: "loading" | "error" | "stale" } | { kind: "ready"; run: Run; step: Run["steps"][number] };

export function procedureRunPath(link: ProcedureRunStepLink) {
  return `/areas?area=04-operacje&view=procedures&procedureId=${encodeURIComponent(link.run.procedureId)}&runId=${encodeURIComponent(link.run.id)}`;
}

export async function readExactProcedureTask(task: ProcedureLinkedTask, readRun: (id: string) => Promise<Run>) {
  const run = await readRun(task.procedureRunStep.run.id);
  const step = run.steps.find(item => item.id === task.procedureRunStep.id && item.task.id === task.id);
  if (run.id !== task.procedureRunStep.run.id || run.procedureId !== task.procedureRunStep.run.procedureId
    || run.procedureVersion !== task.procedureRunStep.run.procedureVersion || !step
    || step.order !== task.procedureRunStep.stepOrder || step.executor !== task.procedureRunStep.stepType
    || step.task.status !== task.status) return { kind: "stale" } as const;
  return { kind: "ready", run, step } as const;
}

export function ProcedureTaskPreview({ task, onClose }: { task: ProcedureLinkedTask; onClose: () => void }) {
  const { locale } = useLanguage(); const pl = locale === "pl";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let current = true;
    setState({ kind: "loading" });
    void readExactProcedureTask(task, async id =>
      (await api<{ data: Run }>(`/v1/process-core/procedure-runs/${encodeURIComponent(id)}`, { cache: "no-store" })).data)
      .then(value => { if (current) setState(value); })
      .catch(() => { if (current) setState({ kind: "error" }); });
    return () => { current = false; };
  }, [task, refresh]);
  const runPath = procedureRunPath(task.procedureRunStep);
  const step = state.kind === "ready" ? state.step : null;
  return <CcRecordEditorModal titleId="procedure-task-preview-title"
    eyebrow={pl ? "04 Operacje · zadanie procedury" : "04 Operations · procedure task"} title={task.title}
    description={pl ? "Krok wykonuje człowiek. Sprawdź przebieg i następny ruch." : "A person completes this step. Review the run and next action."}
    closeLabel={pl ? "Zamknij" : "Close"} onClose={onClose} onSubmit={event => event.preventDefault()}
    maxWidthClassName="max-w-3xl" actions={<><CcButton onClick={onClose} variant="ghost">{pl ? "Zamknij" : "Close"}</CcButton>
      {state.kind === "ready" ? <CcButton href={`/areas?area=04-operacje&view=tasks&focusTaskId=${encodeURIComponent(task.id)}`} variant="outline">{pl ? "Zmień status zadania" : "Update task status"}</CcButton> : null}
      {state.kind === "ready" ? <CcButton href={runPath} variant="primary">{pl ? "Otwórz przebieg i ocenę" : "Open run and assessment"}</CcButton> : null}</>}>
    {state.kind === "loading" ? <p role="status">{pl ? "Sprawdzanie powiązanego przebiegu…" : "Checking the linked run…"}</p> : null}
    {state.kind === "error" ? <CcNotice live tone="error" title={pl ? "Nie można odczytać powiązanego przebiegu." : "The linked run cannot be read."}
      action={<CcButton onClick={() => setRefresh(value => value + 1)} variant="outline">{pl ? "Spróbuj ponownie" : "Try again"}</CcButton>} /> : null}
    {state.kind === "stale" ? <CcNotice live tone="warning" title={pl ? "Powiązanie zadania z przebiegiem zmieniło się." : "The task-to-run link changed."}
      detail={pl ? "Zamknij podgląd i otwórz bieżące zadanie ponownie." : "Close this preview and open the current task again."} /> : null}
    {state.kind === "ready" ? <>
      <CcRecordEditorSection title={pl ? "Przebieg i krok" : "Run and step"}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-company-muted">{pl ? "Procedura" : "Procedure"}</dt><dd>{state.run.procedureName} · v{state.run.procedureVersion}</dd></div>
          <div><dt className="text-company-muted">{pl ? "Krok" : "Step"}</dt><dd>{step!.order} · {step!.executor === "human_review" ? pl ? "Ocena człowieka" : "Human review" : pl ? "Ręczny" : "Manual"}</dd></div>
          <div><dt className="text-company-muted">{pl ? "Status zadania" : "Task status"}</dt><dd>{humanizeBusinessValue(task.status, undefined, locale)}</dd></div>
          <div><dt className="text-company-muted">{pl ? "Status przebiegu" : "Run status"}</dt><dd>{runStatus(state.run.status, pl)}</dd></div>
        </dl>
        <p className="mt-3 text-sm leading-6">{step!.instruction}</p>
      </CcRecordEditorSection>
      <CcRecordEditorSection title={pl ? "Następny ruch" : "Next action"}>
        <p className="text-sm leading-6">{task.status === "done"
          ? pl ? "Otwórz przebieg, sprawdź dowód wyniku i zapisz ocenę właściciela." : "Open the run, inspect the output evidence and record the owner assessment."
          : task.status === "blocked" ? pl ? "Otwórz przebieg i zapisz wyjątek z przyczyną oraz dowodem." : "Open the run and record an exception with its reason and evidence."
            : pl ? "Wykonaj ręcznie ten krok i zapisz status zadania w tablicy pracy. W przebiegu można następnie przyjąć wynik lub zapisać wyjątek." : "Complete this step manually and record the task status on the work board. The run then lets you accept the output or record an exception."}</p>
        {step!.outcomeHistory.length ? <p className="mt-2 text-sm text-company-muted">{pl ? "Ostatnia ocena:" : "Latest assessment:"} {step!.outcomeHistory[0].decision === "accept"
          ? pl ? "przyjęto" : "accepted" : step!.outcomeHistory[0].decision === "exception" ? pl ? "wyjątek" : "exception" : step!.outcomeHistory[0].decision}</p> : null}
      </CcRecordEditorSection>
    </> : null}
  </CcRecordEditorModal>;
}

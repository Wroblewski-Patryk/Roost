import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcRecordEditorModal, CcRecordEditorSection } from "../../components/cc-record-editor";
import { useLanguage } from "../../i18n/i18n";
import { validateTaskNavigation } from "../../owner-record-navigation";
import type { InformationResult } from "./company-information-result";

type PreviewTask = { id: string; title: string; status: string; goalRetired?: boolean };
type PreviewResult = InformationResult & { nextResponsible?: { role: "owner" | "manager" | "verifier"; name: string | null } };
type PreviewState = { kind: "loading" } | { kind: "error" } | { kind: "stale" } | { kind: "retired"; task: PreviewTask } | { kind: "ready"; task: PreviewTask; result: PreviewResult };

export function todayResultReturnPath(taskId: string, executionId: string) {
  return `/areas?area=00-ogolny&view=overview&attentionTaskId=${encodeURIComponent(taskId)}&attentionExecutionId=${encodeURIComponent(executionId)}`;
}

export async function readExactTodayResult(taskId: string, executionId: string,
  readTask: (id: string) => Promise<PreviewTask>, readResult: (id: string) => Promise<PreviewResult>) {
  const task = await readTask(taskId);
  await validateTaskNavigation(taskId, async () => task);
  if (task.goalRetired) return { kind: "retired", task } as const;
  const result = await readResult(taskId);
  if (result.executionId !== executionId || !["failed", "completed"].includes(result.status)
    || ["done", "archived"].includes(task.status) || result.ownerDecision
    || ["accept", "return"].includes(result.review?.decision || "")) return { kind: "stale" } as const;
  return { kind: "ready", task, result } as const;
}

export function TodayResultPreview({ taskId, executionId, onOpenTask }: { taskId: string; executionId: string; onOpenTask: () => void }) {
  const { locale } = useLanguage();
  const pl = locale === "pl";
  const [state, setState] = useState<PreviewState>({ kind: "loading" });
  const todayPath = todayResultReturnPath(taskId, executionId);
  useEffect(() => {
    let current = true;
    setState({ kind: "loading" });
    void readExactTodayResult(taskId, executionId,
      async id => (await api<{ data: PreviewTask }>(`/v1/tasks/${id}`, { cache: "no-store" })).data,
      async id => (await api<{ data: PreviewResult }>(`/v1/agent-runtime/tasks/${id}/information-result`, { cache: "no-store" })).data)
      .then(next => { if (current) setState(next); })
      .catch(() => { if (current) setState({ kind: "error" }); });
    return () => { current = false; };
  }, [taskId, executionId]);

  const failed = state.kind === "ready" && state.result.status === "failed";
  const result = state.kind === "ready" ? state.result : null;
  const reason = result?.reason === "information_lease_lost"
    ? pl ? "Worker utracił dzierżawę wykonania. Próba nie dostarczyła potwierdzonego wyniku." : "The Worker lost its execution lease. This attempt did not deliver a verified result."
    : result?.reason ? pl ? `Próba zakończyła się bez potwierdzonego wyniku. Zapisany kod przyczyny: ${result.reason}.` : `The attempt stopped without a verified result. Recorded reason code: ${result.reason}.` : null;
  const responsible = result?.nextResponsible?.name || (result?.nextResponsible?.role === "owner"
    ? pl ? "Właściciel workspace" : "Workspace owner"
    : result?.nextResponsible?.role === "manager" ? pl ? "Menedżer wskazany w Ready" : "Manager named in Ready"
      : pl ? "Weryfikator wskazany w Ready" : "Verifier named in Ready");

  return <CcRecordEditorModal titleId="today-result-preview-title" eyebrow={pl ? "Today · wynik" : "Today · result"}
    title={state.kind === "ready" || state.kind === "retired" ? state.task.title : pl ? "Wynik zadania" : "Task result"}
    description={pl ? "Podgląd ostatniej próby przypiętej do tej karty Today." : "Preview of the latest attempt pinned to this Today card."}
    closeLabel={pl ? "Wróć do Today" : "Return to Today"} onClose={() => window.location.assign(todayPath)}
    onSubmit={event => event.preventDefault()} maxWidthClassName="max-w-3xl"
    actions={<><CcButton href={todayPath} variant="ghost">{pl ? "Wróć do Today" : "Return to Today"}</CcButton>
      {state.kind === "ready" && !failed ? <CcButton onClick={onOpenTask} variant="primary">{pl ? "Otwórz odbiór w zadaniu" : "Open review in task"}</CcButton> : null}
      {state.kind === "retired" ? <CcButton onClick={onOpenTask} variant="primary">{pl ? "Otwórz historię zadania" : "Open task history"}</CcButton> : null}</>}>
    {state.kind === "loading" ? <p role="status">{pl ? "Wczytywanie zadania i próby…" : "Loading task and attempt…"}</p> : null}
    {state.kind === "error" ? <CcNotice live tone="error" title={pl ? "Nie można odczytać zadania lub wyniku w tym workspace." : "The task or result cannot be read in this workspace."} /> : null}
    {state.kind === "stale" ? <CcNotice live tone="warning" title={pl ? "Karta Today jest nieaktualna." : "This Today card is out of date."} detail={pl ? "Ostatnia próba zmieniła się. Wróć do Today, aby zobaczyć bieżący wpis." : "The latest attempt changed. Return to Today for the current item."} /> : null}
    {state.kind === "retired" ? <CcNotice live tone="warning" title={pl ? "Cel i mandat tego zadania wycofano." : "This task's goal and mandate were retired."}
      detail={pl ? "Ten wynik nie wymaga już bieżącej reakcji w Today. Zadanie i dawna próba pozostają w historii; otwórz je, aby sprawdzić zapis." : "This result no longer calls for current attention in Today. The task and prior attempt remain in history; open them to inspect the record."} /> : null}
    {state.kind === "ready" ? <>
      <CcRecordEditorSection title={pl ? "Co się stało" : "What happened"}>
        <p className="text-sm leading-6">{failed ? reason || (pl ? "Próba nie powiodła się. Nie zapisano szczegółowej przyczyny." : "The attempt failed. No detailed reason was recorded.")
          : result?.summary || (pl ? "Próba zakończona; brak zapisanego podsumowania." : "The attempt completed without a recorded summary.")}</p>
        {failed && result?.summary ? <p className="mt-2 text-sm">{result.summary}</p> : null}
        {result?.finalResponse ? <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">{pl ? "Pełna odpowiedź" : "Full response"}</summary><p className="mt-2 whitespace-pre-wrap break-words">{result.finalResponse}</p></details> : null}
      </CcRecordEditorSection>
      <CcRecordEditorSection title={pl ? "Odpowiedzialność i dowody" : "Responsibility and evidence"}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-company-muted">{pl ? "Odpowiedzialny w zapisanym procesie" : "Responsible in recorded workflow"}</dt><dd>{responsible}</dd></div>
          <div><dt className="text-company-muted">{pl ? "Próba" : "Attempt"}</dt><dd>{result?.execution?.attempt ?? "—"}</dd></div>
          <div><dt className="text-company-muted">{pl ? "Stan" : "Status"}</dt><dd>{failed ? pl ? "Niepowodzenie" : "Failed" : pl ? "Zakończona" : "Completed"}</dd></div>
          <div><dt className="text-company-muted">{pl ? "Punkt kontrolny" : "Checkpoint"}</dt><dd>{result?.execution?.checkpoint || (pl ? "Nie zapisano" : "Not recorded")}</dd></div>
        </dl>
        <p className="mt-3 text-sm">{result?.sources.length ? (pl ? "Wybrane źródła: " : "Selected sources: ") + result.sources.map(source => source.title).join(", ") : pl ? "Nie zapisano wybranych źródeł." : "No selected sources were recorded."}</p>
        <p className="mt-2 text-sm text-company-muted">{result?.budget ? `${pl ? "Deklarowane limity" : "Declared limits"}: ${result.budget.maxAttempts} ${pl ? "próba" : "attempt"}, ${result.budget.maxDurationSeconds} s, ${result.budget.maxOutputTokensIntent} ${pl ? "tokenów wyjściowych" : "output tokens"}. ` : ""}{pl ? "Pomiar użycia i egzekwowanie kosztu mogą być niedostępne; te limity nie potwierdzają kosztu dostawcy." : "Usage measurement and cost enforcement may be unavailable; these limits do not prove provider cost."}</p>
      </CcRecordEditorSection>
      <CcRecordEditorSection title={pl ? "Bezpieczny następny krok" : "Safe next step"}>
        <p className="text-sm leading-6">{failed
          ? pl ? "Wstrzymaj ponowienie. Właściciel powinien ocenić przyczynę i zdecydować o osobnej korekcie Ready oraz nowej zgodzie przed kolejną próbą." : "Wait before retrying. The owner should assess the failure and decide on a separate Ready correction and new authorization before another attempt."
          : result?.review?.decision === "verified_pending_owner"
            ? pl ? "Otwórz odbiór w zadaniu i podejmij decyzję właściciela na podstawie zapisanej weryfikacji." : "Open the task review and make the owner decision from the recorded verification."
            : result?.review?.decision === "reject"
              ? pl ? "Menedżer powinien przejrzeć odrzucony wynik i zdecydować o korekcie w istniejącym procesie zadania." : "The manager should inspect the rejected result and decide on a correction in the existing task workflow."
            : pl ? "Otwórz odbiór w zadaniu, aby sprawdzić wynik i dostępne uprawnione działania." : "Open the task review to inspect the result and available authorized actions."}</p>
      </CcRecordEditorSection>
    </> : null}
  </CcRecordEditorModal>;
}

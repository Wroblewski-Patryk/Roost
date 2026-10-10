import { useEffect, useRef, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { useLanguage } from "../../i18n/i18n";

export type InformationResult = {
  status: string; executionId: string | null; summary: string | null; finalResponse: string | null; reason: string | null;
  canReview: boolean; materialVersion: string | null; review: { decision: "accept" | "return"; summary: string } | null;
  sources: { id: string; title: string; revision: string }[];
  budget: { maxAttempts: number; maxDurationSeconds: number; maxOutputTokensIntent: number; tokenCostEnforcement: "unavailable" } | null;
  execution?: { attempt: number; startedAt: string | null; completedAt: string | null; model: string | null; effort: string | null; checkpoint: string | null; eventsTruncated: boolean; events: { id: string; type: string; at: string }[] };
};
type CommandIdentity = { body: string; requestId: string };
export function informationCommand(previous: CommandIdentity | null, input: object): CommandIdentity {
  const body = JSON.stringify(input);
  return previous?.body === body ? previous : { body, requestId: crypto.randomUUID() };
}
export function informationResultStatus(status: string): "empty" | "pending" | "running" | "completed" | "failed" | "stopped" {
  const value = status.toLowerCase();
  if (["queued", "pending", "preparing"].includes(value)) return "pending";
  if (["running", "claimed", "in_progress"].includes(value)) return "running";
  if (["completed", "succeeded", "success"].includes(value)) return "completed";
  if (["failed", "error"].includes(value)) return "failed";
  if (["cancelled", "canceled", "stopped", "blocked", "budget_exhausted"].includes(value)) return "stopped";
  return "empty";
}
function executionEventLabel(type: string, locale: string) {
  const labels: Record<string, [string, string]> = {
    queued: ["W kolejce", "Queued"], claimed: ["Podjęto wykonanie", "Execution claimed"], information_admitted: ["Dopuszczono próbę", "Attempt admitted"],
    checkpoint: ["Zapisano punkt kontrolny", "Checkpoint recorded"], completed: ["Zakończono", "Completed"], failed: ["Niepowodzenie", "Failed"],
    agent_execution_completed: ["Zakończono wykonanie", "Execution completed"], agent_execution_failed: ["Niepowodzenie wykonania", "Execution failed"],
    information_review: ["Zapisano odbiór wyniku", "Result review recorded"], cancelled: ["Anulowano", "Cancelled"],
    recovering: ["Odzyskiwanie", "Recovering"], recovery_blocked: ["Odzyskiwanie zablokowane", "Recovery blocked"]
  };
  return labels[type]?.[locale === "pl" ? 0 : 1] || (locale === "pl" ? "Inne zapisane zdarzenie" : "Other recorded event");
}
function checkpointLabel(checkpoint: string | null, locale: string) {
  if (!checkpoint) return locale === "pl" ? "Nie zapisano" : "Not recorded";
  const labels: Record<string, [string, string]> = { complete: ["Ukończono", "Complete"], completed: ["Ukończono", "Complete"], failed: ["Niepowodzenie", "Failed"], stopped: ["Zatrzymano", "Stopped"] };
  return labels[checkpoint]?.[locale === "pl" ? 0 : 1] || (locale === "pl" ? "Zapisano etap wykonania" : "Execution stage recorded");
}
function failureReason(reason: string | null, locale: string) {
  if (!reason) return locale === "pl" ? "Szczegóły przyczyny nie zostały zapisane. Sprawdź oś wykonania i odśwież wynik." : "No reason was recorded. Check the execution timeline and refresh the result.";
  const labels: Record<string, [string, string]> = { provider_auth_expired: ["Wygasło uwierzytelnienie dostawcy.", "Provider authentication expired."],
    runtime_authority_required: ["Brak aktualnego dopuszczenia wykonania.", "Current execution authority is missing."],
    timeout: ["Przekroczono czas wykonania.", "Execution timed out."], cancelled: ["Wykonanie anulowano.", "Execution was cancelled."] };
  if (labels[reason]) return labels[reason][locale === "pl" ? 0 : 1];
  return /^[a-z0-9_:-]{1,80}$/i.test(reason) ? (locale === "pl" ? `Zapisany kod przyczyny: ${reason}.` : `Recorded reason code: ${reason}.`) : (locale === "pl" ? "Przyczyna jest zapisana w rekordzie wykonania." : "The reason is recorded in the execution record.");
}
const messages = {
  en: {
    title: "Information task result", loading: "Reading the task result…", refresh: "Refresh result", run: "Run information task",
    empty: "No information result is available.", pending: "Information task is queued.", running: "Information task is running.", completed: "The agent returned an information result.", failed: "Information task failed.", stopped: "Information task stopped; a changed plan and new budget may be required.",
    error: "The request could not be confirmed. Refresh the result before deciding what to do next.", authority: "An accepted owner runtime Decision is required before this task can run.", conflict: "The result or its authority changed. Refresh and review the current material.",
    started: "Runtime start was recorded. Check the execution status below.", saved: "The result review was recorded.", summary: "Review explanation", accept: "Accept information result", return: "Return information result", accepted: "Information result accepted.", returned: "Information result returned.",
    sources: "Selected sources", limits: "Declared task limits", attempts: "Attempts", seconds: "Seconds", intent: "Output token intent", unknown: "Token and cost enforcement is unavailable. These declared limits do not prove a provider token or cost cap.", boundary: "This is a company information result. Acceptance grants no application, Git, push or deployment authority.", noReview: "No reviewable current result is available.", details: "Full information result", timeline: "Execution timeline", timelineTruncated: "Showing the first 100 events. More events exist in the execution record.", model: "Model", effort: "Effort", checkpoint: "Checkpoint", startedAt: "Started", completedAt: "Finished", event: "Event", unavailable: "Not recorded", scope: "Tools and external writes: none authorized"
  },
  pl: {
    title: "Wynik zadania informacyjnego", loading: "Odczytywanie wyniku zadania…", refresh: "Odśwież wynik", run: "Uruchom zadanie informacyjne",
    empty: "Brak dostępnego wyniku informacyjnego.", pending: "Zadanie informacyjne jest w kolejce.", running: "Zadanie informacyjne jest wykonywane.", completed: "Agent zwrócił wynik informacyjny.", failed: "Zadanie informacyjne nie powiodło się.", stopped: "Zadanie informacyjne zatrzymano; może być wymagany zmieniony plan i nowy budżet.",
    error: "Nie udało się potwierdzić żądania. Odśwież wynik przed decyzją o kolejnym działaniu.", authority: "Przed uruchomieniem zadania wymagana jest zaakceptowana decyzja właściciela o wykonaniu runtime.", conflict: "Wynik lub jego uprawnienie uległy zmianie. Odśwież i sprawdź aktualny materiał.",
    started: "Zapisano rozpoczęcie runtime. Sprawdź poniżej status wykonania.", saved: "Zapisano odbiór wyniku.", summary: "Uzasadnienie odbioru", accept: "Przyjmij wynik informacyjny", return: "Zwróć wynik informacyjny", accepted: "Wynik informacyjny przyjęty.", returned: "Wynik informacyjny zwrócony.",
    sources: "Wybrane źródła", limits: "Deklarowane limity zadania", attempts: "Próby", seconds: "Sekundy", intent: "Założony limit tokenów wyjściowych", unknown: "Wymuszanie limitu tokenów i kosztu jest niedostępne. Deklarowane limity nie potwierdzają limitu tokenów ani kosztu po stronie dostawcy.", boundary: "To firmowy wynik informacyjny. Przyjęcie nie nadaje uprawnień do aplikacji, Gita, push ani deploymentu.", noReview: "Brak aktualnego wyniku dostępnego do odbioru.", details: "Pełny wynik informacyjny", timeline: "Oś wykonania", timelineTruncated: "Pokazano pierwsze 100 zdarzeń. Dalsze zdarzenia są w rekordzie wykonania.", model: "Model", effort: "Wysiłek", checkpoint: "Punkt kontrolny", startedAt: "Rozpoczęto", completedAt: "Zakończono", event: "Zdarzenie", unavailable: "Nie zapisano", scope: "Narzędzia i zapisy zewnętrzne: brak uprawnienia"
  }
} as const;

export function CompanyInformationResult({ taskId, canStart, canAuthorize = canStart, onAuthorize, onSaved }: { taskId: string; canStart: boolean; canAuthorize?: boolean; onAuthorize?: () => void; onSaved?: () => void }) {
  const { locale } = useLanguage(), c = messages[locale === "pl" ? "pl" : "en"];
  const [data, setData] = useState<InformationResult | null>(null), [reading, setReading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState<"error" | "authority" | "conflict" | null>(null), [saved, setSaved] = useState<"started" | "saved" | null>(null), [summary, setSummary] = useState("");
  const mounted = useRef(true), readSequence = useRef(0), automaticReads = useRef(0), reviewRequest = useRef<CommandIdentity | null>(null), startRequest = useRef<CommandIdentity | null>(null);
  async function load() {
    const sequence = ++readSequence.current;
    setReading(true);
    try {
      const response = await api<{ data: InformationResult }>(`/v1/agent-runtime/tasks/${taskId}/information-result`, { cache: "no-store" });
      if (!mounted.current || sequence !== readSequence.current) return;
      if (!response.data || typeof response.data.status !== "string" || !Array.isArray(response.data.sources) || response.data.budget === undefined) throw new Error("information_result_invalid");
      setData(response.data); setError(null);
    } catch { if (mounted.current && sequence === readSequence.current) setError("error"); }
    finally { if (mounted.current && sequence === readSequence.current) setReading(false); }
  }
  useEffect(() => { mounted.current = true; setData(null); setSummary(""); automaticReads.current = 0; reviewRequest.current = null; startRequest.current = null; void load(); return () => { mounted.current = false; ++readSequence.current; }; }, [taskId]);
  const status = informationResultStatus(data?.status ?? "");
  useEffect(() => {
    if (status !== "pending" && status !== "running") return;
    const timer = window.setInterval(() => { if (!busy && !reading && automaticReads.current < 12) { ++automaticReads.current; void load(); } }, 5000);
    return () => window.clearInterval(timer);
  }, [taskId, status, busy, reading]);
  function rejected(caught: unknown) {
    if (caught instanceof AppApiError && caught.code === "runtime_authority_required") return "authority" as const;
    if (caught instanceof AppApiError && ["information_result_changed", "information_review_conflict", "task_ready_context_conflict", "task_ready_revalidation_required"].includes(caught.code)) return "conflict" as const;
    return "error" as const;
  }
  async function start() {
    if (!canStart || busy || reading || status === "pending" || status === "running" || status === "completed" || data?.review) return;
    startRequest.current = informationCommand(startRequest.current, {});
    setBusy(true); setError(null); setSaved(null);
    try {
      await api(`/v1/agent-runtime/tasks/${taskId}/actions/start-information`, { method: "POST", body: JSON.stringify({ requestId: startRequest.current.requestId }) });
      if (!mounted.current) return;
      startRequest.current = null; await load(); setSaved("started"); onSaved?.();
    } catch (caught) { if (mounted.current) setError(rejected(caught)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function review(decision: "accept" | "return") {
    if (!data?.canReview || !data.executionId || !data.materialVersion || busy || reading || summary.trim().length < 3 || summary.length > 2000) return;
    const input = { executionId: data.executionId, materialVersion: data.materialVersion, decision, summary: summary.trim() };
    reviewRequest.current = informationCommand(reviewRequest.current, input);
    setBusy(true); setError(null); setSaved(null);
    try {
      await api(`/v1/agent-runtime/tasks/${taskId}/actions/review-information`, { method: "POST", body: JSON.stringify({ ...input, requestId: reviewRequest.current.requestId }) });
      if (!mounted.current) return;
      reviewRequest.current = null; setSummary(""); await load(); setSaved("saved"); onSaved?.();
    } catch (caught) { if (mounted.current) setError(rejected(caught)); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <section aria-label={c.title} className="grid min-w-0 gap-4 border-t border-base-300 pt-4">
    <h3 className="font-bold">{c.title}</h3><p className="text-sm text-company-muted">{c.boundary}</p>
    <div className="flex flex-wrap gap-2"><CcButton type="button" size="sm" variant="outline" disabled={reading || busy} onClick={() => void load()}>{c.refresh}</CcButton>{canAuthorize && ["empty", "failed", "stopped"].includes(status) && onAuthorize ? <CcButton type="button" size="sm" variant="outline" disabled={busy || reading} onClick={onAuthorize}>{locale === "pl" ? "Autoryzuj jedną próbę" : "Authorize one attempt"}</CcButton> : null}{canStart && status !== "completed" && !data?.review ? <CcButton type="button" size="sm" disabled={busy || reading || status === "pending" || status === "running"} onClick={() => void start()}>{c.run}</CcButton> : null}</div>
    {reading && !data ? <CcNotice tone="loading" title={c.loading} /> : null}
    {error ? <CcNotice live tone="error" title={c[error]} /> : saved ? <CcNotice live tone="success" title={c[saved]} /> : null}
    {data ? <>
      <CcNotice live tone={status === "failed" ? "error" : status === "stopped" ? "warning" : "info"} title={c[status]} detail={status === "failed" || status === "stopped" ? failureReason(data.reason, locale) : undefined} />
      {data.summary ? <p className="whitespace-pre-wrap break-words">{data.summary}</p> : null}
      {data.finalResponse ? <details><summary className="cursor-pointer py-2 font-semibold">{c.details}</summary><pre className="whitespace-pre-wrap break-words text-sm">{data.finalResponse}</pre></details> : null}
      {data.sources.length ? <div><h4 className="font-semibold">{c.sources}</h4><ul className="grid gap-2 text-sm">{data.sources.map(source => <li key={source.id} className="break-words">{source.title} · <span className="break-all font-mono text-xs">{source.revision}</span></li>)}</ul></div> : null}
      {data.budget ? <div><h4 className="font-semibold">{c.limits}</h4><p className="text-sm">{c.attempts}: {data.budget.maxAttempts} · {c.seconds}: {data.budget.maxDurationSeconds} · {c.intent}: {data.budget.maxOutputTokensIntent}</p><p className="mt-2 text-sm text-company-muted">{c.unknown}</p></div> : null}
      {data.execution ? <details className="min-w-0 border-t border-base-300 pt-3"><summary className="cursor-pointer py-2 font-semibold">{c.timeline}</summary><dl className="grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-company-muted">{c.model} / {c.effort}</dt><dd>{data.execution.model || c.unavailable} / {data.execution.effort || c.unavailable}</dd></div><div><dt className="text-company-muted">{c.attempts} / {c.checkpoint}</dt><dd>{data.execution.attempt ?? c.unavailable} / {checkpointLabel(data.execution.checkpoint, locale)}</dd></div><div><dt className="text-company-muted">{c.startedAt}</dt><dd>{data.execution.startedAt ? new Date(data.execution.startedAt).toLocaleString(locale) : c.unavailable}</dd></div><div><dt className="text-company-muted">{c.completedAt}</dt><dd>{data.execution.completedAt ? new Date(data.execution.completedAt).toLocaleString(locale) : c.unavailable}</dd></div></dl><p className="my-3 text-sm text-company-muted">{c.scope}</p><ol className="grid gap-2 text-sm">{data.execution.events.map(event => <li key={event.id} className="flex flex-wrap justify-between gap-2 border-b border-base-300 py-2"><span>{executionEventLabel(event.type, locale)}</span><time dateTime={event.at}>{new Date(event.at).toLocaleString(locale)}</time></li>)}</ol></details> : null}
      {data.execution?.eventsTruncated ? <p className="text-sm text-company-muted">{c.timelineTruncated}</p> : null}
      {data.review ? <CcNotice tone={data.review.decision === "accept" ? "success" : "warning"} title={data.review.decision === "accept" ? c.accepted : c.returned} detail={data.review.summary} /> : null}
      {data.canReview && data.executionId && data.materialVersion ? <div className="grid gap-3"><CcField label={c.summary} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-24 w-full" minLength={3} maxLength={2000} value={summary} disabled={busy} onChange={event => { setSummary(event.target.value); setSaved(null); }} />}</CcField><div className="flex flex-wrap gap-2"><CcButton type="button" disabled={busy || reading || summary.trim().length < 3} onClick={() => void review("accept")}>{c.accept}</CcButton><CcButton type="button" variant="warning" disabled={busy || reading || summary.trim().length < 3} onClick={() => void review("return")}>{c.return}</CcButton></div></div> : !data.review ? <p className="text-sm text-company-muted">{c.noReview}</p> : null}
    </> : null}
  </section>;
}

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
const messages = {
  en: {
    title: "Information task result", loading: "Reading the task result…", refresh: "Refresh result", run: "Run information task",
    empty: "No information result is available.", pending: "Information task is queued.", running: "Information task is running.", completed: "The agent returned an information result.", failed: "Information task failed.", stopped: "Information task stopped; a changed plan and new budget may be required.",
    error: "The request could not be confirmed. Refresh the result before deciding what to do next.", authority: "An accepted owner runtime Decision is required before this task can run.", conflict: "The result or its authority changed. Refresh and review the current material.",
    started: "Runtime start was recorded. Check the execution status below.", saved: "Your result decision was recorded.", summary: "Decision explanation", accept: "Accept information result", return: "Return information result", accepted: "Owner accepted this information result.", returned: "Owner returned this information result.",
    sources: "Selected sources", limits: "Declared task limits", attempts: "Attempts", seconds: "Seconds", intent: "Output token intent", unknown: "Token and cost enforcement is unavailable. These declared limits do not prove a provider token or cost cap.", boundary: "This is a company information result. Acceptance grants no application, Git, push or deployment authority.", noReview: "No reviewable current result is available.", details: "Full information result"
  },
  pl: {
    title: "Wynik zadania informacyjnego", loading: "Odczytywanie wyniku zadania…", refresh: "Odśwież wynik", run: "Uruchom zadanie informacyjne",
    empty: "Brak dostępnego wyniku informacyjnego.", pending: "Zadanie informacyjne jest w kolejce.", running: "Zadanie informacyjne jest wykonywane.", completed: "Agent zwrócił wynik informacyjny.", failed: "Zadanie informacyjne nie powiodło się.", stopped: "Zadanie informacyjne zatrzymano; może być wymagany zmieniony plan i nowy budżet.",
    error: "Nie udało się potwierdzić żądania. Odśwież wynik przed decyzją o kolejnym działaniu.", authority: "Przed uruchomieniem zadania wymagana jest zaakceptowana decyzja właściciela o wykonaniu runtime.", conflict: "Wynik lub jego uprawnienie uległy zmianie. Odśwież i sprawdź aktualny materiał.",
    started: "Zapisano rozpoczęcie runtime. Sprawdź poniżej status wykonania.", saved: "Zapisano Twoją decyzję dotyczącą wyniku.", summary: "Uzasadnienie decyzji", accept: "Przyjmij wynik informacyjny", return: "Zwróć wynik informacyjny", accepted: "Właściciel przyjął ten wynik informacyjny.", returned: "Właściciel zwrócił ten wynik informacyjny.",
    sources: "Wybrane źródła", limits: "Deklarowane limity zadania", attempts: "Próby", seconds: "Sekundy", intent: "Założony limit tokenów wyjściowych", unknown: "Wymuszanie limitu tokenów i kosztu jest niedostępne. Deklarowane limity nie potwierdzają limitu tokenów ani kosztu po stronie dostawcy.", boundary: "To firmowy wynik informacyjny. Przyjęcie nie nadaje uprawnień do aplikacji, Gita, push ani deploymentu.", noReview: "Brak aktualnego wyniku dostępnego do odbioru.", details: "Pełny wynik informacyjny"
  }
} as const;

export function CompanyInformationResult({ taskId, canStart, onAuthorize, onSaved }: { taskId: string; canStart: boolean; onAuthorize?: () => void; onSaved?: () => void }) {
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
    if (!canStart || busy || reading || status === "pending" || status === "running") return;
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
    <div className="flex flex-wrap gap-2"><CcButton type="button" size="sm" variant="outline" disabled={reading || busy} onClick={() => void load()}>{c.refresh}</CcButton>{canStart && status === "empty" && onAuthorize ? <CcButton type="button" size="sm" variant="outline" disabled={busy || reading} onClick={onAuthorize}>{locale === "pl" ? "Autoryzuj jedną próbę" : "Authorize one attempt"}</CcButton> : null}{canStart ? <CcButton type="button" size="sm" disabled={busy || reading || status === "pending" || status === "running"} onClick={() => void start()}>{c.run}</CcButton> : null}</div>
    {reading && !data ? <CcNotice tone="loading" title={c.loading} /> : null}
    {error ? <CcNotice live tone="error" title={c[error]} /> : saved ? <CcNotice live tone="success" title={c[saved]} /> : null}
    {data ? <>
      <CcNotice live tone={status === "failed" ? "error" : status === "stopped" ? "warning" : "info"} title={c[status]} />
      {data.summary ? <p className="whitespace-pre-wrap break-words">{data.summary}</p> : null}
      {data.finalResponse ? <details><summary className="cursor-pointer py-2 font-semibold">{c.details}</summary><pre className="whitespace-pre-wrap break-words text-sm">{data.finalResponse}</pre></details> : null}
      {data.sources.length ? <div><h4 className="font-semibold">{c.sources}</h4><ul className="grid gap-2 text-sm">{data.sources.map(source => <li key={source.id} className="break-words">{source.title} · <span className="break-all font-mono text-xs">{source.revision}</span></li>)}</ul></div> : null}
      {data.budget ? <div><h4 className="font-semibold">{c.limits}</h4><p className="text-sm">{c.attempts}: {data.budget.maxAttempts} · {c.seconds}: {data.budget.maxDurationSeconds} · {c.intent}: {data.budget.maxOutputTokensIntent}</p><p className="mt-2 text-sm text-company-muted">{c.unknown}</p></div> : null}
      {data.review ? <CcNotice tone={data.review.decision === "accept" ? "success" : "warning"} title={data.review.decision === "accept" ? c.accepted : c.returned} detail={data.review.summary} /> : null}
      {data.canReview && data.executionId && data.materialVersion ? <div className="grid gap-3"><CcField label={c.summary} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-24 w-full" minLength={3} maxLength={2000} value={summary} disabled={busy} onChange={event => { setSummary(event.target.value); setSaved(null); }} />}</CcField><div className="flex flex-wrap gap-2"><CcButton type="button" disabled={busy || reading || summary.trim().length < 3} onClick={() => void review("accept")}>{c.accept}</CcButton><CcButton type="button" variant="warning" disabled={busy || reading || summary.trim().length < 3} onClick={() => void review("return")}>{c.return}</CcButton></div></div> : !data.review ? <p className="text-sm text-company-muted">{c.noReview}</p> : null}
    </> : null}
  </section>;
}

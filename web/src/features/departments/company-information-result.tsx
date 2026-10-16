import { useEffect, useRef, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { useLanguage } from "../../i18n/i18n";

export type InformationResult = {
  status: string; executionId: string | null; summary: string | null; finalResponse: string | null; reason: string | null;
  canReview: boolean; materialVersion: string | null; review: { decision: "accept" | "reject" | "return" | "verified_pending_owner"; summary: string } | null;
  verifierReview?: { id: string; decision: string; summary: string | null; materialVersion: string;
    evidence: unknown; actorAgentId: string; actorCredentialPrefix: string | null } | null;
  ownerDecision?: { id: string; decision: "accept" | "return"; summary: string; ownerUserId: string; createdAt: string } | null;
  canOwnerDecide?: boolean;
  sources: { id: string; title: string; revision: string }[];
  budget: { maxAttempts: number; maxDurationSeconds: number; maxOutputTokensIntent: number; tokenCostEnforcement: "unavailable" } | null;
  execution?: { attempt: number; startedAt: string | null; completedAt: string | null; model: string | null; effort: string | null;
    requestedBackend: string | null; observedBackend: string | null; observedModel: string | null; observedDigest: string | null;
    checkpoint: string | null; eventsTruncated: boolean; events: { id: string; type: string; at: string }[] };
};
type SpentExecution = {
  id: string; status: string; attempt: number | null; completedAt: string | null; usage: Record<string, unknown> | null; materialDigest?: string;
  errorState: { code?: string; message?: string } | null; checkpoint: { stage?: string } | string | null; checkpointVersion: number | null;
};
export type ContinuationPacket = {
  previousExecution: SpentExecution | null; eligible: boolean; reason: string | null; readyPinId: string | null; readyRevision: string | null;
  continuation: { eventId: string; previousExecutionId: string; approvedAt: string; approvedByUserId: string } | null;
};
const continuationCopy = {
  en: {
    title: "Attempt and continuation", attempt: "Attempt", checkpoint: "Checkpoint", stop: "Stop reason", usage: "Usage evidence", unknown: "Unknown — no usable measure was reported.",
    limitation: "Hermes internal actions and provider 429 responses are not visible here. Progress is assessed after each attempt and independent review.",
    next: "To continue, prepare a new Ready with a changed plan and fresh budget. Review the stopped attempt independently, then approve this continuation before starting another execution.",
    diagnosis: "Independent diagnosis", plan: "Changed plan", approve: "Approve continuation", approved: "Continuation approved for this Ready and budget. Start a new execution from the task.",
    unavailable: "Continuation is not ready for approval.", loadError: "Continuation state could not be read. Refresh before approving or starting another attempt.",
    saved: "Continuation approval recorded.", refresh: "Refresh continuation", conflict: "The Ready, budget or execution changed. Refresh and review the current state.",
    previous: "This is an earlier attempt. Open the latest attempt to approve a continuation.", prepare: "Prepare new Ready"
  },
  pl: {
    title: "Próba i kontynuacja", attempt: "Próba", checkpoint: "Punkt kontrolny", stop: "Powód zatrzymania", usage: "Dane o użyciu", unknown: "Nieznane — nie zapisano użytecznego pomiaru.",
    limitation: "Wewnętrzne działania Hermes i odpowiedzi 429 dostawcy nie są tu widoczne. Postęp ocenia się po każdej próbie i niezależnym przeglądzie.",
    next: "Aby kontynuować, przygotuj nowe Ready ze zmienionym planem i świeżym budżetem. Niezależnie oceń zatrzymaną próbę, a następnie zatwierdź kontynuację przed kolejnym wykonaniem.",
    diagnosis: "Niezależna diagnoza", plan: "Zmieniony plan", approve: "Zatwierdź kontynuację", approved: "Kontynuacja zatwierdzona dla tego Ready i budżetu. Uruchom nowe wykonanie z zadania.",
    unavailable: "Kontynuacja nie jest gotowa do zatwierdzenia.", loadError: "Nie udało się odczytać stanu kontynuacji. Odśwież go przed zatwierdzeniem lub kolejną próbą.",
    saved: "Zapisano zatwierdzenie kontynuacji.", refresh: "Odśwież kontynuację", conflict: "Ready, budżet lub wykonanie uległy zmianie. Odśwież i sprawdź aktualny stan.",
    previous: "To wcześniejsza próba. Otwórz najnowszą, aby zatwierdzić kontynuację.", prepare: "Przygotuj nowe Ready"
  }
} as const;
export function usageMeasures(usage: Record<string, unknown> | null | undefined): Array<[string, number]> {
  if (!usage) return [];
  return Object.entries(usage).flatMap(([key, value]) => {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return [[key, value] as [string, number]];
    if (value && typeof value === "object" && !Array.isArray(value)) return Object.entries(value).flatMap(([nestedKey, nestedValue]) => typeof nestedValue === "number" && Number.isFinite(nestedValue) && nestedValue >= 0 ? [[`${key}.${nestedKey}`, nestedValue] as [string, number]] : []);
    return [];
  });
}
export function continuationState(packet: ContinuationPacket | null, executionId: string): "unavailable" | "earlier" | "blocked" | "eligible" | "approved" {
  if (!packet) return "unavailable";
  if (packet.previousExecution?.id !== executionId) return "earlier";
  if (packet.continuation?.previousExecutionId === executionId) return "approved";
  return packet.eligible && Boolean(packet.readyPinId) && Boolean(packet.readyRevision) ? "eligible" : "blocked";
}
export function informationStartAllowed(status: ReturnType<typeof informationResultStatus>, executionId: string | null, approvedExecutionId: string | null, reviewDecision: "accept" | "reject" | "return" | "verified_pending_owner" | null = null): boolean {
  if (status === "pending" || status === "running" || status === "completed" && reviewDecision !== "return") return false;
  return !(status === "failed" || status === "stopped" || status === "completed") || Boolean(executionId && approvedExecutionId === executionId);
}
function checkpointStage(checkpoint: SpentExecution["checkpoint"]): string | null {
  return typeof checkpoint === "string" ? checkpoint : checkpoint?.stage || null;
}
function continuationReason(reason: string | null, locale: string): string | undefined {
  if (!reason) return undefined;
  const copy: Record<string, [string, string]> = {
    execution_continuation_ready_required: ["Przygotuj i zatwierdź nowe Ready.", "Prepare and approve a new Ready."],
    execution_continuation_ready_stale: ["Ready nadal wskazuje poprzednią próbę.", "Ready still refers to the previous attempt."],
    execution_continuation_plan_unchanged: ["Plan wykonania nie został zmieniony.", "The execution plan has not changed."],
    execution_continuation_budget_invalid: ["Nowy budżet próby jest nieprawidłowy.", "The new attempt budget is invalid."],
    execution_result_accepted: ["Wynik został przyjęty; ta próba jest zamknięta.", "The result was accepted; this attempt is closed."],
    execution_owner_decision_required: ["Weryfikacja agenta jest zapisana; potrzebna jest końcowa decyzja właściciela.", "The agent verification is recorded; the owner's final decision is required."],
    execution_review_required: ["Najpierw odbierz lub zwróć wynik.", "Review or return the result first."],
    execution_review_manager_action_required: ["Po odrzuceniu wyniku potrzebna jest decyzja menedżera o zwrocie.", "A manager return decision is required after rejection."],
    execution_review_specialist_task: ["Korektę przekazano do osobnego zadania specjalisty.", "Correction was assigned to a separate specialist task."],
    execution_not_terminal: ["Próba nadal trwa.", "The attempt is still active."]
  };
  return copy[reason]?.[locale === "pl" ? 0 : 1] || reason.replaceAll("_", " ");
}
export function ExecutionContinuationReview({ taskId, executionId, fallback, onApprovalChange, onPrepareReady, onSaved }: {
  taskId: string; executionId: string; fallback?: SpentExecution | null; onApprovalChange?: (approved: boolean) => void; onPrepareReady?: () => void; onSaved?: () => void;
}) {
  const { locale } = useLanguage(), c = continuationCopy[locale === "pl" ? "pl" : "en"];
  const [packet, setPacket] = useState<ContinuationPacket | null>(null), [reading, setReading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null), [saved, setSaved] = useState(false), [diagnosis, setDiagnosis] = useState(""), [changedPlan, setChangedPlan] = useState("");
  const sequence = useRef(0), approvalRequest = useRef<CommandIdentity | null>(null);
  async function load(): Promise<"approved" | "other" | "error"> {
    const current = ++sequence.current;
    setReading(true); onApprovalChange?.(false);
    try {
      const response = await api<{ data: ContinuationPacket }>(`/v1/agent-runtime/tasks/${taskId}/execution-continuation`, { cache: "no-store" });
      if (current !== sequence.current) return "error";
      if (!response.data || typeof response.data.eligible !== "boolean") throw new Error("continuation_invalid");
      setPacket(response.data); setError(null);
      const state = continuationState(response.data, executionId) === "approved" ? "approved" : "other";
      onApprovalChange?.(state === "approved");
      return state;
    } catch { if (current === sequence.current) { setPacket(null); setError(c.loadError); } return "error"; }
    finally { if (current === sequence.current) setReading(false); }
  }
  useEffect(() => { setPacket(null); setDiagnosis(""); setChangedPlan(""); setSaved(false); approvalRequest.current = null; void load(); return () => { ++sequence.current; }; }, [taskId, executionId]);
  const latest = packet?.previousExecution?.id === executionId;
  const execution = latest ? packet.previousExecution : fallback?.id === executionId ? fallback : null;
  const measures = usageMeasures(execution?.usage);
  const unknownMeasures = Object.entries(execution?.usage || {}).filter(([, value]) => value === null).map(([name]) => name);
  const state = continuationState(packet, executionId);
  const approved = state === "approved";
  const ready = state === "eligible";
  const stopped = execution?.status === "failed" || execution?.status === "cancelled";
  const continuationRelevant = stopped || Boolean(latest && (packet?.eligible || execution?.status === "completed" && packet?.reason?.startsWith("execution_continuation_")));
  async function approve() {
    if (!ready || !packet || busy || reading || diagnosis.trim().length < 3 || diagnosis.trim().length > 2000 || changedPlan.trim().length < 3 || changedPlan.trim().length > 2000) return;
    if (!packet.previousExecution?.materialDigest) { setError(c.loadError); return; }
    const input = { previousExecutionId: executionId, previousMaterialDigest: packet.previousExecution.materialDigest,
      readyPinId: packet.readyPinId!, readyRevision: packet.readyRevision!, diagnosis: diagnosis.trim(), changedPlan: changedPlan.trim() };
    approvalRequest.current = informationCommand(approvalRequest.current, input);
    setBusy(true); setError(null); setSaved(false);
    try {
      await api(`/v1/agent-runtime/tasks/${taskId}/execution-continuation`, { method: "POST", body: JSON.stringify({ ...input, requestId: approvalRequest.current.requestId }) });
      const readBack = await load();
      if (readBack === "approved") { approvalRequest.current = null; setSaved(true); onSaved?.(); }
      else if (readBack === "other") setError(c.conflict);
    } catch (caught) { setError(caught instanceof AppApiError && caught.status === 409 ? c.conflict : c.loadError); }
    finally { setBusy(false); }
  }
  return <section className="mt-4 border-t border-base-300 pt-4" aria-label={c.title}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold">{c.title}</h4><CcButton type="button" size="sm" variant="ghost" disabled={busy || reading} onClick={() => void load()}>{c.refresh}</CcButton></div>
    {execution ? <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-company-muted">{c.attempt}</dt><dd>{execution.attempt ?? "—"}</dd></div>
      <div><dt className="text-company-muted">{c.checkpoint}</dt><dd>{checkpointStage(execution.checkpoint) || "—"} · v{execution.checkpointVersion ?? "—"}</dd></div>
      <div><dt className="text-company-muted">{c.stop}</dt><dd className="break-words">{stopped ? execution.errorState?.code || execution.status : "—"}</dd></div>
      <div><dt className="text-company-muted">{c.usage}</dt><dd>{measures.map(([name, value]) => <span className="block break-all" key={name}>{name}: {value.toLocaleString(locale)}</span>)}{unknownMeasures.map(name => <span className="block break-all" key={name}>{name}: {c.unknown}</span>)}{!measures.length && !unknownMeasures.length ? c.unknown : null}</dd></div>
    </dl> : null}
    <p className="mt-3 text-sm text-company-muted">{c.limitation}</p>
    {continuationRelevant ? <p className="mt-2 text-sm">{c.next}</p> : null}
    {continuationRelevant && state !== "earlier" && onPrepareReady ? <CcButton className="mt-3 min-h-11" size="sm" variant="outline" onClick={onPrepareReady}>{c.prepare}</CcButton> : null}
    {reading && !packet ? <CcNotice tone="loading" title={c.title} /> : null}
    {error ? <CcNotice live tone="error" title={error} /> : null}
    {saved ? <CcNotice live tone="success" title={c.saved} /> : null}
    {approved ? <CcNotice tone="success" title={c.approved} /> : packet && stopped && !latest ? <CcNotice tone="info" title={c.previous} /> : packet && continuationRelevant && !ready ? <CcNotice tone="info" title={c.unavailable} detail={continuationReason(packet.reason, locale)} /> : null}
    {ready ? <div className="mt-4 grid gap-3"><CcField label={c.diagnosis} required>{({ id, describedBy }) => <textarea id={id} aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" minLength={3} maxLength={2000} value={diagnosis} disabled={busy} onChange={event => { setDiagnosis(event.target.value); setSaved(false); }} />}</CcField><CcField label={c.plan} required>{({ id, describedBy }) => <textarea id={id} aria-describedby={describedBy} className="textarea textarea-bordered min-h-24 w-full" minLength={3} maxLength={2000} value={changedPlan} disabled={busy} onChange={event => { setChangedPlan(event.target.value); setSaved(false); }} />}</CcField><CcButton type="button" size="sm" disabled={busy || reading || diagnosis.trim().length < 3 || changedPlan.trim().length < 3} loading={busy} onClick={() => void approve()}>{c.approve}</CcButton></div> : null}
  </section>;
}
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
    started: "Runtime start was recorded. Check the execution status below.", saved: "The result review was recorded.", summary: "Review explanation", accept: "Accept information result", return: "Return information result", accepted: "Information result accepted.", returned: "Information result returned.", rejected: "Verifier rejected the result; manager action is pending.", verifiedPendingOwner: "The independent agent verified this result. Your final decision is pending.", ownerDecision: "Owner decision", verifierEvidence: "Agent verification evidence", ownerSummary: "Reason for your decision", ownerAccept: "Accept this exact result", ownerReturn: "Return this exact result", ownerSaved: "Your decision was recorded.",
    sources: "Selected sources", limits: "Declared task limits", attempts: "Attempts", seconds: "Seconds", intent: "Output token intent", unknown: "Token and cost enforcement is unavailable. These declared limits do not prove a provider token or cost cap.", boundary: "This is a company information result. Acceptance grants no application, Git, push or deployment authority.", noReview: "No reviewable current result is available.", details: "Full information result", timeline: "Execution timeline", timelineTruncated: "Showing the first 100 events. More events exist in the execution record.", model: "Model", effort: "Effort", requestedBackend: "Selected backend", observedBackend: "Worker-observed backend", observedModel: "Worker-observed model", observedDigest: "Worker-observed digest", observerLimit: "The local observer checks the Ollama process and model files, but Ollama does not sign the weights used for each response.", checkpoint: "Checkpoint", startedAt: "Started", completedAt: "Finished", event: "Event", unavailable: "Not recorded", scope: "Tools and external writes: none authorized"
  },
  pl: {
    title: "Wynik zadania informacyjnego", loading: "Odczytywanie wyniku zadania…", refresh: "Odśwież wynik", run: "Uruchom zadanie informacyjne",
    empty: "Brak dostępnego wyniku informacyjnego.", pending: "Zadanie informacyjne jest w kolejce.", running: "Zadanie informacyjne jest wykonywane.", completed: "Agent zwrócił wynik informacyjny.", failed: "Zadanie informacyjne nie powiodło się.", stopped: "Zadanie informacyjne zatrzymano; może być wymagany zmieniony plan i nowy budżet.",
    error: "Nie udało się potwierdzić żądania. Odśwież wynik przed decyzją o kolejnym działaniu.", authority: "Przed uruchomieniem zadania wymagana jest zaakceptowana decyzja właściciela o wykonaniu runtime.", conflict: "Wynik lub jego uprawnienie uległy zmianie. Odśwież i sprawdź aktualny materiał.",
    started: "Zapisano rozpoczęcie runtime. Sprawdź poniżej status wykonania.", saved: "Zapisano odbiór wyniku.", summary: "Uzasadnienie odbioru", accept: "Przyjmij wynik informacyjny", return: "Zwróć wynik informacyjny", accepted: "Wynik informacyjny przyjęty.", returned: "Wynik informacyjny zwrócony.", rejected: "Weryfikator odrzucił wynik; oczekuje on na decyzję menedżera.", verifiedPendingOwner: "Niezależny agent zweryfikował wynik. Oczekuje on na Twoją końcową decyzję.", ownerDecision: "Decyzja właściciela", verifierEvidence: "Dowód weryfikacji agenta", ownerSummary: "Uzasadnienie Twojej decyzji", ownerAccept: "Przyjmij dokładnie ten wynik", ownerReturn: "Zwróć dokładnie ten wynik", ownerSaved: "Zapisano Twoją decyzję.",
    sources: "Wybrane źródła", limits: "Deklarowane limity zadania", attempts: "Próby", seconds: "Sekundy", intent: "Założony limit tokenów wyjściowych", unknown: "Wymuszanie limitu tokenów i kosztu jest niedostępne. Deklarowane limity nie potwierdzają limitu tokenów ani kosztu po stronie dostawcy.", boundary: "To firmowy wynik informacyjny. Przyjęcie nie nadaje uprawnień do aplikacji, Gita, push ani deploymentu.", noReview: "Brak aktualnego wyniku dostępnego do odbioru.", details: "Pełny wynik informacyjny", timeline: "Oś wykonania", timelineTruncated: "Pokazano pierwsze 100 zdarzeń. Dalsze zdarzenia są w rekordzie wykonania.", model: "Model", effort: "Wysiłek", requestedBackend: "Wybrany backend", observedBackend: "Backend zaobserwowany przez Workera", observedModel: "Model zaobserwowany przez Workera", observedDigest: "Digest zaobserwowany przez Workera", observerLimit: "Lokalny obserwator sprawdza proces Ollama i pliki modelu, lecz Ollama nie podpisuje wag użytych do każdej odpowiedzi.", checkpoint: "Punkt kontrolny", startedAt: "Rozpoczęto", completedAt: "Zakończono", event: "Zdarzenie", unavailable: "Nie zapisano", scope: "Narzędzia i zapisy zewnętrzne: brak uprawnienia"
  }
} as const;

export function CompanyInformationResult({ taskId, canStart, canAuthorize = canStart, onAuthorize, onReview, onSaved, historical = false }: { taskId: string; canStart: boolean; canAuthorize?: boolean; onAuthorize?: () => void; onReview?: () => void; onSaved?: () => void; historical?: boolean }) {
  const { locale } = useLanguage(), c = messages[locale === "pl" ? "pl" : "en"];
  const [data, setData] = useState<InformationResult | null>(null), [reading, setReading] = useState(true), [busy, setBusy] = useState(false);
  const [approvedExecutionId, setApprovedExecutionId] = useState<string | null>(null);
  const [error, setError] = useState<"error" | "authority" | "conflict" | null>(null), [saved, setSaved] = useState<"started" | "saved" | "ownerSaved" | null>(null);
  const [ownerSummary, setOwnerSummary] = useState("");
  const mounted = useRef(true), readSequence = useRef(0), automaticReads = useRef(0), startRequest = useRef<CommandIdentity | null>(null), ownerRequest = useRef<CommandIdentity | null>(null);
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
  useEffect(() => { mounted.current = true; setData(null); setApprovedExecutionId(null); setOwnerSummary(""); automaticReads.current = 0; startRequest.current = null; ownerRequest.current = null; void load(); return () => { mounted.current = false; ++readSequence.current; }; }, [taskId]);
  const status = informationResultStatus(data?.status ?? "");
  useEffect(() => {
    if (status !== "pending" && status !== "running") return;
    const timer = window.setInterval(() => { if (!busy && !reading && automaticReads.current < 12) { ++automaticReads.current; void load(); } }, 5000);
    return () => window.clearInterval(timer);
  }, [taskId, status, busy, reading]);
  function rejected(caught: unknown) {
    if (caught instanceof AppApiError && caught.code === "runtime_authority_required") return "authority" as const;
    if (caught instanceof AppApiError && ["information_result_changed", "information_review_conflict", "task_ready_context_conflict", "task_ready_revalidation_required", "information_owner_decision_stale", "information_owner_decision_key_conflict"].includes(caught.code)) return "conflict" as const;
    return "error" as const;
  }
  async function start() {
    if (!canStart || busy || reading || !informationStartAllowed(status, data?.executionId ?? null, approvedExecutionId, data?.review?.decision ?? null)) return;
    startRequest.current = informationCommand(startRequest.current, {});
    setBusy(true); setError(null); setSaved(null);
    try {
      await api(`/v1/agent-runtime/tasks/${taskId}/actions/start-information`, { method: "POST", body: JSON.stringify({ requestId: startRequest.current.requestId }) });
      if (!mounted.current) return;
      startRequest.current = null; await load(); setSaved("started"); onSaved?.();
    } catch (caught) { if (mounted.current) setError(rejected(caught)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function decideOwner(decision: "accept" | "return") {
    const review = data?.verifierReview;
    if (!data?.canOwnerDecide || !review || !data.executionId || busy || reading || ownerSummary.trim().length < 3) return;
    const input = { executionId: data.executionId, reviewId: review.id, materialVersion: review.materialVersion,
      decision, summary: ownerSummary.trim() };
    ownerRequest.current = informationCommand(ownerRequest.current, input);
    setBusy(true); setError(null); setSaved(null);
    try {
      await api(`/v1/agent-runtime/tasks/${taskId}/actions/review-information`, { method: "POST",
        body: JSON.stringify({ ...input, requestId: ownerRequest.current.requestId }) });
      if (!mounted.current) return;
      await load(); ownerRequest.current = null; setSaved("ownerSaved"); onSaved?.();
    } catch (caught) { if (mounted.current) setError(rejected(caught)); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <section aria-label={historical ? locale === "pl" ? "Historia próby informacyjnej" : "Information attempt history" : c.title} className="grid min-w-0 gap-4 border-t border-base-300 pt-4">
    <h3 className="font-bold">{historical ? locale === "pl" ? "Historia próby informacyjnej" : "Information attempt history" : c.title}</h3><p className="text-sm text-company-muted">{historical ? locale === "pl" ? "Zachowany zapis próby. Wycofany mandat nie upoważnia do ponowienia ani odbioru jako bieżącej pracy." : "Retained attempt record. The retired mandate does not authorize a retry or current-work review." : c.boundary}</p>
    <div className="flex flex-wrap gap-2"><CcButton type="button" size="sm" variant="outline" disabled={reading || busy} onClick={() => void load()}>{c.refresh}</CcButton>{!historical && canAuthorize && (["empty", "failed", "stopped"].includes(status) || status === "completed" && data?.review?.decision === "return") && onAuthorize ? <CcButton type="button" size="sm" variant="outline" disabled={busy || reading} onClick={onAuthorize}>{locale === "pl" ? "Autoryzuj jedną próbę" : "Authorize one attempt"}</CcButton> : null}{!historical && canStart && (status !== "completed" || data?.review?.decision === "return") ? <CcButton type="button" size="sm" disabled={busy || reading || !informationStartAllowed(status, data?.executionId ?? null, approvedExecutionId, data?.review?.decision ?? null)} onClick={() => void start()}>{c.run}</CcButton> : null}</div>
    {reading && !data ? <CcNotice tone="loading" title={c.loading} /> : null}
    {error ? <CcNotice live tone="error" title={c[error]} /> : saved ? <CcNotice live tone="success" title={c[saved]} /> : null}
    {data ? <>
      <CcNotice live tone={status === "failed" ? "error" : status === "stopped" ? "warning" : "info"} title={c[status]} detail={status === "failed" || status === "stopped" ? failureReason(data.reason, locale) : undefined} />
      {data.summary ? <p className="whitespace-pre-wrap break-words">{data.summary}</p> : null}
      {data.finalResponse ? <details><summary className="cursor-pointer py-2 font-semibold">{c.details}</summary><pre className="whitespace-pre-wrap break-words text-sm">{data.finalResponse}</pre></details> : null}
      {data.sources.length ? <div><h4 className="font-semibold">{c.sources}</h4><ul className="grid gap-2 text-sm">{data.sources.map(source => <li key={source.id} className="break-words">{source.title} · <span className="break-all font-mono text-xs">{source.revision}</span></li>)}</ul></div> : null}
      {data.budget ? <div><h4 className="font-semibold">{c.limits}</h4><p className="text-sm">{c.attempts}: {data.budget.maxAttempts} · {c.seconds}: {data.budget.maxDurationSeconds} · {c.intent}: {data.budget.maxOutputTokensIntent}</p><p className="mt-2 text-sm text-company-muted">{c.unknown}</p></div> : null}
      {!historical && data.executionId ? <ExecutionContinuationReview key={data.executionId} taskId={taskId} executionId={data.executionId} fallback={data.execution ? { id: data.executionId, status: data.status, attempt: data.execution.attempt, completedAt: data.execution.completedAt, usage: null, errorState: data.reason ? { code: data.reason } : null, checkpoint: data.execution.checkpoint, checkpointVersion: null } : null} onApprovalChange={approved => setApprovedExecutionId(approved ? data.executionId : null)} onSaved={onSaved} /> : null}
      {data.execution ? <details className="min-w-0 border-t border-base-300 pt-3"><summary className="cursor-pointer py-2 font-semibold">{c.timeline}</summary><dl className="grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-company-muted">{c.model} / {c.effort}</dt><dd>{data.execution.model || c.unavailable} / {data.execution.effort || c.unavailable}</dd></div><div><dt className="text-company-muted">{c.requestedBackend}</dt><dd>{data.execution.requestedBackend || c.unavailable}</dd></div><div><dt className="text-company-muted">{c.observedBackend}</dt><dd>{data.execution.observedBackend || c.unavailable}</dd></div><div><dt className="text-company-muted">{c.observedModel}</dt><dd>{data.execution.observedModel || c.unavailable}</dd></div>{data.execution.requestedBackend === "ollama_loopback" ? <div className="sm:col-span-2"><dt className="text-company-muted">{c.observedDigest}</dt><dd className="break-all font-mono text-xs">{data.execution.observedDigest || c.unavailable}</dd></div> : null}<div><dt className="text-company-muted">{c.attempts} / {c.checkpoint}</dt><dd>{data.execution.attempt ?? c.unavailable} / {checkpointLabel(data.execution.checkpoint, locale)}</dd></div><div><dt className="text-company-muted">{c.startedAt}</dt><dd>{data.execution.startedAt ? new Date(data.execution.startedAt).toLocaleString(locale) : c.unavailable}</dd></div><div><dt className="text-company-muted">{c.completedAt}</dt><dd>{data.execution.completedAt ? new Date(data.execution.completedAt).toLocaleString(locale) : c.unavailable}</dd></div></dl>{data.execution.requestedBackend === "ollama_loopback" ? <p className="my-3 text-sm text-company-muted">{c.observerLimit}</p> : null}<p className="my-3 text-sm text-company-muted">{c.scope}</p><ol className="grid gap-2 text-sm">{data.execution.events.map(event => <li key={event.id} className="flex flex-wrap justify-between gap-2 border-b border-base-300 py-2"><span>{executionEventLabel(event.type, locale)}</span><time dateTime={event.at}>{new Date(event.at).toLocaleString(locale)}</time></li>)}</ol></details> : null}
      {data.execution?.eventsTruncated ? <p className="text-sm text-company-muted">{c.timelineTruncated}</p> : null}
      {data.review ? <CcNotice tone={data.review.decision === "accept" ? "success" : "warning"} title={data.review.decision === "accept" ? c.accepted : data.review.decision === "reject" ? c.rejected : data.review.decision === "verified_pending_owner" ? c.verifiedPendingOwner : c.returned} detail={data.review.summary} /> : null}
      {data.verifierReview ? <details className="min-w-0"><summary className="cursor-pointer py-2 font-semibold">{c.verifierEvidence}</summary><p className="break-all text-xs">{data.verifierReview.actorAgentId} · {data.verifierReview.materialVersion}</p><pre className="whitespace-pre-wrap break-words text-sm">{JSON.stringify(data.verifierReview.evidence, null, 2)}</pre></details> : null}
      {!historical && data.canOwnerDecide && data.verifierReview ? <section className="grid gap-3 border-t border-base-300 pt-4" aria-label={c.ownerDecision}>
        <h4 className="font-semibold">{c.ownerDecision}</h4><CcField label={c.ownerSummary} required>{({ id }) => <textarea id={id} className="textarea textarea-bordered min-h-24 w-full" minLength={3} maxLength={2000} required disabled={busy} value={ownerSummary} onChange={event => { setOwnerSummary(event.target.value); ownerRequest.current = null; }} />}</CcField>
        <div className="flex flex-wrap gap-2"><CcButton type="button" disabled={busy || reading || ownerSummary.trim().length < 3} onClick={() => void decideOwner("accept")}>{c.ownerAccept}</CcButton><CcButton type="button" variant="outline" disabled={busy || reading || ownerSummary.trim().length < 3} onClick={() => void decideOwner("return")}>{c.ownerReturn}</CcButton></div>
      </section> : null}
      {!historical && status === "completed" && onReview && (!data.review || data.review.decision === "reject") ? <CcButton type="button" variant="outline" disabled={busy || reading} onClick={onReview}>{data.review?.decision === "reject" ? locale === "pl" ? "Decyzja managera o zwrocie" : "Manager return decision" : locale === "pl" ? "Oceń wynik jako przypisany weryfikator" : "Review as assigned verifier"}</CcButton> : null}
    </> : null}
  </section>;
}
